-- Script de vérification des tables restantes après nettoyage
-- À exécuter dans l'éditeur SQL de Supabase après le script de nettoyage

-- =====================================================
-- 1. TABLES RESTANTES (devraient être actives)
-- =====================================================

SELECT 
  'TABLE' as type,
  tablename as name,
  'Table principale' as description
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'customers',
    'invoices', 
    'payments',
    'payment_allocations',
    'AWBstocks',
    'lta_stock',
    'lta_stock_movements',
    'user_profiles',
    'MASTER'
  )
ORDER BY tablename;

-- =====================================================
-- 2. VUES RESTANTES (devraient être actives)
-- =====================================================

SELECT 
  'VIEW' as type,
  viewname as name,
  'Vue système' as description
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN (
    'invoice_summary',
    'payment_allocation_details', 
    'customer_balance_summary'
  )
ORDER BY viewname;

-- =====================================================
-- 3. FONCTIONS RESTANTES (devraient être actives)
-- =====================================================

SELECT 
  'FUNCTION' as type,
  p.proname as name,
  'Fonction système' as description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'allocate_payment_automatically',
    'update_invoice_status',
    'update_updated_at_column',
    'update_updated_at_column_awbstocks'
  )
ORDER BY p.proname;

-- =====================================================
-- 4. INDEX RESTANTS (devraient être actifs)
-- =====================================================

SELECT 
  'INDEX' as type,
  indexname as name,
  'Index système' as description
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY indexname;

-- =====================================================
-- 5. RÉSUMÉ DES TABLES ACTIVES PAR SYSTÈME
-- =====================================================

SELECT 
  'SYSTÈME DE PAIEMENTS' as system,
  COUNT(*) as table_count,
  STRING_AGG(tablename, ', ') as tables
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('customers', 'invoices', 'payments', 'payment_allocations')

UNION ALL

SELECT 
  'SYSTÈME DE STOCK AWB' as system,
  COUNT(*) as table_count,
  STRING_AGG(tablename, ', ') as tables
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('AWBstocks', 'lta_stock', 'lta_stock_movements')

UNION ALL

SELECT 
  'SYSTÈME UTILISATEURS' as system,
  COUNT(*) as table_count,
  STRING_AGG(tablename, ', ') as tables
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles')

UNION ALL

SELECT 
  'TABLE PRINCIPALE' as system,
  COUNT(*) as table_count,
  STRING_AGG(tablename, ', ') as tables
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('MASTER');

-- =====================================================
-- 6. VÉRIFICATION DES TABLES ORPHELINES RESTANTES
-- =====================================================

SELECT 
  'ORPHELINE POTENTIELLE' as status,
  tablename as name,
  'Table non référencée dans le code' as description
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT IN (
    'customers', 'invoices', 'payments', 'payment_allocations',
    'AWBstocks', 'lta_stock', 'lta_stock_movements',
    'user_profiles', 'MASTER'
  )
ORDER BY tablename; 