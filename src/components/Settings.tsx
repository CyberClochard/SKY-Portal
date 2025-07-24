import React, { useState, useEffect } from 'react'
import { Palette, Monitor, Sun, Moon, Sparkles, Leaf, Zap, Heart, Crown, Waves, Mountain, Coffee, Gamepad2, Plus, X, Save, RefreshCw, Users, AlertCircle, CheckCircle, Search, Filter, Download, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  
  // Customer management states
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [customerSuccess, setCustomerSuccess] = useState<string | null>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  
  const [customerData, setCustomerData] = useState({
    name: '',
    adress1: '',
    adress2: '',
    codePostal: '',
    city: '',
    phone: '',
    email: '',
    SIRET: '',
    TVAnumber: ''
  })

  // Load customers from Supabase
  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true)
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading customers:', error)
        setCustomerError('Erreur lors du chargement des clients')
        return
      }

      setCustomers(data || [])
      setFilteredCustomers(data || [])
    } catch (err) {
      console.error('Failed to load customers:', err)
      setCustomerError('Erreur de connexion à la base de données')
    } finally {
      setLoadingCustomers(false)
    }
  }

  // Search and filter customers
  useEffect(() => {
    let filtered = customers.filter(customer =>
      Object.values(customer).some(value => {
        if (value === null || value === undefined) return false
        return value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      })
    )
    setFilteredCustomers(filtered)
    setCurrentPage(1)
  }, [customers, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageCustomers = filteredCustomers.slice(startIndex, endIndex)

  // Customer selection
  const handleCustomerSelect = (customerId: string) => {
    const newSelected = new Set(selectedCustomers)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedCustomers(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedCustomers.size === currentPageCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(currentPageCustomers.map(customer => customer.id)))
    }
  }

  // Customer actions
  const handleViewCustomer = (customer: any) => {
    setEditingCustomer(customer)
    setShowCustomerDetailsModal(true)
  }

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer)
    setCustomerData({
      name: customer.name || '',
      adress1: customer['adress 1'] || '',
      adress2: customer['adress 2'] || '',
      codePostal: customer['code postal'] || '',
      city: customer.city || '',
      phone: customer.phone || '',
      email: customer.email || '',
      SIRET: customer.SIRET || '',
      TVAnumber: customer['TVA number'] || ''
    })
    setShowCustomerModal(true)
  }

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)

      if (error) {
        setCustomerError(`Erreur lors de la suppression: ${error.message}`)
        return
      }

      setCustomers(prev => prev.filter(c => c.id !== customerId))
      setShowDeleteConfirm(null)
      setCustomerSuccess('Client supprimé avec succès')
      
      setTimeout(() => setCustomerSuccess(null), 3000)
    } catch (err) {
      setCustomerError('Erreur lors de la suppression')
    }
  }

  const handleBulkDelete = async () => {
    try {
      const customerIds = Array.from(selectedCustomers)
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', customerIds)

      if (error) {
        setCustomerError(`Erreur lors de la suppression: ${error.message}`)
        return
      }

      setCustomers(prev => prev.filter(c => !customerIds.includes(c.id)))
      setSelectedCustomers(new Set())
      setShowBulkDeleteConfirm(false)
      setCustomerSuccess(`${customerIds.length} client(s) supprimé(s) avec succès`)
      
      setTimeout(() => setCustomerSuccess(null), 3000)
    } catch (err) {
      setCustomerError('Erreur lors de la suppression')
    }
  }

  const exportToCSV = () => {
    const selectedData = selectedCustomers.size > 0 
      ? customers.filter(c => selectedCustomers.has(c.id))
      : filteredCustomers

    if (selectedData.length === 0) return

    const headers = ['Société', 'Adresse 1', 'Adresse 2', 'Code postal', 'Ville', 'Téléphone', 'E-mail', 'SIRET', 'TVA']
    const csvContent = [
      headers.join(','),
      ...selectedData.map(customer => [
        customer.name || '',
        customer['adress 1'] || '',
        customer['adress 2'] || '',
        customer['code postal'] || '',
        customer.city || '',
        customer.phone || '',
        customer.email || '',
        customer.SIRET || '',
        customer['TVA number'] || ''
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `clients_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCustomerChange = (field: string, value: string) => {
    setCustomerData(prev => ({
      ...prev,
      [field]: value
    }))
    if (customerError) setCustomerError(null)
    if (customerSuccess) setCustomerSuccess(null)
  }

  const createCustomer = async () => {
    // Validation des champs requis
    const requiredFields = ['name']
    const missingFields = requiredFields.filter(field => !customerData[field as keyof typeof customerData]?.trim())
    
    if (missingFields.length > 0) {
      setCustomerError(`Champs requis manquants: ${missingFields.join(', ')}`)
      return
    }

    setCreatingCustomer(true)
    setCustomerError(null)
    setCustomerSuccess(null)

    try {
      // Préparer les données pour Supabase
      const customerRecord = {
        name: customerData.name.trim(),
        'adress 1': customerData.adress1.trim() || null,
        'adress 2': customerData.adress2.trim() || null,
        'code postal': customerData.codePostal.trim() || null,
        city: customerData.city.trim() || null,
        phone: customerData.phone.trim() || null,
        email: customerData.email.trim() || null,
        SIRET: customerData.SIRET.trim() || null,
        'TVA number': customerData.TVAnumber.trim() || null
      }

      let result
      if (editingCustomer) {
        // Update existing customer
        result = await supabase
          .from('customers')
          .update(customerRecord)
          .eq('id', editingCustomer.id)
          .select()
      } else {
        // Create new customer
        result = await supabase
          .from('customers')
          .insert([customerRecord])
          .select()
      }

      if (result.error) {
        setCustomerError(`Erreur lors de la ${editingCustomer ? 'modification' : 'création'}: ${result.error.message}`)
        return
      }

      setCustomerSuccess(`Client ${editingCustomer ? 'modifié' : 'créé'} avec succès !`)
      
      // Refresh customers list
      await loadCustomers()
      
      // Reset form
      setCustomerData({
        name: '',
        adress1: '',
        adress2: '',
        codePostal: '',
        city: '',
        phone: '',
        email: '',
        SIRET: '',
        TVAnumber: ''
      })
      
      setEditingCustomer(null)
      setShowCustomerModal(false)

      // Clear success message after 2 seconds
      setTimeout(() => {
        setCustomerSuccess(null)
      }, 2000)

    } catch (err) {
      setCustomerError(`Erreur lors de la ${editingCustomer ? 'modification' : 'création'} du client`)
    } finally {
      setCreatingCustomer(false)
    }
  }

  const initializeCustomerForm = () => {
    setEditingCustomer(null)
    setCustomerData({
      name: '',
      adress1: '',
      adress2: '',
      codePostal: '',
      city: '',
      phone: '',
      email: '',
      SIRET: '',
      TVAnumber: ''
    })
    setCustomerError(null)
    setCustomerSuccess(null)
    setShowCustomerModal(true)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-theme-primary rounded-lg flex items-center justify-center">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h2>
            <p className="text-gray-600 dark:text-gray-400">Personnalisez votre expérience SkyLogistics</p>
          </div>
        </div>
      </div>

      {/* Customer Management Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Header with stats */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Gestion des clients</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {customers.length} client{customers.length > 1 ? 's' : ''} actif{customers.length > 1 ? 's' : ''} • 
                {customers.filter(c => {
                  const created = new Date(c.created_at || Date.now())
                  const now = new Date()
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                }).length} créé{customers.length > 1 ? 's' : ''} ce mois
              </p>
            </div>
          </div>
          <button 
            onClick={initializeCustomerForm}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau client</span>
          </button>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={exportToCSV}
              disabled={filteredCustomers.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={loadCustomers}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredCustomers.length} résultat{filteredCustomers.length > 1 ? 's' : ''}
            </span>
            {selectedCustomers.size > 0 && (
              <span className="text-sm text-green-600 dark:text-green-400">
                {selectedCustomers.size} sélectionné{selectedCustomers.size > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {customerError && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{customerError}</span>
            </div>
          </div>
        )}

        {customerSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{customerSuccess}</span>
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {loadingCustomers ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Chargement des clients...</p>
              </div>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucun client</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm ? 'Aucun client trouvé pour cette recherche' : 'Aucun client dans la base de données'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="sticky left-0 z-20 px-6 py-3 text-left bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.size === currentPageCustomers.length && currentPageCustomers.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Société
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Adresse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        SIRET
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        TVA
                      </th>
                      <th className="sticky right-0 z-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentPageCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedCustomers.has(customer.id)}
                            onChange={() => handleCustomerSelect(customer.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {customer.name || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div>{customer['adress 1'] || '-'}</div>
                            <div className="text-gray-500 dark:text-gray-400">
                              {customer['code postal'] && customer.city 
                                ? `${customer['code postal']} ${customer.city}`
                                : customer.city || customer['code postal'] || '-'
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            <div>{customer.phone || '-'}</div>
                            <div className="text-gray-500 dark:text-gray-400">{customer.email || '-'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {customer.SIRET || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {customer['TVA number'] || '-'}
                        </td>
                        <td className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap text-sm font-medium bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewCustomer(customer)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditCustomer(customer)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-900/20"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(customer.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Affichage de {startIndex + 1} à {Math.min(endIndex, filteredCustomers.length)} sur {filteredCustomers.length} résultats
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1
            return (
              <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-green-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
                  </div>

        {/* Bulk Actions */}
        {selectedCustomers.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCustomers.size} client{selectedCustomers.size > 1 ? 's' : ''} sélectionné{selectedCustomers.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={exportToCSV}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  Export sélection
                </button>
                <button 
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setSelectedCustomers(new Set())}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                >
                  Annuler
                </button>
                  </div>
                </div>
                  </div>
                )}
      </div>

      {/* Visual Themes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Thème visuel</h3>
            <p className="text-gray-600 dark:text-gray-400">Personnalisez l'apparence de l'application</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Mode clair/sombre</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Basculer entre les modes d'affichage</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleTheme()}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {theme === 'dark' ? 'Sombre' : 'Clair'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Other Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paramètres généraux</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Notifications</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Recevoir les notifications système</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-theme-primary"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Sauvegarde automatique</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Sauvegarder les données automatiquement</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-theme-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Animations
              </label>
              <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary">
                <option value="all">Toutes les animations</option>
                <option value="reduced">Animations réduites</option>
                <option value="none">Aucune animation</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Qualité des graphiques
              </label>
              <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary">
                <option value="high">Haute qualité</option>
                <option value="medium">Qualité moyenne</option>
                <option value="low">Qualité réduite</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">À propos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Version</p>
            <p className="text-gray-900 dark:text-white font-medium">SkyLogistics v2.1.0</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Dernière mise à jour</p>
            <p className="text-gray-900 dark:text-white font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Environnement</p>
            <p className="text-gray-900 dark:text-white font-medium">Production</p>
          </div>
        </div>
      </div>

      {/* Customer Creation Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {editingCustomer ? 'Modifier le client' : 'Nouveau client'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {editingCustomer ? 'Modifier les informations du client' : 'Créer un nouveau client dans la table customers'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Error/Success Messages */}
              {customerError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{customerError}</span>
                  </div>
                </div>
              )}

              {customerSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{customerSuccess}</span>
                  </div>
                </div>
              )}

              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Société *
                  </label>
                  <input
                    type="text"
                    value={customerData.name}
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nom de la société"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse 1
                  </label>
                  <input
                    type="text"
                    value={customerData.adress1}
                    onChange={(e) => handleCustomerChange('adress1', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123 Rue de la Paix"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse 2
                  </label>
                  <input
                    type="text"
                    value={customerData.adress2}
                    onChange={(e) => handleCustomerChange('adress2', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Bâtiment A, Étage 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Code postal
                  </label>
                  <input
                    type="text"
                    value={customerData.codePostal}
                    onChange={(e) => handleCustomerChange('codePostal', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="75001"
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={customerData.city}
                    onChange={(e) => handleCustomerChange('city', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Paris"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={customerData.phone}
                    onChange={(e) => handleCustomerChange('phone', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="01 23 45 67 89"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) => handleCustomerChange('email', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="contact@entreprise.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SIRET
                  </label>
                  <input
                    type="text"
                    value={customerData.SIRET}
                    onChange={(e) => handleCustomerChange('SIRET', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="12345678901234"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Numéro de TVA
                  </label>
                  <input
                    type="text"
                    value={customerData.TVAnumber}
                    onChange={(e) => handleCustomerChange('TVAnumber', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="FR12345678901"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCustomerModal(false)}
                  disabled={creatingCustomer}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={createCustomer}
                  disabled={creatingCustomer}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {creatingCustomer ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{creatingCustomer ? 'Sauvegarde...' : (editingCustomer ? 'Modifier le client' : 'Créer le client')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showCustomerDetailsModal && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Détails du client</h3>
                    <p className="text-gray-600 dark:text-gray-400">Informations complètes du client</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informations générales</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Société</label>
                      <p className="text-gray-900 dark:text-white font-medium">{editingCustomer.name || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">SIRET</label>
                      <p className="text-gray-900 dark:text-white">{editingCustomer.SIRET || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Numéro de TVA</label>
                      <p className="text-gray-900 dark:text-white">{editingCustomer['TVA number'] || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Téléphone</label>
                      <p className="text-gray-900 dark:text-white">{editingCustomer.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</label>
                      <p className="text-gray-900 dark:text-white">{editingCustomer.email || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Adresse</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Adresse 1</label>
                      <p className="text-gray-900 dark:text-white">{editingCustomer['adress 1'] || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Adresse 2</label>
                      <p className="text-gray-900 dark:text-white">{editingCustomer['adress 2'] || '-'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Code postal</label>
                        <p className="text-gray-900 dark:text-white">{editingCustomer['code postal'] || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Ville</label>
                        <p className="text-gray-900 dark:text-white">{editingCustomer.city || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowCustomerDetailsModal(false)
                    handleEditCustomer(editingCustomer)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Modifier</span>
                </button>
                <button
                  onClick={() => {
                    setShowCustomerDetailsModal(false)
                    setShowDeleteConfirm(editingCustomer.id)
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirmer la suppression</h3>
                <p className="text-gray-600 dark:text-gray-400">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer ce client ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteCustomer(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirmer la suppression</h3>
                <p className="text-gray-600 dark:text-gray-400">Cette action est irréversible.</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer {selectedCustomers.size} client{selectedCustomers.size > 1 ? 's' : ''} ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings