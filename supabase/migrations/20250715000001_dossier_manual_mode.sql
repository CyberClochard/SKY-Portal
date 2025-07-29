-- Migration pour ajouter le mode manuel par dossier
-- Date: 2025-01-15

-- 1. Supprimer la contrainte de clé étrangère sur master_id si elle existe
DO $$
BEGIN
  -- Vérifier si la contrainte existe et la supprimer
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'invoices' 
    AND constraint_name = 'invoices_master_id_fkey'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_master_id_fkey;
  END IF;
END $$;

-- 2. Ajouter les colonnes master_id et master_name à la table invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS master_id TEXT,
ADD COLUMN IF NOT EXISTS master_name TEXT;

-- Index pour performance sur master_id
CREATE INDEX IF NOT EXISTS idx_invoices_master_id ON invoices(master_id);

-- 3. Table pour gérer les modes des dossiers
CREATE TABLE IF NOT EXISTS dossier_settings (
  master_id TEXT PRIMARY KEY,
  manual_mode BOOLEAN DEFAULT false,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_dossier_settings_manual_mode ON dossier_settings(manual_mode);

-- 4. Fonction helper pour vérifier le mode d'un dossier
CREATE OR REPLACE FUNCTION get_dossier_manual_mode(p_master_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_manual BOOLEAN := false;
BEGIN
  SELECT COALESCE(manual_mode, false)
  INTO is_manual
  FROM dossier_settings
  WHERE master_id = p_master_id;

  RETURN COALESCE(is_manual, false);
END;
$$ LANGUAGE plpgsql;

-- 5. Fonction pour activer/désactiver le mode manuel d'un dossier
CREATE OR REPLACE FUNCTION set_dossier_manual_mode(
  p_master_id TEXT,
  p_manual_mode BOOLEAN,
  p_updated_by TEXT
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO dossier_settings (master_id, manual_mode, updated_by)
  VALUES (p_master_id, p_manual_mode, p_updated_by)
  ON CONFLICT (master_id)
  DO UPDATE SET
    manual_mode = p_manual_mode,
    updated_by = p_updated_by,
    updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'master_id', p_master_id,
    'manual_mode', p_manual_mode
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Fonction pour obtenir le mode d'un dossier depuis un payment_id
CREATE OR REPLACE FUNCTION get_payment_dossier_mode(p_payment_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  dossier_master_id TEXT;
  is_manual BOOLEAN := false;
BEGIN
  -- Récupérer le master_id du dossier via les allocations
  SELECT DISTINCT i.master_id
  INTO dossier_master_id
  FROM payment_allocations pa
  JOIN invoices i ON pa.invoice_id = i.id
  WHERE pa.payment_id = p_payment_id
  LIMIT 1;

  -- Si trouvé, vérifier le mode
  IF dossier_master_id IS NOT NULL THEN
    SELECT get_dossier_manual_mode(dossier_master_id) INTO is_manual;
  END IF;

  RETURN COALESCE(is_manual, false);
END;
$$ LANGUAGE plpgsql;

-- 7. Vue dossiers avec leur mode de gestion
CREATE OR REPLACE VIEW dossier_overview_with_mode AS
SELECT
  i.master_id,
  i.master_name,
  i.customer_id,
  c.name as customer_name,
  SUM(i.amount_total) as total_invoiced,
  SUM(i.amount_paid) as total_paid,
  SUM(i.amount_total) - SUM(i.amount_paid) as balance,
  COUNT(i.id) as invoice_count,
  -- Mode de gestion du dossier
  COALESCE(ds.manual_mode, false) as is_manual_mode,
  ds.updated_by as mode_updated_by,
  ds.updated_at as mode_updated_at,
  -- Statut global
  CASE
    WHEN SUM(i.amount_paid) = 0 THEN 'unpaid'
    WHEN SUM(i.amount_paid) >= SUM(i.amount_total) THEN 'paid'
    ELSE 'partial'
  END as dossier_status
FROM invoices i
LEFT JOIN customers c ON i.customer_id = c.id
LEFT JOIN dossier_settings ds ON i.master_id = ds.master_id
WHERE i.master_id IS NOT NULL
GROUP BY i.master_id, i.master_name, i.customer_id, c.name,
         ds.manual_mode, ds.updated_by, ds.updated_at
ORDER BY i.master_name;

-- 8. Vue paiements avec contexte dossier
CREATE OR REPLACE VIEW payments_with_dossier_context AS
SELECT
  p.*,
  c.name as customer_name,
  -- Informations du dossier principal (si déterminable)
  dossier_info.master_id,
  dossier_info.master_name,
  dossier_info.is_manual_mode,
  -- Type d'allocation déterminé
  CASE
    WHEN dossier_info.is_manual_mode = true THEN 'Manual (Dossier)'
    WHEN p.auto_allocate = true THEN 'Auto'
    ELSE 'Standard'
  END as allocation_type
FROM payments p
LEFT JOIN customers c ON p.customer_id = c.id
LEFT JOIN (
  SELECT DISTINCT
    pa.payment_id,
    i.master_id,
    i.master_name,
    COALESCE(ds.manual_mode, false) as is_manual_mode
  FROM payment_allocations pa
  JOIN invoices i ON pa.invoice_id = i.id
  LEFT JOIN dossier_settings ds ON i.master_id = ds.master_id
) dossier_info ON p.id = dossier_info.payment_id
ORDER BY p.created_at DESC;

-- 9. Fonction pour créer un paiement en tenant compte du mode du dossier
CREATE OR REPLACE FUNCTION create_payment_for_dossier(
  p_customer_id UUID,
  p_master_id TEXT,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_reference TEXT,
  p_notes TEXT,
  p_manual_allocations JSON DEFAULT NULL -- Allocations manuelles si mode manuel
)
RETURNS JSON AS $$
DECLARE
  payment_id UUID;
  is_manual_mode BOOLEAN;
  allocation RECORD;
BEGIN
  -- Vérifier le mode du dossier
  SELECT get_dossier_manual_mode(p_master_id) INTO is_manual_mode;

  -- Créer le paiement
  INSERT INTO payments (
    customer_id, amount, payment_method, reference, notes,
    status, auto_allocate
  ) VALUES (
    p_customer_id, p_amount, p_payment_method::payment_method_enum,
    p_reference, p_notes, 'completed', NOT is_manual_mode
  ) RETURNING id INTO payment_id;

  -- Si mode manuel ET allocations fournies, les créer
  IF is_manual_mode = true AND p_manual_allocations IS NOT NULL THEN
    FOR allocation IN SELECT * FROM json_to_recordset(p_manual_allocations) AS x(invoice_id UUID, amount_allocated DECIMAL)
    LOOP
      -- Vérifier que la facture appartient au dossier
      IF NOT EXISTS (
        SELECT 1 FROM invoices
        WHERE id = allocation.invoice_id
        AND master_id = p_master_id
        AND customer_id = p_customer_id
      ) THEN
        RAISE EXCEPTION 'Invoice % does not belong to dossier % for customer %',
          allocation.invoice_id, p_master_id, p_customer_id;
      END IF;

      -- Créer l'allocation manuelle
      INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
      VALUES (payment_id, allocation.invoice_id, allocation.amount_allocated);
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', true,
    'payment_id', payment_id,
    'dossier_mode', CASE WHEN is_manual_mode THEN 'manual' ELSE 'auto' END
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Modifier le trigger d'allocation automatique pour vérifier le mode du dossier
CREATE OR REPLACE FUNCTION trigger_auto_allocate_payment()
RETURNS TRIGGER AS $$
DECLARE
  dossier_master_id TEXT;
  is_dossier_manual BOOLEAN := false;
BEGIN
  -- Si auto_allocate est activé et le paiement est complété
  IF NEW.auto_allocate = true AND NEW.status = 'completed' THEN

    -- Déterminer le dossier concerné par ce paiement
    -- (via les allocations ou autres moyens selon votre logique actuelle)
    SELECT DISTINCT i.master_id
    INTO dossier_master_id
    FROM payment_allocations pa
    JOIN invoices i ON pa.invoice_id = i.id
    WHERE pa.payment_id = NEW.id
    LIMIT 1;

    -- Si pas trouvé via allocations, essayer via customer + logique métier
    -- (à adapter selon votre logique existante)

    -- Vérifier si le dossier est en mode manuel
    IF dossier_master_id IS NOT NULL THEN
      SELECT get_dossier_manual_mode(dossier_master_id) INTO is_dossier_manual;
    END IF;

    -- Ne déclencher l'allocation automatique QUE si le dossier n'est pas en mode manuel
    IF COALESCE(is_dossier_manual, false) = false THEN
      PERFORM allocate_payment_automatically(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Données de test pour les dossiers existants
-- (Optionnel : pour tester avec des dossiers existants)
-- Mettre à jour les factures existantes avec des master_id de test
UPDATE invoices 
SET master_id = 'DOSSIER-' || customer_id::text,
    master_name = 'Dossier ' || customer_id::text
WHERE master_id IS NULL;

-- Insérer des paramètres de dossier pour les dossiers existants
INSERT INTO dossier_settings (master_id, manual_mode, updated_by)
SELECT DISTINCT master_id, false, 'system'
FROM invoices
WHERE master_id IS NOT NULL
ON CONFLICT (master_id) DO NOTHING; 