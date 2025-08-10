import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, sendPDFsToWebhook } from '../lib/supabase'
import { RefreshCw, FileText, AlertCircle, Plus } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'
import InvoiceImportModal from './InvoiceImportModal'
import SearchAndFilters from './SearchAndFilters'
import { useAuth } from '../contexts/AuthContext'

// Interfaces
interface FinanceCase {
  master_id: string
  dossier: string
  client_name: string
  net_payable: number
  lta: string
  status: string
  override_mode: boolean
  notes: string | null
  notes_last_updated?: string
}

const FacturationPage: React.FC = () => {
  const { user } = useAuth()
  
  // États pour le système de notes finance
  const [financeCases, setFinanceCases] = useState<FinanceCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingNotes, setLoadingNotes] = useState<Set<string>>(new Set())
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Fonction pour charger les données finance
  const loadFinanceCases = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Test d'abord si la vue existe
      const { data: testData, error: testError } = await supabase
        .from('case_finance_summary')
        .select('*')
        .limit(1)
      
      if (testError) {
        console.error('Erreur lors du test de case_finance_summary:', testError)
        setError(`Erreur lors du chargement des données finance: ${testError.message}`)
        setFinanceCases([])
        setLoading(false)
        return
      }
      
      // Si le test passe, récupérer toutes les données
      const { data, error } = await supabase
        .from('case_finance_summary')
        .select('*')
        .order('date_operation', { ascending: false })
      
      if (error) {
        setError(error.message)
        setFinanceCases([])
      } else {
        console.log('Données finance chargées:', data?.length || 0, 'cases')
        setFinanceCases(data || [])
      }
    } catch (err) {
      console.error('Erreur chargement cases finance:', err)
      setError('Erreur lors du chargement des données')
      setFinanceCases([])
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour sauvegarder les notes
  const saveFinanceNotes = async (masterId: string, overrideMode: boolean, notes: string) => {
    try {
      setLoadingNotes(prev => new Set(prev).add(masterId))
      
      const { data: existing } = await supabase
        .from('case_finance_notes')
        .select('id')
        .eq('master_id', masterId)
        .single()
      
      if (existing) {
        // Update
        const { error } = await supabase
          .from('case_finance_notes')
          .update({
            override_mode: overrideMode,
            notes: notes,
            updated_by: user?.id
          })
          .eq('master_id', masterId)
        
        if (error) throw error
      } else {
        // Insert
        const { error } = await supabase
          .from('case_finance_notes')
          .insert({
            master_id: masterId,
            override_mode: overrideMode,
            notes: notes,
            created_by: user?.id,
            updated_by: user?.id
          })
        
        if (error) throw error
      }
      
      // Recharger les données
      await loadFinanceCases()
      
    } catch (err) {
      console.error('Erreur sauvegarde notes:', err)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setLoadingNotes(prev => {
        const newSet = new Set(prev)
        newSet.delete(masterId)
        return newSet
      })
    }
  }

  // Handlers avec debounce pour les notes
  const handleOverrideModeChange = async (masterId: string, overrideMode: boolean) => {
    const caseData = financeCases.find(c => c.master_id === masterId)
    await saveFinanceNotes(masterId, overrideMode, caseData?.notes || '')
  }

  const debouncedSaveNotes = useCallback(
    (masterId: string, notes: string) => {
      const caseData = financeCases.find(c => c.master_id === masterId)
      if (caseData) {
        saveFinanceNotes(masterId, caseData.override_mode, notes)
      }
    },
    [financeCases]
  )

  const handleNotesChange = (masterId: string, notes: string) => {
    // Mise à jour locale immédiate pour l'UI
    setFinanceCases(prev => prev.map(c => 
      c.master_id === masterId ? { ...c, notes } : c
    ))
    
    // Sauvegarde avec debounce
    setTimeout(() => debouncedSaveNotes(masterId, notes), 1000)
  }

  useEffect(() => {
    loadFinanceCases()
  }, [])

  // Fonction de rafraîchissement des données
  const handleRefresh = async () => {
    console.log('🔄 Rafraîchissement des cases finance...')
    await loadFinanceCases()
  }

  const handleImportInvoices = async (files: File[]) => {
    try {
      console.log('Importation de', files.length, 'fichiers PDF')
      
      // Envoyer les fichiers PDF au webhook n8n et récupérer les résultats
      const importResults = await sendPDFsToWebhook(files)
      console.log('Traitement des fichiers PDF terminé')
      console.log('Résultats d\'import:', importResults)
      
      // Recharger les données après importation (seulement si au moins un succès)
      const successCount = importResults.filter(r => r.success).length
      if (successCount > 0) {
        await loadFinanceCases()
      }
      
      // Retourner les résultats d'import pour affichage dans le modal
      return importResults
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error)
      throw error
    }
  }

  // Filtrage des cases finance
  const filteredFinanceCases = useMemo(() => {
    return financeCases.filter(financeCase => {
      // Filtre par recherche
      const searchMatch = !searchTerm || 
        financeCase.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        financeCase.dossier?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par statut
      const statusMatch = !statusFilter || financeCase.status === statusFilter

      // Filtre par client
      const customerMatch = !customerFilter || financeCase.client_name === customerFilter

      // Filtre par date (si disponible)
      const dateMatch = !dateFilter || (() => {
        if (!financeCase.notes_last_updated) return true
        const caseDate = new Date(financeCase.notes_last_updated)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        switch (dateFilter) {
          case 'today':
            return caseDate.toDateString() === today.toDateString()
          case 'yesterday':
            return caseDate.toDateString() === yesterday.toDateString()
          case 'last_week':
            return caseDate >= lastWeek
          case 'last_month':
            return caseDate >= lastMonth
          default:
            return true
        }
      })()

      return searchMatch && statusMatch && customerMatch && dateMatch
    })
  }, [financeCases, searchTerm, statusFilter, customerFilter, dateFilter])

  // Options pour les filtres
  const filterOptions = {
    status: {
      label: 'Statut',
      options: [
        { value: 'pending', label: 'En attente' },
        { value: 'completed', label: 'Terminé' },
        { value: 'cancelled', label: 'Annulé' }
      ],
      value: statusFilter,
      onChange: setStatusFilter
    },
    customer: {
      label: 'Client',
      options: Array.from(new Set(financeCases.map(fc => fc.client_name)))
        .filter(Boolean)
        .map(clientName => ({
          value: clientName,
          label: clientName
        })),
      value: customerFilter,
      onChange: setCustomerFilter
    },
    date: {
      label: 'Période',
      options: [
        { value: 'today', label: 'Aujourd\'hui' },
        { value: 'yesterday', label: 'Hier' },
        { value: 'last_week', label: 'Cette semaine' },
        { value: 'last_month', label: 'Ce mois' }
      ],
      value: dateFilter,
      onChange: setDateFilter
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Facturation</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des dossiers finance avec système de notes override
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle facture</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Recherche et filtres */}
      <SearchAndFilters
        searchPlaceholder="Rechercher par client, dossier..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filterOptions}
        onClearAll={() => {
          setSearchTerm('')
          setStatusFilter('')
          setCustomerFilter('')
          setDateFilter('')
        }}
      />

      {/* Cases Finance avec Notes Override */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Chargement des cases finance...</p>
            </div>
          </div>
        ) : filteredFinanceCases.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {financeCases.length === 0 ? 'Aucun dossier finance' : 'Aucun dossier ne correspond aux critères'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {financeCases.length === 0 
                  ? 'Aucun dossier trouvé dans la vue case_finance_summary'
                  : 'Aucun dossier ne correspond aux critères de recherche et de filtres'
                }
              </p>
            </div>
          </div>
        ) : (
          filteredFinanceCases.map((financeCase) => (
            <div 
              key={financeCase.master_id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Dossier {financeCase.dossier}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                    {financeCase.client_name}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {financeCase.net_payable ? `${financeCase.net_payable.toLocaleString('fr-FR')} €` : '-'}
                  </span>
                  
                  {/* Toggle Override Mode */}
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Override manuel</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={financeCase.override_mode || false}
                        onChange={(e) => handleOverrideModeChange(financeCase.master_id, e.target.checked)}
                        disabled={loadingNotes.has(financeCase.master_id)}
                        className="sr-only"
                      />
                      <div className={`w-11 h-6 rounded-full transition-colors ${
                        financeCase.override_mode 
                          ? 'bg-blue-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform translate-y-1 ${
                          financeCase.override_mode ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Notes Field - Apparaît seulement en mode override */}
              {financeCase.override_mode && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (mode override manuel)
                  </label>
                  <textarea
                    value={financeCase.notes || ''}
                    onChange={(e) => handleNotesChange(financeCase.master_id, e.target.value)}
                    disabled={loadingNotes.has(financeCase.master_id)}
                    placeholder="Ajoutez vos notes pour ce dossier..."
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  {loadingNotes.has(financeCase.master_id) && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Sauvegarde...</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Infos supplémentaires */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">LTA:</span>
                  <span className="ml-2 font-mono text-gray-900 dark:text-white">{financeCase.lta || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Statut:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{financeCase.status || '-'}</span>
                </div>
                {financeCase.notes_last_updated && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Dernière note:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(financeCase.notes_last_updated).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Import Modal */}
      <InvoiceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportInvoices}
      />
    </div>
  )
}

export default FacturationPage 