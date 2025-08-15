-- Script de test pour la table invoice_lines
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Insérer un en-tête de facturation de test
INSERT INTO invoice_headers (
  dossier_number,
  client_name,
  client_email,
  statut_facturation,
  date_devis,
  conditions_paiement
) VALUES (
  'TEST-001',
  'Client Test SARL',
  'contact@clienttest.fr',
  'devis',
  CURRENT_DATE,
  '30 jours'
) ON CONFLICT (dossier_number) DO NOTHING;

-- 2. Insérer des lignes de facturation de test
INSERT INTO invoice_lines (
  dossier_number,
  designation,
  quantite,
  prix_unitaire,
  taux_tva,
  ordre,
  notes
) VALUES 
  (
    'TEST-001',
    'Transport aérien international',
    1,
    1500.00,
    20.00,
    1,
    'Vol direct Paris - New York'
  ),
  (
    'TEST-001',
    'Frais de dossier administratif',
    1,
    150.00,
    20.00,
    2,
    'Gestion des formalités douanières'
  ),
  (
    'TEST-001',
    'Assurance transport',
    1,
    75.00,
    20.00,
    3,
    'Couverture complète pendant le transport'
  ),
  (
    'TEST-001',
    'Emballage spécialisé',
    2,
    45.00,
    20.00,
    4,
    'Caisses en bois renforcé'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Vérifier les données insérées
SELECT 
  'En-tête de facturation' as type,
  dossier_number,
  client_name,
  statut_facturation,
  date_devis
FROM invoice_headers 
WHERE dossier_number = 'TEST-001';

SELECT 
  'Lignes de facturation' as type,
  dossier_number,
  designation,
  quantite,
  prix_unitaire,
  taux_tva,
  montant_ht,
  montant_tva,
  montant_ttc,
  ordre
FROM invoice_lines 
WHERE dossier_number = 'TEST-001'
ORDER BY ordre;

-- 4. Vérifier les totaux calculés
SELECT 
  'Totaux par dossier' as type,
  dossier_number,
  COUNT(*) as nombre_lignes,
  SUM(montant_ht) as total_ht,
  SUM(montant_tva) as total_tva,
  SUM(montant_ttc) as total_ttc
FROM invoice_lines 
WHERE dossier_number = 'TEST-001'
GROUP BY dossier_number;

-- 5. Tester la vue invoice_lines_summary
SELECT 
  'Vue summary' as type,
  il.dossier_number,
  il.designation,
  il.montant_ttc,
  ih.statut_facturation,
  ih.client_name
FROM invoice_lines_summary il
WHERE il.dossier_number = 'TEST-001'
ORDER BY il.ordre;
