/*
  # Création directe de la table case_finance_notes
  Exécutez ce script dans l'éditeur SQL de Supabase
*/

-- Table des notes financières
CREATE TABLE IF NOT EXISTS case_finance_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_dossier text NOT NULL,
  notes text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text,
  
  CONSTRAINT valid_notes CHECK (length(trim(notes)) > 0),
  CONSTRAINT valid_master_dossier CHECK (length(trim(master_dossier)) > 0),
  CONSTRAINT valid_created_by CHECK (length(trim(created_by)) > 0)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_case_finance_notes_master_dossier ON case_finance_notes(master_dossier);
CREATE INDEX IF NOT EXISTS idx_case_finance_notes_created_at ON case_finance_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_case_finance_notes_created_by ON case_finance_notes(created_by);

-- Enable Row Level Security
ALTER TABLE case_finance_notes ENABLE ROW LEVEL SECURITY;

-- Policies pour les utilisateurs authentifiés
CREATE POLICY "Users can view all case finance notes" ON case_finance_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert case finance notes" ON case_finance_notes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update case finance notes" ON case_finance_notes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete case finance notes" ON case_finance_notes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Fonction pour mettre à jour automatiquement updated_at et updated_by
CREATE OR REPLACE FUNCTION update_case_finance_notes_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = COALESCE(auth.jwt() ->> 'user_name', auth.jwt() ->> 'email', 'Système');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour la mise à jour automatique
CREATE TRIGGER update_case_finance_notes_metadata_trigger
  BEFORE UPDATE ON case_finance_notes
  FOR EACH ROW EXECUTE FUNCTION update_case_finance_notes_metadata();

-- Fonction pour récupérer le nom d'utilisateur actuel
CREATE OR REPLACE FUNCTION get_current_user_name()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(auth.jwt() ->> 'user_name', auth.jwt() ->> 'email', 'Système');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer une note avec le nom d'utilisateur automatique
CREATE OR REPLACE FUNCTION create_case_finance_note(
  p_master_dossier text,
  p_notes text
)
RETURNS uuid AS $$
DECLARE
  v_note_id uuid;
BEGIN
  INSERT INTO case_finance_notes (master_dossier, notes, created_by)
  VALUES (p_master_dossier, p_notes, get_current_user_name())
  RETURNING id INTO v_note_id;
  
  RETURN v_note_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Vérification de la création
SELECT 'Table case_finance_notes créée avec succès!' as status; 