-- Vérifier la structure de la table MASTER
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'MASTER'
ORDER BY ordinal_position;

-- Vérifier la structure de la table customers
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Vérifier quelques exemples de données
SELECT 
  '"CLIENT"' as field_name,
  m."CLIENT" as sample_value,
  pg_typeof(m."CLIENT") as data_type
FROM "MASTER" m 
LIMIT 5;

-- Vérifier la table customers
SELECT 
  'id' as field_name,
  c.id as sample_value,
  pg_typeof(c.id) as data_type
FROM customers c 
LIMIT 5; 