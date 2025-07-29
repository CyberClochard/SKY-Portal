-- Script pour corriger la contrainte de clé étrangère sur master_id
-- Exécutez ce script AVANT d'exécuter la migration principale

-- 1. Vérifier les contraintes existantes sur la table invoices
SELECT 
  'Contraintes sur invoices' as info,
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'invoices';

-- 2. Vérifier si la contrainte invoices_master_id_fkey existe
SELECT 
  'Contrainte master_id_fkey' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'invoices' 
      AND constraint_name = 'invoices_master_id_fkey'
    )
    THEN '✅ EXISTE - À supprimer'
    ELSE '❌ N\'EXISTE PAS - OK'
  END as status;

-- 3. Supprimer la contrainte si elle existe
DO $$
BEGIN
  -- Vérifier si la contrainte existe et la supprimer
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'invoices' 
    AND constraint_name = 'invoices_master_id_fkey'
  ) THEN
    ALTER TABLE invoices DROP CONSTRAINT invoices_master_id_fkey;
    RAISE NOTICE 'Contrainte invoices_master_id_fkey supprimée';
  ELSE
    RAISE NOTICE 'Contrainte invoices_master_id_fkey n''existe pas';
  END IF;
END $$;

-- 4. Vérifier que la contrainte a été supprimée
SELECT 
  'Vérification suppression' as check_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'invoices' 
      AND constraint_name = 'invoices_master_id_fkey'
    )
    THEN '✅ SUPPRIMÉE - OK pour la migration'
    ELSE '❌ TOUJOURS PRÉSENTE - Problème'
  END as status;

-- 5. Vérifier les colonnes de la table invoices
SELECT 
  'Colonnes invoices' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoices'
ORDER BY ordinal_position; 