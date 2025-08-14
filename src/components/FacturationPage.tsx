import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase, sendPDFsToWebhook } from '../lib/supabase'
import { RefreshCw, FileText, AlertCircle, Plus } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'
import InvoiceImportModal from './InvoiceImportModal'
import SearchAndFilters from './SearchAndFilters'
import { useAuth } from '../contexts/AuthContext'

// Interfaces
interface FinanceCase {
  id: string
  customer_id: string
  customer_name: string
  invoice_number: string
  amount_total: number
  amount_paid: number
  amount_remaining: number
  status: 'unpaid' | 'partial' | 'paid'
  due_date: string
  issued_date: string
  created_at: string
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
  
  // États pour le tri
  const [sortField, setSortField] = useState<'invoice_number' | 'customer_name' | 'issued_date' | 'due_date' | 'amount_total' | 'status' | 'created_at'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fonction pour charger les données finance
  const loadFinanceCases = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Chargement des factures...')
      
      // Utiliser la vue invoice_summary qui existe déjà
      const { data, error } = await supabase
        .from('invoice_summary')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Erreur lors du chargement des factures:', error)
        setError(`Erreur lors du chargement des factures: ${error.message}`)
        setFinanceCases([])
      } else {
        console.log('Factures chargées:', data?.length || 0, 'factures')
        setFinanceCases(data || [])
      }
    } catch (err) {
      console.error('Erreur chargement factures:', err)
      setError('Erreur lors du chargement des données')
      setFinanceCases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinanceCases()
  }, [])

  // Handlers simplifiés pour les factures
  const handleRefresh = async () => {
    console.log('🔄 Rafraîchissement des factures...')
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

  // Filtrage et tri des factures
  const filteredAndSortedFinanceCases = useMemo(() => {
    let filtered = financeCases.filter(financeCase => {
      // Filtre par recherche
      const searchMatch = !searchTerm || 
        financeCase.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        financeCase.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par statut
      const statusMatch = !statusFilter || financeCase.status === statusFilter

      // Filtre par client
      const customerMatch = !customerFilter || financeCase.customer_name === customerFilter

      // Filtre par date (si disponible)
      const dateMatch = !dateFilter || (() => {
        if (!financeCase.created_at) return true
        const caseDate = new Date(financeCase.created_at)
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

    // Tri des factures
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Gestion des valeurs null/undefined
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      // Tri spécial pour les dates
      if (sortField === 'issued_date' || sortField === 'due_date' || sortField === 'created_at') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      // Tri spécial pour les montants
      if (sortField === 'amount_total') {
        aValue = Number(aValue) || 0
        bValue = Number(bValue) || 0
      }

      // Tri spécial pour les numéros de facture (tri naturel)
      if (sortField === 'invoice_number') {
        aValue = aValue.toString()
        bValue = bValue.toString()
      }

      // Tri spécial pour le nom du client
      if (sortField === 'customer_name') {
        aValue = aValue.toString().toLowerCase()
        bValue = bValue.toString().toLowerCase()
      }

      // Tri spécial pour le statut
      if (sortField === 'status') {
        const statusOrder = { 'paid': 3, 'partial': 2, 'unpaid': 1 }
        aValue = statusOrder[aValue as keyof typeof statusOrder] || 0
        bValue = statusOrder[bValue as keyof typeof statusOrder] || 0
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    return filtered
  }, [financeCases, searchTerm, statusFilter, customerFilter, dateFilter, sortField, sortDirection])

  // Fonction pour changer le tri
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Fonction pour obtenir l'icône de tri
  const getSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  // Options pour les filtres
  const filterOptions = {
    status: {
      label: 'Statut',
      options: [
        { value: 'unpaid', label: 'Impayée' },
        { value: 'partial', label: 'Partielle' },
        { value: 'paid', label: 'Payée' }
      ],
      value: statusFilter,
      onChange: setStatusFilter
    },
    customer: {
      label: 'Client',
      options: Array.from(new Set(financeCases.map(fc => fc.customer_name)))
        .filter(Boolean)
        .map(customerName => ({
          value: customerName,
          label: customerName
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
            Gestion des factures et suivi des paiements
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
        ) : filteredAndSortedFinanceCases.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {financeCases.length === 0 ? 'Aucun dossier finance' : 'Aucun dossier ne correspond aux critères'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {financeCases.length === 0 
                  ? 'Aucune facture trouvée'
                  : 'Aucune facture ne correspond aux critères de recherche et de filtres'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* En-têtes de colonnes avec tri */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-t-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-12 gap-4 p-4 font-medium text-gray-700 dark:text-gray-300 text-sm">
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('invoice_number')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>N° Facture</span>
                    <span className="text-xs">{getSortIcon('invoice_number')}</span>
                  </button>
                </div>
                <div className="col-span-3">
                  <button
                    onClick={() => handleSort('customer_name')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>Client</span>
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('amount_total')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>Montant</span>
                    <span className="text-xs">{getSortIcon('amount_total')}</span>
                  </button>
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>Statut</span>
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('issued_date')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>Date émission</span>
                    <span className="text-xs">{getSortIcon('issued_date')}</span>
                  </button>
                </div>
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort('due_date')}
                    className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <span>Échéance</span>
                    <span className="text-xs">{getSortIcon('due_date')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Lignes des factures */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-b-lg">
              {filteredAndSortedFinanceCases.map((financeCase, index) => (
                <div 
                  key={financeCase.id}
                  className={`grid grid-cols-12 gap-4 p-4 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  {/* N° Facture */}
                  <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                    {financeCase.invoice_number || '-'}
                  </div>
                  
                  {/* Client */}
                  <div className="col-span-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                      {financeCase.customer_name || '-'}
                    </span>
                  </div>
                  
                  {/* Montant */}
                  <div className="col-span-2 font-medium text-gray-900 dark:text-white">
                    {financeCase.amount_total ? `${financeCase.amount_total.toLocaleString('fr-FR')} €` : '-'}
                  </div>
                  
                  {/* Statut */}
                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      financeCase.status === 'paid' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : financeCase.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {financeCase.status === 'paid' ? 'Payée' : 
                       financeCase.status === 'partial' ? 'Partielle' : 'Impayée'}
                    </span>
                  </div>
                  
                  {/* Date d'émission */}
                  <div className="col-span-2 text-gray-600 dark:text-gray-400">
                    {financeCase.issued_date ? new Date(financeCase.issued_date).toLocaleDateString('fr-FR') : '-'}
                  </div>
                  
                  {/* Échéance */}
                  <div className="col-span-2 text-gray-600 dark:text-gray-400">
                    {financeCase.due_date ? new Date(financeCase.due_date).toLocaleDateString('fr-FR') : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
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