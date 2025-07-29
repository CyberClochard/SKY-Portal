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

      // Test de connexion d'abord
      const connectionTest = await supabase.from('customers').select('*').limit(1)
      if (connectionTest.error) {
        console.error('Erreur de connexion à la base de données:', connectionTest.error)
        throw new Error('Impossible de se connecter à la base de données. Vérifiez que les tables du système de paiements sont créées.')
      }

      let query = supabase
        .from('invoices')
        .select(`
          id,
          customer_id,
          invoice_number,
          amount_total,
          amount_paid,
          status,
          due_date,
          created_at
        `)
        .in('status', options.includePartial ? ['unpaid', 'partial'] : ['unpaid'])
        .order('due_date', { ascending: true })

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erreur lors de la requête des factures:', error)
        throw error
      }

      console.log('Factures récupérées:', data?.length || 0)
      
      // Log détaillé des données pour diagnostiquer les problèmes de dates
      if (data && data.length > 0) {
        console.log('=== DIAGNOSTIC DES DONNÉES DE FACTURES ===')
        data.forEach((invoice, index) => {
          console.log(`Facture ${index + 1}:`, {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            due_date: {
              value: invoice.due_date,
              type: typeof invoice.due_date,
              isValid: invoice.due_date ? !isNaN(new Date(invoice.due_date).getTime()) : false
            },
            issued_date: {
              value: invoice.issued_date,
              type: typeof invoice.issued_date,
              isValid: invoice.issued_date ? !isNaN(new Date(invoice.issued_date).getTime()) : false
            },
            created_at: {
              value: invoice.created_at,
              type: typeof invoice.created_at,
              isValid: invoice.created_at ? !isNaN(new Date(invoice.created_at).getTime()) : false
            },
            amount_total: invoice.amount_total,
            amount_paid: invoice.amount_paid
          })
        })
        console.log('=== FIN DIAGNOSTIC ===')
      }
      
      setInvoices(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des factures impayées'
      console.error('Erreur dans useUnpaidInvoices:', errorMessage)
      setError(errorMessage)
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