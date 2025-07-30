# 💵 Règlements Espèces Hors Comptabilité - Guide d'Installation

## 📋 Vue d'ensemble

Cette fonctionnalité permet de tracer les dossiers réglés en espèces sans passer par le système de facturation officiel, respectant ainsi les contraintes comptables.

### **Problème résolu** :
- Client règle un dossier en espèces 💵
- Espèces ne passent pas en banque → Pas de trace comptable officielle
- Impossible d'émettre une facture → Créerait une divergence comptable
- **SOLUTION** : Système séparé pour tracer les règlements espèces

## 🗃️ Installation Base de Données

### 1. Exécuter la migration SQL

Allez dans l'éditeur SQL de Supabase et exécutez le contenu du fichier :
```
supabase/migrations/20250715000002_cash_settlements.sql
```

Cette migration crée :
- ✅ Table `cash_settlements` pour les règlements espèces
- ✅ Vue `cash_settlements_detail` avec informations client
- ✅ Vue `dossier_status_with_cash` combinant facturation et espèces
- ✅ Fonction `add_cash_settlement()` pour ajouter un règlement
- ✅ Fonction `delete_cash_settlement()` pour supprimer un règlement
- ✅ Index pour performance
- ✅ Données de test

### 2. Vérifier l'installation

Exécutez ces requêtes pour vérifier que tout fonctionne :
```sql
-- Vérifier que la table existe
SELECT * FROM cash_settlements LIMIT 1;

-- Vérifier que la vue fonctionne
SELECT * FROM dossier_status_with_cash LIMIT 1;

-- Tester la fonction d'ajout
SELECT add_cash_settlement('DOSSIER-TEST', 'customer-uuid', 1000.00, 'Test règlement espèces');
```

## 🔧 Composants Frontend

### 1. Types TypeScript (déjà ajoutés)
```typescript
// src/types/payments.ts
export interface CashSettlement { ... }
export interface CashSettlementDetail { ... }
export interface DossierStatusWithCash { ... }
export interface CashSettlementFormData { ... }
```

### 2. Hooks de gestion (déjà créés)
```typescript
// src/hooks/useCashSettlements.ts
export const useCashSettlements = () => { ... }
export const useDossierStatusWithCash = () => { ... }
```

### 3. Composants UI (déjà créés)
```typescript
// src/components/CashSettlementForm.tsx
// src/components/DossierStatusDashboard.tsx
// src/components/DossierPage.tsx
```

## 🚀 Utilisation

### 1. Dashboard des statuts
```typescript
import DossierStatusDashboard from './components/DossierStatusDashboard'

// Dans votre page
<DossierStatusDashboard />
```

### 2. Page dossier avec règlements espèces
```typescript
import DossierPage from './components/DossierPage'

// Dans votre routeur
<DossierPage masterId="DOSSIER-123" />
```

### 3. Formulaire règlement espèces
```typescript
import CashSettlementForm from './components/CashSettlementForm'

// Dans un composant
<CashSettlementForm
  masterId="DOSSIER-123"
  masterName="Dossier Test"
  customerId="customer-uuid"
  onSuccess={() => console.log('Règlement enregistré')}
/>
```

## 🎯 Statuts des dossiers

### **Statuts disponibles** :
- `cash_settled` : Réglé uniquement en espèces (hors comptabilité)
- `invoiced_paid` : Facturé et entièrement payé
- `invoiced_partial` : Facturé et partiellement payé
- `invoiced_unpaid` : Facturé mais impayé
- `no_activity` : Aucune activité financière

### **Badges visuels** :
- 💵 **Orange** : Règlements espèces
- ✅ **Vert** : Facturé & payé
- ⏳ **Jaune** : Partiellement payé
- ❌ **Rouge** : Facturé impayé
- ⚪ **Gris** : Aucune activité

## 📊 Métriques disponibles

### **Dashboard** :
- Nombre de dossiers réglés en espèces
- Nombre de dossiers facturés & payés
- Nombre de dossiers partiellement payés
- Nombre de dossiers impayés

### **Par dossier** :
- Montant total facturé
- Montant total payé (factures)
- Montant total espèces (hors comptabilité)
- Date du dernier règlement espèces

## 🔒 Sécurité et Conformité

### **Séparation claire** :
- ✅ Règlements espèces complètement séparés de la comptabilité officielle
- ✅ Aucun risque de confusion ou de divergence comptable
- ✅ Traçabilité complète des règlements espèces

### **Validation** :
- ✅ Vérification de l'existence du client
- ✅ Validation des montants (positifs uniquement)
- ✅ Contrôle des paramètres obligatoires

## 🎨 Interface utilisateur

### **Design cohérent** :
- Couleur orange pour distinguer les espèces des paiements comptabilisés
- Badges visuels clairs pour chaque statut
- Formulaires intuitifs avec validation
- Historique détaillé des règlements

### **Feedback utilisateur** :
- Messages de succès/erreur clairs
- Indicateurs de chargement
- Validation en temps réel
- Confirmation des actions importantes

## 📋 Checklist d'implémentation

### Base de données
- [x] Créer table `cash_settlements`
- [x] Créer vue `dossier_status_with_cash`
- [x] Créer fonction `add_cash_settlement`
- [x] Créer fonction `delete_cash_settlement`
- [x] Ajouter index pour performance
- [x] Tester avec données de test

### Frontend
- [x] Types TypeScript pour règlements espèces
- [x] Hook `useCashSettlements`
- [x] Hook `useDossierStatusWithCash`
- [x] Formulaire `CashSettlementForm`
- [x] Dashboard avec statuts espèces
- [x] Page dossier avec règlements espèces

## 🚀 Résultat

- ✅ **Traçabilité** : Tous les règlements espèces sont enregistrés
- ✅ **Clarté** : Distinction visuelle claire (espèces vs comptabilité)
- ✅ **Simplicité** : Interface dédiée et intuitive
- ✅ **Conformité** : Respect des contraintes comptables
- ✅ **Performance** : Index optimisés et requêtes efficaces

Cette solution répond parfaitement au besoin métier de tracer les règlements espèces sans interférer avec la comptabilité officielle ! 🎯 