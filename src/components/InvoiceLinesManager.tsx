import React, { useState } from 'react'
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react'
import { useInvoiceLines, InvoiceLineFormData } from '../hooks/useInvoiceLines'

interface InvoiceLinesManagerProps {
  dossierNumber: string
  onUpdate?: () => void
}

export const InvoiceLinesManager: React.FC<InvoiceLinesManagerProps> = ({
  dossierNumber,
  onUpdate
}) => {
  const {
    invoiceLines,
    invoiceHeader,
    loading,
    error,
    totals,
    createInvoiceLine,
    updateInvoiceLine,
    deleteInvoiceLine,
    reorderInvoiceLines,
    upsertInvoiceHeader
  } = useInvoiceLines({ dossierNumber })

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLine, setEditingLine] = useState<string | null>(null)
  const [formData, setFormData] = useState<InvoiceLineFormData>({
    designation: '',
    quantite: 1,
    prix_unitaire: 0,
    taux_tva: 20,
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingLine) {
      const success = await updateInvoiceLine(editingLine, formData)
      if (success) {
        setEditingLine(null)
        setFormData({ designation: '', quantite: 1, prix_unitaire: 0, taux_tva: 20, notes: '' })
        onUpdate?.()
      }
    } else {
      const newLine = await createInvoiceLine(formData)
      if (newLine) {
        setShowAddForm(false)
        setFormData({ designation: '', quantite: 1, prix_unitaire: 0, taux_tva: 20, notes: '' })
        onUpdate?.()
      }
    }
  }

  const handleEdit = (line: any) => {
    setEditingLine(line.id)
    setFormData({
      designation: line.designation,
      quantite: line.quantite,
      prix_unitaire: line.prix_unitaire,
      taux_tva: line.taux_tva,
      notes: line.notes || ''
    })
  }

  const handleDelete = async (lineId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
      const success = await deleteInvoiceLine(lineId)
      if (success) {
        onUpdate?.()
      }
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingLine(null)
    setFormData({ designation: '', quantite: 1, prix_unitaire: 0, taux_tva: 20, notes: '' })
  }

  if (loading) {
    return <div className="text-center py-4">Chargement des lignes de facturation...</div>
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">Erreur: {error}</div>
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec totaux */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total HT</div>
            <div className="text-lg font-semibold">{totals.totalHT.toFixed(2)} €</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total TVA</div>
            <div className="text-lg font-semibold">{totals.totalTVA.toFixed(2)} €</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total TTC</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {totals.totalTTC.toFixed(2)} €
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'ajout */}
      {!showAddForm && !editingLine && (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter une ligne
        </button>
      )}

      {/* Formulaire d'ajout/modification */}
      {(showAddForm || editingLine) && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Désignation *
              </label>
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.quantite}
                onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix unitaire HT *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.prix_unitaire}
                onChange={(e) => setFormData({ ...formData, prix_unitaire: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Taux TVA (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.taux_tva}
                onChange={(e) => setFormData({ ...formData, taux_tva: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingLine ? 'Modifier' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des lignes */}
      {invoiceLines.length > 0 && (
        <div className="space-y-2">
          {invoiceLines.map((line, index) => (
            <div
              key={line.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border flex items-center gap-3"
            >
              <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
              
              <div className="flex-1">
                <div className="font-medium">{line.designation}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {line.quantite} × {line.prix_unitaire.toFixed(2)} € HT
                  {line.notes && ` • ${line.notes}`}
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium">{line.montant_ttc.toFixed(2)} € TTC</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {line.montant_ht.toFixed(2)} € HT + {line.montant_tva.toFixed(2)} € TVA ({line.taux_tva}%)
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(line)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(line.id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message si aucune ligne */}
      {invoiceLines.length === 0 && !showAddForm && !editingLine && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Aucune ligne de facturation pour ce dossier.
          <br />
          <button
            onClick={() => setShowAddForm(true)}
            className="text-blue-600 hover:text-blue-800 underline mt-2"
          >
            Ajouter la première ligne
          </button>
        </div>
      )}
    </div>
  )
}
