-- Script de nettoyage des tables orphelines dans Supabase
-- À exécuter dans l'éditeur SQL de Supabase
-- Ce script supprime toutes les tables, vues et fonctions qui ne sont plus utilisées

-- =====================================================
-- 1. SUPPRESSION DES TABLES ORPHELINES
-- =====================================================

-- Table des règlements espèces (système supprimé)
DROP TABLE IF EXISTS cash_settlements CASCADE;

-- Table d'import de factures (potentiellement inutilisée)
DROP TABLE IF EXISTS imported_invoices CASCADE;

-- Table des paramètres de dossiers (mode manuel supprimé)
DROP TABLE IF EXISTS dossier_settings CASCADE;

-- =====================================================
-- 2. SUPPRESSION DES VUES ORPHELINES
-- =====================================================

-- Vues des règlements espèces (système supprimé)
DROP VIEW IF EXISTS dossier_status_with_cash CASCADE;
DROP VIEW IF EXISTS dossier_status_with_cash_uninvoiced CASCADE;
DROP VIEW IF EXISTS dossier_status_with_cash_complete CASCADE;
DROP VIEW IF EXISTS cash_settlements_detail CASCADE;

-- =====================================================
-- 3. SUPPRESSION DES FONCTIONS ORPHELINES
-- =====================================================

-- Fonctions des règlements espèces (système supprimé)
DROP FUNCTION IF EXISTS add_cash_settlement CASCADE;
DROP FUNCTION IF EXISTS delete_cash_settlement CASCADE;

-- Fonctions du mode manuel (système supprimé)
DROP FUNCTION IF EXISTS get_dossier_manual_mode CASCADE;
DROP FUNCTION IF EXISTS set_dossier_manual_mode CASCADE;
DROP FUNCTION IF EXISTS get_payment_dossier_mode CASCADE;
DROP FUNCTION IF EXISTS create_payment_for_dossier CASCADE;

-- =====================================================
-- 4. SUPPRESSION DES TRIGGERS ORPHELINS
-- =====================================================

-- Triggers des règlements espèces (système supprimé)
-- (Les triggers sont automatiquement supprimés avec les tables)

-- =====================================================
-- 5. SUPPRESSION DES INDEX ORPHELINS
-- =====================================================

-- Index des règlements espèces (système supprimé)
DROP INDEX IF EXISTS idx_cash_settlements_master_id CASCADE;
DROP INDEX IF EXISTS idx_cash_settlements_customer_id CASCADE;
DROP INDEX IF EXISTS idx_cash_settlements_settlement_date CASCADE;

-- Index du mode manuel (système supprimé)
DROP INDEX IF EXISTS idx_dossier_settings_master_id CASCADE;

-- Index d'import de factures (potentiellement inutilisé)
DROP INDEX IF EXISTS idx_imported_invoices_uploaded_at CASCADE;
DROP INDEX IF EXISTS idx_imported_invoices_status CASCADE;

-- =====================================================
-- 6. SUPPRESSION DES POLICIES RLS ORPHELINES
-- =====================================================

-- Les politiques RLS sont automatiquement supprimées avec les tables
-- Mais on peut les supprimer explicitement si elles existent encore

-- =====================================================
-- 7. VÉRIFICATION POST-NETTOYAGE
-- =====================================================

-- Vérifier les tables restantes
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Vérifier les vues restantes
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE schemaname = 'public' 
ORDER BY viewname;

-- Vérifier les fonctions restantes
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- =====================================================
-- 8. MESSAGE DE CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Nettoyage terminé !';
  RAISE NOTICE 'Tables supprimées : cash_settlements, imported_invoices, dossier_settings';
  RAISE NOTICE 'Vues supprimées : dossier_status_with_cash*, cash_settlements_detail';
  RAISE NOTICE 'Fonctions supprimées : add_cash_settlement, delete_cash_settlement, get_dossier_manual_mode, etc.';
  RAISE NOTICE 'Index supprimés : idx_cash_settlements*, idx_dossier_settings*, idx_imported_invoices*';
END $$; 