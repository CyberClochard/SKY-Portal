import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { sendInvoiceDataToWebhook } from '../lib/supabase'
import { X, FileText, Search, Loader2 } from 'lucide-react'

interface CreateInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface MasterRecord {
  id: string
  DOSSIER: string
  CLIENT: string
  DATE: string
  STATUS: string
  NETPAYABLE: string
}

interface InvoiceLine {
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [masterRecords, setMasterRecords] = useState<MasterRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDossier, setSelectedDossier] = useState<MasterRecord | null>(null)
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([
    { description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ])
  const [creatingInvoice, setCreatingInvoice] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Charger les dossiers MASTER
  useEffect(() => {
    if (isOpen) {
      loadMasterRecords()
    }
  }, [isOpen])

  const loadMasterRecords = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('MASTER')
        .select('id, DOSSIER, CLIENT, DATE, STATUS, NETPAYABLE')
        .order('DATE', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Erreur lors du chargement des dossiers:', error)
        setMessage({ type: 'error', text: `Erreur lors du chargement: ${error.message}` })
      } else {
        setMasterRecords(data || [])
      }
    } catch (err) {
      console.error('Erreur chargement dossiers:', err)
      setMessage({ type: 'error', text: 'Erreur lors du chargement des dossiers' })
    } finally {
      setLoading(false)
    }
  }

  // Filtrer les dossiers selon la recherche
  const filteredRecords = masterRecords.filter(record =>
    record.DOSSIER.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.CLIENT.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Gérer les lignes de facturation
  const addInvoiceLine = () => {
    setInvoiceLines([...invoiceLines, { description: '', quantity: 1, unit_price: 0, total_price: 0 }])
  }

  const removeInvoiceLine = (index: number) => {
    if (invoiceLines.length > 1) {
      setInvoiceLines(invoiceLines.filter((_, i) => i !== index))
    }
  }

  const updateInvoiceLine = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...invoiceLines]
    newLines[index] = { ...newLines[index], [field]: value }
    
    // Recalculer le total
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : newLines[index].quantity
      const unitPrice = field === 'unit_price' ? Number(value) : newLines[index].unit_price
      newLines[index].total_price = quantity * unitPrice
    }
    
    setInvoiceLines(newLines)
  }

  // Créer la facture
  const handleCreateInvoice = async () => {
    if (!selectedDossier) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un dossier' })
      return
    }

    if (invoiceLines.some(line => !line.description.trim() || line.unit_price <= 0)) {
      setMessage({ type: 'error', text: 'Veuillez remplir toutes les lignes de facturation' })
      return
    }

    setCreatingInvoice(true)
    setMessage(null)

    try {
      const totalAmount = invoiceLines.reduce((sum, line) => sum + line.total_price, 0)

      const invoiceData = {
        master_id: selectedDossier.id,
        dossier_number: selectedDossier.DOSSIER,
        client_name: selectedDossier.CLIENT,
        invoice_lines: invoiceLines,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        source: 'SkyLogistics WebApp - Modal Création'
      }

      console.log('📋 Données de facture préparées:', invoiceData)

      const result = await sendInvoiceDataToWebhook(invoiceData)

      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        console.log('✅ Facture créée avec succès via n8n')
        
        // Réinitialiser le formulaire
        setTimeout(() => {
          setSelectedDossier(null)
          setInvoiceLines([{ description: '', quantity: 1, unit_price: 0, total_price: 0 }])
          setMessage(null)
          onSuccess?.()
          onClose()
        }, 2000)
      } else {
        setMessage({ type: 'error', text: result.message })
      }

    } catch (error) {
      console.error('❌ Erreur lors de la création de la facture:', error)
      setMessage({ 
        type: 'error', 
        text: `Erreur lors de la création: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      })
    } finally {
      setCreatingInvoice(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Créer une nouvelle facture
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Sélection du dossier */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
              Sélectionner un dossier
            </h3>
            
            {/* Recherche */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par numéro de dossier ou client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Liste des dossiers */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Aucun dossier trouvé
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <div
                    key={record.id}
                    onClick={() => setSelectedDossier(record)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                      selectedDossier?.id === record.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {record.DOSSIER}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {record.CLIENT}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(record.DATE).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.STATUS}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dossier sélectionné */}
          {selectedDossier && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Dossier sélectionné
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Numéro:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100 font-medium">
                    {selectedDossier.DOSSIER}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Client:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100 font-medium">
                    {selectedDossier.CLIENT}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Date:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">
                    {new Date(selectedDossier.DATE).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Statut:</span>
                  <span className="ml-2 text-blue-900 dark:text-blue-100">
                    {selectedDossier.STATUS}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Lignes de facturation */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Lignes de facturation
              </h3>
              <button
                onClick={addInvoiceLine}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              >
                + Ajouter une ligne
              </button>
            </div>

            <div className="space-y-3">
              {invoiceLines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Description de la prestation"
                      value={line.description}
                      onChange={(e) => updateInvoiceLine(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qté"
                      value={line.quantity}
                      onChange={(e) => updateInvoiceLine(index, 'quantity', Number(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Prix unit."
                      value={line.unit_price}
                      onChange={(e) => updateInvoiceLine(index, 'unit_price', Number(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="px-3 py-2 bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md text-right font-medium">
                      {line.total_price.toFixed(2)} €
                    </div>
                  </div>
                  <div className="col-span-1">
                    {invoiceLines.length > 1 && (
                      <button
                        onClick={() => removeInvoiceLine(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 text-right">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                Total: {invoiceLines.reduce((sum, line) => sum + line.total_price, 0).toFixed(2)} €
              </div>
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div className={`p-3 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={!selectedDossier || creatingInvoice || invoiceLines.some(line => !line.description.trim() || line.unit_price <= 0)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md flex items-center"
            >
              {creatingInvoice ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Création...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Créer la facture
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateInvoiceModal
