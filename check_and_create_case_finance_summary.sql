-- Script pour vérifier et créer la vue case_finance_summary
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si la vue existe
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'case_finance_summary';

-- 2. Vérifier si la table case_finance_notes existe
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'case_finance_notes';

-- 3. Vérifier si la table customers existe
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename = 'customers';

-- 4. Créer la vue case_finance_summary si elle n'existe pas
CREATE OR REPLACE VIEW case_finance_summary AS
SELECT 
  m.id as master_id,
  m."DOSSIER" as dossier,
  m."CLIENT" as client_id,
  m."NETPAYABLE" as net_payable,
  m."LTA" as lta,
  m."STATUS" as status,
  m."DATE" as date_operation,
  COALESCE(c.name, 'Client inconnu') as client_name,
  COALESCE(cfn.override_mode, false) as override_mode,
  COALESCE(cfn.notes, '') as notes,
  COALESCE(cfn.updated_at, m."DATE") as notes_last_updated
FROM "MASTER" m
LEFT JOIN customers c ON m."CLIENT" = c.id  
LEFT JOIN case_finance_notes cfn ON m.id = cfn.master_id
ORDER BY m."DATE" DESC;

-- 5. Vérifier que la vue a été créée
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'case_finance_summary';

-- 6. Tester la vue avec quelques données
SELECT * FROM case_finance_summary LIMIT 5;

-- 7. Vérifier les colonnes de la vue
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'case_finance_summary'
ORDER BY ordinal_position; 