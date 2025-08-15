import React, { useState, useMemo } from 'react'
import { usePayments } from '../hooks/usePayments'
import { Payment, PaymentFormProps, PaymentWithCustomer } from '../types/payments'
import PaymentForm from './PaymentForm'
import ManualAllocationModal from './ManualAllocationModal'
import PaymentAllocationTable from './PaymentAllocationTable'
import SearchAndFilters from './SearchAndFilters'
import SortableTable, { SortableColumn } from './SortableTable'

import { Plus, Euro, FileText, CreditCard, Calendar, User, Eye, Trash2, Edit, RefreshCw } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'

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
  const [allocationFilter, setAllocationFilter] = useState('')

  const { payments, loading, error, createPayment, updatePayment, deletePayment, refetch } = usePayments()

  const handlePaymentSuccess = (payment: PaymentWithCustomer) => {
    setShowPaymentForm(false)
    
    // Si le paiement n'est pas encore alloué (status !== 'completed'), ouvrir le modal d'allocation manuelle
    if (payment.status !== 'completed') {
      setSelectedPayment(payment)
      setShowAllocationModal(true)
    }
  }

  const handleAllocationSuccess = () => {
    setShowAllocationModal(false)
    setSelectedPayment(null)
    // Rafraîchir les données des paiements pour mettre à jour le statut d'allocation
    refetch()
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
    if (!payments || !Array.isArray(payments)) return []
    
    return payments.filter(payment => {
             // Filtre par recherche
       const searchMatch = !searchTerm || 
         (payment.customer?.name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (payment.customer?.email || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.notes?.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtre par statut
      const statusMatch = !statusFilter || payment.status === statusFilter

      // Filtre par mode de paiement
      const methodMatch = !methodFilter || payment.payment_method === methodFilter

      // Filtre par allocation
      const allocationMatch = !allocationFilter || 
        (allocationFilter === 'allocated' && payment.status === 'completed') ||
        (allocationFilter === 'unallocated' && payment.status !== 'completed')

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

      return searchMatch && statusMatch && methodMatch && allocationMatch && dateMatch
    })
  }, [payments, searchTerm, statusFilter, methodFilter, allocationFilter, dateFilter])

  // Configuration des colonnes triables
  const columns: SortableColumn[] = [
    { 
      key: 'customer_name', 
      label: 'Client', 
      sortable: true,
                    format: (payment: any) => {
         if (!payment) return <div>Données manquantes</div>
         const customerName = payment.customer?.name || 'Client inconnu'
         
         return (
           <div className="flex items-center">
             <User className="w-4 h-4 text-gray-400 mr-2" />
             <div className="text-sm font-medium text-gray-900 dark:text-white">
               {customerName}
             </div>
           </div>
         )
       }
    },
    { 
      key: 'amount', 
      label: 'Montant', 
      sortable: true,
      align: 'text-right',
             format: (payment: any) => {
         if (!payment) return <div>Données manquantes</div>
         return (
           <div className="text-sm font-medium text-gray-900 dark:text-white">
             {formatCurrency(payment.amount)}
           </div>
         )
       }
    },
    { 
      key: 'payment_method', 
      label: 'Mode', 
      sortable: true,
             format: (payment: any) => {
         if (!payment) return <div>Données manquantes</div>
         return (
           <div className="flex items-center">
             {getPaymentMethodIcon(payment.payment_method)}
             <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
               {getPaymentMethodLabel(payment.payment_method)}
             </span>
           </div>
         )
       }
    },
    { 
      key: 'status', 
      label: 'Statut', 
      sortable: true,
             format: (payment: any) => {
         if (!payment) return <div>Données manquantes</div>
         return (
           <div className="flex items-center space-x-2">
             {getStatusBadge(payment.status)}
             {payment.status !== 'completed' && (
               <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 rounded-full text-xs font-medium">
                 Non alloué
               </span>
             )}
           </div>
         )
       }
    },
    { 
      key: 'created_at', 
      label: 'Date', 
      sortable: true,
             format: (payment: any) => {
         if (!payment) return <div>Données manquantes</div>
         return (
           <span className="text-sm text-gray-500 dark:text-gray-400">
             {formatDate(payment.created_at)}
           </span>
         )
       }
    },
    { 
      key: 'actions', 
      label: 'Actions', 
      sortable: false,
             format: (payment: any) => {
         if (!payment) return <div>Données manquantes</div>
         return (
           <div className="flex items-center space-x-2">
             <button
               onClick={() => setShowAllocations(showAllocations === payment.id ? null : payment.id)}
               className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
               title="Voir les allocations"
             >
               <Eye className="w-4 h-4" />
             </button>
             {payment.status !== 'completed' && (
               <button
                 onClick={() => {
                   setSelectedPayment(payment)
                   setShowAllocationModal(true)
                 }}
                 className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
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
         )
       }
    }
  ]

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
    allocation: {
      label: 'État d\'allocation',
      options: [
        { value: 'allocated', label: 'Allocation terminée' },
        { value: 'unallocated', label: 'Allocation en cours' }
      ],
      value: allocationFilter,
      onChange: setAllocationFilter
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
        <div className="flex items-center space-x-3">
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
          <button
            onClick={() => setShowPaymentForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau paiement</span>
          </button>
        </div>
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
          setAllocationFilter('')
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
          <div className="p-6 text-center">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-2">
                <Euro className="w-5 h-5" />
                <span className="font-medium">Erreur lors du chargement des paiements</span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              {error.includes('table') && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Solution :</strong> Exécutez le script d'initialisation de la base de données dans Supabase.
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    Allez dans l'éditeur SQL de Supabase et exécutez le contenu du fichier <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">init-payments-db.sql</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            <Euro className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>{!payments || payments.length === 0 ? 'Aucun paiement trouvé' : 'Aucun paiement ne correspond aux critères de recherche'}</p>
          </div>
        ) : (
          <SortableTable
            columns={columns}
            data={filteredPayments}
            defaultSort={{ key: 'created_at', direction: 'desc' }}
          />
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