-- Migration pour améliorer l'affichage des règlements espèces
-- - Afficher le numéro de dossier (DOSSIER) au lieu de l'ID
-- - Filtrer pour ne montrer que les dossiers non facturés

-- 1. VUE AMÉLIORÉE POUR RÈGLEMENTS ESPÈCES (TOUS LES DOSSIERS NON FACTURÉS)
CREATE OR REPLACE VIEW dossier_status_with_cash_uninvoiced AS
SELECT 
  m.DOSSIER as master_id,
  m.DOSSIER as dossier_number,
  m.CLIENT as customer_name,
  NULL as customer_id, -- Pas de customer_id pour les dossiers sans règlements
  
  -- Règlements espèces (hors comptabilité)
  COALESCE(cash_data.total_cash_settlements, 0) as total_cash_settlements,
  cash_data.last_cash_settlement_date,
  
  -- Statut basé sur les règlements espèces
  CASE 
    WHEN COALESCE(cash_data.total_cash_settlements, 0) > 0 THEN 'cash_settled'
    ELSE 'no_activity'
  END as dossier_status,
  
  COALESCE(cash_data.total_cash_settlements, 0) > 0 as has_cash_settlements,
  false as has_invoices -- Toujours false car seuls les non facturés
  
FROM MASTER m
LEFT JOIN (
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
) cash_data ON m.DOSSIER = cash_data.master_id
WHERE NOT EXISTS (
  -- Exclure les dossiers qui ont des factures
  SELECT 1 FROM invoices i WHERE i.master_id = m.DOSSIER
)
ORDER BY m.DOSSIER;

-- 2. VUE POUR TOUS LES DOSSIERS AVEC RÈGLEMENTS ESPÈCES (COMPLÈTE)
CREATE OR REPLACE VIEW dossier_status_with_cash_complete AS
SELECT 
  COALESCE(invoices_data.master_id, cash_data.master_id) as master_id,
  COALESCE(m.DOSSIER, invoices_data.master_id, cash_data.master_id) as dossier_number,
  COALESCE(m.CLIENT, invoices_data.customer_name, cash_data.customer_name) as customer_name,
  COALESCE(invoices_data.customer_id, cash_data.customer_id) as customer_id,
  
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
LEFT JOIN MASTER m ON COALESCE(invoices_data.master_id, cash_data.master_id) = m.DOSSIER
ORDER BY COALESCE(m.DOSSIER, invoices_data.master_id, cash_data.master_id);

-- 3. COMMENTAIRES POUR DOCUMENTATION
COMMENT ON VIEW dossier_status_with_cash_uninvoiced IS 'Vue pour règlements espèces - Dossiers non facturés uniquement avec numéro de dossier';
COMMENT ON VIEW dossier_status_with_cash_complete IS 'Vue complète pour tous les dossiers avec règlements espèces et facturation'; 