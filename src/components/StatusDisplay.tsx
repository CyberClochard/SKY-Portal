import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  FileText, 
  CreditCard, 
  Settings, 
  AlertCircle, 
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

interface StatusDisplayProps {
  dossierId: string
  showOverrideButton?: boolean
  onOverrideClick?: () => void
}

interface MasterStatus {
  DOSSIER: string
  FACTURE: string
  REGLEMENT: string
  MANUAL_OVERRIDE: boolean
  mode_gestion: 'Manuel' | 'Automatique'
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({
  dossierId,
  showOverrideButton = false,
  onOverrideClick
}) => {
  const [status, setStatus] = useState<MasterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charger le statut actuel
  const loadStatus = async () => {
    try {
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

      setStatus(data)
    } catch (err) {
      console.error('❌ Erreur dans loadStatus:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les données au montage
  useEffect(() => {
    if (dossierId) {
      loadStatus()
    }
  }, [dossierId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Chargement...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
        <AlertCircle className="w-4 h-4 mr-1" />
        <span>Erreur de chargement</span>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Aucun statut disponible
      </div>
    )
  }

  // Fonctions pour obtenir les icônes et couleurs des statuts
  const getFactureStatus = (statut: string) => {
    switch (statut) {
      case 'facture':
        return { icon: <FileText className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20', label: 'Facturé' }
      case 'famille':
        return { icon: <FileText className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20', label: 'Famille' }
      case 'non facture':
        return { icon: <XCircle className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700', label: 'Non facturé' }
      default:
        return { icon: <Clock className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700', label: statut }
    }
  }

  const getReglementStatus = (statut: string) => {
    switch (statut) {
      case 'paid':
        return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50 dark:bg-green-900/20', label: 'Payé' }
      case 'partial':
        return { icon: <Clock className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20', label: 'Partiel' }
      case 'unpaid':
        return { icon: <XCircle className="w-4 h-4" />, color: 'text-red-600 bg-red-50 dark:bg-red-900/20', label: 'Non payé' }
      default:
        return { icon: <Clock className="w-4 h-4" />, color: 'text-gray-600 bg-gray-50 dark:bg-gray-700', label: statut }
    }
  }

  const factureStatus = getFactureStatus(status.FACTURE)
  const reglementStatus = getReglementStatus(status.REGLEMENT)

  return (
    <div className="flex items-center space-x-3">
      {/* Statut de facturation */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${factureStatus.color}`}>
        {factureStatus.icon}
        <span>{factureStatus.label}</span>
      </div>

      {/* Séparateur */}
      <div className="text-gray-400">•</div>

      {/* Statut de règlement */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${reglementStatus.color}`}>
        {reglementStatus.icon}
        <span>{reglementStatus.label}</span>
      </div>

      {/* Indicateur de mode manuel */}
      {status.MANUAL_OVERRIDE && (
        <>
          <div className="text-gray-400">•</div>
          <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20">
            <Settings className="w-3 h-3" />
            <span>Manuel</span>
          </div>
        </>
      )}

      {/* Bouton d'override si demandé */}
      {showOverrideButton && onOverrideClick && (
        <>
          <div className="text-gray-400">•</div>
          <button
            onClick={onOverrideClick}
            className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <Settings className="w-3 h-3" />
            <span>Override</span>
          </button>
        </>
      )}
    </div>
  )
}

export default StatusDisplay 