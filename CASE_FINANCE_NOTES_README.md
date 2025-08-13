# Système de Notes Financières - Page Dossier

## Vue d'ensemble

Cette fonctionnalité permet de remplacer la carte "Règlements" par une carte "Notes" dans l'onglet Finances de la page dossier, lorsque le mode manuel est activé.

## Fonctionnalités

### Mode Automatique (par défaut)
- Affichage de la carte "Règlements" classique
- Gestion des paiements avec montants, modes, références et statuts
- Calcul automatique des soldes

### Mode Manuel
- Remplacement de la carte "Règlements" par la carte "Notes"
- Gestion des notes financières en texte libre
- Traçabilité complète des modifications

## Structure de la Base de Données

### Table `case_finance_notes`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Identifiant unique (clé primaire) |
| `master_dossier` | text | Numéro du dossier (obligatoire) |
| `notes` | text | Contenu de la note (obligatoire) |
| `created_at` | timestamptz | Date/heure de création |
| `created_by` | text | Utilisateur qui a créé la note |
| `updated_at` | timestamptz | Date/heure de dernière modification |
| `updated_by` | text | Utilisateur qui a modifié la note |

### Contraintes
- `valid_notes` : La note ne peut pas être vide
- `valid_master_dossier` : Le numéro de dossier ne peut pas être vide
- `valid_created_by` : L'utilisateur créateur ne peut pas être vide

### Index
- `idx_case_finance_notes_master_dossier` : Performance sur les requêtes par dossier
- `idx_case_finance_notes_created_at` : Performance sur le tri chronologique
- `idx_case_finance_notes_created_by` : Performance sur les requêtes par utilisateur

## Installation

### 1. Créer la table dans Supabase

Exécutez le script SQL `create_case_finance_notes_direct.sql` dans l'éditeur SQL de Supabase.

### 2. Vérifier les composants

Assurez-vous que les composants suivants sont présents :
- `src/components/ui/Card.tsx` - Composants Card réutilisables
- `src/components/FinanceNotesCard.tsx` - Carte des notes financières
- `src/components/CaseModal.tsx` - Modal principal avec logique conditionnelle

## Utilisation

### Activation du Mode Manuel

1. Ouvrir un dossier dans l'onglet Finances
2. Dans le "Contrôle Unifié", sélectionner "Mode Manuel"
3. Choisir le statut de règlement souhaité
4. La carte "Règlements" sera automatiquement remplacée par la carte "Notes"

### Gestion des Notes

#### Créer une Note
1. Cliquer sur le bouton "Nouvelle note" en haut à droite
2. Saisir le texte de la note dans le champ texte libre
3. Cliquer sur "Enregistrer"

#### Modifier une Note
1. Cliquer sur l'icône "Modifier" (crayon) à droite de la note
2. Modifier le texte dans le champ d'édition
3. Cliquer sur "Enregistrer" ou "Annuler"

#### Supprimer une Note
1. Cliquer sur l'icône "Supprimer" (poubelle) à droite de la note
2. Confirmer la suppression

## Sécurité

### Row Level Security (RLS)
- Activé sur la table `case_finance_notes`
- Seuls les utilisateurs authentifiés peuvent accéder aux notes

### Policies
- **SELECT** : Lecture de toutes les notes pour les utilisateurs authentifiés
- **INSERT** : Création de notes pour les utilisateurs authentifiés
- **UPDATE** : Modification de notes pour les utilisateurs authentifiés
- **DELETE** : Suppression de notes pour les utilisateurs authentifiés

### Traçabilité
- `created_by` : Récupéré automatiquement depuis le JWT de l'utilisateur
- `updated_by` : Mis à jour automatiquement lors des modifications
- `created_at` et `updated_at` : Gérés automatiquement par les triggers

## Fonctions SQL

### `get_current_user_name()`
Retourne le nom d'utilisateur actuel depuis le JWT.

### `create_case_finance_note(p_master_dossier, p_notes)`
Crée une nouvelle note avec l'utilisateur actuel automatiquement assigné.

### `update_case_finance_notes_metadata()`
Trigger qui met à jour automatiquement `updated_at` et `updated_by`.

## Interface Utilisateur

### Carte Notes (Mode Manuel)
- **En-tête** : Icône document + titre "Notes" + bouton "Nouvelle note"
- **Formulaire d'ajout** : Champ texte libre large + boutons Enregistrer/Annuler
- **Liste des notes** : Affichage chronologique inverse
- **Actions par note** : Boutons Modifier et Supprimer
- **Métadonnées** : Créateur, date de création, modificateur, date de modification

### Responsive Design
- Adaptation automatique sur mobile et tablette
- Boutons et champs optimisés pour le tactile
- Espacement et tailles adaptés aux différents écrans

## Gestion des Erreurs

### Erreurs de Base de Données
- Affichage des messages d'erreur dans une bannière rouge
- Logs détaillés dans la console pour le débogage
- Gestion gracieuse des échecs de requêtes

### Validation des Données
- Vérification côté client et serveur
- Messages d'erreur explicites
- Prévention de la soumission de données invalides

## Performance

### Optimisations
- Index sur les colonnes fréquemment utilisées
- Requêtes optimisées avec LIMIT et ORDER BY
- Chargement asynchrone des notes
- Mise à jour en temps réel de l'interface

### Monitoring
- Logs de performance dans la console
- Indicateurs de chargement visuels
- Gestion des états de chargement et d'erreur

## Tests

### Scénarios de Test
1. **Mode Automatique** : Vérifier l'affichage de la carte Règlements
2. **Mode Manuel** : Vérifier l'affichage de la carte Notes
3. **Création de note** : Tester l'ajout d'une nouvelle note
4. **Modification de note** : Tester l'édition d'une note existante
5. **Suppression de note** : Tester la suppression avec confirmation
6. **Gestion des erreurs** : Tester les cas d'erreur réseau/base de données

### Données de Test
- Créer plusieurs notes avec différents contenus
- Tester avec des notes longues et courtes
- Vérifier la persistance des données
- Tester la récupération par dossier

## Maintenance

### Nettoyage
- Suppression des notes orphelines (dossiers supprimés)
- Archivage des anciennes notes
- Optimisation des index

### Sauvegarde
- Sauvegarde régulière de la table `case_finance_notes`
- Export des données pour analyse
- Restauration en cas de problème

## Support

### Problèmes Courants
- **Notes non visibles** : Vérifier les permissions RLS
- **Erreurs de création** : Vérifier la connexion Supabase
- **Interface non responsive** : Vérifier les composants Card

### Contact
Pour toute question ou problème, contacter l'équipe technique. 