-- Script d'initialisation du système de paiements
-- À exécuter dans Supabase SQL Editor

-- Table des clients
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  siret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des factures
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  invoice_number text NOT NULL,
  amount_total decimal(12,2) NOT NULL,
  amount_paid decimal(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  due_date date NOT NULL,
  issued_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_invoice_amount CHECK (amount_total > 0),
  CONSTRAINT valid_paid_amount CHECK (amount_paid >= 0),
  CONSTRAINT valid_paid_vs_total CHECK (amount_paid <= amount_total)
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  amount decimal(12,2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('transfer', 'check', 'card', 'cash', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  reference text,
  notes text,
  auto_allocate boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_payment_amount CHECK (amount > 0)
);

-- Table des allocations de paiements
CREATE TABLE IF NOT EXISTS payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  amount_allocated decimal(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_allocation_amount CHECK (amount_allocated > 0),
  UNIQUE(payment_id, invoice_id)
);

-- Vues SQL

-- Vue des factures enrichies
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
  i.created_at
FROM invoices i
JOIN customers c ON i.customer_id = c.id;

-- Vue des détails d'allocation
CREATE OR REPLACE VIEW payment_allocation_details AS
SELECT 
  pa.id,
  pa.payment_id,
  p.amount as payment_amount,
  p.payment_method,
  p.reference as payment_reference,
  pa.invoice_id,
  i.invoice_number,
  pa.amount_allocated,
  pa.created_at as allocation_date
FROM payment_allocations pa
JOIN payments p ON pa.payment_id = p.id
JOIN invoices i ON pa.invoice_id = i.id;

-- Vue des soldes par client
CREATE OR REPLACE VIEW customer_balance_summary AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  COALESCE(SUM(i.amount_total), 0) as total_invoiced,
  COALESCE(SUM(i.amount_paid), 0) as total_paid,
  COALESCE(SUM(i.amount_total - i.amount_paid), 0) as total_remaining,
  COUNT(CASE WHEN i.status = 'unpaid' THEN 1 END) as unpaid_invoices_count,
  COUNT(CASE WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN 1 END) as overdue_invoices_count
FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id
GROUP BY c.id, c.name;

-- Fonction pour l'allocation automatique
CREATE OR REPLACE FUNCTION allocate_payment_automatically(payment_uuid uuid)
RETURNS void AS $$
DECLARE
  payment_record payments%ROWTYPE;
  invoice_record invoices%ROWTYPE;
  remaining_amount decimal(12,2);
  allocation_amount decimal(12,2);
BEGIN
  -- Récupérer les informations du paiement
  SELECT * INTO payment_record FROM payments WHERE id = payment_uuid;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement non trouvé: %', payment_uuid;
  END IF;
  
  -- Initialiser le montant restant
  remaining_amount := payment_record.amount;
  
  -- Parcourir les factures impayées du client par ordre chronologique
  FOR invoice_record IN 
    SELECT * FROM invoices 
    WHERE customer_id = payment_record.customer_id 
      AND status IN ('unpaid', 'partial')
      AND (amount_total - amount_paid) > 0
    ORDER BY due_date ASC, created_at ASC
  LOOP
    -- Calculer le montant à allouer sur cette facture
    allocation_amount := LEAST(
      remaining_amount,
      invoice_record.amount_total - invoice_record.amount_paid
    );
    
    -- Insérer l'allocation
    INSERT INTO payment_allocations (payment_id, invoice_id, amount_allocated)
    VALUES (payment_uuid, invoice_record.id, allocation_amount);
    
    -- Mettre à jour le montant restant
    remaining_amount := remaining_amount - allocation_amount;
    
    -- Sortir si le paiement est entièrement alloué
    EXIT WHEN remaining_amount <= 0;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statuts des factures
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS trigger AS $$
BEGIN
  -- Mettre à jour amount_paid
  UPDATE invoices 
  SET amount_paid = (
    SELECT COALESCE(SUM(amount_allocated), 0)
    FROM payment_allocations
    WHERE invoice_id = NEW.invoice_id
  )
  WHERE id = NEW.invoice_id;
  
  -- Mettre à jour le statut
  UPDATE invoices 
  SET status = CASE 
    WHEN amount_paid >= amount_total THEN 'paid'
    WHEN amount_paid > 0 THEN 'partial'
    ELSE 'unpaid'
  END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les statuts
CREATE TRIGGER update_invoice_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Insérer des données de test
INSERT INTO customers (id, name, email, phone, address, siret) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Entreprise Test SARL',
  'contact@entreprisetest.fr',
  '01 23 45 67 89',
  '123 Rue de la Paix, 75001 Paris',
  '12345678901234'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO invoices (id, customer_id, invoice_number, amount_total, amount_paid, status, due_date, issued_date) 
VALUES 
  (
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440001',
    'F25-0008',
    2500.00,
    0.00,
    'unpaid',
    '2025-01-12',
    '2024-12-15'
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440001',
    'F25-0009',
    1800.00,
    0.00,
    'unpaid',
    '2025-01-12',
    '2024-12-20'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, customer_id, amount, payment_method, status, reference, notes, auto_allocate) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440001',
  1500.00,
  'transfer',
  'completed',
  'VIR-2024-001',
  'Paiement de test',
  false
) ON CONFLICT (id) DO NOTHING; 