# 🎯 Mode Manuel par Dossier - Guide d'Installation

## 📋 Vue d'ensemble

Cette fonctionnalité permet de définir un mode de gestion spécifique pour chaque dossier :
- **Mode automatique** (par défaut) : Allocation automatique des paiements
- **Mode manuel** : Allocation manuelle obligatoire pour tous les paiements du dossier

## 🗃️ Installation Base de Données

### 1. Exécuter la migration SQL

Allez dans l'éditeur SQL de Supabase et exécutez le contenu du fichier :
```
supabase/migrations/20250715000001_dossier_manual_mode.sql
```

Cette migration crée :
- ✅ Table `dossier_settings` pour stocker les modes par dossier
- ✅ Fonctions `get_dossier_manual_mode()` et `set_dossier_manual_mode()`
- ✅ Vue `dossier_overview_with_mode` avec informations complètes
- ✅ Vue `payments_with_dossier_context` avec contexte dossier
- ✅ Fonction `create_payment_for_dossier()` pour paiements adaptatifs
- ✅ Trigger modifié pour respecter le mode dossier

### 2. Vérifier l'installation

Exécutez cette requête pour vérifier que tout fonctionne :
```sql
-- Vérifier que la table existe
SELECT * FROM dossier_settings LIMIT 1;

-- Vérifier que la vue fonctionne
SELECT * FROM dossier_overview_with_mode LIMIT 1;

-- Tester la fonction de mode
SELECT get_dossier_manual_mode('DOSSIER-001');
```

## 🔧 Composants Frontend

### 1. Types TypeScript (déjà ajoutés)
```typescript
// src/types/payments.ts
export interface DossierSettings { ... }
export interface DossierWithMode { ... }
export interface ManualAllocationItem { ... }
export interface DossierPaymentData { ... }
```

### 2. Hook de gestion (déjà créé)
```typescript
// src/hooks/useDossierMode.ts
export const useDossierMode = () => { ... }
export const useDossiersWithMode = () => { ... }
```

### 3. Composants UI (déjà créés)
```typescript
// src/components/DossierModeToggle.tsx
// src/components/DossierPaymentForm.tsx
// src/components/DossierDetailPage.tsx
```

## 🚀 Utilisation

### 1. Toggle du mode dossier

```tsx
import DossierModeToggle from './components/DossierModeToggle'

<DossierModeToggle
  masterId="DOSSIER-001"
  masterName="Dossier Test"
  currentMode={false}
  onModeChange={(newMode) => console.log('Mode changé:', newMode)}
/>
```

### 2. Formulaire de paiement adaptatif

```tsx
import DossierPaymentForm from './components/DossierPaymentForm'

<DossierPaymentForm
  masterId="DOSSIER-001"
  masterName="Dossier Test"
  customerId="customer-uuid"
  onSuccess={() => refetch()}
/>
```

### 3. Page complète de dossier

```tsx
import DossierDetailPage from './components/DossierDetailPage'

<DossierDetailPage masterId="DOSSIER-001" />
```

## 🎯 Workflow Utilisateur

### Mode Automatique (par défaut)
1. ✅ Utilisateur crée un paiement
2. ✅ Le système alloue automatiquement aux factures
3. ✅ Aucune intervention manuelle requise

### Mode Manuel
1. ✅ Utilisateur active le mode manuel sur le dossier
2. ✅ Interface s'adapte (formulaire avec allocations manuelles)
3. ✅ Utilisateur sélectionne les factures et montants
4. ✅ Paiement créé avec allocations manuelles

## 🔍 Fonctionnalités Clés

### ✅ **Granularité parfaite**
- Mode par dossier (pas par paiement)
- Vision claire : "Ce dossier nécessite une gestion spéciale"
- Cohérence : Tous les paiements du dossier suivent la même logique

### ✅ **UX optimisée**
- Un seul toggle par dossier
- Formulaire s'adapte automatiquement
- Feedback visuel clair (orange = manuel, vert = auto)

### ✅ **Flexibilité maximale**
- 95% des dossiers en automatique
- 5% en manuel pour les cas particuliers
- Changement de mode possible à tout moment

### ✅ **Performance maintenue**
- Système automatique existant préservé
- Triggers optimisés avec vérification du mode
- Pas de régression sur les dossiers automatiques

## 🧪 Tests

### Test 1 : Mode automatique
1. Créer un dossier en mode automatique
2. Créer un paiement
3. Vérifier que l'allocation est automatique

### Test 2 : Mode manuel
1. Activer le mode manuel sur un dossier
2. Créer un paiement
3. Vérifier que l'allocation manuelle est requise
4. Sélectionner des factures et montants
5. Vérifier que les allocations sont créées

### Test 3 : Changement de mode
1. Changer le mode d'un dossier existant
2. Vérifier que les nouveaux paiements suivent le nouveau mode
3. Vérifier que les anciens paiements ne sont pas affectés

## 🐛 Dépannage

### Problème : "Fonction get_dossier_manual_mode n'existe pas"
**Solution :** Exécuter la migration SQL complète

### Problème : "Vue dossier_overview_with_mode n'existe pas"
**Solution :** Vérifier que la migration a été exécutée correctement

### Problème : Les paiements ne respectent pas le mode
**Solution :** Vérifier que le trigger a été mis à jour

## 📈 Avantages

1. **Flexibilité** : Gestion granulaire par dossier
2. **Simplicité** : Interface intuitive avec toggle
3. **Performance** : Système existant préservé
4. **Évolutivité** : Facile d'ajouter d'autres paramètres
5. **Cohérence** : Logique uniforme par dossier

## 🎯 Résultat Final

- ✅ **Mode par dossier** : Granularité parfaite
- ✅ **Interface intuitive** : Toggle visible et feedback clair
- ✅ **Flexibilité totale** : Auto par défaut, manuel si besoin
- ✅ **Performance** : Système existant préservé
- ✅ **Evolutivité** : Facile d'ajouter d'autres paramètres par dossier

Cette implémentation répond parfaitement au besoin de gestion manuelle sélective par dossier ! 🎯 