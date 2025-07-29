-- Script de données de test pour le système de paiements

-- Insérer un client de test
INSERT INTO customers (id, name, email, phone, address, siret) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Entreprise Test SARL',
  'contact@entreprisetest.fr',
  '01 23 45 67 89',
  '123 Rue de la Paix, 75001 Paris',
  '12345678901234'
) ON CONFLICT (id) DO NOTHING;

-- Insérer des factures impayées
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

-- Insérer un paiement de test
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