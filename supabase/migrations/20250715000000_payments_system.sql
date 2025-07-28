/*
  # Système de Gestion des Règlements Client

  1. Tables principales
    - `customers` : Clients avec informations complètes
    - `invoices` : Factures avec gestion des paiements
    - `payments` : Paiements clients
    - `payment_allocations` : Table pivot pour les allocations

  2. Vues SQL
    - `invoice_summary` : Factures enrichies
    - `payment_allocation_details` : Détails des allocations
    - `customer_balance_summary` : Soldes par client

  3. Fonctions et triggers
    - `allocate_payment_automatically()` : Allocation automatique
    - Triggers pour mise à jour des statuts
    - Validation des contraintes

  4. Sécurité
    - RLS activé sur toutes les tables
    - Policies pour utilisateurs authentifiés
*/

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
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  amount_total decimal(12,2) NOT NULL DEFAULT 0,
  amount_paid decimal(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  due_date date NOT NULL,
  issued_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_amounts CHECK (amount_total >= 0 AND amount_paid >= 0 AND amount_paid <= amount_total)
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
  (i.amount_total - i.amount_paid) as amount_remaining,
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
RETURNS TRIGGER AS $$
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

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Policies pour les utilisateurs authentifiés
CREATE POLICY "Users can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage all customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage all invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage all payments"
  ON payments FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read all payment allocations"
  ON payment_allocations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage all payment allocations"
  ON payment_allocations FOR ALL
  TO authenticated
  USING (true);

-- Index pour les performances
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Données de test
INSERT INTO customers (name, email, phone, address, siret) VALUES
('Entreprise ABC', 'contact@abc.fr', '01 23 45 67 89', '123 Rue de la Paix, 75001 Paris', '12345678901234'),
('Société XYZ', 'info@xyz.com', '01 98 76 54 32', '456 Avenue des Champs, 75008 Paris', '98765432109876'),
('SARL Test', 'test@sarl.fr', '01 11 22 33 44', '789 Boulevard Test, 75016 Paris', '11122233344455');

INSERT INTO invoices (customer_id, invoice_number, amount_total, due_date, issued_date) VALUES
((SELECT id FROM customers WHERE name = 'Entreprise ABC'), 'FAC-2025-001', 1500.00, '2025-02-15', '2025-01-15'),
((SELECT id FROM customers WHERE name = 'Entreprise ABC'), 'FAC-2025-002', 2300.00, '2025-03-01', '2025-02-01'),
((SELECT id FROM customers WHERE name = 'Société XYZ'), 'FAC-2025-003', 800.00, '2025-02-28', '2025-01-28'),
((SELECT id FROM customers WHERE name = 'SARL Test'), 'FAC-2025-004', 1200.00, '2025-03-15', '2025-02-15'); 