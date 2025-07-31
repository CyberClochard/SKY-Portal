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

  // Options disponibles pour le mode manuel
  const manualOptions = [
    { value: 'non facturé', label: 'Non facturé' },
    { value: 'facturé', label: 'Facturé' },
    { value: 'famille', label: 'Famille' }
  ]

  // Charger le statut actuel
  const loadStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('master_facturation_status')
        .select('*')
        .eq('DOSSIER', dossierId)
        .single()

      if (fetchError) {
        throw new Error(`Erreur lors du chargement: ${fetchError.message}`)
      }

      setStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  // Définir un override manuel
  const setManualOverride = async (nouvelleValeur: string) => {
    try {
      setIsUpdating(true)
      setError(null)
      setSuccessMessage(null)

      const { data, error: rpcError } = await supabase.rpc('set_master_facture_override', {
        dossier_id: dossierId,
        nouvelle_valeur: nouvelleValeur
      })

      if (rpcError) {
        throw new Error(`Erreur lors de la mise à jour: ${rpcError.message}`)
      }

      setSuccessMessage(`Statut manuel défini: ${nouvelleValeur}`)
      
      // Recharger les données
      await loadStatus()
      
      // Notifier le parent
      onStatusChange?.(nouvelleValeur, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Supprimer l'override (revenir en automatique)
  const removeOverride = async () => {
    try {
      setIsUpdating(true)
      setError(null)
      setSuccessMessage(null)

      const { data, error: rpcError } = await supabase.rpc('remove_master_facture_override', {
        dossier_id: dossierId
      })

      if (rpcError) {
        throw new Error(`Erreur lors de la suppression: ${rpcError.message}`)
      }

      setSuccessMessage('Retour au mode automatique')
      
      // Recharger les données
      await loadStatus()
      
      // Notifier le parent
      onStatusChange?.(status?.valeur_automatique_calculee || 'non facturé', false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Charger les données au montage
  useEffect(() => {
    if (dossierId) {
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
      </div>
    )
  }

  if (!status) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="text-center py-4 text-gray-500">
          Aucune donnée de facturation disponible
        </div>
      </div>
    )
  }

  const isManualMode = status.FACTURE_MANUAL_OVERRIDE

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
        {isManualMode && (
          <div className="flex items-center text-orange-600 dark:text-orange-400">
            <Settings className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">Mode manuel</span>
          </div>
        )}
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