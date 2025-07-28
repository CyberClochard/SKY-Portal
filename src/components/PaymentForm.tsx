import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { PaymentFormData, Payment, Customer, PaymentWithCustomer } from '../types/payments'
import { Euro, User, CreditCard, CheckCircle, AlertCircle, Loader2, X, Edit } from 'lucide-react'

interface PaymentFormModalProps {
  isOpen: boolean
  onClose: () => void
  customerId?: string
  onSuccess?: (payment: PaymentWithCustomer) => void
}

const PaymentForm: React.FC<PaymentFormModalProps> = ({ isOpen, onClose, customerId, onSuccess }) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    customer_id: customerId || '',
    amount: 0,
    payment_method: 'transfer',
    reference: '',
    notes: '',
    auto_allocate: true
  })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Charger la liste des clients
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name')

        if (error) throw error
        setCustomers(data || [])
      } catch (err) {
        console.error('Erreur lors du chargement des clients:', err)
      }
    }

    fetchCustomers()
  }, [])

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Effacer les messages d'erreur/succès quand l'utilisateur modifie
    if (error) setError(null)
    if (success) setSuccess(null)
  }

  const validateForm = (): boolean => {
    if (!formData.customer_id) {
      setError('Veuillez sélectionner un client')
      return false
    }
    if (formData.amount <= 0) {
      setError('Le montant doit être supérieur à 0')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...formData,
          status: 'completed'
        }])
        .select()
        .single()

      if (error) throw error

      setSuccess('Paiement créé avec succès')
      
      // Si allocation automatique, appeler la fonction SQL
      if (formData.auto_allocate && data) {
        try {
          await supabase.rpc('allocate_payment_automatically', {
            payment_uuid: data.id
          })
        } catch (allocationError) {
          console.error('Erreur lors de l\'allocation automatique:', allocationError)
          // Ne pas bloquer le succès du paiement si l'allocation échoue
        }
      }

      // Callback de succès
      if (onSuccess && data) {
        onSuccess(data)
      }

      // Réinitialiser le formulaire
      setFormData({
        customer_id: customerId || '',
        amount: 0,
        payment_method: 'transfer',
        reference: '',
        notes: '',
        auto_allocate: true
      })

      // Fermer le modal
      onClose()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  // Gestion de la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

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

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={handleOverlayClick}>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Nouveau Règlement</h3>
                <p className="text-gray-600 dark:text-gray-400">Saisir un nouveau paiement client</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 flex-1 overflow-y-auto">
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

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Client *
              </label>
              <select
                value={formData.customer_id}
                onChange={(e) => handleInputChange('customer_id', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="">Sélectionner un client</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Euro className="w-4 h-4 inline mr-2" />
                Montant *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                  placeholder="0.00"
                  disabled={submitting}
                />
                <span className="absolute right-4 top-3 text-gray-500">€</span>
              </div>
              {formData.amount > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Montant saisi : {formatCurrency(formData.amount)}
                </p>
              )}
            </div>

            {/* Mode de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <CreditCard className="w-4 h-4 inline mr-2" />
                Mode de paiement *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="transfer">Virement</option>
                <option value="check">Chèque</option>
                <option value="card">Carte bancaire</option>
                <option value="cash">Espèces</option>
                <option value="other">Autre</option>
              </select>
            </div>

            {/* Référence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Référence
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Numéro de chèque, référence virement..."
                disabled={submitting}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informations complémentaires..."
                disabled={submitting}
              />
            </div>

            {/* Allocation automatique */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="auto_allocate"
                checked={formData.auto_allocate}
                onChange={(e) => handleInputChange('auto_allocate', e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                disabled={submitting}
              />
              <label htmlFor="auto_allocate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Allocation automatique
              </label>
            </div>

            {!formData.auto_allocate && (
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <Edit className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                      Allocation manuelle
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Ce paiement sera créé sans allocation automatique. Vous pourrez l'allouer manuellement plus tard depuis la liste des paiements.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={submitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Création...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Créer le paiement</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentForm 