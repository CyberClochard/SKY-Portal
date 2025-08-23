# 🧾 Système de Création de Factures avec n8n

## 📋 Vue d'ensemble

Le système de création de factures permet de générer des factures PDF via le workflow n8n en envoyant les données de facturation à un webhook dédié.

## 🔗 Configuration n8n

### Webhook URL
```
https://n8n.skylogistics.fr/webhook-test/490100a6-95d3-49ef-94a6-c897856cf9c9
```

### Format des données envoyées
```json
{
  "master_id": "uuid-du-dossier",
  "dossier_number": "AE25/0934",
  "client_name": "Nom du client",
  "invoice_lines": [
    {
      "description": "Transport aérien",
      "quantity": 1,
      "unit_price": 1500.00,
      "total_price": 1500.00
    }
  ],
  "total_amount": 1500.00,
  "created_at": "2025-01-15T10:30:00.000Z",
  "source": "SkyLogistics WebApp"
}
```

## 🚀 Utilisation

### 1. Depuis la page Facturation
- Cliquez sur le bouton **"Créer Facture"** (vert)
- Sélectionnez un dossier dans la liste
- Ajoutez/modifiez les lignes de facturation
- Cliquez sur **"Créer la facture"**

### 2. Depuis le CaseModal (onglet Finances)
- Dans le card "Ventes - Lignes de facturation"
- Ajoutez des lignes avec le bouton **"+ Ajouter"**
- Cliquez sur **"Créer Facture"** pour envoyer au webhook n8n

## 🛠️ Composants impliqués

### `CreateInvoiceModal.tsx`
- Modal dédié à la création de factures
- Sélection de dossier depuis la table MASTER
- Interface de saisie des lignes de facturation
- Envoi direct au webhook n8n

### `InvoiceLinesManager.tsx`
- Gestion des lignes de facturation dans le CaseModal
- Bouton "Créer Facture" intégré
- Envoi des données existantes au webhook n8n

### `FacturationPage.tsx`
- Bouton "Créer Facture" dans l'en-tête
- Ouverture du modal de création

## 🔧 Fonctions techniques

### `sendInvoiceDataToWebhook()`
```typescript
export const sendInvoiceDataToWebhook = async (
  invoiceData: InvoiceDataForWebhook
): Promise<{ success: boolean; message: string; response?: any }>
```

**Localisation** : `src/lib/supabase.ts`

**Fonctionnalités** :
- Envoi des données au webhook n8n
- Gestion des erreurs HTTP
- Parsing de la réponse
- Logs détaillés pour le debugging

## 📊 Structure des données

### Interface `InvoiceDataForWebhook`
```typescript
interface InvoiceDataForWebhook {
  master_id: string           // UUID du dossier
  dossier_number: string      // Numéro de dossier (ex: AE25/0934)
  client_name?: string        // Nom du client
  invoice_lines: {            // Lignes de facturation
    description: string       // Description de la prestation
    quantity: number          // Quantité
    unit_price: number        // Prix unitaire
    total_price: number       // Total de la ligne
  }[]
  total_amount: number        // Montant total de la facture
  created_at: string          // Timestamp de création
  source: string              // Source de la création
}
```

## 🔍 Workflow n8n attendu

Le webhook n8n doit être configuré pour :

1. **Recevoir** les données JSON de facturation
2. **Valider** la structure des données
3. **Générer** le PDF de facture
4. **Retourner** une confirmation de succès

### Réponse attendue
```json
{
  "success": true,
  "message": "Facture créée avec succès",
  "invoice_id": "FACT-2025-001",
  "pdf_url": "https://.../facture.pdf"
}
```

## 🚨 Gestion des erreurs

### Erreurs courantes
- **Webhook inaccessible** : Vérifier l'URL et la connectivité
- **Données invalides** : Vérifier la structure JSON
- **Timeout** : Augmenter le délai d'attente si nécessaire

### Logs de debugging
- Console du navigateur : Logs détaillés de l'envoi
- Console n8n : Réception et traitement des données
- Réponse HTTP : Statut et contenu de la réponse

## 🔄 Flux de travail

```
1. Utilisateur saisit les lignes de facturation
2. Validation des données côté client
3. Préparation du payload pour n8n
4. Envoi au webhook via fetch()
5. Traitement par le workflow n8n
6. Génération du PDF
7. Retour de confirmation
8. Affichage du message de succès
```

## 📝 Notes d'implémentation

### Sécurité
- Le webhook est en mode test (`/webhook-test/`)
- Aucune authentification requise actuellement
- Validation des données côté serveur n8n recommandée

### Performance
- Envoi asynchrone des données
- Pas de blocage de l'interface utilisateur
- Gestion des timeouts et retry si nécessaire

### Évolutions futures
- Authentification du webhook
- Historique des factures créées
- Templates de factures personnalisables
- Intégration avec la comptabilité
