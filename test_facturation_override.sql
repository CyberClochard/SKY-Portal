-- Script de test pour vérifier l'existence et le fonctionnement des éléments nécessaires
-- pour le composant FacturationStatusOverride

-- ==========================================
-- 1. VÉRIFICATION DE LA VUE master_facturation_status
-- ==========================================

-- Test 1: Vérifier si la vue existe
SELECT 
  schemaname,
  tablename,
  tabletype
FROM pg_tables 
WHERE tablename = 'master_facturation_status'
   OR tablename LIKE '%facturation%';

-- Test 2: Vérifier si c'est une vue
SELECT 
  schemaname,
  viewname
FROM pg_views 
WHERE viewname = 'master_facturation_status'
   OR viewname LIKE '%facturation%';

-- Test 3: Vérifier la structure de la vue (si elle existe)
-- Décommentez les lignes suivantes si la vue existe
/*
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'master_facturation_status'
ORDER BY ordinal_position;
*/

-- ==========================================
-- 2. VÉRIFICATION DES FONCTIONS RPC
-- ==========================================

-- Test 4: Vérifier si les fonctions RPC existent
SELECT 
  proname,
  prosrc,
  proargtypes
FROM pg_proc 
WHERE proname IN ('set_master_facture_override', 'remove_master_facture_override');

-- Test 5: Vérifier les fonctions dans le schéma public
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('set_master_facture_override', 'remove_master_facture_override')
  AND routine_schema = 'public';

-- ==========================================
-- 3. VÉRIFICATION DE LA TABLE MASTER
-- ==========================================

-- Test 6: Vérifier si la table MASTER existe et sa structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'MASTER'
  AND column_name IN ('DOSSIER', 'FACTURE', 'FACTURE_MANUAL_OVERRIDE')
ORDER BY ordinal_position;

-- Test 7: Vérifier les données existantes dans MASTER
SELECT 
  DOSSIER,
  FACTURE,
  FACTURE_MANUAL_OVERRIDE
FROM MASTER 
LIMIT 5;

-- ==========================================
-- 4. TESTS DE FONCTIONNEMENT (À DÉCOMMENTER)
-- ==========================================

-- Test 8: Tester la fonction set_master_facture_override
-- Remplacez 'DOSSIER_TEST' par un vrai ID de dossier
/*
SELECT set_master_facture_override('DOSSIER_TEST', 'facturé');
*/

-- Test 9: Tester la fonction remove_master_facture_override
-- Remplacez 'DOSSIER_TEST' par un vrai ID de dossier
/*
SELECT remove_master_facture_override('DOSSIER_TEST');
*/

-- Test 10: Tester la vue master_facturation_status
-- Remplacez 'DOSSIER_TEST' par un vrai ID de dossier
/*
SELECT * FROM master_facturation_status WHERE DOSSIER = 'DOSSIER_TEST';
*/

-- ==========================================
-- 5. VÉRIFICATION DES POLITIQUES RLS
-- ==========================================

-- Test 11: Vérifier les politiques RLS sur la table MASTER
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
WHERE tablename = 'MASTER';

-- ==========================================
-- 6. VÉRIFICATION DES TRIGGERS
-- ==========================================

-- Test 12: Vérifier les triggers sur la table MASTER
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'MASTER';

-- ==========================================
-- 7. INSTRUCTIONS DE DÉBOGAGE
-- ==========================================

/*
INSTRUCTIONS POUR DÉBOGUER LE COMPOSANT:

1. Si la vue master_facturation_status n'existe pas:
   - Créer la vue avec la structure appropriée
   - Ou modifier le composant pour utiliser directement la table MASTER

2. Si les fonctions RPC n'existent pas:
   - Créer les fonctions set_master_facture_override et remove_master_facture_override
   - Ou modifier le composant pour utiliser des requêtes SQL directes

3. Si la table MASTER n'a pas les colonnes nécessaires:
   - Ajouter les colonnes FACTURE et FACTURE_MANUAL_OVERRIDE
   - Ou adapter le composant à la structure existante

4. Pour tester le composant en mode développement:
   - Le composant passera automatiquement en "mode test" si les éléments ne sont pas disponibles
   - Cela permettra de tester l'interface utilisateur même sans les fonctions backend

5. Vérifier les logs dans la console du navigateur:
   - Le composant affiche des logs détaillés avec des emojis
   - Rechercher les messages commençant par 🔍, ❌, ✅, 🧪, etc.
*/

-- ==========================================
-- 8. EXEMPLE DE CRÉATION DES ÉLÉMENTS MANQUANTS
-- ==========================================

/*
-- Exemple de création de la vue master_facturation_status:
CREATE OR REPLACE VIEW master_facturation_status AS
SELECT 
  DOSSIER,
  COALESCE(FACTURE, 'non facturé') as FACTURE,
  COALESCE(FACTURE_MANUAL_OVERRIDE, false) as FACTURE_MANUAL_OVERRIDE,
  CASE 
    WHEN FACTURE_MANUAL_OVERRIDE = true THEN 'Manuel'
    ELSE 'Automatique'
  END as mode_gestion,
  'non facturé' as valeur_automatique_calculee
FROM MASTER;

-- Exemple de création de la fonction set_master_facture_override:
CREATE OR REPLACE FUNCTION set_master_facture_override(dossier_id text, nouvelle_valeur text)
RETURNS void AS $$
BEGIN
  UPDATE MASTER 
  SET 
    FACTURE = nouvelle_valeur,
    FACTURE_MANUAL_OVERRIDE = true
  WHERE DOSSIER = dossier_id;
END;
$$ LANGUAGE plpgsql;

-- Exemple de création de la fonction remove_master_facture_override:
CREATE OR REPLACE FUNCTION remove_master_facture_override(dossier_id text)
RETURNS void AS $$
BEGIN
  UPDATE MASTER 
  SET 
    FACTURE_MANUAL_OVERRIDE = false
  WHERE DOSSIER = dossier_id;
END;
$$ LANGUAGE plpgsql;
*/ 