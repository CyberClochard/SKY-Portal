import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, FileText } from 'lucide-react'
import { useInvoiceLines, InvoiceLine } from '../hooks/useInvoiceLines'
import { sendInvoiceDataToWebhook, testWebhookConnectivity } from '../lib/supabase'
import { InvoicePDFDownload } from './InvoicePDFDownload'

interface InvoiceLinesManagerProps {
  masterId: string
  onUpdate?: () => void
}

export const InvoiceLinesManager: React.FC<InvoiceLinesManagerProps> = ({
  masterId,
  onUpdate
}) => {
  console.log('🔍 InvoiceLinesManager: Rendu avec masterId:', masterId)
  
  const {
    invoiceLines,
    loading,
    error,
    createInvoiceLine,
    updateInvoiceLine,
    deleteInvoiceLine
  } = useInvoiceLines({ masterId })

  console.log('🔍 InvoiceLinesManager: État actuel:', { 
    lignesCount: invoiceLines.length, 
    loading, 
    error,
    masterId 
  })

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newLine, setNewLine] = useState({
    description: '',
    quantity: 1,
    unit_price: 0
  })
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false)
  const [invoiceMessage, setInvoiceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPDFDownload, setShowPDFDownload] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | undefined>()
  const [pdfFileName, setPdfFileName] = useState<string | undefined>()

  // Effet pour surveiller les changements d'état du PDF
  useEffect(() => {
    console.log('🔍 État PDF mis à jour:')
    console.log('  - showPDFDownload:', showPDFDownload)
    console.log('  - pdfBlob:', pdfBlob ? `Blob de ${pdfBlob.size} bytes` : 'undefined')
    console.log('  - pdfFileName:', pdfFileName)
  }, [showPDFDownload, pdfBlob, pdfFileName])

  const handleAddLine = async () => {
    if (!newLine.description.trim()) return

    const success = await createInvoiceLine({
      master_id: masterId,
      description: newLine.description.trim(),
      quantity: newLine.quantity,
      unit_price: newLine.unit_price,
    })

      if (success) {
      setNewLine({ description: '', quantity: 1, unit_price: 0 })
      setIsAdding(false)
        onUpdate?.()
      }
  }

  const handleUpdateLine = async (id: string, updates: Partial<InvoiceLine>) => {
    const success = await updateInvoiceLine(id, updates)
    if (success) {
      setEditingId(null)
        onUpdate?.()
    }
  }

  const handleDeleteLine = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
      const success = await deleteInvoiceLine(id)
      if (success) {
        onUpdate?.()
      }
    }
  }

  const handleTestConnectivity = async () => {
    setIsTestingConnectivity(true)
    setInvoiceMessage(null)

    try {
      console.log('🔍 Test de connectivité au webhook n8n...')
      const result = await testWebhookConnectivity()

      if (result.success) {
        setInvoiceMessage({ type: 'success', text: result.message })
        console.log('✅ Test de connectivité réussi:', result.details)
      } else {
        setInvoiceMessage({ type: 'error', text: result.message })
        console.error('❌ Test de connectivité échoué:', result.details)
      }

    } catch (error) {
      console.error('❌ Erreur lors du test de connectivité:', error)
      setInvoiceMessage({ 
        type: 'error', 
        text: `Erreur lors du test: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      })
    } finally {
      setIsTestingConnectivity(false)
    }
  }

  const handleCreateInvoice = async () => {
    if (invoiceLines.length === 0) {
      setInvoiceMessage({ type: 'error', text: 'Aucune ligne de facturation à traiter' })
      return
    }

    setIsCreatingInvoice(true)
    setInvoiceMessage(null)

    try {
      // Calculer le montant total
      const totalAmount = invoiceLines.reduce((sum, line) => sum + line.total_price, 0)

      // Préparer les données pour le webhook
      const invoiceData = {
        master_id: masterId,
        dossier_number: masterId,
        client_name: `Dossier ${masterId}`,
        invoice_lines: invoiceLines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total_price: line.total_price
        })),
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        source: 'SkyLogistics WebApp'
      }

      console.log('📋 Données de facture préparées:', invoiceData)

      // Envoyer au webhook n8n
      const result = await sendInvoiceDataToWebhook(invoiceData)

      if (result.success) {
        setInvoiceMessage({ type: 'success', text: result.message })
        console.log('✅ Facture créée avec succès via n8n')
        
        // Si un PDF a été généré, afficher le composant de téléchargement
        if (result.pdfBlob) {
          console.log('📄 PDF binaire reçu:', result.pdfBlob)
          console.log('📄 Nom du fichier:', result.fileName)
          setPdfBlob(result.pdfBlob)
          setPdfFileName(result.fileName)
          setShowPDFDownload(true)
          console.log('📄 État showPDFDownload mis à true')
          console.log('📄 État pdfBlob mis à jour')
          console.log('📄 État pdfFileName mis à jour')
        }
      } else {
        setInvoiceMessage({ type: 'error', text: result.message })
        console.error('❌ Erreur lors de la création de la facture:', result.message)
      }

    } catch (error) {
      console.error('❌ Erreur lors de la création de la facture:', error)
      setInvoiceMessage({ 
        type: 'error', 
        text: `Erreur lors de la création de la facture: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      })
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p className="font-medium">Erreur lors du chargement des lignes de facturation</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bouton Ajouter */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Lignes de facturation
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-1" />
            Ajouter
          </button>
          <button
            onClick={handleTestConnectivity}
              disabled={isTestingConnectivity}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Tester la connectivité au webhook n8n"
            >
              🔍
              {isTestingConnectivity ? 'Test...' : 'Test Webhook'}
            </button>
            <button
              onClick={handleCreateInvoice}
              disabled={isCreatingInvoice || invoiceLines.length === 0}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 mr-1" />
              {isCreatingInvoice ? 'Création...' : 'Créer Facture'}
            </button>
        </div>
      </div>

      {/* Messages de succès/erreur */}
      {invoiceMessage && (
        <div className={`mb-4 p-3 rounded-md ${
          invoiceMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
        }`}>
          {invoiceMessage.text}
        </div>
      )}

      {/* Formulaire d'ajout */}
      {isAdding && (
        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description *
              </label>
              <input
                type="text"
                value={newLine.description}
                onChange={(e) => setNewLine(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du produit/service"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantité
              </label>
              <input
                type="number"
                value={newLine.quantity}
                onChange={(e) => setNewLine(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix unitaire
              </label>
              <div className="relative">
              <input
                type="number"
                  value={newLine.unit_price}
                  onChange={(e) => setNewLine(prev => ({ ...prev, unit_price: Number(e.target.value) || 0 }))}
                step="0.01"
                min="0"
                  className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-2 text-sm text-gray-500">€</span>
            </div>
          </div>
            <div className="flex space-x-2">
            <button
                onClick={handleAddLine}
                disabled={!newLine.description.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
            >
                <Save className="w-4 h-4" />
            </button>
            <button
                onClick={() => {
                  setIsAdding(false)
                  setNewLine({ description: '', quantity: 1, unit_price: 0 })
                }}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
            </button>
          </div>
                </div>
              </div>
      )}

      {/* Tableau des lignes */}
      {invoiceLines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 dark:border-gray-600 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prix unitaire
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {invoiceLines.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    {editingId === line.id ? (
                      <input
                        type="text"
                        defaultValue={line.description}
                        onBlur={(e) => handleUpdateLine(line.id, { description: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <span className="text-gray-900 dark:text-white">{line.description}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === line.id ? (
                      <input
                        type="number"
                        defaultValue={line.quantity}
                        onBlur={(e) => handleUpdateLine(line.id, { quantity: Number(e.target.value) || 1 })}
                        onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        min="1"
                        className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ) : (
                      <span className="text-gray-900 dark:text-white">{line.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === line.id ? (
                      <div className="relative">
                        <input
                          type="number"
                          defaultValue={line.unit_price}
                          onBlur={(e) => handleUpdateLine(line.id, { unit_price: Number(e.target.value) || 0 })}
                          onKeyPress={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          step="0.01"
                          min="0"
                          className="w-24 px-2 py-1 pr-6 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <span className="absolute right-2 top-1 text-xs text-gray-500">€</span>
                </div>
                    ) : (
                      <span className="text-gray-900 dark:text-white">{formatCurrency(line.unit_price)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(line.total_price)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      {editingId === line.id ? (
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-green-600 hover:text-green-800"
                          title="Sauvegarder"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      ) : (
                <button
                          onClick={() => setEditingId(line.id)}
                          className="text-blue-600 hover:text-blue-800"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </button>
                      )}
                <button
                        onClick={() => handleDeleteLine(line.id)}
                        className="text-red-600 hover:text-red-800"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
                  </td>
                </tr>
          ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Aucune ligne de facturation</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter" pour créer la première ligne</p>
        </div>
      )}

      {/* Composant de téléchargement PDF */}
      <InvoicePDFDownload
        isVisible={showPDFDownload}
        pdfBlob={pdfBlob}
        fileName={pdfFileName}
        onClose={() => {
          console.log('🔒 Fermeture du modal PDF')
          setShowPDFDownload(false)
          setPdfBlob(undefined)
          setPdfFileName(undefined)
        }}
      />

      {/* Indicateur de débogage temporaire */}
      {showPDFDownload && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-2 rounded z-50">
          🔴 DEBUG: Modal PDF activé
          <br />
          Blob: {pdfBlob ? `${pdfBlob.size} bytes` : 'undefined'}
          <br />
          File: {pdfFileName || 'undefined'}
        </div>
      )}
    </div>
  )
}
