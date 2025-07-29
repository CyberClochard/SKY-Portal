-- Script de test rapide après déploiement du mode manuel par dossier
-- Exécutez ce script après avoir lancé le déploiement pour vérifier que tout fonctionne

-- ========================================
-- VÉRIFICATIONS DE BASE
-- ========================================

-- 1. Vérifier que les colonnes existent
SELECT 'Vérification colonnes' as test,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_id')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_name')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 2. Vérifier que la table dossier_settings existe
SELECT 'Vérification table dossier_settings' as test,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dossier_settings')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 3. Vérifier que les fonctions existent
SELECT 'Vérification fonction get_dossier_manual_mode' as test,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_dossier_manual_mode')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

SELECT 'Vérification fonction set_dossier_manual_mode' as test,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'set_dossier_manual_mode')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- 4. Vérifier que les vues existent
SELECT 'Vérification vue dossier_overview_with_mode' as test,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'dossier_overview_with_mode')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

SELECT 'Vérification vue payments_with_dossier_context' as test,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'payments_with_dossier_context')
         THEN '✅ OK'
         ELSE '❌ ERREUR'
       END as result;

-- ========================================
-- TESTS FONCTIONNELS
-- ========================================

-- 5. Test de la fonction get_dossier_manual_mode
SELECT 'Test fonction get_dossier_manual_mode' as test,
       get_dossier_manual_mode('DOSSIER-TEST') as result;

-- 6. Test de la fonction set_dossier_manual_mode
SELECT 'Test fonction set_dossier_manual_mode' as test,
       set_dossier_manual_mode('DOSSIER-TEST', true, 'test-user') as result;

-- 7. Vérifier que le mode a été sauvegardé
SELECT 'Vérification sauvegarde mode' as test,
       get_dossier_manual_mode('DOSSIER-TEST') as result;

-- 8. Test de la vue dossier_overview_with_mode
SELECT 'Test vue dossier_overview_with_mode' as test,
       COUNT(*) as nombre_dossiers
FROM dossier_overview_with_mode;

-- 9. Afficher quelques dossiers de test
SELECT 'Exemples de dossiers' as test,
       master_id,
       master_name,
       customer_name,
       is_manual_mode,
       dossier_status
FROM dossier_overview_with_mode
LIMIT 3;

-- 10. Vérifier que les factures ont des master_id
SELECT 'Vérification factures avec master_id' as test,
       COUNT(*) as total_factures,
       COUNT(CASE WHEN master_id IS NOT NULL THEN 1 END) as factures_avec_master_id,
       COUNT(CASE WHEN master_id IS NULL THEN 1 END) as factures_sans_master_id
FROM invoices;

-- ========================================
-- TESTS D'INTÉGRATION
-- ========================================

-- 11. Test de création d'un dossier de test
SELECT 'Test création dossier' as test,
       set_dossier_manual_mode('DOSSIER-INTEGRATION-TEST', false, 'test-user') as result;

-- 12. Test de changement de mode
SELECT 'Test changement mode' as test,
       set_dossier_manual_mode('DOSSIER-INTEGRATION-TEST', true, 'test-user') as result;

-- 13. Vérifier le changement
SELECT 'Vérification changement mode' as test,
       get_dossier_manual_mode('DOSSIER-INTEGRATION-TEST') as result;

-- ========================================
-- NETTOYAGE ET RÉSUMÉ
-- ========================================

-- 14. Nettoyer les données de test
DELETE FROM dossier_settings WHERE master_id IN ('DOSSIER-TEST', 'DOSSIER-INTEGRATION-TEST');

-- 15. Résumé final
SELECT '--- RÉSUMÉ DES TESTS ---' as info;

SELECT 
  'Installation complète' as status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'master_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dossier_settings')
    AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_dossier_manual_mode')
    AND EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'dossier_overview_with_mode')
    THEN '✅ SUCCÈS - Tous les éléments sont installés et fonctionnels'
    ELSE '❌ ÉCHEC - Certains éléments manquent ou ne fonctionnent pas'
  END as result;

-- 16. Informations supplémentaires
SELECT 'Informations système' as info,
       (SELECT COUNT(*) FROM dossier_settings) as nombre_dossiers_configures,
       (SELECT COUNT(*) FROM dossier_overview_with_mode) as nombre_dossiers_actifs,
       (SELECT COUNT(*) FROM invoices WHERE master_id IS NOT NULL) as factures_avec_dossier; 