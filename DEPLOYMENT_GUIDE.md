# Guide de Déploiement - Mode Manuel par Dossier

## 🚀 Déploiement de la Base de Données

### Option 1: Déploiement Simplifié (RECOMMANDÉ)

**Utilisez le script simplifié qui évite les erreurs de syntaxe :**

1. **Connectez-vous à votre projet Supabase**
   - Allez sur https://supabase.com
   - Sélectionnez votre projet
   - Cliquez sur "SQL Editor" dans le menu de gauche

2. **Exécutez le script simplifié**
   - Copiez le contenu du fichier `deploy_dossier_mode_simple.sql`
   - Collez-le dans l'éditeur SQL
   - Cliquez sur "Run" pour exécuter

   **✅ Avantages :**
   - Supprime automatiquement la contrainte de clé étrangère problématique
   - Crée toutes les tables, fonctions et vues nécessaires
   - Inclut des vérifications simples sans erreurs de syntaxe
   - Met à jour automatiquement les factures existantes

### Option 2: Déploiement par Étapes

Si vous préférez un déploiement plus contrôlé :

1. **Correction préalable** :
   ```sql
   -- Copiez et exécutez le contenu de fix_master_id_constraint.sql
   ```

2. **Migration principale** :
   ```sql
   -- Copiez et exécutez le contenu de supabase/migrations/20250715000001_dossier_manual_mode.sql
   ```

3. **Vérification** :
   ```sql
   -- Copiez et exécutez le contenu de quick_test_dossier_mode.sql
   ```

### Option 3: Déploiement Complet

Pour un déploiement avec vérifications détaillées :

1. **Exécutez le script complet** :
   ```sql
   -- Copiez et exécutez le contenu de deploy_dossier_mode_complete.sql
   ```

## 🔧 Intégration Frontend

### 1. Vérification des Fichiers

Assurez-vous que tous ces fichiers sont présents dans votre projet :

```
src/
├── hooks/
│   └── useDossierMode.ts ✅
├── components/
│   ├── DossierModeToggle.tsx ✅
│   ├── DossierPaymentForm.tsx ✅
│   ├── DossierDetailPage.tsx ✅
│   └── DossierModeTest.tsx ✅
├── types/
│   └── payments.ts ✅ (avec les nouvelles interfaces)
└── utils/
    └── dateUtils.ts ✅
```

### 2. Test de Connexion

Utilisez le composant `DossierModeTest` pour vérifier la connexion :

```typescript
// Dans votre page principale, ajoutez temporairement :
import DossierModeTest from './components/DossierModeTest'

// Puis dans le JSX :
<DossierModeTest />
```

## 🧪 Tests de Fonctionnalité

### 1. Test du Toggle Mode

1. **Ajoutez temporairement le composant de test à votre page principale**
2. **Testez le toggle sur un dossier existant**
3. **Vérifiez que le mode est bien sauvegardé en base**

### 2. Test du Formulaire Adaptatif

1. **Créez un dossier en mode manuel**
2. **Testez la création d'un paiement**
3. **Vérifiez que l'interface s'adapte correctement**

### 3. Test de l'Allocation

1. **Mode automatique** : Créez un paiement → vérifiez l'allocation automatique
2. **Mode manuel** : Créez un paiement → vérifiez l'allocation manuelle

## 🔍 Diagnostic des Problèmes

### Problème 1: "syntax error at or near SELECT"

**Solution :** Cette erreur indique un problème de syntaxe dans le script SQL.

```sql
-- Utilisez le script simplifié
-- Copiez et exécutez le contenu de deploy_dossier_mode_simple.sql
```

### Problème 2: "violates foreign key constraint invoices_master_id_fkey"

**Solution :** Cette erreur indique qu'il y a une contrainte de clé étrangère sur `master_id` qui fait référence à une table inexistante.

```sql
-- Exécutez le script de correction
-- Copiez et exécutez le contenu de fix_master_id_constraint.sql
```

### Problème 3: "column i.master_name does not exist"

**Solution :** Cette erreur indique que la migration n'a pas été exécutée correctement. Vérifiez que :
1. La migration SQL a été exécutée complètement
2. Les colonnes `master_id` et `master_name` ont été ajoutées à la table `invoices`

```sql
-- Vérifiez que les colonnes existent
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'invoices' AND column_name IN ('master_id', 'master_name');
```

### Problème 4: "Fonction get_dossier_manual_mode n'existe pas"

**Solution :**
```sql
-- Vérifiez que la fonction existe
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_dossier_manual_mode';

-- Si elle n'existe pas, réexécutez la migration
```

### Problème 5: "Table dossier_settings n'existe pas"

**Solution :**
```sql
-- Vérifiez que la table existe
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'dossier_settings';

-- Si elle n'existe pas, réexécutez la migration
```

### Problème 6: Erreur de type TypeScript

**Solution :**
```bash
# Redémarrez votre serveur de développement
npm run dev
# ou
yarn dev
```

## 📋 Checklist de Validation

### Base de Données
- [ ] Contrainte `invoices_master_id_fkey` supprimée (si elle existait)
- [ ] Colonnes `master_id` et `master_name` ajoutées à `invoices`
- [ ] Table `dossier_settings` créée
- [ ] Fonction `get_dossier_manual_mode` fonctionne
- [ ] Fonction `set_dossier_manual_mode` fonctionne
- [ ] Vue `dossier_overview_with_mode` accessible
- [ ] Trigger modifié pour respecter le mode dossier

### Frontend
- [ ] Hook `useDossierMode` fonctionne
- [ ] Composant `DossierModeToggle` s'affiche
- [ ] Formulaire `DossierPaymentForm` s'adapte
- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs console

### Fonctionnalités
- [ ] Toggle mode dossier fonctionne
- [ ] Paiement automatique en mode auto
- [ ] Paiement manuel en mode manuel
- [ ] Interface s'adapte selon le mode
- [ ] Feedback visuel correct

## 🎯 Prochaines Étapes

1. **Exécutez le script simplifié** `deploy_dossier_mode_simple.sql` (RECOMMANDÉ)
2. **Testez la connexion** avec le composant `DossierModeTest`
3. **Intégrez les composants** dans votre interface existante
4. **Testez le workflow complet** sur un dossier de test
5. **Formez vos utilisateurs** sur la nouvelle fonctionnalité

## 📞 Support

Si vous rencontrez des problèmes :

1. **Utilisez le script simplifié** `deploy_dossier_mode_simple.sql`
2. **Vérifiez les logs Supabase** dans la console
3. **Vérifiez les logs frontend** dans la console du navigateur
4. **Testez les fonctions SQL** directement dans l'éditeur Supabase
5. **Vérifiez la structure des données** avec des requêtes de diagnostic
6. **Exécutez le script de vérification** `verify_dossier_mode_installation.sql`

## 📁 Fichiers de Déploiement

### Scripts Principaux
- `deploy_dossier_mode_simple.sql` - **RECOMMANDÉ** (déploiement simplifié)
- `deploy_dossier_mode_complete.sql` - Déploiement avec vérifications détaillées
- `fix_master_id_constraint.sql` - Correction de la contrainte de clé étrangère

### Scripts de Vérification
- `verify_dossier_mode_installation.sql` - Vérification complète de l'installation
- `quick_test_dossier_mode.sql` - Test rapide de l'installation

### Migration Officielle
- `supabase/migrations/20250715000001_dossier_manual_mode.sql` - Migration Supabase

---

**Note :** Cette fonctionnalité est conçue pour être non-intrusive. Les dossiers existants continueront à fonctionner en mode automatique par défaut. Les factures existantes seront automatiquement assignées à des dossiers basés sur leur `customer_id`. 