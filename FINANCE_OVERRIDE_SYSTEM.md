# 🎯 Système de Notes Finance Override

## 📋 Vue d'ensemble

Le système de notes finance override permet aux utilisateurs d'ajouter des notes persistantes et un mode override manuel pour chaque dossier finance dans l'onglet Facturation.

## 🗄️ Structure de la base de données

### Table `case_finance_notes`
```sql
CREATE TABLE case_finance_notes (
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

### Vue `case_finance_summary`
```sql
CREATE OR REPLACE VIEW case_finance_summary AS
SELECT 
  m.id as master_id,
  m."DOSSIER" as dossier,
  m."CLIENT" as client_id,
  m."NETPAYABLE" as net_payable,
  m."LTA" as lta,
  m."STATUS" as status,
  m."DATE" as date_operation,
  c.name as client_name,
  cfn.override_mode,
  cfn.notes,
  cfn.updated_at as notes_last_updated
FROM "MASTER" m
LEFT JOIN customers c ON m."CLIENT" = c.id  
LEFT JOIN case_finance_notes cfn ON m.id = cfn.master_id
ORDER BY m."DATE" DESC;
```

## 🚀 Installation

### 1. Exécuter le SQL dans Supabase
Copiez et exécutez le contenu du fichier `create_finance_notes_system.sql` dans l'interface SQL de Supabase.

### 2. Redémarrer l'application
Le composant `FacturationPage.tsx` a été modifié pour utiliser le nouveau système.

## ✨ Fonctionnalités

### Toggle "Mode Override Manuel"
- **Activation** : Cliquez sur le toggle pour activer le mode override
- **Désactivation** : Cliquez à nouveau pour désactiver
- **Persistance** : L'état est automatiquement sauvegardé en base

### Champ de Notes
- **Apparition** : Le champ de notes apparaît uniquement quand le mode override est activé
- **Sauvegarde automatique** : Les notes sont sauvegardées automatiquement après 1 seconde d'inactivité
- **Feedback visuel** : Indicateur de sauvegarde avec spinner

### Interface Utilisateur
- **Design moderne** : Interface claire avec cartes pour chaque dossier
- **Responsive** : S'adapte aux différentes tailles d'écran
- **Thème sombre** : Support complet du thème sombre
- **Accessibilité** : Labels appropriés et états désactivés

## 🔧 Utilisation

### 1. Accéder à l'onglet Facturation
Naviguez vers l'onglet "Facturation" dans l'application.

### 2. Activer le mode override
Pour un dossier spécifique :
1. Localisez le dossier dans la liste
2. Cliquez sur le toggle "Override manuel" (à droite du montant)
3. Le toggle devient bleu et le champ de notes apparaît

### 3. Ajouter des notes
1. Tapez vos notes dans le champ de texte
2. Les notes sont automatiquement sauvegardées après 1 seconde
3. Un indicateur "Sauvegarde..." confirme l'opération

### 4. Désactiver le mode override
1. Cliquez à nouveau sur le toggle
2. Le champ de notes disparaît
3. Les notes sont conservées en base

## 📱 Interface

### Éléments visuels
- **Header** : Titre du dossier et nom du client
- **Montant** : Affichage du montant net payable
- **Toggle** : Switch pour activer/désactiver le mode override
- **Notes** : Zone de texte avec fond jaune (mode override)
- **Informations** : LTA, statut, date de dernière note

### États visuels
- **Mode normal** : Toggle gris, pas de champ de notes
- **Mode override** : Toggle bleu, champ de notes visible
- **Sauvegarde** : Spinner et texte "Sauvegarde..."
- **Erreur** : Message d'erreur en rouge

## 🔍 Recherche et Filtres

### Recherche
- Recherche par nom de client
- Recherche par numéro de dossier
- Recherche en temps réel

### Filtres
- **Statut** : En attente, Terminé, Annulé
- **Client** : Liste des clients disponibles
- **Période** : Aujourd'hui, Hier, Cette semaine, Ce mois

## 🛠️ Développement

### Composant modifié
- `src/components/FacturationPage.tsx`

### Nouvelles interfaces
```typescript
interface FinanceCase {
  master_id: string
  dossier: string
  client_name: string
  net_payable: number
  lta: string
  status: string
  override_mode: boolean
  notes: string | null
  notes_last_updated?: string
}
```

### Nouvelles fonctions
- `loadFinanceCases()` : Charge les données depuis `case_finance_summary`
- `saveFinanceNotes()` : Sauvegarde les notes en base
- `handleOverrideModeChange()` : Gère le changement de mode override
- `handleNotesChange()` : Gère la modification des notes avec debounce

### Dépendances
- `useAuth` : Pour récupérer l'utilisateur connecté
- `useCallback` : Pour optimiser les fonctions
- `useState` : Pour la gestion des états locaux

## 🚨 Dépannage

### Erreur "case_finance_summary n'existe pas"
- Vérifiez que le SQL a été exécuté dans Supabase
- Vérifiez que la vue `case_finance_summary` existe

### Erreur "case_finance_notes n'existe pas"
- Vérifiez que la table `case_finance_notes` a été créée
- Vérifiez les permissions Supabase

### Les notes ne se sauvegardent pas
- Vérifiez la console du navigateur pour les erreurs
- Vérifiez que l'utilisateur est connecté
- Vérifiez les permissions de la table

## 🔮 Améliorations futures

### Fonctionnalités suggérées
- **Historique des notes** : Voir toutes les modifications
- **Notifications** : Alertes pour les dossiers en mode override
- **Export** : Export des notes en CSV/PDF
- **Collaboration** : Notes partagées entre utilisateurs
- **Templates** : Modèles de notes prédéfinis

### Optimisations techniques
- **Cache local** : Mise en cache des données
- **Synchronisation** : Mise à jour en temps réel
- **Validation** : Validation des notes avant sauvegarde
- **Backup** : Sauvegarde automatique des notes

## 📞 Support

Pour toute question ou problème :
1. Vérifiez la console du navigateur (F12)
2. Vérifiez les logs Supabase
3. Consultez ce document
4. Contactez l'équipe de développement

---

**Version** : 1.0.0  
**Date** : Décembre 2024  
**Auteur** : Équipe SKY-Portal 