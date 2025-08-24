import React, { useState, useEffect } from 'react'
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
  const [editingLine, setEditingLine] = useState({
    description: '',
    quantity: 1,
    unit_price: 0
  })
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
        </div>
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
                Sauvegarder
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Liste des lignes existantes */}
      <div className="space-y-3">
        {invoiceLines.map((line) => (
          <div key={line.id} className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            {editingId === line.id ? (
              // Mode édition
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingLine.description}
                    onChange={(e) => setEditingLine(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    value={editingLine.quantity}
                    onChange={(e) => setEditingLine(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
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
                      value={editingLine.unit_price}
                      onChange={(e) => setEditingLine(prev => ({ ...prev, unit_price: Number(e.target.value) || 0 }))}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-2 text-sm text-gray-500">€</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateLine(line.id, editingLine)}
                    disabled={!editingLine.description.trim()}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Mode affichage
              <>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">{line.description}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Qté: {line.quantity} × {formatCurrency(line.unit_price)} = {formatCurrency(line.total_price)}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingId(line.id)
                      setEditingLine({
                        description: line.description,
                        quantity: line.quantity,
                        unit_price: line.unit_price
                      })
                    }}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLine(line.id)}
                    className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {invoiceLines.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Aucune ligne de facturation</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter" pour créer la première ligne</p>
        </div>
      )}
    </div>
  )
}
