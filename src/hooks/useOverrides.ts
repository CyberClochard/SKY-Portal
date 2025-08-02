import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface MasterStatus {
  DOSSIER: string
  FACTURE: string
  REGLEMENT: string
  MANUAL_OVERRIDE: boolean
  mode_gestion: 'Manuel' | 'Automatique'
}

interface UseOverridesReturn {
  // États
  status: MasterStatus | null
  isLoading: boolean
  error: string | null
  
  // Actions
  loadStatus: (dossierId: string) => Promise<void>
  setManualMode: (dossierId: string, reglementStatus: string) => Promise<boolean>
  setAutoMode: (dossierId: string) => Promise<boolean>
  refreshStatus: () => Promise<void>
}

export const useOverrides = (): UseOverridesReturn => {
  const [status, setStatus] = useState<MasterStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charger le statut d'un dossier
  const loadStatus = useCallback(async (dossierId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('master_mode_status')
        .select('*')
        .eq('DOSSIER', dossierId)
        .single()

      if (fetchError) {
        throw new Error(`Erreur lors du chargement: ${fetchError.message}`)
      }

      setStatus(data)
    } catch (err) {
      console.error('❌ Erreur dans loadStatus:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Activer le mode manuel
  const setManualMode = useCallback(async (dossierId: string, reglementStatus: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('set_master_manual_mode', {
        dossier_id: dossierId,
        reglement_statut: reglementStatus
      })

      if (rpcError) {
        throw new Error(`Erreur lors de la mise à jour: ${rpcError.message}`)
      }

      // Recharger le statut
      await loadStatus(dossierId)
      return true
    } catch (err) {
      console.error('❌ Erreur dans setManualMode:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadStatus])

  // Revenir en mode automatique
  const setAutoMode = useCallback(async (dossierId: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('set_master_auto_mode', {
        dossier_id: dossierId
      })

      if (rpcError) {
        throw new Error(`Erreur lors de la suppression: ${rpcError.message}`)
      }

      // Recharger le statut
      await loadStatus(dossierId)
      return true
    } catch (err) {
      console.error('❌ Erreur dans setAutoMode:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [loadStatus])

  // Rafraîchir le statut actuel
  const refreshStatus = useCallback(async () => {
    if (status?.DOSSIER) {
      await loadStatus(status.DOSSIER)
    }
  }, [status?.DOSSIER, loadStatus])

  return {
    status,
    isLoading,
    error,
    loadStatus,
    setManualMode,
    setAutoMode,
    refreshStatus
  }
} 