-- Vérifier les tables existantes
SELECT 
  schemaname,
  tablename,
  tabletype
FROM pg_tables 
WHERE tablename IN ('case_finance_notes', 'case_finance_summary')
ORDER BY tablename;

-- Vérifier les vues existantes
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'case_finance_summary';

-- Vérifier la structure de case_finance_notes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'case_finance_notes'
ORDER BY ordinal_position;

-- Vérifier les index sur case_finance_notes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'case_finance_notes'; 