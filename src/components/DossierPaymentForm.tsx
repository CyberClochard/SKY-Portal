import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useDossierMode } from '../hooks/useDossierMode'
import { DossierPaymentData, ManualAllocationItem, Invoice } from '../types/payments'
import { Settings, CheckCircle, AlertCircle, Plus, X } from 'lucide-react'

interface DossierPaymentFormProps {
  masterId: string
  masterName: string
  customerId: string
  onSuccess?: () => void
}

export const DossierPaymentForm: React.FC<DossierPaymentFormProps> = ({
  masterId,
  masterName,
  customerId,
  onSuccess
}) => {
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'transfer' as DossierPaymentData['payment_method'],
    reference: '',
    notes: ''
  })
  const [dossierMode, setDossierMode] = useState<boolean>(false)
  const [manualAllocations, setManualAllocations] = useState<ManualAllocationItem[]>([])
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const { getDossierMode, createPaymentForDossier } = useDossierMode()
  
  // Charger le mode du dossier au montage
  useEffect(() => {
    const loadDossierMode = async () => {
      const mode = await getDossierMode(masterId)
      setDossierMode(mode)
      
      // Si mode manuel, charger les factures disponibles
      if (mode) {
        loadDossierInvoices()
      }
    }
    
    loadDossierMode()
  }, [masterId])
  
  const loadDossierInvoices = async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('master_id', masterId)
      .in('status', ['unpaid', 'partial'])
      .order('created_at')
    
    setAvailableInvoices(data || [])
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      const { error } = await createPaymentForDossier(
        masterId,
        {
          customer_id: customerId,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.payment_method,
          reference: paymentData.reference || undefined,
          notes: paymentData.notes || undefined
        },
        dossierMode ? manualAllocations : undefined
      )
      
      if (error) {
        setError(`Erreur lors de la création du paiement: ${error.message}`)
      } else {
        setSuccess(`Paiement ${dossierMode ? 'manuel' : 'automatique'} créé avec succès`)
        // Reset form
        setPaymentData({
          amount: '',
          payment_method: 'transfer',
          reference: '',
          notes: ''
        })
        setManualAllocations([])
        onSuccess?.()
      }
    } catch (err) {
      setError('Erreur inattendue lors de la création du paiement')
    } finally {
      setLoading(false)
    }
  }
  
  const addAllocation = () => {
    setManualAllocations(prev => [...prev, { invoice_id: '', amount_allocated: 0 }])
  }
  
  const updateAllocation = (index: number, field: 'invoice_id' | 'amount_allocated', value: string | number) => {
    setManualAllocations(prev => 
      prev.map((alloc, i) => 
        i === index ? { ...alloc, [field]: value } : alloc
      )
    )
  }
  
  const removeAllocation = (index: number) => {
    setManualAllocations(prev => prev.filter((_, i) => i !== index))
  }
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }
  
  const getRemainingAmount = (invoice: Invoice): number => {
    return invoice.amount_total - invoice.amount_paid
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Nouveau paiement</h3>
        <p className="text-sm text-gray-600">Dossier: {masterName}</p>
      </div>
      
      {/* Indicateur du mode du dossier */}
      <div className={`p-4 rounded-lg border ${
        dossierMode 
          ? 'bg-orange-50 border-orange-200' 
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center space-x-2">
          {dossierMode ? (
            <>
              <Settings className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">Mode manuel activé</span>
              <span className="text-xs text-orange-600">- Allocation manuelle requise</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Mode automatique</span>
              <span className="text-xs text-green-600">- Allocation automatique</span>
            </>
          )}
        </div>
      </div>
      
      {/* Messages d'erreur/succès */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{success}</span>
          </div>
        </div>
      )}
      
      {/* Champs de paiement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Montant *
          </label>
          <input
            type="number"
            step="0.01"
            value={paymentData.amount}
            onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mode de paiement *
          </label>
          <select
            value={paymentData.payment_method}
            onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value as DossierPaymentData['payment_method'] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="transfer">Virement</option>
            <option value="check">Chèque</option>
            <option value="card">Carte bancaire</option>
            <option value="cash">Espèces</option>
            <option value="other">Autre</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Référence
        </label>
        <input
          type="text"
          value={paymentData.reference}
          onChange={(e) => setPaymentData(prev => ({ ...prev, reference: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="N° virement, chèque..."
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={paymentData.notes}
          onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Informations complémentaires..."
        />
      </div>
      
      {/* Section allocation manuelle (visible seulement si dossier en mode manuel) */}
      {dossierMode && (
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900">Allocation manuelle requise</h4>
            <button
              type="button"
              onClick={addAllocation}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une allocation</span>
            </button>
          </div>
          
          {manualAllocations.map((allocation, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 mb-3 p-3 bg-gray-50 rounded-md">
              <div className="col-span-6">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Facture
                </label>
                <select
                  value={allocation.invoice_id}
                  onChange={(e) => updateAllocation(index, 'invoice_id', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  required
                >
                  <option value="">Sélectionner une facture</option>
                  {availableInvoices.map(invoice => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} (Reste: {formatCurrency(getRemainingAmount(invoice))})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Montant
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={allocation.amount_allocated || ''}
                  onChange={(e) => updateAllocation(index, 'amount_allocated', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={() => removeAllocation(index)}
                  className="w-full h-8 text-red-600 hover:text-red-700 text-sm flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {dossierMode && manualAllocations.length === 0 && (
            <div className="text-center py-4 text-orange-600 bg-orange-50 border border-orange-200 rounded-md">
              <AlertCircle className="w-5 h-5 mx-auto mb-2" />
              <p className="text-sm">Allocation manuelle requise - Ajoutez au moins une allocation</p>
            </div>
          )}
        </div>
      )}
      
      <button
        type="submit"
        disabled={loading || !paymentData.amount || (dossierMode && manualAllocations.length === 0)}
        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          dossierMode 
            ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' 
            : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        }`}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Création en cours...</span>
          </div>
        ) : (
          <span>
            {dossierMode ? 'Créer paiement manuel' : 'Créer paiement automatique'}
          </span>
        )}
      </button>
    </form>
  )
}

export default DossierPaymentForm 