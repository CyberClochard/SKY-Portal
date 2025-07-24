import React, { useEffect, useState } from 'react'
import { supabase, sendPDFsToWebhook } from '../lib/supabase'
import { RefreshCw, FileText, AlertCircle, Plus } from 'lucide-react'
import InvoiceImportModal from './InvoiceImportModal'

const FacturationPage: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.from('invoice_summary').select('*')
      if (error) {
        setError(error.message)
        setInvoices([])
      } else {
        setInvoices(data || [])
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
      
      // Envoyer les fichiers PDF au webhook n8n et récupérer les réponses
      const webhookResponses = await sendPDFsToWebhook(files)
      console.log('Fichiers envoyés au webhook n8n avec succès')
      console.log('Réponses du webhook:', webhookResponses)
      
      // Recharger les factures après importation
      const { data, error } = await supabase.from('invoice_summary').select('*')
      if (error) {
        throw new Error(error.message)
      } else {
        setInvoices(data || [])
      }
      
      // Retourner les réponses du webhook pour affichage dans le modal
      return webhookResponses
    } catch (error) {
      console.error('Erreur lors de l\'importation:', error)
      throw error
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
            onClick={() => console.log('Nouvelle facture')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Importer</span>
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

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Chargement des factures...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucune facture</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {error ? 'Erreur de chargement des factures' : 'Aucune facture trouvée dans la vue invoice_summary'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {(() => {
              // Colonnes à afficher et leur label
              const columns = [
                { key: 'created_at', label: 'Date', format: (val: any) => {
                  if (!val) return '-';
                  const d = new Date(val)
                  return d.toLocaleDateString('fr-FR')
                } },
                { key: 'customer_name', label: 'Client' },
                { key: 'master_id', label: 'Dossier' },
                { key: 'invoice_number', label: 'Facture n°' },
                { key: 'amount_total', label: 'Montant', format: (val: any) => {
                  if (val === null || val === undefined) return '-';
                  return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
                }, align: 'text-right' },
                { key: 'amount_paid', label: 'Payé', format: (val: any) => {
                  if (val === null || val === undefined) return '-';
                  return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
                }, align: 'text-right' },
                { key: 'amount_due', label: 'Restant dû', format: (val: any) => {
                  if (val === null || val === undefined) return '-';
                  return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
                }, align: 'text-right' },
                { key: 'status', label: 'Statut' },
                { key: 'due_date', label: 'Échéance', format: (val: any) => {
                  if (!val) return '-';
                  const d = new Date(val)
                  return d.toLocaleDateString('fr-FR')
                } },
              ]
              return (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invoices.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        {columns.map((col, i) => (
                          <td key={i} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${col.align || ''}`}>
                            {col.format ? col.format(row[col.key]) : (row[col.key] === null || row[col.key] === undefined ? '-' : row[col.key].toString())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
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