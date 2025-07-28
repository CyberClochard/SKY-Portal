# Système de Gestion des Règlements Client - Documentation

## Vue d'ensemble

Le système de gestion des règlements client permet de :
- Créer et gérer les paiements clients
- Allouer automatiquement ou manuellement les paiements sur les factures
- Suivre l'historique des allocations
- Gérer les statuts des factures (impayée, partielle, payée)

## Architecture Backend Supabase

### Tables principales

#### `customers`
- `id` (uuid, PK)
- `name` (text)
- `email` (text)
- `phone` (text)
- `address` (text)
- `siret` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `invoices`
- `id` (uuid, PK)
- `customer_id` (uuid, FK)
- `invoice_number` (text)
- `amount_total` (decimal)
- `amount_paid` (decimal, calculé)
- `status` (text: 'unpaid', 'partial', 'paid')
- `due_date` (date)
- `issued_date` (date)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `payments`
- `id` (uuid, PK)
- `customer_id` (uuid, FK)
- `amount` (decimal)
- `payment_method` (text: 'transfer', 'check', 'card', 'cash', 'other')
- `status` (text: 'pending', 'completed', 'cancelled')
- `reference` (text)
- `notes` (text)
- `auto_allocate` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

#### `payment_allocations`
- `id` (uuid, PK)
- `payment_id` (uuid, FK)
- `invoice_id` (uuid, FK)
- `amount_allocated` (decimal)
- `created_at` (timestamptz)

### Vues SQL

#### `invoice_summary`
Vue enrichie des factures avec informations client et calculs de paiement.

#### `payment_allocation_details`
Vue détaillée des allocations avec informations de paiement et facture.

#### `customer_balance_summary`
Résumé des soldes par client.

## Composants Frontend

### Hooks personnalisés

#### `usePayments(options)`
Hook principal pour gérer les paiements.

```typescript
const { payments, loading, error, createPayment, updatePayment, deletePayment } = usePayments({
  customerId: 'uuid',
  status: 'completed',
  limit: 50
})
```

#### `useUnpaidInvoices(options)`
Hook pour récupérer les factures impayées.

```typescript
const { invoices, loading, error } = useUnpaidInvoices({
  customerId: 'uuid',
  includePartial: true
})
```

#### `usePaymentAllocations(options)`
Hook pour gérer les allocations de paiements.

```typescript
const { allocations, loading, error, createManualAllocation, deleteAllocation } = usePaymentAllocations({
  paymentId: 'uuid'
})
```

### Composants

#### `PaymentForm`
Formulaire de création de paiement avec :
- Sélection du client
- Saisie du montant
- Choix du mode de paiement
- Référence et notes
- Toggle allocation automatique/manuelle

#### `ManualAllocationModal`
Modal pour l'allocation manuelle avec :
- Liste des factures impayées du client
- Saisie des montants à allouer
- Validation en temps réel
- Option d'allocation automatique du reste

#### `PaymentAllocationTable`
Tableau des allocations d'un paiement avec :
- Détails des factures concernées
- Montants alloués
- Statuts des factures
- Actions (supprimer allocation)

#### `PaymentsPage`
Page principale intégrant tous les composants.

## Utilisation

### 1. Création d'un paiement

```typescript
import { PaymentForm } from './components/payments'

<PaymentForm
  customerId="uuid"
  onSuccess={(payment) => {
    // Gérer le succès
    if (!payment.auto_allocate) {
      // Ouvrir modal d'allocation manuelle
    }
  }}
  onCancel={() => {
    // Fermer le formulaire
  }}
/>
```

### 2. Allocation manuelle

```typescript
import { ManualAllocationModal } from './components/payments'

<ManualAllocationModal
  isOpen={showModal}
  payment={selectedPayment}
  onClose={() => setShowModal(false)}
  onSuccess={() => {
    // Rafraîchir les données
  }}
/>
```

### 3. Affichage des allocations

```typescript
import { PaymentAllocationTable } from './components/payments'

<PaymentAllocationTable
  paymentId="uuid"
  onAllocationChange={() => {
    // Rafraîchir les données
  }}
/>
```

## Fonctionnalités

### Allocation automatique
- Déclenchée par le champ `auto_allocate: true`
- Utilise la fonction SQL `allocate_payment_automatically(payment_uuid)`
- Alloue selon l'ordre chronologique des factures
- Empêche les surpaiements

### Allocation manuelle
- Permet de répartir manuellement le paiement
- Validation en temps réel des montants
- Option d'allocation automatique du reste
- Gestion des erreurs et feedback utilisateur

### Validation et sécurité
- Contraintes de validation côté base de données
- Triggers automatiques pour mettre à jour les statuts
- Gestion des erreurs avec messages explicites
- Confirmation pour les actions destructives

## Intégration

### Dans le menu principal
Ajouter un lien vers la page des paiements :

```typescript
// Dans Sidebar.tsx
{
  name: 'Règlements',
  href: '/payments',
  icon: Euro,
  current: pathname === '/payments'
}
```

### Dans le routeur
Ajouter la route pour la page des paiements :

```typescript
// Dans App.tsx ou le routeur principal
<Route path="/payments" element={<PaymentsPage />} />
```

## Configuration Supabase

### Fonctions SQL nécessaires

#### `allocate_payment_automatically(payment_uuid)`
Fonction pour l'allocation automatique des paiements.

#### Triggers automatiques
- Mise à jour `amount_paid` et `status` des factures
- Validation des contraintes de montant

### Policies RLS
- Lecture/écriture pour les utilisateurs authentifiés
- Validation des données côté serveur

## Évolutions futures

### Fonctionnalités prévues
- Import de factures fournisseurs (OCR)
- Génération automatique de devis/factures
- Relances automatiques
- Export des données
- Rapports et statistiques

### Améliorations techniques
- Optimisation des performances
- Cache côté client
- Notifications en temps réel
- API REST complète 