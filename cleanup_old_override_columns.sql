-- =====================================================
-- SCRIPT DE NETTOYAGE - SUPPRESSION DES ANCIENNES COLONNES
-- =====================================================

-- Vérifier si les colonnes existent avant de les supprimer
DO $$
BEGIN
    -- Supprimer la colonne FACTURE_MANUAL_OVERRIDE si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'MASTER' 
        AND column_name = 'FACTURE_MANUAL_OVERRIDE'
    ) THEN
        ALTER TABLE "MASTER" DROP COLUMN "FACTURE_MANUAL_OVERRIDE";
        RAISE NOTICE 'Colonne FACTURE_MANUAL_OVERRIDE supprimee';
    ELSE
        RAISE NOTICE 'Colonne FACTURE_MANUAL_OVERRIDE n''existe pas';
    END IF;

    -- Supprimer la colonne REGLEMENT_MANUAL_OVERRIDE si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'MASTER' 
        AND column_name = 'REGLEMENT_MANUAL_OVERRIDE'
    ) THEN
        ALTER TABLE "MASTER" DROP COLUMN "REGLEMENT_MANUAL_OVERRIDE";
        RAISE NOTICE 'Colonne REGLEMENT_MANUAL_OVERRIDE supprimee';
    ELSE
        RAISE NOTICE 'Colonne REGLEMENT_MANUAL_OVERRIDE n''existe pas';
    END IF;
END $$;

-- Vérifier la structure finale de la table MASTER
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'MASTER' 
AND column_name IN ('DOSSIER', 'FACTURE', 'REGLEMENT', 'MANUAL_OVERRIDE')
ORDER BY ordinal_position; 