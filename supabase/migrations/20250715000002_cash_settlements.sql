-- Migration pour règlements espèces hors comptabilité
-- Permet de tracer les dossiers réglés en espèces sans passer par le système de facturation officiel

-- 1. TABLE POUR RÈGLEMENTS ESPÈCES
CREATE TABLE cash_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id),
  amount DECIMAL(12,2) NOT NULL,
  settlement_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_cash_settlements_master ON cash_settlements(master_id);
CREATE INDEX idx_cash_settlements_customer ON cash_settlements(customer_id);
CREATE INDEX idx_cash_settlements_date ON cash_settlements(settlement_date);

-- 2. VUE DÉTAILLÉE DES RÈGLEMENTS ESPÈCES
CREATE OR REPLACE VIEW cash_settlements_detail AS
SELECT 
  cs.*,
  c.name as customer_name,
  c.email as customer_email
FROM cash_settlements cs
LEFT JOIN customers c ON cs.customer_id = c.id
ORDER BY cs.settlement_date DESC, cs.created_at DESC;

-- 3. VUE STATUT DOSSIERS AVEC ESPÈCES
CREATE OR REPLACE VIEW dossier_status_with_cash AS
SELECT 
  COALESCE(invoices_data.master_id, cash_data.master_id) as master_id,
  COALESCE(invoices_data.master_name, cash_data.master_id) as master_name,
  COALESCE(invoices_data.customer_id, cash_data.customer_id) as customer_id,
  COALESCE(invoices_data.customer_name, cash_data.customer_name) as customer_name,
  
  -- Comptabilité officielle
  COALESCE(invoices_data.total_invoiced, 0) as total_invoiced,
  COALESCE(invoices_data.total_paid, 0) as total_paid,
  
  -- Règlements espèces (hors comptabilité)
  COALESCE(cash_data.total_cash_settlements, 0) as total_cash_settlements,
  cash_data.last_cash_settlement_date,
  
  -- Statut global
  CASE 
    WHEN COALESCE(invoices_data.total_invoiced, 0) = 0 AND COALESCE(cash_data.total_cash_settlements, 0) > 0 THEN 'cash_settled'
    WHEN COALESCE(invoices_data.total_paid, 0) >= COALESCE(invoices_data.total_invoiced, 0) AND COALESCE(invoices_data.total_invoiced, 0) > 0 THEN 'invoiced_paid'
    WHEN COALESCE(invoices_data.total_paid, 0) > 0 AND COALESCE(invoices_data.total_invoiced, 0) > 0 THEN 'invoiced_partial'
    WHEN COALESCE(invoices_data.total_invoiced, 0) > 0 THEN 'invoiced_unpaid'
    ELSE 'no_activity'
  END as dossier_status,
  
  COALESCE(cash_data.total_cash_settlements, 0) > 0 as has_cash_settlements,
  COALESCE(invoices_data.total_invoiced, 0) > 0 as has_invoices
FROM (
  -- Données des factures (comptabilité officielle)
  SELECT 
    i.master_id,
    i.master_name,
    i.customer_id,
    c.name as customer_name,
    SUM(i.amount_total) as total_invoiced,
    SUM(i.amount_paid) as total_paid
  FROM invoices i
  LEFT JOIN customers c ON i.customer_id = c.id
  WHERE i.master_id IS NOT NULL
  GROUP BY i.master_id, i.master_name, i.customer_id, c.name
) invoices_data
FULL OUTER JOIN (
  -- Données des règlements espèces
  SELECT 
    cs.master_id,
    c.name as customer_name,
    cs.customer_id,
    SUM(cs.amount) as total_cash_settlements,
    MAX(cs.settlement_date) as last_cash_settlement_date
  FROM cash_settlements cs
  LEFT JOIN customers c ON cs.customer_id = c.id
  GROUP BY cs.master_id, cs.customer_id, c.name
) cash_data ON invoices_data.master_id = cash_data.master_id
ORDER BY COALESCE(invoices_data.master_name, cash_data.master_id);

-- 4. FONCTION POUR AJOUTER UN RÈGLEMENT ESPÈCES
CREATE OR REPLACE FUNCTION add_cash_settlement(
  p_master_id TEXT,
  p_customer_id UUID,
  p_amount DECIMAL,
  p_notes TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT 'current_user'
)
RETURNS JSON AS $$
DECLARE
  new_settlement_id UUID;
BEGIN
  -- Validation des paramètres
  IF p_master_id IS NULL OR p_master_id = '' THEN
    RAISE EXCEPTION 'master_id ne peut pas être vide';
  END IF;
  
  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id ne peut pas être null';
  END IF;
  
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount doit être positif';
  END IF;
  
  -- Vérifier que le client existe
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;
  
  -- Insérer le règlement espèces
  INSERT INTO cash_settlements (
    master_id,
    customer_id,
    amount,
    settlement_date,
    notes,
    created_by
  ) VALUES (
    p_master_id,
    p_customer_id,
    p_amount,
    CURRENT_DATE,
    p_notes,
    p_created_by
  ) RETURNING id INTO new_settlement_id;
  
  RETURN json_build_object(
    'success', true,
    'settlement_id', new_settlement_id,
    'message', 'Règlement espèces enregistré (hors comptabilité)'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 5. FONCTION POUR SUPPRIMER UN RÈGLEMENT ESPÈCES
CREATE OR REPLACE FUNCTION delete_cash_settlement(
  p_settlement_id UUID
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM cash_settlements WHERE id = p_settlement_id;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Règlement espèces supprimé'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Règlement espèces non trouvé'
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- 6. DONNÉES DE TEST
INSERT INTO cash_settlements (master_id, customer_id, amount, settlement_date, notes, created_by) VALUES
('DOSSIER-TEST-001', (SELECT id FROM customers LIMIT 1), 1500.00, CURRENT_DATE - 5, 'Règlement espèces client satisfait', 'test_user'),
('DOSSIER-TEST-002', (SELECT id FROM customers LIMIT 1), 800.00, CURRENT_DATE - 2, 'Paiement espèces urgent', 'test_user');

-- 7. COMMENTAIRES POUR DOCUMENTATION
COMMENT ON TABLE cash_settlements IS 'Règlements espèces hors comptabilité officielle';
COMMENT ON COLUMN cash_settlements.master_id IS 'Identifiant du dossier';
COMMENT ON COLUMN cash_settlements.amount IS 'Montant réglé en espèces';
COMMENT ON COLUMN cash_settlements.settlement_date IS 'Date du règlement espèces';
COMMENT ON COLUMN cash_settlements.notes IS 'Notes optionnelles sur le règlement';
COMMENT ON COLUMN cash_settlements.created_by IS 'Utilisateur ayant enregistré le règlement';

COMMENT ON VIEW dossier_status_with_cash IS 'Vue combinant facturation officielle et règlements espèces';
COMMENT ON VIEW cash_settlements_detail IS 'Vue détaillée des règlements espèces avec informations client'; 