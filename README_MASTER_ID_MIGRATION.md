# Migration: Ajout du champ master_id à la table invoices

## Vue d'ensemble

Cette migration ajoute le champ `master_id` à la table `invoices` pour permettre de lier les factures aux dossiers de la table `MASTER`. Cela améliore l'expérience utilisateur en affichant des informations contextuelles (numéro de dossier, nom de l'HUM, route) lors de l'allocation manuelle des règlements.

## Problème résolu

**Avant :** Lors de l'allocation manuelle d'un règlement, seuls les numéros de factures étaient affichés, ce qui n'était pas assez informatif pour les utilisateurs.

**Après :** Chaque facture affiche maintenant :
- ✅ Numéro de facture
- ✅ Numéro de dossier (badge bleu)
- ✅ Nom du client
- ✅ Nom de l'HUM (si type de dossier = HUM)
- ✅ Route (départ → arrivée)
- ✅ Échéance et montant restant

## Fichiers de migration

### 1. Migration Supabase
- **Fichier :** `supabase/migrations/20250715000004_add_master_id_to_invoices.sql`
- **Usage :** Exécution automatique via Supabase CLI

### 2. Script SQL direct
- **Fichier :** `add_master_id_to_invoices_direct.sql`
- **Usage :** Exécution manuelle dans l'éditeur SQL Supabase

### 3. Script Node.js
- **Fichier :** `execute_master_id_migration.js`
- **Usage :** Exécution programmatique via Node.js

## Installation

### Option 1: Exécution automatique (recommandée)
```bash
# Via Supabase CLI
supabase db push
```

### Option 2: Exécution manuelle
1. Allez sur votre instance Supabase
2. Ouvrez l'éditeur SQL
3. Copiez et exécutez le contenu de `add_master_id_to_invoices_direct.sql`

### Option 3: Exécution programmatique
```bash
# Définir la clé de service
export SUPABASE_SERVICE_ROLE_KEY="votre_clé_de_service"

# Exécuter le script
node execute_master_id_migration.js
```

## Changements dans le code

### 1. Hook useUnpaidInvoices
- **Fichier :** `src/hooks/useUnpaidInvoices.ts`
- **Modifications :**
  - Ajout de `master_id` dans la requête SELECT
  - Jointure avec la table `MASTER` pour récupérer les informations du dossier
  - Enrichissement des données de factures avec les informations contextuelles

### 2. Types TypeScript
- **Fichier :** `src/types/payments.ts`
- **Modifications :**
  - Extension de l'interface `InvoiceSummary` avec les nouveaux champs
  - Ajout de `master_id`, `dossier_number`, `dossier_client`, `hum_name`, etc.

### 3. Composant ManualAllocationModal
- **Fichier :** `src/components/ManualAllocationModal.tsx`
- **Modifications :**
  - Affichage du numéro de dossier dans un badge bleu
  - Section d'informations contextuelles (client, HUM, route)
  - Amélioration de la mise en page pour accommoder les nouvelles informations

## Structure des données

### Table invoices (après migration)
```sql
CREATE TABLE invoices (
  -- ... colonnes existantes ...
  master_id text,  -- ← NOUVELLE COLONNE
  -- ... autres colonnes ...
);
```

### Données enrichies retournées
```typescript
interface InvoiceSummary {
  // ... champs existants ...
  master_id?: string
  dossier_number?: string      // Numéro du dossier
  dossier_client?: string      // Nom du client
  dossier_type?: string        // Type de dossier (HUM/CARGO)
  hum_name?: string           // Nom de l'HUM (si applicable)
  depart?: string             // Ville de départ
  arrivee?: string           // Ville d'arrivée
}
```

## Vérification

Après la migration, vérifiez que :

1. ✅ La colonne `master_id` existe dans la table `invoices`
2. ✅ L'index `idx_invoices_master_id` a été créé
3. ✅ La vue `invoice_summary` inclut le champ `master_id`
4. ✅ L'interface d'allocation manuelle affiche les informations contextuelles

## Utilisation

### 1. Lier une facture à un dossier
```sql
UPDATE invoices 
SET master_id = 'DOSSIER123' 
WHERE invoice_number = 'FACT001';
```

### 2. Récupérer les factures avec informations de dossier
```sql
SELECT i.*, m.DOSSIER, m.CLIENT, m.NOM, m.DEPART, m.ARRIVEE
FROM invoices i
LEFT JOIN "MASTER" m ON i.master_id = m.DOSSIER
WHERE i.status = 'unpaid';
```

## Avantages

1. **Meilleure expérience utilisateur** : Plus d'informations contextuelles
2. **Traçabilité** : Lien direct entre factures et dossiers
3. **Efficacité** : Identification rapide des dossiers concernés
4. **Flexibilité** : Possibilité d'ajouter d'autres informations contextuelles

## Notes importantes

- Le champ `master_id` est nullable (les factures existantes n'auront pas de valeur)
- La migration est rétrocompatible
- Les performances sont optimisées avec un index sur `master_id`
- La vue `invoice_summary` est automatiquement mise à jour

## Support

En cas de problème avec cette migration :
1. Vérifiez les logs de Supabase
2. Assurez-vous que la clé de service a les bonnes permissions
3. Vérifiez que la table `MASTER` existe et est accessible 