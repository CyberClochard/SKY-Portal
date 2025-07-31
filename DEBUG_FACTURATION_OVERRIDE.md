# Débogage du Composant FacturationStatusOverride

## Problème Signalé

L'utilisateur a signalé :
- "j'ai cette erreur dans la page finances du case modal"
- "je ne vois pas la checkbox 'manuel'"

## Analyse du Problème

### Causes Possibles

1. **Fonctions RPC manquantes** : Les fonctions `set_master_facture_override` et `remove_master_facture_override` n'existent pas dans la base de données
2. **Vue manquante** : La vue `master_facturation_status` n'existe pas
3. **Colonnes manquantes** : Les colonnes `FACTURE` et `FACTURE_MANUAL_OVERRIDE` n'existent pas dans la table `MASTER`
4. **Erreur de rendu** : Le composant ne se rend pas correctement à cause d'une erreur JavaScript
5. **Problème de CSS** : Les éléments sont présents mais invisibles à cause de styles CSS

### Solutions Implémentées

#### 1. Logs de Débogage Détaillés

Des logs détaillés ont été ajoutés pour identifier le problème :

```typescript
console.log('🔍 Chargement du statut pour le dossier:', dossierId)
console.log('✅ Données chargées:', data)
console.log('❌ Erreur dans loadStatus:', err)
```

#### 2. Gestion d'Erreur Robuste

Le composant gère maintenant les erreurs de manière claire :

- Vue inexistante → Affichage d'erreur
- Fonctions RPC inexistantes → Affichage d'erreur
- Aucune donnée pour le dossier → Affichage d'erreur
- Erreurs réseau → Affichage d'erreur claire

## Instructions de Débogage

### 1. Vérifier les Logs de la Console

Ouvrir la console du navigateur (F12) et rechercher :

- `🔍` : Début du chargement
- `✅` : Succès
- `❌` : Erreur
- `🎨` : Rendu du composant

### 2. Vérifier l'État du Composant

Le composant affiche maintenant des indicateurs visuels :

- **Mode manuel** : Icône orange avec "Mode manuel"
- **Erreur** : Message d'erreur rouge avec détails

### 3. Tester les Fonctions Backend

Exécuter le script `test_facturation_override.sql` dans Supabase SQL Editor pour vérifier :

- Existence de la vue `master_facturation_status`
- Existence des fonctions RPC
- Structure de la table `MASTER`

### 4. Vérifier l'Intégration

Le composant est intégré dans `CaseModal.tsx` :

```typescript
<FacturationStatusOverride
  dossierId={dossier}
  onStatusChange={(newStatus, isManual) => {
    console.log('Statut de facturation modifié:', { newStatus, isManual })
  }}
/>
```

## Solutions par Type de Problème

### Si les Fonctions RPC n'existent pas

Créer les fonctions dans Supabase SQL Editor :

```sql
-- Fonction pour définir un override manuel
CREATE OR REPLACE FUNCTION set_master_facture_override(dossier_id text, nouvelle_valeur text)
RETURNS void AS $$
BEGIN
  UPDATE MASTER 
  SET 
    FACTURE = nouvelle_valeur,
    FACTURE_MANUAL_OVERRIDE = true
  WHERE DOSSIER = dossier_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour supprimer l'override
CREATE OR REPLACE FUNCTION remove_master_facture_override(dossier_id text)
RETURNS void AS $$
BEGIN
  UPDATE MASTER 
  SET 
    FACTURE_MANUAL_OVERRIDE = false
  WHERE DOSSIER = dossier_id;
END;
$$ LANGUAGE plpgsql;
```

### Si la Vue n'existe pas

Créer la vue dans Supabase SQL Editor :

```sql
CREATE OR REPLACE VIEW master_facturation_status AS
SELECT 
  DOSSIER,
  COALESCE(FACTURE, 'non facture') as FACTURE,
  COALESCE(FACTURE_MANUAL_OVERRIDE, false) as FACTURE_MANUAL_OVERRIDE,
  CASE 
    WHEN FACTURE_MANUAL_OVERRIDE = true THEN 'Manuel'
    ELSE 'Automatique'
  END as mode_gestion,
  'non facture' as valeur_automatique_calculee
FROM MASTER;
```

### Si les Colonnes n'existent pas

Ajouter les colonnes à la table MASTER :

```sql
-- Ajouter la colonne FACTURE si elle n'existe pas
ALTER TABLE MASTER ADD COLUMN IF NOT EXISTS FACTURE text DEFAULT 'non facture';

-- Ajouter la colonne FACTURE_MANUAL_OVERRIDE si elle n'existe pas
ALTER TABLE MASTER ADD COLUMN IF NOT EXISTS FACTURE_MANUAL_OVERRIDE boolean DEFAULT false;
```

## Test du Composant

### Fonctionnement Normal

Le composant fonctionne avec les vraies données backend :

1. Affiche les boutons radio "Automatique" et "Manuel"
2. Permet de passer en mode manuel
3. Affiche le dropdown avec les options
4. Effectue les vraies mises à jour via RPC
5. Affiche les messages de succès
6. Synchronise avec les autres composants

## Vérification Visuelle

Le composant devrait afficher :

1. **En-tête** : "Statut de Facturation" avec icône Euro
2. **Indicateurs** : "Mode manuel" si applicable
3. **Boutons radio** : "Automatique" et "Manuel" clairement visibles
4. **Dropdown** : Visible uniquement en mode manuel
5. **Bouton de retour** : Icône de rotation pour revenir en automatique
6. **Messages** : Succès en vert, erreurs en rouge

## Prochaines Étapes

1. **Vérifier les logs** dans la console du navigateur
2. **Exécuter le script de test** dans Supabase
3. **Créer les éléments manquants** si nécessaire
4. **Tester le composant** avec les vraies données
5. **Vérifier l'intégration** dans le CaseModal 