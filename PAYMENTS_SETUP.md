# Configuration du Système de Paiements

## Problème actuel

L'erreur "Erreur lors du chargement des factures" indique que les tables du système de paiements ne sont pas créées dans la base de données Supabase.

## Solution

### 1. Accéder à Supabase

1. Allez sur votre instance Supabase : https://supabase.skylogistics.fr
2. Connectez-vous avec vos identifiants
3. Accédez à l'éditeur SQL (SQL Editor)

### 2. Exécuter le script d'initialisation

Copiez et exécutez le contenu du fichier `init-payments-db.sql` dans l'éditeur SQL de Supabase.

Ce script va créer :
- Les tables : `customers`, `invoices`, `payments`, `payment_allocations`
- Les vues : `invoice_summary`, `payment_allocation_details`, `customer_balance_summary`
- Les fonctions : `allocate_payment_automatically`, `update_invoice_status`
- Les triggers pour la mise à jour automatique
- Les index pour les performances
- Les données de test

### 3. Vérifier la configuration

Après avoir exécuté le script, l'application devrait afficher un diagnostic de la base de données qui confirme :
- ✅ Connexion Supabase : OK
- ✅ Tables du système de paiements : OK (4 tables trouvées)
- ✅ Données de test : OK (1 client trouvé)

### 4. Tester l'application

Une fois les tables créées, vous devriez pouvoir :
1. Voir la page des paiements sans erreur
2. Créer un nouveau paiement
3. Allouer manuellement un paiement
4. Voir les montants des factures correctement affichés (plus de "NaN €")

## Structure des tables

### `customers`
- `id` (uuid, PK)
- `name` (text, NOT NULL)
- `email` (text)
- `phone` (text)
- `address` (text)
- `siret` (text)
- `created_at`, `updated_at` (timestamptz)

### `invoices`
- `id` (uuid, PK)
- `customer_id` (uuid, FK vers customers)
- `invoice_number` (text, NOT NULL)
- `amount_total` (decimal(12,2), NOT NULL)
- `amount_paid` (decimal(12,2), NOT NULL, DEFAULT 0)
- `status` (text: 'unpaid', 'partial', 'paid')
- `due_date` (date, NOT NULL)
- `issued_date` (date, NOT NULL)
- `created_at`, `updated_at` (timestamptz)

### `payments`
- `id` (uuid, PK)
- `customer_id` (uuid, FK vers customers)
- `amount` (decimal(12,2), NOT NULL)
- `payment_method` (text: 'transfer', 'check', 'card', 'cash', 'other')
- `status` (text: 'pending', 'completed', 'cancelled')
- `reference` (text)
- `notes` (text)
- `auto_allocate` (boolean, DEFAULT true)
- `created_at`, `updated_at` (timestamptz)

### `payment_allocations`
- `id` (uuid, PK)
- `payment_id` (uuid, FK vers payments)
- `invoice_id` (uuid, FK vers invoices)
- `amount_allocated` (decimal(12,2), NOT NULL)
- `created_at` (timestamptz)

## Fonctionnalités

### Allocation automatique
- Déclenchée quand `auto_allocate = true`
- Utilise la fonction `allocate_payment_automatically(payment_uuid)`
- Alloue selon l'ordre chronologique des factures

### Allocation manuelle
- Permet de répartir manuellement le paiement
- Validation en temps réel
- Option d'allocation automatique du reste

### Triggers automatiques
- Mise à jour automatique de `amount_paid` et `status` des factures
- Validation des contraintes de montant

## Données de test

Le script crée automatiquement :
- 1 client : "Entreprise Test SARL"
- 2 factures impayées : F25-0008 (2500€) et F25-0009 (1800€)
- 1 paiement : 1500€ (non alloué automatiquement)

## Dépannage

### Si l'erreur persiste après l'exécution du script :

1. **Vérifiez les permissions** : Assurez-vous que votre utilisateur Supabase a les droits d'accès aux tables
2. **Vérifiez la connexion** : Testez la connexion dans l'éditeur SQL
3. **Vérifiez les logs** : Regardez la console du navigateur pour les erreurs détaillées
4. **Contactez l'administrateur** : Si le problème persiste, contactez l'équipe technique

### Messages d'erreur courants :

- **"relation does not exist"** : Les tables ne sont pas créées
- **"permission denied"** : Problème de permissions Supabase
- **"connection failed"** : Problème de connexion à Supabase

## Support

Pour toute question ou problème, contactez l'équipe technique avec :
- Le message d'erreur exact
- Les logs de la console du navigateur
- Le résultat du diagnostic de la base de données 