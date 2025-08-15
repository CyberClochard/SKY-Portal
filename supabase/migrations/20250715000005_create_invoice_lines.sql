/*
  # Table invoice_lines - Lignes de facturation du card 'ventes'
  
  Cette table stocke les lignes de facturation associées aux dossiers
  dans le card 'ventes' de l'onglet 'finances' du CaseModal.
  
  Structure basée sur l'interface LigneVente du CaseModal :
  - designation: Description de la prestation/service
  - quantite: Quantité de la prestation
  - prixUnitaire: Prix unitaire HT
  - tauxTVA: Taux de TVA applicable
  - montantHT: Montant HT calculé (quantite * prixUnitaire)
  - montantTVA: Montant TVA calculé
  - montantTTC: Montant TTC calculé
*/

-- Table des lignes de facturation
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence vers le dossier (relation avec la table des dossiers)
  dossier_number text NOT NULL,
  
  -- Informations de la ligne
  designation text NOT NULL,
  quantite decimal(10,2) NOT NULL DEFAULT 1,
  prix_unitaire decimal(12,2) NOT NULL DEFAULT 0,
  taux_tva decimal(5,2) NOT NULL DEFAULT 20.00,
  
  -- Montants calculés
  montant_ht decimal(12,2) NOT NULL DEFAULT 0,
  montant_tva decimal(12,2) NOT NULL DEFAULT 0,
  montant_ttc decimal(12,2) NOT NULL DEFAULT 0,
  
  -- Métadonnées
  ordre integer NOT NULL DEFAULT 0, -- Ordre d'affichage des lignes
  notes text, -- Notes additionnelles sur la ligne
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT valid_quantite CHECK (quantite > 0),
  CONSTRAINT valid_prix_unitaire CHECK (prix_unitaire >= 0),
  CONSTRAINT valid_taux_tva CHECK (taux_tva >= 0 AND taux_tva <= 100),
  CONSTRAINT valid_montants CHECK (
    montant_ht >= 0 AND 
    montant_tva >= 0 AND 
    montant_ttc >= 0 AND
    montant_ttc = montant_ht + montant_tva
  )
);

-- Table des en-têtes de facturation (optionnelle, pour gérer les métadonnées globales)
CREATE TABLE IF NOT EXISTS invoice_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence vers le dossier
  dossier_number text NOT NULL UNIQUE,
  
  -- Informations de facturation
  statut_facturation text NOT NULL DEFAULT 'devis' CHECK (
    statut_facturation IN ('devis', 'facture_envoyee', 'payee')
  ),
  
  -- Dates importantes
  date_devis date,
  date_facture date,
  numero_facture text,
  
  -- Informations client
  client_name text,
  client_email text,
  client_phone text,
  client_address text,
  
  -- Conditions de paiement
  conditions_paiement text DEFAULT '30 jours',
  echeance_paiement date,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_invoice_lines_dossier_number ON invoice_lines(dossier_number);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_ordre ON invoice_lines(dossier_number, ordre);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_dossier_number ON invoice_headers(dossier_number);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_invoice_lines_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_lines_updated_at
  BEFORE UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_lines_updated_at();

CREATE TRIGGER update_invoice_headers_updated_at
  BEFORE UPDATE ON invoice_headers
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_lines_updated_at();

-- Fonction pour calculer automatiquement les montants d'une ligne
CREATE OR REPLACE FUNCTION calculate_invoice_line_amounts()
RETURNS trigger AS $$
BEGIN
  -- Calculer le montant HT
  NEW.montant_ht = NEW.quantite * NEW.prix_unitaire;
  
  -- Calculer le montant TVA
  NEW.montant_tva = NEW.montant_ht * (NEW.taux_tva / 100);
  
  -- Calculer le montant TTC
  NEW.montant_ttc = NEW.montant_ht + NEW.montant_tva;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les montants
CREATE TRIGGER calculate_invoice_line_amounts_trigger
  BEFORE INSERT OR UPDATE ON invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_line_amounts();

-- Vue pour récupérer les lignes avec calculs automatiques
CREATE OR REPLACE VIEW invoice_lines_summary AS
SELECT 
  il.*,
  ih.statut_facturation,
  ih.date_devis,
  ih.date_facture,
  ih.numero_facture,
  ih.client_name,
  ih.client_email,
  ih.client_phone,
  ih.client_address,
  ih.conditions_paiement,
  ih.echeance_paiement
FROM invoice_lines il
LEFT JOIN invoice_headers ih ON il.dossier_number = ih.dossier_number
ORDER BY il.dossier_number, il.ordre;

-- Vue pour les totaux par dossier
CREATE OR REPLACE VIEW invoice_totals_by_dossier AS
SELECT 
  dossier_number,
  COUNT(*) as nombre_lignes,
  SUM(montant_ht) as total_ht,
  SUM(montant_tva) as total_tva,
  SUM(montant_ttc) as total_ttc,
  MAX(updated_at) as derniere_modification
FROM invoice_lines
GROUP BY dossier_number;

-- Données de test (optionnel)
-- INSERT INTO invoice_headers (dossier_number, client_name, statut_facturation) VALUES
--   ('TEST-001', 'Client Test SARL', 'devis');

-- INSERT INTO invoice_lines (dossier_number, designation, quantite, prix_unitaire, taux_tva, ordre) VALUES
--   ('TEST-001', 'Transport aérien', 1, 1500.00, 20.00, 1),
--   ('TEST-001', 'Frais de dossier', 1, 150.00, 20.00, 2),
--   ('TEST-001', 'Assurance', 1, 75.00, 20.00, 3);
