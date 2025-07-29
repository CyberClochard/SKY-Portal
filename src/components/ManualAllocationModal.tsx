import React, { useState, useEffect } from 'react'
import { Payment, InvoiceSummary, ManualAllocationModalProps } from '../types/payments'
import { useUnpaidInvoices } from '../hooks/useUnpaidInvoices'
import { usePaymentAllocations } from '../hooks/usePaymentAllocations'
import { X, Euro, FileText, CheckCircle, AlertCircle, Loader2, Calculator } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

const ManualAllocationModal: React.FC<ManualAllocationModalProps> = ({ 
  isOpen, 
  payment, 
  onClose, 
  onSuccess 
}) => {
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: number }>({})
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Hooks
  const { invoices, loading: loadingInvoices, error: invoicesError } = useUnpaidInvoices({
    customerId: payment?.customer_id,
    includePartial: true
  })

  const { createManualAllocation, allocatePaymentAutomatically } = usePaymentAllocations({
    paymentId: payment?.id || ''
  })

  // Initialiser le montant restant
  useEffect(() => {
    if (payment) {
      setRemainingAmount(payment.amount)
    }
  }, [payment])

  // Désactiver la molette de souris sur les champs numériques
  useEffect(() => {
    const preventWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
        e.preventDefault()
      }
    }

    document.addEventListener('wheel', preventWheel, { passive: false })
    return () => document.removeEventListener('wheel', preventWheel)
  }, [])

  // Calculer le montant restant en temps réel
  useEffect(() => {
    if (payment) {
      const totalAllocated = Object.values(allocations).reduce((sum, amount) => sum + amount, 0)
      setRemainingAmount(payment.amount - totalAllocated)
    }
  }, [allocations, payment])

  const handleAllocationChange = (invoiceId: string, amount: number) => {
    setAllocations(prev => ({
      ...prev,
      [invoiceId]: amount
    }))

    // Effacer les messages
    if (error) setError(null)
    if (success) setSuccess(null)
  }

  const handleAutoAllocateRemaining = async () => {
    if (!payment) return

    try {
      setSubmitting(true)
      setError(null)

      const success = await allocatePaymentAutomatically(payment.id)
      
      if (success) {
        setSuccess('Allocation automatique du montant restant effectuée')
        // Attendre un peu pour que la base de données se mette à jour
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 500)
      } else {
        setError('Erreur lors de l\'allocation automatique')
      }
    } catch (err) {
      setError('Erreur lors de l\'allocation automatique')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!payment) return

    try {
      setSubmitting(true)
      setError(null)

      // Filtrer les allocations avec des montants > 0
      const validAllocations = Object.entries(allocations)
        .filter(([_, amount]) => amount > 0)
        .map(([invoiceId, amount]) => ({
          invoice_id: invoiceId,
          amount_allocated: amount
        }))

      if (validAllocations.length === 0) {
        setError('Veuillez saisir au moins une allocation')
        return
      }

      const success = await createManualAllocation({
        payment_id: payment.id,
        allocations: validAllocations
      })

      if (success) {
        setSuccess('Allocation manuelle effectuée avec succès')
        // Attendre un peu pour que la base de données se mette à jour
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 500)
      } else {
        setError('Erreur lors de l\'allocation manuelle')
      }
    } catch (err) {
      setError('Erreur lors de l\'allocation manuelle')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    // Vérifier si le montant est valide
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0,00 €'
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }



  if (!isOpen || !payment) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Allocation Manuelle
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Répartir le paiement de {formatCurrency(payment.amount)} sur les factures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Erreur</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Résumé du paiement */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-300">Paiement à allouer</h3>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 dark:text-blue-400">Montant restant</p>
                <p className={`text-lg font-bold ${remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Liste des factures */}
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des factures...</span>
            </div>
          ) : invoicesError ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>Erreur lors du chargement des factures</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2" />
              <p>Aucune facture impayée trouvée pour ce client</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Factures impayées
              </h3>
              
              {invoices
                .sort((a, b) => {
                  // Tri par date d'échéance (plus ancienne en premier)
                  const dateA = new Date(a.due_date || 0)
                  const dateB = new Date(b.due_date || 0)
                  if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime()
                  }
                  // Si même date d'échéance, tri par numéro de facture
                  return (a.invoice_number || '').localeCompare(b.invoice_number || '')
                })
                .map((invoice) => (
                <div key={invoice.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {invoice.invoice_number}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Échéance : {formatDate(invoice.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Montant restant</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(invoice.amount_remaining || (invoice.amount_total - invoice.amount_paid))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Montant à allouer
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={invoice.amount_remaining || (invoice.amount_total - invoice.amount_paid)}
                          value={allocations[invoice.id] || 0}
                          onChange={(e) => handleAllocationChange(invoice.id, parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                          placeholder="0.00"
                          disabled={submitting}
                        />
                        <span className="absolute right-3 top-2 text-sm text-gray-500">€</span>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Max: {formatCurrency(invoice.amount_remaining || (invoice.amount_total - invoice.amount_paid))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Validation en temps réel */}
          {remainingAmount < 0 && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                <strong>Attention :</strong> Le montant alloué ({formatCurrency(payment.amount - remainingAmount)}) 
                dépasse le montant du paiement ({formatCurrency(payment.amount)})
              </p>
            </div>
          )}

          {remainingAmount > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note :</strong> Il reste {formatCurrency(remainingAmount)} à allouer
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {remainingAmount > 0 && (
                <button
                  type="button"
                  onClick={handleAutoAllocateRemaining}
                  disabled={submitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4" />
                  )}
                  <span>Allouer automatiquement le reste</span>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                disabled={submitting}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || remainingAmount < 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Allocation...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Valider l'allocation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManualAllocationModal 