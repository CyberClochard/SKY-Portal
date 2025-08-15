# Système de Lignes de Facturation - Documentation

## Vue d'ensemble

Le système de lignes de facturation permet de gérer les prestations et services facturés pour chaque dossier dans le card 'ventes' de l'onglet 'finances' du CaseModal.

## Architecture

### Base de données

#### Table `invoice_lines`
- **Structure** : Stockage des lignes de facturation individuelles
- **Champs clés** :
  - `dossier_number` : Référence vers le numéro de dossier
  - `designation` : Description de la prestation/service
  - `quantite` : Quantité de la prestation
  - `prix_unitaire` : Prix unitaire HT
  - `taux_tva` : Taux de TVA applicable
  - `montant_ht`, `montant_tva`, `montant_ttc` : Montants calculés automatiquement
  - `ordre` : Ordre d'affichage des lignes
  - `notes` : Notes additionnelles

#### Table `invoice_headers`
- **Structure** : Métadonnées globales de facturation par dossier
- **Champs clés** :
  - `dossier_number` : Référence vers le numéro de dossier (unique)
  - `statut_facturation` : 'devis', 'facture_envoyee', 'payee'
  - `client_name`, `client_email`, `client_phone`, `client_address`
  - `date_devis`, `date_facture`, `numero_facture`
  - `conditions_paiement`, `echeance_paiement`

### Fonctionnalités automatiques

#### Calculs automatiques
- **Montant HT** : `quantite × prix_unitaire`
- **Montant TVA** : `montant_ht × (taux_tva / 100)`
- **Montant TTC** : `montant_ht + montant_tva`

#### Triggers SQL
- **`calculate_invoice_line_amounts_trigger`** : Calcule automatiquement les montants
- **`update_invoice_lines_updated_at`** : Met à jour le timestamp de modification

#### Vues SQL
- **`invoice_lines_summary`** : Lignes avec informations d'en-tête
- **`invoice_totals_by_dossier`** : Totaux par dossier

## Composants Frontend

### Hook `useInvoiceLines`

```typescript
const {
  invoiceLines,        // Lignes de facturation
  invoiceHeader,       // En-tête de facturation
  loading,            // État de chargement
  error,              // Erreurs éventuelles
  totals,             // Totaux calculés
  createInvoiceLine,  // Créer une nouvelle ligne
  updateInvoiceLine,  // Modifier une ligne existante
  deleteInvoiceLine,  // Supprimer une ligne
  reorderInvoiceLines, // Réorganiser l'ordre
  upsertInvoiceHeader, // Créer/modifier l'en-tête
  refetch             // Rafraîchir les données
} = useInvoiceLines({ dossierNumber: 'DOSSIER-001' })
```

### Composant `InvoiceLinesManager`

Interface complète pour gérer les lignes de facturation :
- **Affichage des totaux** : HT, TVA, TTC
- **Gestion des lignes** : Ajout, modification, suppression
- **Formulaire intégré** : Saisie des données avec validation
- **Interface responsive** : Adaptation mobile/desktop

## Utilisation

### 1. Intégration dans le CaseModal

Le composant est déjà intégré dans le card 'ventes' de l'onglet 'finances' :

```tsx
<InvoiceLinesManager 
  dossierNumber={dossier}
  onUpdate={() => {
    // Callback appelé après modification des données
    console.log('Lignes de facturation mises à jour')
  }}
/>
```

### 2. Ajout d'une ligne de facturation

1. Cliquer sur "Ajouter une ligne"
2. Remplir le formulaire :
   - **Désignation** : Description de la prestation
   - **Quantité** : Nombre d'unités
   - **Prix unitaire HT** : Prix sans TVA
   - **Taux TVA** : Pourcentage de TVA (défaut : 20%)
   - **Notes** : Informations additionnelles (optionnel)
3. Cliquer sur "Ajouter"

### 3. Modification d'une ligne

1. Cliquer sur l'icône "Modifier" (crayon)
2. Modifier les champs souhaités
3. Cliquer sur "Modifier"

### 4. Suppression d'une ligne

1. Cliquer sur l'icône "Supprimer" (poubelle)
2. Confirmer la suppression

## Migration des données existantes

### Si vous avez des données dans l'ancien système

1. **Exécuter la migration SQL** : `20250715000005_create_invoice_lines.sql`
2. **Migrer les données existantes** (si applicable) :
   ```sql
   -- Exemple de migration depuis l'ancien système
   INSERT INTO invoice_lines (
     dossier_number,
     designation,
     quantite,
     prix_unitaire,
     taux_tva,
     ordre
   )
   SELECT 
     dossier_number,
     designation,
     quantite,
     prix_unitaire,
     taux_tva,
     ROW_NUMBER() OVER (ORDER BY id)
   FROM ancienne_table_ventes;
   ```

## Tests

### Script de test

Exécuter `test_invoice_lines.sql` dans l'éditeur SQL de Supabase pour :
- Créer des données de test
- Vérifier le bon fonctionnement des calculs
- Tester les vues SQL

### Vérifications

1. **Calculs automatiques** : Les montants HT, TVA, TTC sont calculés correctement
2. **Contraintes** : Validation des données (quantité > 0, prix ≥ 0, TVA 0-100%)
3. **Triggers** : Mise à jour automatique des timestamps
4. **Vues** : Affichage correct des données agrégées

## Sécurité

### RLS (Row Level Security)
- Activé sur toutes les tables
- Policies pour utilisateurs authentifiés
- Accès restreint aux données de l'utilisateur connecté

### Validation des données
- Contraintes SQL au niveau base de données
- Validation côté client dans les composants React
- Gestion des erreurs avec messages utilisateur

## Maintenance

### Nettoyage des données
```sql
-- Supprimer les lignes orphelines
DELETE FROM invoice_lines 
WHERE dossier_number NOT IN (
  SELECT dossier_number FROM invoice_headers
);

-- Supprimer les en-têtes sans lignes
DELETE FROM invoice_headers 
WHERE dossier_number NOT IN (
  SELECT DISTINCT dossier_number FROM invoice_lines
);
```

### Optimisation des performances
- Index sur `dossier_number` et `ordre`
- Vues matérialisées pour les totaux (si nécessaire)
- Pagination des résultats pour les gros volumes

## Support

Pour toute question ou problème :
1. Vérifier les logs de la console navigateur
2. Contrôler les erreurs SQL dans Supabase
3. Tester avec le script de test fourni
4. Vérifier la structure des tables avec `\d invoice_lines`
