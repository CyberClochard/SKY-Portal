import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface InvoiceLine {
  id: string
  invoice_id?: string // lecture uniquement
  master_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number // remplissage auto (quantity * unit_price)
  created_at?: string
  updated_at?: string
}

interface UseInvoiceLinesOptions {
  masterId: string
}

export const useInvoiceLines = (options: UseInvoiceLinesOptions) => {
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Récupérer les lignes de facturation pour un dossier
  const fetchInvoiceLines = useCallback(async () => {
    if (!options.masterId) {
      console.log('⚠️ useInvoiceLines: Pas de masterId fourni')
      setInvoiceLines([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('🔍 useInvoiceLines: Chargement des lignes pour masterId:', options.masterId)

      const { data: linesData, error: linesError } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('master_id', options.masterId)
        .order('created_at', { ascending: true })

      if (linesError) {
        console.error('❌ useInvoiceLines: Erreur lors du chargement:', linesError)
        throw linesError
      }

      console.log('✅ useInvoiceLines: Lignes chargées:', linesData?.length || 0, 'lignes trouvées')
      setInvoiceLines(linesData || [])
    } catch (err) {
      console.error('❌ useInvoiceLines: Erreur lors du chargement:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des lignes de facturation'
      setError(errorMessage)
      setInvoiceLines([])
    } finally {
      setLoading(false)
    }
  }, [options.masterId])

  // Créer une nouvelle ligne
  const createInvoiceLine = useCallback(async (lineData: Omit<InvoiceLine, 'id' | 'invoice_id' | 'total_price' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    try {
      setError(null)
      console.log('🔍 useInvoiceLines: Création d\'une nouvelle ligne:', lineData)

      // Le total_price sera calculé automatiquement (quantity * unit_price)
      const dataToInsert = {
        ...lineData,
        total_price: lineData.quantity * lineData.unit_price
      }

      const { data, error } = await supabase
        .from('invoice_lines')
        .insert([dataToInsert])
        .select()

      if (error) {
        console.error('❌ useInvoiceLines: Erreur lors de l\'insertion:', error)
        throw error
      }

      console.log('✅ useInvoiceLines: Ligne créée avec succès:', data)
      
      // Rafraîchir les données
      await fetchInvoiceLines()
      return true
    } catch (err) {
      console.error('❌ useInvoiceLines: Erreur lors de la création:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de la ligne'
      setError(errorMessage)
      return false
    }
  }, [fetchInvoiceLines])

  // Mettre à jour une ligne
  const updateInvoiceLine = useCallback(async (id: string, updates: Partial<InvoiceLine>): Promise<boolean> => {
    try {
      setError(null)

      // Si quantity ou unit_price change, recalculer total_price
      if (updates.quantity !== undefined || updates.unit_price !== undefined) {
        const currentLine = invoiceLines.find(line => line.id === id)
        if (currentLine) {
          const newQuantity = updates.quantity ?? currentLine.quantity
          const newUnitPrice = updates.unit_price ?? currentLine.unit_price
          updates.total_price = newQuantity * newUnitPrice
        }
      }

      const { error } = await supabase
        .from('invoice_lines')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Rafraîchir les données
      await fetchInvoiceLines()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la ligne'
      setError(errorMessage)
      return false
    }
  }, [invoiceLines, fetchInvoiceLines])

  // Supprimer une ligne
  const deleteInvoiceLine = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('invoice_lines')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Rafraîchir les données
      await fetchInvoiceLines()
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression de la ligne'
      setError(errorMessage)
      return false
    }
  }, [fetchInvoiceLines])

  // Charger les données au montage et quand masterId change
  useEffect(() => {
    fetchInvoiceLines()
  }, [fetchInvoiceLines])

  return {
    invoiceLines,
    loading,
    error,
    createInvoiceLine,
    updateInvoiceLine,
    deleteInvoiceLine,
    refetch: fetchInvoiceLines
  }
}
