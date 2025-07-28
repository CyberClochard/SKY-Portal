import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { InvoiceSummary, UseUnpaidInvoicesOptions } from '../types/payments'

export const useUnpaidInvoices = (options: UseUnpaidInvoicesOptions = {}) => {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnpaidInvoices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('invoice_summary')
        .select('*')
        .in('status', options.includePartial ? ['unpaid', 'partial'] : ['unpaid'])
        .order('due_date', { ascending: true })

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      const { data, error } = await query

      if (error) throw error

      setInvoices(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des factures impayées')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [options.customerId, options.includePartial])

  useEffect(() => {
    fetchUnpaidInvoices()
  }, [fetchUnpaidInvoices])

  return {
    invoices,
    loading,
    error,
    refetch: fetchUnpaidInvoices
  }
} 