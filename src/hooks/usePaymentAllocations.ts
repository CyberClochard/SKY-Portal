import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { PaymentAllocation, PaymentAllocationDetails, ManualAllocationData, UsePaymentAllocationsOptions } from '../types/payments'

export const usePaymentAllocations = (options: UsePaymentAllocationsOptions) => {
  const [allocations, setAllocations] = useState<PaymentAllocationDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Récupérer les allocations
      const { data: allocationsData, error: allocationsError } = await supabase
        .from('payment_allocations')
        .select('*')
        .eq('payment_id', options.paymentId)
        .order('created_at', { ascending: false })

      if (allocationsError) throw allocationsError

      if (!allocationsData || allocationsData.length === 0) {
        setAllocations([])
        return
      }

      // Récupérer les informations du paiement
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('amount, payment_method, reference')
        .eq('id', options.paymentId)
        .single()

      if (paymentError) throw paymentError

      // Récupérer les informations des factures
      const invoiceIds = allocationsData.map(allocation => allocation.invoice_id)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .in('id', invoiceIds)

      if (invoicesError) throw invoicesError

      // Transformer les données
      const transformedData = allocationsData.map(allocation => {
        const invoice = invoicesData?.find(inv => inv.id === allocation.invoice_id)
        return {
          id: allocation.id,
          payment_id: allocation.payment_id,
          payment_amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.reference,
          invoice_id: allocation.invoice_id,
          invoice_number: invoice?.invoice_number || 'N/A',
          amount_allocated: allocation.amount_allocated,
          allocation_date: allocation.created_at
        }
      })

      setAllocations(transformedData)
    } catch (err) {
      console.error('Erreur détaillée:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des allocations')
      setAllocations([])
    } finally {
      setLoading(false)
    }
  }, [options.paymentId])

  const createManualAllocation = useCallback(async (allocationData: ManualAllocationData): Promise<boolean> => {
    try {
      setError(null)

      // Insérer les allocations
      const { error } = await supabase
        .from('payment_allocations')
        .insert(allocationData.allocations.map(allocation => ({
          payment_id: allocationData.payment_id,
          invoice_id: allocation.invoice_id,
          amount_allocated: allocation.amount_allocated
        })))

      if (error) throw error

      // Rafraîchir la liste des allocations
      await fetchAllocations()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création des allocations')
      return false
    }
  }, [fetchAllocations])

  const deleteAllocation = useCallback(async (allocationId: string): Promise<boolean> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('payment_allocations')
        .delete()
        .eq('id', allocationId)

      if (error) throw error

      // Rafraîchir la liste des allocations
      await fetchAllocations()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression de l\'allocation')
      return false
    }
  }, [fetchAllocations])

  const allocatePaymentAutomatically = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      setError(null)

      // Appeler la fonction SQL pour l'allocation automatique
      const { error } = await supabase.rpc('allocate_payment_automatically', {
        payment_uuid: paymentId
      })

      if (error) throw error

      // Rafraîchir la liste des allocations
      await fetchAllocations()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'allocation automatique')
      return false
    }
  }, [fetchAllocations])

  useEffect(() => {
    if (options.paymentId) {
      fetchAllocations()
    }
  }, [fetchAllocations, options.paymentId])

  return {
    allocations,
    loading,
    error,
    createManualAllocation,
    deleteAllocation,
    allocatePaymentAutomatically,
    refetch: fetchAllocations
  }
} 