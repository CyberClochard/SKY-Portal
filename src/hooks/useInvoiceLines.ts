import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Types pour les lignes de facturation
export interface InvoiceLine {
  id: string
  dossier_number: string
  designation: string
  quantite: number
  prix_unitaire: number
  taux_tva: number
  montant_ht: number
  montant_tva: number
  montant_ttc: number
  ordre: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface InvoiceHeader {
  id: string
  dossier_number: string
  statut_facturation: 'devis' | 'facture_envoyee' | 'payee'
  date_devis?: string
  date_facture?: string
  numero_facture?: string
  client_name?: string
  client_email?: string
  client_phone?: string
  client_address?: string
  conditions_paiement?: string
  echeance_paiement?: string
  created_at: string
  updated_at: string
}

export interface InvoiceLineFormData {
  designation: string
  quantite: number
  prix_unitaire: number
  taux_tva: number
  notes?: string
}

export interface UseInvoiceLinesOptions {
  dossierNumber?: string
  limit?: number
}

export const useInvoiceLines = (options: UseInvoiceLinesOptions = {}) => {
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([])
  const [invoiceHeader, setInvoiceHeader] = useState<InvoiceHeader | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Récupérer les lignes de facturation pour un dossier
  const fetchInvoiceLines = useCallback(async () => {
    if (!options.dossierNumber) {
      setInvoiceLines([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Récupérer les lignes de facturation
      const { data: linesData, error: linesError } = await supabase
        .from('invoice_lines')
        .select('*')
        .eq('dossier_number', options.dossierNumber)
        .order('ordre', { ascending: true })

      if (linesError) throw linesError

      // Récupérer l'en-tête de facturation
      const { data: headerData, error: headerError } = await supabase
        .from('invoice_headers')
        .select('*')
        .eq('dossier_number', options.dossierNumber)
        .single()

      if (headerError && headerError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.warn('Erreur lors de la récupération de l\'en-tête:', headerError)
      }

      setInvoiceLines(linesData || [])
      setInvoiceHeader(headerData || null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des lignes de facturation'
      console.error('Erreur dans useInvoiceLines:', errorMessage)
      setError(errorMessage)
      setInvoiceLines([])
      setInvoiceHeader(null)
    } finally {
      setLoading(false)
    }
  }, [options.dossierNumber])

  // Créer une nouvelle ligne de facturation
  const createInvoiceLine = useCallback(async (lineData: InvoiceLineFormData): Promise<InvoiceLine | null> => {
    if (!options.dossierNumber) {
      setError('Numéro de dossier requis')
      return null
    }

    try {
      setError(null)

      // Déterminer l'ordre de la nouvelle ligne
      const nextOrder = invoiceLines.length > 0 
        ? Math.max(...invoiceLines.map(line => line.ordre)) + 1 
        : 1

      const { data, error } = await supabase
        .from('invoice_lines')
        .insert([{
          dossier_number: options.dossierNumber,
          designation: lineData.designation,
          quantite: lineData.quantite,
          prix_unitaire: lineData.prix_unitaire,
          taux_tva: lineData.taux_tva,
          notes: lineData.notes,
          ordre: nextOrder
        }])
        .select()
        .single()

      if (error) throw error

      // Rafraîchir la liste
      await fetchInvoiceLines()

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la création de la ligne'
      setError(errorMessage)
      return null
    }
  }, [options.dossierNumber, invoiceLines, fetchInvoiceLines])

  // Mettre à jour une ligne de facturation
  const updateInvoiceLine = useCallback(async (lineId: string, updates: Partial<InvoiceLineFormData>): Promise<boolean> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('invoice_lines')
        .update(updates)
        .eq('id', lineId)

      if (error) throw error

      // Rafraîchir la liste
      await fetchInvoiceLines()

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la ligne'
      setError(errorMessage)
      return false
    }
  }, [fetchInvoiceLines])

  // Supprimer une ligne de facturation
  const deleteInvoiceLine = useCallback(async (lineId: string): Promise<boolean> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('invoice_lines')
        .delete()
        .eq('id', lineId)

      if (error) throw error

      // Rafraîchir la liste
      await fetchInvoiceLines()

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la suppression de la ligne'
      setError(errorMessage)
      return false
    }
  }, [fetchInvoiceLines])

  // Réorganiser l'ordre des lignes
  const reorderInvoiceLines = useCallback(async (lineIds: string[]): Promise<boolean> => {
    try {
      setError(null)

      // Mettre à jour l'ordre de chaque ligne
      const updatePromises = lineIds.map((lineId, index) => 
        supabase
          .from('invoice_lines')
          .update({ ordre: index + 1 })
          .eq('id', lineId)
      )

      await Promise.all(updatePromises)

      // Rafraîchir la liste
      await fetchInvoiceLines()

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la réorganisation des lignes'
      setError(errorMessage)
      return false
    }
  }, [fetchInvoiceLines])

  // Créer ou mettre à jour l'en-tête de facturation
  const upsertInvoiceHeader = useCallback(async (headerData: Partial<InvoiceHeader>): Promise<boolean> => {
    if (!options.dossierNumber) {
      setError('Numéro de dossier requis')
      return false
    }

    try {
      setError(null)

      const { error } = await supabase
        .from('invoice_headers')
        .upsert([{
          dossier_number: options.dossierNumber,
          ...headerData
        }])

      if (error) throw error

      // Rafraîchir l'en-tête
      await fetchInvoiceLines()

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l\'en-tête'
      setError(errorMessage)
      return false
    }
  }, [options.dossierNumber, fetchInvoiceLines])

  // Calculer les totaux
  const totals = {
    totalHT: invoiceLines.reduce((sum, line) => sum + line.montant_ht, 0),
    totalTVA: invoiceLines.reduce((sum, line) => sum + line.montant_tva, 0),
    totalTTC: invoiceLines.reduce((sum, line) => sum + line.montant_ttc, 0)
  }

  // Charger les données au montage et quand le numéro de dossier change
  useEffect(() => {
    fetchInvoiceLines()
  }, [fetchInvoiceLines])

  return {
    invoiceLines,
    invoiceHeader,
    loading,
    error,
    totals,
    createInvoiceLine,
    updateInvoiceLine,
    deleteInvoiceLine,
    reorderInvoiceLines,
    upsertInvoiceHeader,
    refetch: fetchInvoiceLines
  }
}
