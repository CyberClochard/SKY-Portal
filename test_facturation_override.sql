-- Script de test pour vérifier les fonctions d'override de facturation
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier que la vue master_facturation_status existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name = 'master_facturation_status';

-- 2. Vérifier la structure de la vue
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'master_facturation_status'
ORDER BY ordinal_position;

-- 3. Vérifier que les fonctions RPC existent
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN (
  'set_master_facture_override',
  'remove_master_facture_override'
);

-- 4. Tester avec un dossier existant (remplacer DOSSIER-123 par un vrai ID)
-- Vérifier le statut actuel
SELECT * FROM master_facturation_status 
WHERE DOSSIER = 'DOSSIER-123';

-- 5. Test de la fonction set_master_facture_override
-- (Décommenter et adapter le dossier_id)
/*
SELECT set_master_facture_override(
  dossier_id := 'DOSSIER-123',
  nouvelle_valeur := 'famille'
);
*/

-- 6. Test de la fonction remove_master_facture_override
-- (Décommenter et adapter le dossier_id)
/*
SELECT remove_master_facture_override(
  dossier_id := 'DOSSIER-123'
);
*/

-- 7. Vérifier les permissions RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('master', 'master_facturation_status');

-- 8. Vérifier les triggers sur la table MASTER
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'master';

-- 9. Test de données d'exemple
-- Insérer un dossier de test si nécessaire
/*
INSERT INTO master (DOSSIER, FACTURE, FACTURE_MANUAL_OVERRIDE) 
VALUES ('TEST-OVERRIDE-001', 'non facturé', false)
ON CONFLICT (DOSSIER) DO UPDATE SET
  FACTURE = EXCLUDED.FACTURE,
  FACTURE_MANUAL_OVERRIDE = EXCLUDED.FACTURE_MANUAL_OVERRIDE;
*/

-- 10. Vérifier les contraintes
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'master';

-- Résultats attendus :
-- ✅ Vue master_facturation_status existe
-- ✅ Colonnes : DOSSIER, FACTURE, FACTURE_MANUAL_OVERRIDE, mode_gestion, valeur_automatique_calculee
-- ✅ Fonctions RPC disponibles
-- ✅ Permissions RLS configurées
-- ✅ Triggers pour mise à jour automatique 