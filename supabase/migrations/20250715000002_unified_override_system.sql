-- =====================================================
-- SCRIPTS SQL - SYSTÈME OVERRIDE UNIFIÉ FINAL
-- =====================================================

-- SCRIPT 1 : Suppression des anciennes fonctions
DROP FUNCTION IF EXISTS set_master_facture_override(TEXT, TEXT);
DROP FUNCTION IF EXISTS remove_master_facture_override(TEXT);
DROP VIEW IF EXISTS master_facturation_status;

-- SCRIPT 2 : Ajout de la colonne unifiée pour l'override manuel
ALTER TABLE "MASTER" 
ADD COLUMN IF NOT EXISTS "MANUAL_OVERRIDE" BOOLEAN DEFAULT FALSE;

-- SCRIPT 3 : Fonction pour calculer le statut de règlement automatique
CREATE OR REPLACE FUNCTION calculate_reglement_status(dossier_id TEXT)
RETURNS TEXT AS $$
DECLARE
  total_factures DECIMAL := 0;
  total_paiements DECIMAL := 0;
BEGIN
  -- Calculer le montant total des factures du dossier
  SELECT COALESCE(SUM(amount_total), 0) 
  INTO total_factures
  FROM invoices 
  WHERE master_id = dossier_id;
  
  -- Calculer le montant total des paiements alloués au dossier
  SELECT COALESCE(SUM(pa.amount_allocated), 0)
  INTO total_paiements
  FROM payment_allocations pa
  JOIN invoices i ON pa.invoice_id = i.id
  WHERE i.master_id = dossier_id;
  
  -- Déterminer le statut
  IF total_paiements = 0 THEN
    RETURN 'unpaid';
  ELSIF total_paiements >= total_factures THEN
    RETURN 'paid';
  ELSE
    RETURN 'partial';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- SCRIPT 4 : Fonction principale pour mode manuel
CREATE OR REPLACE FUNCTION set_master_manual_mode(
  dossier_id TEXT,
  facture_statut TEXT,
  reglement_statut TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Vérifier que le dossier existe
  IF NOT EXISTS (SELECT 1 FROM "MASTER" WHERE "DOSSIER" = dossier_id) THEN
    RAISE EXCEPTION 'Dossier % non trouve', dossier_id;
  END IF;
  
  -- Valider le statut de facturation
  IF facture_statut NOT IN ('non facture', 'facture', 'famille') THEN
    RAISE EXCEPTION 'Statut facture invalide: %. Utilisez: non facture, facture, famille', facture_statut;
  END IF;
  
  -- Valider le statut de règlement
  IF reglement_statut NOT IN ('unpaid', 'paid', 'partial') THEN
    RAISE EXCEPTION 'Statut reglement invalide: %. Utilisez: unpaid, paid, partial', reglement_statut;
  END IF;
  
  -- Passer en mode manuel
  UPDATE "MASTER"
  SET 
    "FACTURE" = facture_statut,
    "REGLEMENT" = reglement_statut,
    "MANUAL_OVERRIDE" = TRUE
  WHERE "DOSSIER" = dossier_id;
  
  RETURN 'Mode manuel active pour: ' || dossier_id || 
         ' (facture: ' || facture_statut || 
         ', reglement: ' || reglement_statut || ')';
END;
$$ LANGUAGE plpgsql;

-- SCRIPT 5 : Fonction pour revenir en mode automatique
CREATE OR REPLACE FUNCTION set_master_auto_mode(dossier_id TEXT)
RETURNS TEXT AS $$
DECLARE
  nouveau_facture_statut TEXT;
  nouveau_reglement_statut TEXT;
BEGIN
  -- Vérifier que le dossier existe
  IF NOT EXISTS (SELECT 1 FROM "MASTER" WHERE "DOSSIER" = dossier_id) THEN
    RAISE EXCEPTION 'Dossier % non trouve', dossier_id;
  END IF;
  
  -- Calculer les nouveaux statuts automatiques
  SELECT CASE 
    WHEN EXISTS (SELECT 1 FROM invoices WHERE master_id = dossier_id) 
    THEN 'facture'
    ELSE 'non facture'
  END INTO nouveau_facture_statut;
  
  SELECT calculate_reglement_status(dossier_id) INTO nouveau_reglement_statut;
  
  -- Remettre en mode automatique
  UPDATE "MASTER"
  SET 
    "MANUAL_OVERRIDE" = FALSE,
    "FACTURE" = nouveau_facture_statut,
    "REGLEMENT" = nouveau_reglement_statut
  WHERE "DOSSIER" = dossier_id;
  
  RETURN 'Mode automatique reactive pour: ' || dossier_id || 
         ' (facture: ' || nouveau_facture_statut || 
         ', reglement: ' || nouveau_reglement_statut || ')';
END;
$$ LANGUAGE plpgsql;

-- SCRIPT 6 : Vue pour l'interface
CREATE OR REPLACE VIEW master_mode_status AS
SELECT 
  "DOSSIER",
  "FACTURE",
  "REGLEMENT",
  CASE 
    WHEN "MANUAL_OVERRIDE" THEN 'Manuel'
    ELSE 'Automatique'
  END as mode_gestion,
  "MANUAL_OVERRIDE"
FROM "MASTER";

-- SCRIPT 7 : Trigger pour mise à jour automatique
CREATE OR REPLACE FUNCTION update_master_auto_status()
RETURNS TRIGGER AS $$
DECLARE
  affected_dossier TEXT;
BEGIN
  -- Déterminer quel dossier est affecté
  IF TG_TABLE_NAME = 'invoices' THEN
    affected_dossier := COALESCE(NEW.master_id, OLD.master_id);
  ELSIF TG_TABLE_NAME = 'payment_allocations' THEN
    -- Trouver le dossier via la facture
    SELECT i.master_id INTO affected_dossier
    FROM invoices i
    WHERE i.id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;
  
  -- Mettre à jour seulement les dossiers en mode automatique
  IF affected_dossier IS NOT NULL THEN
    -- Mise à jour facturation automatique
    UPDATE "MASTER" 
    SET "FACTURE" = CASE 
      WHEN EXISTS (SELECT 1 FROM invoices WHERE master_id = affected_dossier) 
      THEN 'facture'
      ELSE 'non facture'
    END
    WHERE "DOSSIER" = affected_dossier 
    AND "MANUAL_OVERRIDE" = FALSE;
    
    -- Mise à jour règlement automatique
    UPDATE "MASTER"
    SET "REGLEMENT" = calculate_reglement_status(affected_dossier)
    WHERE "DOSSIER" = affected_dossier
    AND "MANUAL_OVERRIDE" = FALSE;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- SCRIPT 8 : Créer les triggers
DROP TRIGGER IF EXISTS trigger_master_auto_invoices ON invoices;
CREATE TRIGGER trigger_master_auto_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_master_auto_status();

DROP TRIGGER IF EXISTS trigger_master_auto_payments ON payment_allocations;
CREATE TRIGGER trigger_master_auto_payments
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_master_auto_status();

-- SCRIPT 9 : Initialiser les valeurs existantes
UPDATE "MASTER" 
SET 
  "FACTURE" = CASE 
    WHEN EXISTS (SELECT 1 FROM invoices WHERE master_id = "MASTER"."DOSSIER") 
    THEN 'facture'
    ELSE 'non facture'
  END,
  "REGLEMENT" = calculate_reglement_status("DOSSIER")
WHERE "MANUAL_OVERRIDE" = FALSE OR "MANUAL_OVERRIDE" IS NULL; 