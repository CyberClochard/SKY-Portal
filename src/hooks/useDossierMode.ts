import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { DossierWithMode, DossierPaymentData, ManualAllocationItem } from '../types/payments'

export const useDossierMode = () => {
  const [loading, setLoading] = useState(false)
  
  const getDossierMode = async (masterId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .rpc('get_dossier_manual_mode', { p_master_id: masterId })
    
    if (error) {
      console.error('Error getting dossier mode:', error)
      return false
    }
    
    return data || false
  }
  
  const setDossierMode = async (
    masterId: string, 
    manualMode: boolean, 
    updatedBy: string
  ) => {
    setLoading(true)
    
    const { data, error } = await supabase
      .rpc('set_dossier_manual_mode', {
        p_master_id: masterId,
        p_manual_mode: manualMode,
        p_updated_by: updatedBy
      })
    
    setLoading(false)
    
    if (error) {
      console.error('Error setting dossier mode:', error)
      return { success: false, error }
    }
    
    return { success: true, data }
  }
  
  const createPaymentForDossier = async (
    masterId: string,
    paymentData: DossierPaymentData,
    manualAllocations?: ManualAllocationItem[]
  ) => {
    const { data, error } = await supabase
      .rpc('create_payment_for_dossier', {
        p_master_id: masterId,
        p_customer_id: paymentData.customer_id,
        p_amount: paymentData.amount,
        p_payment_method: paymentData.payment_method,
        p_reference: paymentData.reference,
        p_notes: paymentData.notes,
        p_manual_allocations: manualAllocations ? JSON.stringify(manualAllocations) : null
      })
    
    return { data, error }
  }
  
  return {
    loading,
    getDossierMode,
    setDossierMode,
    createPaymentForDossier
  }
}

export const useDossiersWithMode = (customerId?: string) => {
  const [dossiers, setDossiers] = useState<DossierWithMode[]>([])
  const [loading, setLoading] = useState(false)
  
  const fetchDossiers = async () => {
    setLoading(true)
    
    const query = supabase
      .from('dossier_overview_with_mode')
      .select('*')
      .order('master_name')
    
    if (customerId) {
      query.eq('customer_id', customerId)
    }
    
    const { data, error } = await query
    if (!error) setDossiers(data || [])
    setLoading(false)
  }
  
  useEffect(() => {
    fetchDossiers()
  }, [customerId])
  
  return { dossiers, loading, refetch: fetchDossiers }
} 