# Système de Notes Financières - SKY Portal

## Vue d'ensemble

Le système de notes financières permet aux utilisateurs de créer, modifier et supprimer des notes liées aux dossiers financiers. Ce système remplace la carte "Règlements" lorsque le mode manuel est activé dans l'onglet Finances.

## Fonctionnalités

### Mode Manuel vs Mode Automatique
- **Mode Automatique** : Affiche la carte "Règlements" traditionnelle
- **Mode Manuel** : Affiche la carte "Notes" avec gestion des notes financières

### Gestion des Notes
- ✅ Création de nouvelles notes
- ✅ Modification des notes existantes
- ✅ Suppression des notes
- ✅ Affichage chronologique des notes
- ✅ Traçabilité des modifications

## Structure de la Base de Données

### Table `case_finance_notes`
```sql
CREATE TABLE case_finance_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_dossier text NOT NULL,           -- Numéro du dossier
  notes text NOT NULL,                    -- Contenu de la note
  created_at timestamptz DEFAULT now(),   -- Date de création
  created_by text NOT NULL,               -- Utilisateur créateur
  updated_at timestamptz DEFAULT now(),   -- Date de modification
  updated_by text                         -- Utilisateur modificateur
);
```

### Contraintes et Index
- Validation du contenu des notes (non vide)
- Index sur `master_dossier` pour les performances
- Index sur `created_at` pour le tri chronologique
- Index sur `created_by` pour la traçabilité

### Sécurité (RLS)
- Row Level Security activé
- Policies pour les utilisateurs authentifiés
- Accès en lecture, écriture, modification et suppression

## Installation

### Option 1 : Script automatique
```bash
# Configurer les variables d'environnement
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Exécuter le script
node execute_case_finance_notes_migration.js
```

### Option 2 : Exécution manuelle
1. Ouvrir l'éditeur SQL de Supabase
2. Copier le contenu de `create_case_finance_notes_direct.sql`
3. Exécuter le script

## Utilisation

### Interface Utilisateur
1. **Accéder à l'onglet Finances** d'un dossier
2. **Activer le mode manuel** via le contrôle unifié
3. **Utiliser la carte Notes** qui remplace la carte Règlements

### Actions Disponibles
- **Ajouter une note** : Bouton "+ Nouvelle note" en haut à droite
- **Modifier une note** : Icône crayon sur chaque note
- **Supprimer une note** : Icône poubelle sur chaque note

### Format des Notes
- **Champ de saisie** : Zone de texte libre (largeur complète de la carte)
- **Validation** : Les notes vides ne peuvent pas être sauvegardées
- **Limitations** : Aucune limite de caractères imposée

## Composants React

### FinanceNotesCard
- Composant principal pour la gestion des notes
- Gère l'état local et les interactions avec Supabase
- Responsive et accessible

### Intégration dans CaseModal
- Remplacement conditionnel de la carte Règlements
- Communication avec UnifiedOverrideControl
- Gestion de l'état `isManualMode`

## Fonctions Supabase

### `get_current_user_name()`
- Récupère le nom d'utilisateur depuis le JWT
- Fallback sur l'email ou "Système"

### `create_case_finance_note(p_master_dossier, p_notes)`
- Création simplifiée d'une note
- Remplissage automatique de `created_by`

### `update_case_finance_notes_metadata()`
- Trigger automatique pour `updated_at` et `updated_by`
- Exécution avant chaque mise à jour

## Gestion des Erreurs

### Erreurs de Base de Données
- Affichage des messages d'erreur Supabase
- Gestion des timeouts et des erreurs réseau
- Retry automatique pour les opérations critiques

### Validation des Données
- Vérification côté client et serveur
- Messages d'erreur explicites
- Prévention des données invalides

## Performance

### Optimisations
- Index sur les colonnes fréquemment utilisées
- Pagination des notes (si nécessaire)
- Mise en cache des données récentes

### Monitoring
- Logs des opérations CRUD
- Métriques de performance
- Alertes en cas d'erreur

## Tests

### Scénarios de Test
1. **Création de note** : Vérifier l'insertion en base
2. **Modification de note** : Vérifier la mise à jour
3. **Suppression de note** : Vérifier la suppression
4. **Mode manuel/automatique** : Vérifier le basculement
5. **Gestion des erreurs** : Tester les cas d'erreur

### Tests de Performance
- Création de 100+ notes
- Recherche dans les notes
- Affichage de la liste

## Maintenance

### Sauvegarde
- Table incluse dans les sauvegardes automatiques
- Export des données si nécessaire

### Nettoyage
- Suppression des notes orphelines
- Archivage des anciennes notes
- Optimisation des index

## Support

### Problèmes Courants
- **Erreur d'authentification** : Vérifier les policies RLS
- **Erreur de contrainte** : Vérifier la validation des données
- **Performance lente** : Vérifier les index

### Contact
- Développeur : [Votre nom]
- Date de création : [Date]
- Version : 1.0.0 