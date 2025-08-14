# Erreur : "column case_finance_summary.date_operation does not exist"

## 🚨 **Problème identifié**

L'erreur indique que la colonne `date_operation` n'existe pas dans la vue `case_finance_summary`. Cela signifie que :

1. **La vue `case_finance_summary` n'existe pas** dans votre base de données, OU
2. **La vue existe mais n'a pas la bonne structure** avec la colonne `date_operation`

## 🔍 **Diagnostic**

### **Fichiers concernés :**
- `src/components/FacturationPage.tsx` - Ligne 62 : `.order('date_operation', { ascending: false })`
- Vue SQL `case_finance_summary` qui devrait contenir cette colonne

### **Structure attendue de la vue :**
```sql
CREATE OR REPLACE VIEW case_finance_summary AS
SELECT 
  m.id as master_id,
  m."DOSSIER" as dossier,
  m."CLIENT" as client_id,
  m."NETPAYABLE" as net_payable,
  m."LTA" as lta,
  m."STATUS" as status,
  m."DATE" as date_operation,  -- ← Cette colonne manque
  c.name as client_name,
  cfn.override_mode,
  cfn.notes,
  cfn.updated_at as notes_last_updated
FROM "MASTER" m
LEFT JOIN customers c ON m."CLIENT" = c.id  
LEFT JOIN case_finance_notes cfn ON m.id = cfn.master_id
ORDER BY m."DATE" DESC;
```

## 🛠️ **Solutions**

### **Option 1: Exécution du script SQL (Recommandée)**

1. **Allez sur votre instance Supabase** : https://supabase.skylogistics.fr
2. **Ouvrez l'éditeur SQL**
3. **Copiez et exécutez** le contenu de `check_and_create_case_finance_summary.sql`

### **Option 2: Exécution programmatique**

```bash
# Définir la clé de service
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_de_service"

# Exécuter le script de vérification
node check_case_finance_summary.js
```

### **Option 3: Vérification manuelle**

Exécutez ces requêtes dans l'éditeur SQL Supabase :

```sql
-- 1. Vérifier si la vue existe
SELECT schemaname, viewname, definition
FROM pg_views 
WHERE viewname = 'case_finance_summary';

-- 2. Vérifier les colonnes si la vue existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'case_finance_summary'
ORDER BY ordinal_position;

-- 3. Créer la vue si elle n'existe pas
CREATE OR REPLACE VIEW case_finance_summary AS
SELECT 
  m.id as master_id,
  m."DOSSIER" as dossier,
  m."CLIENT" as client_id,
  m."NETPAYABLE" as net_payable,
  m."LTA" as lta,
  m."STATUS" as status,
  m."DATE" as date_operation,
  COALESCE(c.name, 'Client inconnu') as client_name,
  COALESCE(cfn.override_mode, false) as override_mode,
  COALESCE(cfn.notes, '') as notes,
  COALESCE(cfn.updated_at, m."DATE") as notes_last_updated
FROM "MASTER" m
LEFT JOIN customers c ON m."CLIENT" = c.id  
LEFT JOIN case_finance_notes cfn ON m.id = cfn.master_id
ORDER BY m."DATE" DESC;
```

## 📋 **Prérequis**

Avant de créer la vue, assurez-vous que ces tables existent :

### **1. Table MASTER**
```sql
-- Vérifier l'existence
SELECT * FROM "MASTER" LIMIT 1;
```

### **2. Table customers**
```sql
-- Vérifier l'existence
SELECT * FROM customers LIMIT 1;

-- Créer si elle n'existe pas
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  siret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### **3. Table case_finance_notes**
```sql
-- Vérifier l'existence
SELECT * FROM case_finance_notes LIMIT 1;

-- Créer si elle n'existe pas
CREATE TABLE IF NOT EXISTS case_finance_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID NOT NULL REFERENCES "MASTER"(id) ON DELETE CASCADE,
  override_mode BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

## ✅ **Vérification**

Après avoir créé la vue, vérifiez que :

1. **La vue existe** : `SELECT * FROM case_finance_summary LIMIT 1;`
2. **La colonne date_operation est présente** : `SELECT date_operation FROM case_finance_summary LIMIT 1;`
3. **L'application fonctionne** sans erreur

## 🐛 **Débogage**

Si le problème persiste, le code modifié dans `FacturationPage.tsx` affichera :

- **Les colonnes disponibles** dans la console
- **La structure des données** récupérées
- **Les erreurs détaillées** pour identifier le problème

## 📝 **Notes importantes**

- **La vue dépend de la table MASTER** - assurez-vous qu'elle contient des données
- **Les jointures LEFT JOIN** permettent d'afficher des dossiers même sans notes finance
- **La colonne date_operation** correspond à `m."DATE"` de la table MASTER
- **L'ordre par défaut** est `ORDER BY m."DATE" DESC` (plus récent en premier)

## 🆘 **Support**

En cas de problème persistant :
1. Vérifiez les logs de Supabase
2. Assurez-vous que toutes les tables prérequises existent
3. Vérifiez les permissions RLS sur les tables
4. Testez la vue directement dans l'éditeur SQL 