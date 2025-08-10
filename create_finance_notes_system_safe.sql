-- Script sécurisé pour créer le système de notes finance
-- Vérifie l'existence avant création

-- 1. Créer la table case_finance_notes si elle n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'case_finance_notes') THEN
    CREATE TABLE case_finance_notes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      master_id UUID NOT NULL REFERENCES "MASTER"(id) ON DELETE CASCADE,
      override_mode BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id),
      updated_by UUID REFERENCES auth.users(id)
    );
    RAISE NOTICE 'Table case_finance_notes créée avec succès';
  ELSE
    RAISE NOTICE 'Table case_finance_notes existe déjà';
  END IF;
END $$;

-- 2. Créer l'index s'il n'existe pas
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_case_finance_notes_master_id') THEN
    CREATE INDEX idx_case_finance_notes_master_id ON case_finance_notes(master_id);
    RAISE NOTICE 'Index idx_case_finance_notes_master_id créé avec succès';
  ELSE
    RAISE NOTICE 'Index idx_case_finance_notes_master_id existe déjà';
  END IF;
END $$;

-- 3. Créer ou remplacer la vue case_finance_summary
CREATE OR REPLACE VIEW case_finance_summary AS
SELECT 
  m.id as master_id,
  m."DOSSIER" as dossier,
  m."CLIENT" as client_id,
  m."NETPAYABLE" as net_payable,
  m."LTA" as lta,
  m."STATUS" as status,
  m."DATE" as date_operation,
  c.name as client_name,
  COALESCE(cfn.override_mode, false) as override_mode,
  cfn.notes,
  cfn.updated_at as notes_last_updated
FROM "MASTER" m
LEFT JOIN customers c ON m."CLIENT" = c.id  
LEFT JOIN case_finance_notes cfn ON m.id = cfn.master_id
ORDER BY m."DATE" DESC;

-- 4. Vérifier que tout fonctionne
SELECT 
  'Vérification du système' as test,
  (SELECT COUNT(*) FROM case_finance_notes) as notes_count,
  (SELECT COUNT(*) FROM case_finance_summary) as summary_count; 