-- Migration pour ajouter le champ master_id à la table invoices
-- Ce champ permettra de lier les factures aux dossiers de la table MASTER

-- Ajouter la colonne master_id
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS master_id text;

-- Créer un index pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_invoices_master_id ON invoices(master_id);

-- Ajouter une contrainte de validation (optionnelle)
-- ALTER TABLE invoices ADD CONSTRAINT valid_master_id CHECK (length(trim(master_id)) > 0);

-- Commentaire sur la colonne
COMMENT ON COLUMN invoices.master_id IS 'Référence vers le numéro de dossier dans la table MASTER';

-- Mettre à jour la vue invoice_summary pour inclure master_id
CREATE OR REPLACE VIEW invoice_summary AS
SELECT 
  i.id,
  i.customer_id,
  c.name as customer_name,
  i.invoice_number,
  i.amount_total,
  i.amount_paid,
  (i.amount_total - i.amount_paid) as amount_due,
  i.status,
  i.due_date,
  i.issued_date,
  i.created_at,
  i.master_id
FROM invoices i
JOIN customers c ON i.customer_id = c.id; 