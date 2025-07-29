-- Script de vérification de l'installation du mode manuel par dossier
-- Exécutez ce script dans l'éditeur SQL de Supabase pour vérifier l'installation

-- 1. Vérifier que les colonnes master_id et master_name existent dans invoices
SELECT 
  'Colonnes master_id et master_name dans invoices' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'master_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name = 'master_name'
    )
    THEN '✅ EXISTENT' 
    ELSE '❌ MANQUANTES' 
  END as status;

-- 2. Vérifier que la table dossier_settings existe
SELECT 
  'Table dossier_settings' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dossier_settings') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

-- 3. Vérifier que les fonctions existent
SELECT 
  'Fonction get_dossier_manual_mode' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_dossier_manual_mode') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

SELECT 
  'Fonction set_dossier_manual_mode' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'set_dossier_manual_mode') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

SELECT 
  'Fonction get_payment_dossier_mode' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_payment_dossier_mode') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

SELECT 
  'Fonction create_payment_for_dossier' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_payment_for_dossier') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

-- 4. Vérifier que les vues existent
SELECT 
  'Vue dossier_overview_with_mode' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'dossier_overview_with_mode') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

SELECT 
  'Vue payments_with_dossier_context' as check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'payments_with_dossier_context') 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANTE' 
  END as status;

-- 5. Vérifier que le trigger a été modifié
SELECT 
  'Trigger trigger_auto_allocate_payment modifié' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers 
      WHERE trigger_name = 'trigger_auto_allocate_payment'
    ) 
    THEN '✅ EXISTE' 
    ELSE '❌ MANQUANT' 
  END as status;

-- 6. Test des fonctions
SELECT '--- TESTS DE FONCTIONNEMENT ---' as info;

-- Test de la fonction get_dossier_manual_mode
SELECT 
  'Test get_dossier_manual_mode' as test_name,
  get_dossier_manual_mode('test-dossier') as result;

-- Test de la fonction set_dossier_manual_mode
SELECT 
  'Test set_dossier_manual_mode' as test_name,
  set_dossier_manual_mode('test-dossier', true, 'test-user') as result;

-- Vérifier que le mode a été sauvegardé
SELECT 
  'Vérification sauvegarde mode' as test_name,
  get_dossier_manual_mode('test-dossier') as result;

-- 7. Test de la vue dossier_overview_with_mode
SELECT 
  'Test vue dossier_overview_with_mode' as test_name,
  COUNT(*) as nombre_dossiers
FROM dossier_overview_with_mode;

-- 8. Afficher quelques dossiers de test
SELECT 
  'Exemples de dossiers' as info,
  master_id,
  master_name,
  customer_name,
  is_manual_mode,
  dossier_status
FROM dossier_overview_with_mode
LIMIT 5;

-- 9. Vérifier que les factures ont des master_id
SELECT 
  'Factures avec master_id' as info,
  COUNT(*) as total_factures,
  COUNT(CASE WHEN master_id IS NOT NULL THEN 1 END) as factures_avec_master_id,
  COUNT(CASE WHEN master_id IS NULL THEN 1 END) as factures_sans_master_id
FROM invoices;

-- 10. Nettoyer les données de test
DELETE FROM dossier_settings WHERE master_id = 'test-dossier';

-- 11. Résumé final
SELECT '--- RÉSUMÉ DE L\'INSTALLATION ---' as info;

SELECT 
  'Installation complète' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dossier_settings')
    AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_dossier_manual_mode')
    AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'set_dossier_manual_mode')
    AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'dossier_overview_with_mode')
    THEN '✅ SUCCÈS - Tous les éléments sont installés'
    ELSE '❌ ÉCHEC - Certains éléments manquent'
  END as result; 