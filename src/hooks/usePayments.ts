import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Payment, PaymentFormData, UsePaymentsOptions, PaymentWithCustomer } from '../types/payments'

export const usePayments = (options: UsePaymentsOptions = {}) => {
  const [payments, setPayments] = useState<PaymentWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Test de connexion d'abord
      const connectionTest = await supabase.from('payments').select('*').limit(1)
      if (connectionTest.error) {
        console.error('Erreur de connexion à la base de données:', connectionTest.error)
        throw new Error('Impossible de se connecter à la base de données. Vérifiez que la table "payments" existe.')
      }

      // Récupérer les paiements avec les informations du client (JOIN)
      let query = supabase
        .from('payments')
        .select(`
          *,
          customers(
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (options.customerId) {
        query = query.eq('customer_id', options.customerId)
      }

      if (options.status) {
        query = query.eq('status', options.status)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query

      if (error) {
        console.error('Erreur lors de la requête des paiements:', error)
        if (error.code === '42P01') {
          throw new Error('La table "payments" n\'existe pas. Veuillez exécuter le script d\'initialisation de la base de données.')
        }
        throw error
      }

      // Transformer les données pour inclure les informations du client
      const paymentsWithCustomers = (data || []).map(payment => ({
        ...payment,
        customer: payment.customers ? {
          id: payment.customers.id,
          name: payment.customers.name,
          email: payment.customers.email
        } : null
      }))

      setPayments(paymentsWithCustomers)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des paiements'
      console.error('Erreur dans usePayments:', errorMessage)
      setError(errorMessage)
      setPayments([])
    } finally {
      setLoading(false)
    }
  }, [options.customerId, options.status, options.limit])

  const createPayment = useCallback(async (paymentData: PaymentFormData): Promise<PaymentWithCustomer | null> => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          status: 'completed'
        }])
        .select(`
          *,
          customers(
            id,
            name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Transformer les données pour inclure les informations du client
      const paymentWithCustomer: PaymentWithCustomer = {
        ...data,
        customer: data.customers ? {
          id: data.customers.id,
          name: data.customers.name,
          email: data.customers.email
        } : null
      }

      // Rafraîchir la liste des paiements
      await fetchPayments()

      return paymentWithCustomer
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement')
      return null
    }
  }, [fetchPayments])

  const updatePayment = useCallback(async (paymentId: string, updates: Partial<Payment>): Promise<PaymentWithCustomer | null> => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', paymentId)
        .select(`
          *,
          customers(
            id,
            name,
            email
          )
        `)
        .single()

      if (error) throw error

      // Transformer les données pour inclure les informations du client
      const paymentWithCustomer: PaymentWithCustomer = {
        ...data,
        customer: data.customers ? {
          id: data.customers.id,
          name: data.customers.name,
          email: data.customers.email
        } : null
      }

      // Rafraîchir la liste des paiements
      await fetchPayments()

      return paymentWithCustomer
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du paiement')
      return null
    }
  }, [fetchPayments])

  const deletePayment = useCallback(async (paymentId: string): Promise<boolean> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId)

      if (error) throw error

      // Rafraîchir la liste des paiements
      await fetchPayments()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du paiement')
      return false
    }
  }, [fetchPayments])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return {
    payments,
    loading,
    error,
    createPayment,
    updatePayment,
    deletePayment,
    refetch: fetchPayments
  }
} 