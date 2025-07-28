import React, { useState, useMemo } from 'react'
import { usePayments } from '../hooks/usePayments'
import { Payment, PaymentFormProps, PaymentWithCustomer } from '../types/payments'
import PaymentForm from './PaymentForm'
import ManualAllocationModal from './ManualAllocationModal'
import PaymentAllocationTable from './PaymentAllocationTable'
import SearchAndFilters from './SearchAndFilters'
import { Plus, Euro, FileText, CreditCard, Calendar, User, Eye, Trash2, Edit } from 'lucide-react'

const PaymentsPage: React.FC = () => {
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithCustomer | null>(null)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [showAllocations, setShowAllocations] = useState<string | null>(null)
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const { payments, loading, error, createPayment, updatePayment, deletePayment } = usePayments()

  const handlePaymentSuccess = (payment: PaymentWithCustomer) => {
    setShowPaymentForm(false)
    
    // Si le paiement n'a pas d'allocation automatique, ouvrir le modal d'allocation manuelle
    if (!payment.auto_allocate) {
      setSelectedPayment(payment)
      setShowAllocationModal(true)
    }
  }

  const handleAllocationSuccess = () => {
    setShowAllocationModal(false)
    setSelectedPayment(null)
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce paiement ?')) {
      await deletePayment(paymentId)
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'transfer':
        return <CreditCard className="w-4 h-4" />
      case 'check':
        return <FileText className="w-4 h-4" />
      case 'card':
        return <CreditCard className="w-4 h-4" />
      case 'cash':
        return <Euro className="w-4 h-4" />
      default:
        return <Euro className="w-4 h-4" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'transfer':
        return 'Virement'
      case 'check':
        return 'Chèque'
      case 'card':
        return 'Carte bancaire'
      case 'cash':
        return 'Espèces'
      case 'other':
        return 'Autre'
      default:
        return method
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    } as Record<string, string>

    const labels = {
      pending: 'En attente',
      completed: 'Terminé',
      cancelled: 'Annulé'
    } as Record<string, string>

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {labels[status] || labels.pending}
      </span>
    )
  }

  // Filtrage des paiements
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Filtre par recherche
      const searchMatch = !searchTerm || 
        payment.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par statut
      const statusMatch = !statusFilter || payment.status === statusFilter

      // Filtre par mode de paiement
      const methodMatch = !methodFilter || payment.payment_method === methodFilter

      // Filtre par date
      const dateMatch = !dateFilter || (() => {
        const paymentDate = new Date(payment.created_at)
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        switch (dateFilter) {
          case 'today':
            return paymentDate.toDateString() === today.toDateString()
          case 'yesterday':
            return paymentDate.toDateString() === yesterday.toDateString()
          case 'last_week':
            return paymentDate >= lastWeek
          case 'last_month':
            return paymentDate >= lastMonth
          default:
            return true
        }
      })()

      return searchMatch && statusMatch && methodMatch && dateMatch
    })
  }, [payments, searchTerm, statusFilter, methodFilter, dateFilter])

  // Options pour les filtres
  const filterOptions = {
    status: {
      label: 'Statut',
      options: [
        { value: 'pending', label: 'En attente' },
        { value: 'completed', label: 'Terminé' },
        { value: 'cancelled', label: 'Annulé' }
      ],
      value: statusFilter,
      onChange: setStatusFilter
    },
    method: {
      label: 'Mode de paiement',
      options: [
        { value: 'transfer', label: 'Virement' },
        { value: 'check', label: 'Chèque' },
        { value: 'card', label: 'Carte bancaire' },
        { value: 'cash', label: 'Espèces' },
        { value: 'other', label: 'Autre' }
      ],
      value: methodFilter,
      onChange: setMethodFilter
    },
    date: {
      label: 'Période',
      options: [
        { value: 'today', label: 'Aujourd\'hui' },
        { value: 'yesterday', label: 'Hier' },
        { value: 'last_week', label: 'Cette semaine' },
        { value: 'last_month', label: 'Ce mois' }
      ],
      value: dateFilter,
      onChange: setDateFilter
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Règlements</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gérer les paiements clients et leurs allocations
          </p>
        </div>
        <button
          onClick={() => setShowPaymentForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau paiement</span>
        </button>
      </div>

      {/* Modal de formulaire de paiement */}
      <PaymentForm
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSuccess={handlePaymentSuccess}
      />

      {/* Recherche et filtres */}
      <SearchAndFilters
        searchPlaceholder="Rechercher par client, référence, notes..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filterOptions}
        onClearAll={() => {
          setSearchTerm('')
          setStatusFilter('')
          setMethodFilter('')
          setDateFilter('')
        }}
      />

      {/* Liste des paiements */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Paiements récents
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400">
            <p>Erreur lors du chargement des paiements</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            <Euro className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>{payments.length === 0 ? 'Aucun paiement trouvé' : 'Aucun paiement ne correspond aux critères de recherche'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {payment.customer?.name || payment.customer_id}
                        </div>
                        {payment.customer?.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                            ({payment.customer.email})
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowAllocations(showAllocations === payment.id ? null : payment.id)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Voir les allocations"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!payment.auto_allocate && (
                          <button
                            onClick={() => {
                              setSelectedPayment(payment)
                              setShowAllocationModal(true)
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Allouer manuellement"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Supprimer le paiement"
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
        )}
      </div>

      {/* Affichage des allocations */}
      {showAllocations && (
        <PaymentAllocationTable
          paymentId={showAllocations}
          onAllocationChange={() => {
            // Rafraîchir la liste des paiements si nécessaire
          }}
        />
      )}

      {/* Modal d'allocation manuelle */}
      <ManualAllocationModal
        isOpen={showAllocationModal}
        payment={selectedPayment}
        onClose={() => {
          setShowAllocationModal(false)
          setSelectedPayment(null)
        }}
        onSuccess={handleAllocationSuccess}
      />
    </div>
  )
}

export default PaymentsPage 