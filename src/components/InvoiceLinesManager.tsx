import React, { useState } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useInvoiceLines, InvoiceLine } from '../hooks/useInvoiceLines'

interface InvoiceLinesManagerProps {
  masterId: string
  onUpdate?: () => void
}

export const InvoiceLinesManager: React.FC<InvoiceLinesManagerProps> = ({
  masterId,
  onUpdate
}) => {
  const {
    invoiceLines,
    loading,
    error,
    createInvoiceLine,
    updateInvoiceLine,
    deleteInvoiceLine
  } = useInvoiceLines({ masterId })

  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newLine, setNewLine] = useState({
    description: '',
    quantity: 1,
    unit_price: 0
  })

  const handleAddLine = async () => {
    if (!newLine.description.trim()) return

    const success = await createInvoiceLine({
      master_id: masterId,
      description: newLine.description.trim(),
      quantity: newLine.quantity,
      unit_price: newLine.unit_price
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Lignes de facturation ({invoiceLines.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        )}
      </div>

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
    </div>
  )
}
