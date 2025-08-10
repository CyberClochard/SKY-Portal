-- Créer la table des notes finance
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

CREATE INDEX idx_case_finance_notes_master_id ON case_finance_notes(master_id);

-- Vue enrichie pour l'onglet Facturation
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