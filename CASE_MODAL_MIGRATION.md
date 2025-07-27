# Migration CasePage → CaseModal

## Vue d'ensemble

Ce document décrit la transformation du composant `CasePage.tsx` en `CaseModal.tsx` avec un système d'onglets et des templates conditionnels selon le type de dossier.

## Changements apportés

### 1. Nouveau composant CaseModal.tsx

**Fonctionnalités principales :**
- Modal responsive avec overlay sombre
- Système d'onglets : Général, Finances, Documents
- Templates conditionnels selon le type de dossier (HUM/CARGO)
- Gestion des modes CARGO (AÉRIEN/MARITIME/ROUTIER)
- Édition en ligne avec sauvegarde automatique
- Fermeture avec ESC, clic overlay, ou bouton X

**Architecture des templates :**

#### Template HUM (Dépouilles mortelles)
- **Onglet Général (4 cards verticales) :**
  - **Card 1 - Informations Dossier :** Date de création, Client, N° Dossier
  - **Card 2 - Défunt :** Nom du défunt (spécifique HUM)
  - **Card 3 - Transport :** N° LTA, Compagnie aérienne, Routing
  - **Card 4 - Colis :** Poids (simplifié, 1 colis standard)

#### Template CARGO (Fret)
- **Onglet Général (4 cards verticales) :**
  - **Card 1 - Informations Dossier :** Date de création, Client, N° Dossier
  - **Card 2 - Mode de Transport :** Sélecteur AÉRIEN/MARITIME/ROUTIER
  - **Card 3 - Transport :** Référence conditionnelle (LTA/BL selon mode), Transporteur, Routing
  - **Card 4 - Colisage :** Gestion multi-colis avec poids et dimensions

#### Onglets communs
- **Finances :** Gestion commerciale et facturation avec 4 cards (Ventes, Achats Prévisionnels/Réels, Règlements)
- **Documents :** Gestion documentaire avec drag & drop et nommage libre

### 2. Modifications DataTable.tsx

**Changements principaux :**
- Remplacement de `CasePage` par `CaseModal`
- Nouveaux états : `selectedDossier`, `isModalOpen`
- Nouvelle fonction `handleCloseModal()`
- Intégration du modal dans le rendu principal

**Avant :**
```typescript
const [showCasePage, setShowCasePage] = useState<string | null>(null)

const handleViewCase = (dossier: string) => {
  setShowCasePage(dossier)
}

// Rendu conditionnel
if (showCasePage) {
  return <CasePage dossier={showCasePage} onBack={handleBackFromCase} />
}
```

**Après :**
```typescript
const [selectedDossier, setSelectedDossier] = useState<string | null>(null)
const [isModalOpen, setIsModalOpen] = useState(false)

const handleViewCase = (dossier: string) => {
  setSelectedDossier(dossier)
  setIsModalOpen(true)
}

// Modal intégré dans le rendu principal
{isModalOpen && selectedDossier && (
  <CaseModal 
    isOpen={isModalOpen} 
    dossier={selectedDossier} 
    onClose={handleCloseModal} 
  />
)}
```

## Types et interfaces

### Types de dossier
```typescript
type DossierType = 'HUM' | 'CARGO'
type CargoMode = 'AÉRIEN' | 'MARITIME' | 'ROUTIER'
```

### Configuration des champs
```typescript
interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'file'
  required?: boolean
  visible?: boolean
  options?: string[]
  defaultValue?: any
  conditional?: {
    dependsOn: string
    showWhen: any[]
  }
}

interface DocumentConfig {
  id: string
  name: string
  fileName: string
  uploadDate: string
  size: number
  type: string
}

interface LigneVente {
  id: string
  designation: string
  montantHT: number
  quantite: number
  prixUnitaire: number
}

interface VentesData {
  lignes: LigneVente[]
  tauxTVA: number
  montantTVA: number
  montantTTC: number
  statutFacturation: 'devis' | 'facture_envoyee' | 'payee'
  dateDevis?: string
  dateFacture?: string
  numeroFacture?: string
}

interface LigneAchat {
  id: string
  categorie: string
  description: string
  montant: number
  fournisseur?: string
  datePrevu?: string
  dateReel?: string
}

interface Reglement {
  id: string
  date: string
  montant: number
  mode: 'virement' | 'cheque' | 'cb' | 'especes' | 'autre'
  reference: string
  statut: 'en_attente' | 'recu' | 'encaisse'
  notes?: string
}
```

## Fonctionnalités UX

### Modal
- **Taille :** Large modal (max-w-5xl) avec hauteur adaptative
- **Responsive :** Plein écran sur mobile
- **Overlay :** Background sombre avec fermeture au clic
- **Fermeture :** ESC key + clic overlay + bouton X
- **Gestion des changements :** Confirmation avant fermeture si modifications non sauvegardées

### Navigation par onglets
- Onglets avec icônes et état actif
- Contenu conditionnel selon le type de dossier
- Sauvegarde automatique des modifications

### Édition
- Mode édition avec boutons Sauvegarder/Annuler
- Champs conditionnels selon le type et mode
- Validation des champs obligatoires

### Gestion des documents
- Zone de drag & drop avec feedback visuel
- Sélection de fichier via bouton
- Modal de nommage libre du document
- Liste des documents uploadés avec métadonnées
- Actions : suppression et téléchargement

### Gestion financière
- **Card Ventes :** Système de lignes multiples avec désignation, calculs automatiques TVA/TTC
- **Cards Achats :** Gestion prévisionnelle et réelle avec comparaison d'écarts
- **Card Règlements :** Tableau éditable avec résumé financier
- **Calculs automatiques :** Totaux, écarts budgétaires, solde restant
- **Badges et indicateurs :** Statuts, modes de paiement, états visuels
- **Corrections UX :** Résolution des problèmes de focus et de saisie dans les champs

## Avantages de la nouvelle architecture

1. **UX améliorée :** Plus besoin de navigation entre pages
2. **Performance :** Chargement plus rapide, pas de re-rendu complet
3. **Flexibilité :** Templates conditionnels extensibles
4. **Maintenabilité :** Code modulaire et réutilisable
5. **Responsive :** Meilleure adaptation mobile

## Utilisation

### Ouverture du modal
```typescript
// Dans DataTable.tsx
<button onClick={() => handleViewCase(dossier)}>
  <FileText className="w-4 h-4" />
</button>
```

### Fermeture du modal
```typescript
// Gestion automatique avec confirmation si modifications
const handleCloseModal = () => {
  if (hasChanges) {
    if (confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) {
      onClose()
    }
  } else {
    onClose()
  }
}
```

## Extensibilité

Le système de templates permet d'ajouter facilement de nouveaux types de dossiers :

```typescript
const getDossierTemplate = (type: DossierType, mode?: CargoMode): DossierTemplate => {
  switch (type) {
    case 'HUM':
      return humTemplate
    case 'CARGO':
      return cargoTemplate
    case 'NEW_TYPE':
      return newTypeTemplate
    default:
      return defaultTemplate
  }
}
```

## Architecture des Cards - Onglet Général

### Composants de base
- **Card :** Conteneur principal avec bordure et ombre
- **CardHeader :** En-tête avec icône, titre et actions optionnelles
- **CardContent :** Contenu principal de la card
- **FormGrid :** Grille responsive pour organiser les champs
- **FormField :** Champ de formulaire avec label et validation

### Composants spécialisés
- **ModeSelector :** Sélecteur de mode pour CARGO (AÉRIEN/MARITIME/ROUTIER)
- **ColisageManager :** Gestionnaire de colis multiples pour CARGO

### Logique conditionnelle
- **Type HUM :** 4 cards verticales avec champs spécifiques aux dépouilles
- **Type CARGO :** 4 cards verticales avec gestion du mode de transport et colisage complexe
- **Champs conditionnels :** Affichage/masquage selon le type et le mode

## Architecture des Cards - Onglet Finances

### Layout en 4 zones
```
┌─────────────────────────────────────────────────────────┐
│  💰 VENTES (card pleine largeur)                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────┬─────────────────────────────────┐
│  📋 ACHATS PRÉVISIONNELS│  📋 ACHATS RÉELS               │
│  (card 50% largeur)     │  (card 50% largeur)            │
└─────────────────────────┴─────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  💳 RÈGLEMENTS (card pleine largeur)                   │
└─────────────────────────────────────────────────────────┘
```

### Card Ventes
- **Lignes de vente multiples :** Système de lignes avec désignation, quantité, prix unitaire
- **Calculs automatiques :** Total HT calculé par ligne (quantité × prix unitaire)
- **Résumé financier :** 3 indicateurs (HT, TVA, TTC) avec calculs automatiques
- **Taux TVA :** Configurable globalement pour toutes les lignes
- **Statut et actions :** Badge de statut + boutons de génération de documents
- **Gestion des lignes :** Ajout/suppression dynamique de lignes de vente

### Cards Achats (layout horizontal)
- **Achats Prévisionnels :** Lignes éditables avec catégories et montants
- **Achats Réels :** Lignes avec fournisseur et date en plus
- **Comparaison :** Calcul automatique de l'écart budgétaire
- **Actions :** Ajout/suppression de lignes dynamique

### Card Règlements
- **Tableau éditable :** Toutes les colonnes modifiables en ligne
- **Modes de paiement :** Sélecteur avec icônes et badges
- **Statuts :** En attente, Reçu, Encaissé avec badges colorés
- **Résumé financier :** Total reçu, montant facture, solde restant

### Composants financiers spécialisés
- **StatutBadge :** Badge coloré pour les statuts de facturation
- **ModePaiementBadge :** Badge avec icône pour les modes de paiement
- **StatutReglementBadge :** Badge pour les statuts de règlement
- **EcartBudgetaire :** Indicateur d'écart avec pourcentage
- **LigneAchatPrevisionnel/Reel :** Composants pour les lignes d'achat

## Gestion des documents

### Fonctionnalités implémentées

#### Upload de documents
- **Drag & drop :** Zone dédiée avec feedback visuel lors du survol
- **Sélection manuelle :** Bouton pour ouvrir le sélecteur de fichiers
- **Formats acceptés :** Tous les types de fichiers
- **Nommage libre :** Modal pour donner un nom personnalisé au document

#### Interface utilisateur
- **Zone de drop :** Bordure en pointillés avec icône et instructions
- **Feedback visuel :** Changement de couleur lors du drag over
- **Modal de nommage :** Interface claire pour nommer le document
- **Liste des documents :** Affichage avec icône, nom, nom de fichier, taille et date

#### Actions disponibles
- **Suppression :** Bouton rouge pour supprimer un document
- **Téléchargement :** Bouton bleu pour télécharger (placeholder)
- **Informations :** Affichage de la taille du fichier et date d'upload

### Workflow utilisateur
1. L'utilisateur glisse-dépose un fichier ou clique sur "Sélectionner un fichier"
2. Un modal s'ouvre pour nommer le document
3. Après validation, le document apparaît dans la liste
4. L'utilisateur peut supprimer ou télécharger le document

## Migration complète

✅ **Terminé :**
- Création de CaseModal.tsx
- Modification de DataTable.tsx
- Système d'onglets fonctionnel
- Templates conditionnels
- Gestion des états et sauvegarde
- **Système de gestion des documents avec drag & drop**
- **Système de gestion financière avec 4 cards et calculs automatiques**

🔄 **À faire (optionnel) :**
- Tests unitaires
- Documentation API
- Optimisations de performance
- Animations de transition
- **Intégration avec Supabase Storage pour le stockage réel des fichiers** 