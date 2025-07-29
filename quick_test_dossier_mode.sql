-- Test rapide de l'installation du mode manuel par dossier
-- Exécutez ce script après avoir lancé la migration principale

-- 1. Test des colonnes master_id et master_name
SELECT 'Test colonnes master_id et master_name' as test_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_id')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_name')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 2. Test de la table dossier_settings
SELECT 'Test table dossier_settings' as test_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dossier_settings')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 3. Test de la fonction get_dossier_manual_mode
SELECT 'Test fonction get_dossier_manual_mode' as test_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_dossier_manual_mode')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 4. Test de la vue dossier_overview_with_mode
SELECT 'Test vue dossier_overview_with_mode' as test_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'dossier_overview_with_mode')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 5. Test fonctionnel - créer un dossier de test
SELECT 'Test création dossier' as test_name,
       set_dossier_manual_mode('DOSSIER-TEST', true, 'test-user') as result;

-- 6. Test fonctionnel - vérifier le mode
SELECT 'Test vérification mode' as test_name,
       get_dossier_manual_mode('DOSSIER-TEST') as result;

-- 7. Test de la vue avec données
SELECT 'Test vue avec données' as test_name,
       COUNT(*) as nombre_dossiers
FROM dossier_overview_with_mode;

-- 8. Nettoyer les données de test
DELETE FROM dossier_settings WHERE master_id = 'DOSSIER-TEST';

-- 9. Résumé final
SELECT '--- RÉSUMÉ ---' as info;

SELECT 
  'Installation' as element,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dossier_settings')
    AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_dossier_manual_mode')
    AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'dossier_overview_with_mode')
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END as status; 