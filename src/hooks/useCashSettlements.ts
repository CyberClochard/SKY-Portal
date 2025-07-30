import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CashSettlement, CashSettlementDetail, CashSettlementFormData } from '../types/payments'

export const useCashSettlements = () => {
  const [cashSettlements, setCashSettlements] = useState<CashSettlementDetail[]>([])
  const [loading, setLoading] = useState(false)

  const addCashSettlement = async (settlementData: CashSettlementFormData) => {
    setLoading(true)
    
    const { data, error } = await supabase
      .rpc('add_cash_settlement', {
        p_master_id: settlementData.master_id,
        p_customer_id: settlementData.customer_id,
        p_amount: settlementData.amount,
        p_notes: settlementData.notes,
        p_created_by: settlementData.created_by || 'current_user'
      })
    
    setLoading(false)
    
    if (error) {
      console.error('Erreur lors de l\'ajout du règlement espèces:', error)
      return { success: false, error }
    }
    
    // Rafraîchir la liste après ajout
    await fetchCashSettlements()
    
    return { success: true, data }
  }

  const deleteCashSettlement = async (settlementId: string) => {
    setLoading(true)
    
    const { data, error } = await supabase
      .rpc('delete_cash_settlement', {
        p_settlement_id: settlementId
      })
    
    setLoading(false)
    
    if (error) {
      console.error('Erreur lors de la suppression du règlement espèces:', error)
      return { success: false, error }
    }
    
    // Rafraîchir la liste après suppression
    await fetchCashSettlements()
    
    return { success: true, data }
  }

  const fetchCashSettlements = async (masterId?: string) => {
    setLoading(true)
    
    const query = supabase
      .from('cash_settlements_detail')
      .select('*')
      .order('settlement_date', { ascending: false })
    
    if (masterId) {
      query.eq('master_id', masterId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Erreur lors du chargement des règlements espèces:', error)
      setCashSettlements([])
    } else {
      setCashSettlements(data || [])
    }
    
    setLoading(false)
  }

  const getCashSettlementsForDossier = async (masterId: string) => {
    await fetchCashSettlements(masterId)
    return cashSettlements.filter(settlement => settlement.master_id === masterId)
  }

  return {
    cashSettlements,
    loading,
    addCashSettlement,
    deleteCashSettlement,
    fetchCashSettlements,
    getCashSettlementsForDossier
  }
}

// Hook pour statut dossiers avec espèces
export const useDossierStatusWithCash = (customerId?: string) => {
  const [dossiers, setDossiers] = useState<DossierStatusWithCash[]>([])
  const [loading, setLoading] = useState(false)

  const fetchDossierStatus = async () => {
    setLoading(true)
    
    const query = supabase
      .from('dossier_status_with_cash_uninvoiced')
      .select('*')
      .order('dossier_number')
    
    if (customerId) {
      query.eq('customer_id', customerId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Erreur lors du chargement du statut des dossiers:', error)
      setDossiers([])
    } else {
      setDossiers(data || [])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchDossierStatus()
  }, [customerId])

  return { 
    dossiers, 
    loading, 
    refetch: fetchDossierStatus 
  }
} 