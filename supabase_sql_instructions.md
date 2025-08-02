# Instructions pour exécuter le système d'override unifié

## Méthode 1 : Interface Web Supabase

1. **Accédez à votre projet Supabase :**
   - Allez sur https://supabase.skylogistics.fr
   - Connectez-vous à votre compte
   - Accédez à votre projet

2. **Ouvrez l'éditeur SQL :**
   - Dans le menu de gauche, cliquez sur "SQL Editor"
   - Cliquez sur "New query"

3. **Copiez et exécutez le script :**
   - Ouvrez le fichier `unified_override_system.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

## Méthode 2 : Via l'API (si vous avez la clé de service)

```bash
# Définir la clé de service
export SUPABASE_SERVICE_KEY="votre-clé-de-service"

# Exécuter le script
node execute_sql_direct.js
```

## Méthode 3 : Via la ligne de commande Supabase

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Lier le projet (remplacez par votre project-ref)
supabase link --project-ref votre-project-ref

# Pousser les migrations
supabase db push
```

## Vérification de l'installation

Après l'exécution, vous pouvez vérifier que le système fonctionne :

```sql
-- Vérifier que la nouvelle colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'MASTER' 
AND column_name = 'MANUAL_OVERRIDE';

-- Vérifier que les fonctions existent
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('calculate_reglement_status', 'set_master_manual_mode', 'set_master_auto_mode');

-- Tester la vue
SELECT * FROM master_mode_status LIMIT 5;
```

## Utilisation du système

### Activer le mode manuel pour un dossier :
```sql
-- Définir manuellement le statut de facturation ET de règlement
SELECT set_master_manual_mode('DOSSIER123', 'facture', 'paid');
```

### Remettre en mode automatique :
```sql
SELECT set_master_auto_mode('DOSSIER123');
```

### Voir le statut d'un dossier :
```sql
SELECT * FROM master_mode_status WHERE "DOSSIER" = 'DOSSIER123';
```

## Statuts disponibles

### Statuts de facturation :
- `'non facture'` - Aucune facture associée
- `'facture'` - Facture(s) associée(s)
- `'famille'` - Facture de type famille

### Statuts de règlement :
- `'unpaid'` - Non payé
- `'partial'` - Partiellement payé
- `'paid'` - Entièrement payé

## Logique du système

- **Mode automatique** (`MANUAL_OVERRIDE = FALSE`) : Les statuts sont calculés automatiquement
- **Mode manuel** (`MANUAL_OVERRIDE = TRUE`) : Les statuts sont définis manuellement et ne changent plus automatiquement 