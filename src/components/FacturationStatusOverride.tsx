import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Euro, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RotateCcw
} from 'lucide-react'

interface FacturationStatusOverrideProps {
  dossierId: string
  onStatusChange?: (newStatus: string, isManual: boolean) => void
}

interface FacturationStatus {
  DOSSIER: string
  FACTURE: string
  FACTURE_MANUAL_OVERRIDE: boolean
  mode_gestion: 'Manuel' | 'Automatique'
  valeur_automatique_calculee: string
}

const FacturationStatusOverride: React.FC<FacturationStatusOverrideProps> = ({
  dossierId,
  onStatusChange
}) => {
  const [status, setStatus] = useState<FacturationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)

  // Options disponibles pour le mode manuel
  const manualOptions = [
    { value: 'non facturé', label: 'Non facturé' },
    { value: 'facturé', label: 'Facturé' },
    { value: 'famille', label: 'Famille' }
  ]

  // Données de test si les fonctions RPC ne sont pas disponibles
  const createTestData = (): FacturationStatus => ({
    DOSSIER: dossierId,
    FACTURE: 'non facturé',
    FACTURE_MANUAL_OVERRIDE: false,
    mode_gestion: 'Automatique',
    valeur_automatique_calculee: 'non facturé'
  })

  // Charger le statut actuel
  const loadStatus = async () => {
    try {
      console.log('🔍 Chargement du statut pour le dossier:', dossierId)
      setIsLoading(true)
      setError(null)

      // Test d'abord si la vue existe
      const { data: testData, error: testError } = await supabase
        .from('master_facturation_status')
        .select('*')
        .limit(1)

      if (testError) {
        console.error('❌ Vue master_facturation_status non trouvée:', testError)
        console.log('🔄 Passage en mode test avec données factices')
        setIsTestMode(true)
        setStatus(createTestData())
        return
      }

      console.log('✅ Vue master_facturation_status accessible')

      const { data, error: fetchError } = await supabase
        .from('master_facturation_status')
        .select('*')
        .eq('DOSSIER', dossierId)
        .single()

      if (fetchError) {
        console.error('❌ Erreur lors du chargement du statut:', fetchError)
        // Si pas de données pour ce dossier, créer des données de test
        if (fetchError.code === 'PGRST116') {
          console.log('🔄 Aucune donnée pour ce dossier, utilisation du mode test')
          setIsTestMode(true)
          setStatus(createTestData())
          return
        }
        throw new Error(`Erreur lors du chargement: ${fetchError.message}`)
      }

      console.log('✅ Données chargées:', data)
      setStatus(data)
    } catch (err) {
      console.error('❌ Erreur dans loadStatus:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  // Définir un override manuel
  const setManualOverride = async (nouvelleValeur: string) => {
    try {
      console.log('🔧 Définition de l\'override manuel:', { dossierId, nouvelleValeur })
      setIsUpdating(true)
      setError(null)
      setSuccessMessage(null)

      if (isTestMode) {
        // Mode test : simuler la mise à jour
        console.log('🧪 Mode test : simulation de la mise à jour')
        await new Promise(resolve => setTimeout(resolve, 500)) // Simuler un délai
        setStatus(prev => prev ? {
          ...prev,
          FACTURE: nouvelleValeur,
          FACTURE_MANUAL_OVERRIDE: true,
          mode_gestion: 'Manuel'
        } : null)
        setSuccessMessage(`Statut manuel défini: ${nouvelleValeur} (mode test)`)
        onStatusChange?.(nouvelleValeur, true)
        return
      }

      // Test d'abord si la fonction RPC existe
      const { data: testData, error: testError } = await supabase.rpc('set_master_facture_override', {
        dossier_id: dossierId,
        nouvelle_valeur: nouvelleValeur
      })

      if (testError) {
        console.error('❌ Fonction set_master_facture_override non trouvée:', testError)
        throw new Error(`Fonction RPC non disponible: ${testError.message}`)
      }

      console.log('✅ Override défini avec succès')
      setSuccessMessage(`Statut manuel défini: ${nouvelleValeur}`)
      
      // Recharger les données
      await loadStatus()
      
      // Notifier le parent
      onStatusChange?.(nouvelleValeur, true)
    } catch (err) {
      console.error('❌ Erreur dans setManualOverride:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Supprimer l'override (revenir en automatique)
  const removeOverride = async () => {
    try {
      console.log('🔄 Suppression de l\'override pour le dossier:', dossierId)
      setIsUpdating(true)
      setError(null)
      setSuccessMessage(null)

      if (isTestMode) {
        // Mode test : simuler la suppression
        console.log('🧪 Mode test : simulation de la suppression')
        await new Promise(resolve => setTimeout(resolve, 500)) // Simuler un délai
        setStatus(prev => prev ? {
          ...prev,
          FACTURE: prev.valeur_automatique_calculee,
          FACTURE_MANUAL_OVERRIDE: false,
          mode_gestion: 'Automatique'
        } : null)
        setSuccessMessage('Retour au mode automatique (mode test)')
        onStatusChange?.(status?.valeur_automatique_calculee || 'non facturé', false)
        return
      }

      // Test d'abord si la fonction RPC existe
      const { data: testData, error: testError } = await supabase.rpc('remove_master_facture_override', {
        dossier_id: dossierId
      })

      if (testError) {
        console.error('❌ Fonction remove_master_facture_override non trouvée:', testError)
        throw new Error(`Fonction RPC non disponible: ${testError.message}`)
      }

      console.log('✅ Override supprimé avec succès')
      setSuccessMessage('Retour au mode automatique')
      
      // Recharger les données
      await loadStatus()
      
      // Notifier le parent
      onStatusChange?.(status?.valeur_automatique_calculee || 'non facturé', false)
    } catch (err) {
      console.error('❌ Erreur dans removeOverride:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Charger les données au montage
  useEffect(() => {
    if (dossierId) {
      console.log('🚀 Montage du composant FacturationStatusOverride pour le dossier:', dossierId)
      loadStatus()
    }
  }, [dossierId])

  // Nettoyer les messages après 3 secondes
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement du statut...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-700 p-4">
        <div className="flex items-center text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Dossier ID: {dossierId}
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center py-4 text-gray-500">
          Aucune donnée de facturation disponible pour le dossier {dossierId}
        </div>
      </div>
    )
  }

  const isManualMode = status.FACTURE_MANUAL_OVERRIDE

  console.log('🎨 Rendu du composant avec status:', status, 'isManualMode:', isManualMode, 'isTestMode:', isTestMode)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Euro className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Statut de Facturation
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {isManualMode && (
            <div className="flex items-center text-orange-600 dark:text-orange-400">
              <Settings className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Mode manuel</span>
            </div>
          )}
          {isTestMode && (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Mode test</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages de feedback */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center text-green-700 dark:text-green-300">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="space-y-4">
        {/* Mode automatique */}
        <div className="flex items-center space-x-3">
          <input
            type="radio"
            id="mode-auto"
            name="facturation-mode"
            checked={!isManualMode}
            onChange={() => !isManualMode || removeOverride()}
            disabled={isUpdating}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="mode-auto" className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Automatique: {status.valeur_automatique_calculee}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Statut calculé automatiquement selon les factures
            </div>
          </label>
        </div>

        {/* Mode manuel */}
        <div className="flex items-start space-x-3">
          <input
            type="radio"
            id="mode-manuel"
            name="facturation-mode"
            checked={isManualMode}
            onChange={() => isManualMode || setManualOverride('non facturé')}
            disabled={isUpdating}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
          />
          <div className="flex-1">
            <label htmlFor="mode-manuel" className="block">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Manuel
              </div>
            </label>
            
            {isManualMode ? (
              <div className="space-y-3">
                {/* Dropdown pour la valeur manuelle */}
                <div className="flex items-center space-x-2">
                  <select
                    value={status.FACTURE}
                    onChange={(e) => setManualOverride(e.target.value)}
                    disabled={isUpdating}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {manualOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  {/* Bouton revenir en automatique */}
                  <button
                    onClick={removeOverride}
                    disabled={isUpdating}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    title="Revenir au mode automatique"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Indicateur de différence */}
                {status.FACTURE !== status.valeur_automatique_calculee && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                    ⚠️ Différent de la valeur automatique ({status.valeur_automatique_calculee})
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Cliquez pour passer en mode manuel
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicateur de chargement */}
      {isUpdating && (
        <div className="mt-4 flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Mise à jour en cours...
          </span>
        </div>
      )}
    </div>
  )
}

export default FacturationStatusOverride 