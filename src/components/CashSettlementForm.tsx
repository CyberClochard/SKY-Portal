import React, { useState } from 'react'
import { useCashSettlements } from '../hooks/useCashSettlements'
import { CashSettlementFormData } from '../types/payments'

interface CashSettlementFormProps {
  masterId: string
  masterName: string
  customerId: string
  onSuccess?: () => void
}

export const CashSettlementForm: React.FC<CashSettlementFormProps> = ({
  masterId,
  masterName,
  customerId,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    notes: ''
  })
  
  const { addCashSettlement, loading } = useCashSettlements()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const settlementData: CashSettlementFormData = {
      master_id: masterId,
      customer_id: customerId,
      amount: parseFloat(formData.amount),
      notes: formData.notes || undefined,
      created_by: 'current_user' // À remplacer par l'utilisateur connecté
    }
    
    const result = await addCashSettlement(settlementData)
    
    if (result.success) {
      setFormData({ amount: '', notes: '' })
      onSuccess?.()
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 p-4 rounded-md">
        <div className="flex items-center space-x-2">
          <span className="text-orange-600">💵</span>
          <div>
            <h3 className="font-medium text-orange-900">Règlement en espèces</h3>
            <p className="text-sm text-orange-700">
              Dossier: {masterName} • Enregistrement hors comptabilité officielle
            </p>
          </div>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Montant réglé en espèces
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          placeholder="0.00"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          ⚠️ Ce montant ne sera pas comptabilisé dans la facturation officielle
        </p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes (optionnel)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
          rows={3}
          placeholder="Détails du règlement, circonstances, etc."
        />
      </div>
      
      <button
        type="submit"
        disabled={!formData.amount || loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
      >
        {loading ? 'Enregistrement...' : 'Enregistrer le règlement espèces'}
      </button>
    </form>
  )
}

export default CashSettlementForm 