import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Euro, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RotateCcw,
  CreditCard,
  FileText
} from 'lucide-react'

interface UnifiedOverrideControlProps {
  dossierId: string
  onStatusChange?: (newFactureStatus: string, newReglementStatus: string, isManual: boolean) => void
  onInitialStatus?: (factureStatus: string, reglementStatus: string, isManual: boolean) => void
}

interface MasterStatus {
  DOSSIER: string
  FACTURE: string
  REGLEMENT: string
  MANUAL_OVERRIDE: boolean
  mode_gestion: 'Manuel' | 'Automatique'
}

const UnifiedOverrideControl: React.FC<UnifiedOverrideControlProps> = ({
  dossierId,
  onStatusChange,
  onInitialStatus
}) => {
  const [status, setStatus] = useState<MasterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedReglementStatus, setSelectedReglementStatus] = useState<string>('paid')

  // Options disponibles pour le règlement en mode manuel
  const reglementOptions = [
    { value: 'unpaid', label: 'Non payé', color: 'text-red-600 bg-red-50' },
    { value: 'partial', label: 'Partiellement payé', color: 'text-orange-600 bg-orange-50' },
    { value: 'paid', label: 'Entièrement payé', color: 'text-green-600 bg-green-50' }
  ]

  // Charger le statut actuel
  const loadStatus = async () => {
    try {
      console.log('🔍 Chargement du statut pour le dossier:', dossierId)
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('master_mode_status')
        .select('*')
        .eq('DOSSIER', dossierId)
        .single()

      if (fetchError) {
        console.error('❌ Erreur lors du chargement du statut:', fetchError)
        throw new Error(`Erreur lors du chargement: ${fetchError.message}`)
      }

      console.log('✅ Données chargées:', data)
      setStatus(data)
      setSelectedReglementStatus(data.REGLEMENT)
      
      // Communiquer le statut initial au composant parent
      onInitialStatus?.(data.FACTURE, data.REGLEMENT, data.MANUAL_OVERRIDE)
    } catch (err) {
      console.error('❌ Erreur dans loadStatus:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  // Activer le mode manuel
  const setManualMode = async (reglementStatus: string) => {
    try {
      console.log('🔧 Activation du mode manuel:', { dossierId, reglementStatus })
      setIsUpdating(true)
      setError(null)
      setSuccessMessage(null)

      const { data, error: rpcError } = await supabase.rpc('set_master_manual_mode', {
        dossier_id: dossierId,
        reglement_statut: reglementStatus
      })

      if (rpcError) {
        console.error('❌ Erreur lors de la mise à jour:', rpcError)
        throw new Error(`Erreur lors de la mise à jour: ${rpcError.message}`)
      }

      console.log('✅ Mode manuel activé avec succès')
      setSuccessMessage(`Mode manuel activé (Facture: Famille, Règlement: ${reglementStatus})`)
      
      // Recharger les données
      await loadStatus()
      
      // Notifier le parent
      onStatusChange?.('famille', reglementStatus, true)
    } catch (err) {
      console.error('❌ Erreur dans setManualMode:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Revenir en mode automatique
  const setAutoMode = async () => {
    try {
      console.log('🔄 Retour au mode automatique pour le dossier:', dossierId)
      setIsUpdating(true)
      setError(null)
      setSuccessMessage(null)

      const { data, error: rpcError } = await supabase.rpc('set_master_auto_mode', {
        dossier_id: dossierId
      })

      if (rpcError) {
        console.error('❌ Erreur lors de la suppression:', rpcError)
        throw new Error(`Erreur lors de la suppression: ${rpcError.message}`)
      }

      console.log('✅ Mode automatique activé avec succès')
      setSuccessMessage('Retour au mode automatique')
      
      // Recharger les données
      await loadStatus()
      
      // Notifier le parent
      onStatusChange?.(status?.FACTURE || 'non facture', status?.REGLEMENT || 'unpaid', false)
    } catch (err) {
      console.error('❌ Erreur dans setAutoMode:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Charger les données au montage
  useEffect(() => {
    if (dossierId) {
      console.log('🚀 Montage du composant UnifiedOverrideControl pour le dossier:', dossierId)
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
          Aucune donnée disponible pour le dossier {dossierId}
        </div>
      </div>
    )
  }

  const isManualMode = status.MANUAL_OVERRIDE

  console.log('🎨 Rendu du composant avec status:', status, 'isManualMode:', isManualMode)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Settings className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contrôle Unifié
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
            name="override-mode"
            checked={!isManualMode}
            onChange={() => !isManualMode || setAutoMode()}
            disabled={isUpdating}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="mode-auto" className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              Mode Automatique
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <FileText className="w-3 h-3" />
                <span>Facture: {status.FACTURE}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CreditCard className="w-3 h-3" />
                <span>Règlement: {status.REGLEMENT}</span>
              </div>
            </div>
          </label>
        </div>

        {/* Mode manuel */}
        <div className="flex items-start space-x-3">
          <input
            type="radio"
            id="mode-manuel"
            name="override-mode"
            checked={isManualMode}
            onChange={() => isManualMode || setManualMode(selectedReglementStatus)}
            disabled={isUpdating}
            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-1"
          />
          <div className="flex-1">
            <label htmlFor="mode-manuel" className="block">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Mode Manuel
              </div>
            </label>
            
            {isManualMode ? (
              <div className="space-y-3">
                {/* Affichage du statut facture en mode manuel */}
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-gray-900 dark:text-white text-sm">
                    Famille
                  </div>
                </div>

                {/* Sélection du statut de règlement */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Statut de règlement:</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {reglementOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setManualMode(option.value)}
                        disabled={isUpdating}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                          status.REGLEMENT === option.value
                            ? `${option.color} border-current`
                            : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Bouton revenir en automatique */}
                <div className="flex justify-end">
                  <button
                    onClick={setAutoMode}
                    disabled={isUpdating}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    title="Revenir au mode automatique"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Mode automatique
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Cliquez pour passer en mode manuel
                </div>
                
                {/* Prévisualisation du mode manuel */}
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-3 h-3" />
                    <span>Facture sera: Famille</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-3 h-3" />
                    <span>Règlement sera: {selectedReglementStatus}</span>
                  </div>
                </div>

                {/* Sélecteur de règlement pour prévisualisation */}
                <div className="grid grid-cols-3 gap-2">
                  {reglementOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedReglementStatus(option.value)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedReglementStatus === option.value
                          ? `${option.color} border-current`
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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

export default UnifiedOverrideControl 