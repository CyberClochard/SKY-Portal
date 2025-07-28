import React from 'react'
import { PaymentAllocationDetails, PaymentAllocationTableProps } from '../types/payments'
import { usePaymentAllocations } from '../hooks/usePaymentAllocations'
import { FileText, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react'

const PaymentAllocationTable: React.FC<PaymentAllocationTableProps> = ({ 
  paymentId, 
  onAllocationChange 
}) => {
  const { allocations, loading, error, deleteAllocation } = usePaymentAllocations({
    paymentId
  })

  const handleDeleteAllocation = async (allocationId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette allocation ?')) {
      const success = await deleteAllocation(allocationId)
      if (success && onAllocationChange) {
        onAllocationChange()
      }
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const getStatusBadge = (amountAllocated: number, invoiceTotal: number) => {
    const percentage = (amountAllocated / invoiceTotal) * 100
    
    if (percentage >= 100) {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
          Payée
        </span>
      )
    } else if (percentage > 0) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          Partielle
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
          Impayée
        </span>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des allocations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>Erreur lors du chargement des allocations</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (allocations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        <FileText className="w-8 h-8 mx-auto mb-2" />
        <p>Aucune allocation trouvée pour ce paiement</p>
      </div>
    )
  }

  const totalAllocated = allocations.reduce((sum, allocation) => sum + allocation.amount_allocated, 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Allocations du paiement
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total alloué : {formatCurrency(totalAllocated)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Facture
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Montant alloué
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Date d'allocation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {allocations.map((allocation) => (
              <tr key={allocation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {allocation.invoice_number}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Réf: {allocation.payment_reference || 'N/A'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(allocation.amount_allocated)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(allocation.allocation_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(allocation.amount_allocated, allocation.payment_amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteAllocation(allocation.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Supprimer l'allocation"
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

      {/* Résumé */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {allocations.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Allocations
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAllocated)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total alloué
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {allocations.filter(a => a.amount_allocated > 0).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Factures concernées
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentAllocationTable 