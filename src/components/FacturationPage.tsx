import React, { useEffect, useState, useMemo } from 'react'
import { supabase, sendPDFsToWebhook } from '../lib/supabase'
import { RefreshCw, FileText, AlertCircle, Plus } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'
import InvoiceImportModal from './InvoiceImportModal'
import SearchAndFilters from './SearchAndFilters'
import SortableTable, { SortableColumn } from './SortableTable'

const FacturationPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Test d'abord si la vue existe
        const { data: testData, error: testError } = await supabase
          .from('invoice_summary')
          .select('*')
          .limit(1)
        
        if (testError) {
          console.error('Erreur lors du test de invoice_summary:', testError)
          setError(`Erreur lors du chargement des factures: ${testError.message}`)
          setInvoices([])
          setLoading(false)
          return
        }
        
        // Si le test passe, récupérer toutes les données
        const { data, error } = await supabase.from('invoice_summary').select('*')
        if (error) {
          setError(error.message)
          setInvoices([])
        } else {
          // Log détaillé des données pour diagnostiquer les problèmes de dates
          if (data && data.length > 0) {
            console.log('=== DIAGNOSTIC DES DONNÉES DE INVOICE_SUMMARY ===')
            console.log('Nombre de factures trouvées:', data.length)
            console.log('Clés disponibles:', Object.keys(data[0]))
            data.forEach((invoice, index) => {
              console.log(`Facture Summary ${index + 1}:`, {
                id: invoice.id,
                invoice_number: invoice.invoice_number,
                customer_name: invoice.customer_name,
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
                amount_total: {
                  value: invoice.amount_total,
                  type: typeof invoice.amount_total
                },
                amount_paid: {
                  value: invoice.amount_paid,
                  type: typeof invoice.amount_paid
                },
                                 amount_due: {
                   value: invoice.amount_due,
                   type: typeof invoice.amount_due,
                   exists: 'amount_due' in invoice
                 }
              })
            })
            console.log('=== FIN DIAGNOSTIC INVOICE_SUMMARY ===')
          } else {
            console.log('Aucune facture trouvée dans invoice_summary')
          }
          setInvoices(data || [])
        }
      } catch (err) {
        console.error('Erreur lors du chargement des factures:', err)
        setError('Erreur lors du chargement des factures')
        setInvoices([])
      }
      
      setLoading(false)
    }
    fetchInvoices()
  }, [])

  // Affiche les clés réelles des objets retournés par la vue
  if (invoices.length > 0) {
    console.log('Clés des factures :', Object.keys(invoices[0]));
  }

  const handleImportInvoices = async (files: File[]) => {
    try {
      console.log('Importation de', files.length, 'fichiers PDF')
      
      // Envoyer les fichiers PDF au webhook n8n et récupérer les résultats
      const importResults = await sendPDFsToWebhook(files)
      console.log('Traitement des fichiers PDF terminé')
      console.log('Résultats d\'import:', importResults)
      
      // Recharger les factures après importation (seulement si au moins un succès)
      const successCount = importResults.filter(r => r.success).length
      if (successCount > 0) {
        const { data, error } = await supabase.from('invoice_summary').select('*')
        if (error) {
          console.error('Erreur lors du rechargement des factures:', error)
        } else {
          setInvoices(data || [])
        }
      }
      
      // Retourner les résultats d'import pour affichage dans le modal
      return importResults
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error)
      throw error
    }
  }

  // Filtrage des factures
  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      // Filtre par recherche
      const searchMatch = !searchTerm || 
        invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par statut
      const statusMatch = !statusFilter || invoice.status === statusFilter

      // Filtre par client
      const customerMatch = !customerFilter || invoice.customer_id === customerFilter

      // Filtre par date
      const dateMatch = !dateFilter || (() => {
        const invoiceDate = new Date(invoice.created_at)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        switch (dateFilter) {
          case 'today':
            return invoiceDate.toDateString() === today.toDateString()
          case 'yesterday':
            return invoiceDate.toDateString() === yesterday.toDateString()
          case 'last_week':
            return invoiceDate >= lastWeek
          case 'last_month':
            return invoiceDate >= lastMonth
          default:
            return true
        }
      })()

      return searchMatch && statusMatch && customerMatch && dateMatch
    })
  }, [invoices, searchTerm, statusFilter, customerFilter, dateFilter])

  // Configuration des colonnes triables
  const columns: SortableColumn[] = [
    { 
      key: 'created_at', 
      label: 'Date', 
      sortable: true,
      format: (invoice: any) => formatDate(invoice.created_at)
    },
    { 
      key: 'customer_name', 
      label: 'Client', 
      sortable: true 
    },
    { 
      key: 'invoice_number', 
      label: 'Facture n°', 
      sortable: true 
    },
    { 
      key: 'amount_total', 
      label: 'Montant', 
      sortable: true,
      align: 'text-right',
      format: (invoice: any) => {
        const val = invoice.amount_total;
        if (val === null || val === undefined) return '-';
        return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
      }
    },
    { 
      key: 'amount_paid', 
      label: 'Payé', 
      sortable: true,
      align: 'text-right',
      format: (invoice: any) => {
        const val = invoice.amount_paid;
        if (val === null || val === undefined) return '-';
        return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
      }
    },
    { 
      key: 'amount_due', 
      label: 'Restant dû', 
      sortable: true,
      align: 'text-right',
      format: (invoice: any) => {
        const val = invoice.amount_due;
        console.log('Format amount_due - Valeur reçue:', val, 'Type:', typeof val);
        if (val === null || val === undefined) return '-';
        return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
      }
    },
    { 
      key: 'status', 
      label: 'Statut', 
      sortable: true 
    },
    { 
      key: 'due_date', 
      label: 'Échéance', 
      sortable: true,
      format: (invoice: any) => formatDate(invoice.due_date)
    },
  ]

  // Options pour les filtres
  const filterOptions = {
    status: {
      label: 'Statut',
      options: [
        { value: 'unpaid', label: 'Impayée' },
        { value: 'partial', label: 'Partiellement payée' },
        { value: 'paid', label: 'Payée' }
      ],
      value: statusFilter,
      onChange: setStatusFilter
    },
    customer: {
      label: 'Client',
      options: Array.from(new Set(invoices.map(inv => inv.customer_id)))
        .filter(Boolean)
        .map(customerId => {
          const customer = invoices.find(inv => inv.customer_id === customerId)
          return {
            value: customerId,
            label: customer?.customer_name || customerId
          }
        }),
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
            Synthèse des factures générées par la vue <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">invoice_summary</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
        searchPlaceholder="Rechercher par client, numéro de facture, dossier..."
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

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Chargement des factures...</p>
            </div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {invoices.length === 0 ? 'Aucune facture' : 'Aucune facture ne correspond aux critères'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {invoices.length === 0 
                  ? 'Aucune facture trouvée dans la vue invoice_summary'
                  : 'Aucune facture ne correspond aux critères de recherche et de filtres'
                }
              </p>
            </div>
          </div>
        ) : (
                     <SortableTable
             columns={columns}
             data={filteredInvoices}
             defaultSort={{ key: 'created_at', direction: 'desc' }}
             itemsPerPage={15}
           />
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