import React, { useState, useEffect } from 'react'
import { Package, AlertTriangle, TrendingUp, TrendingDown, Plus, Search, Filter, RefreshCw, BarChart3, ShoppingCart, Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface StockItem {
  id: string
  lta_number: string
  airline_code: string
  airline_name: string
  stock_type: string
  current_quantity: number
  reserved_quantity: number
  available_quantity: number
  minimum_threshold: number
  maximum_capacity: number
  unit_cost: number
  supplier: string
  location: string
  status: string
  last_restock_date: string
  next_restock_date: string
  created_at: string
  updated_at: string
}

interface StockAlert {
  id: string
  alert_type: string
  message: string
  severity: string
  is_read: boolean
  is_resolved: boolean
  created_at: string
  lta_stock: StockItem
}

interface StockStats {
  total_items: number
  low_stock_items: number
  out_of_stock_items: number
  total_value: number
  active_alerts: number
}

const StockDashboard: React.FC = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [stats, setStats] = useState<StockStats>({
    total_items: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    total_value: 0,
    active_alerts: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'low_stock' | 'out_of_stock'>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadStockData()
    loadAlerts()
  }, [])

  const loadStockData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('lta_stock')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setStockItems(data || [])
      calculateStats(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('lta_alerts')
        .select(`
          *,
          lta_stock (*)
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setAlerts(data || [])
    } catch (err) {
      console.error('Erreur lors du chargement des alertes:', err)
    }
  }

  // Fonction de rafraîchissement des données
  const handleRefresh = async () => {
    console.log('🔄 Rafraîchissement des données de stock...')
    await loadStockData()
    await loadAlerts()
  }

  const calculateStats = (items: StockItem[]) => {
    const activeItems = items.filter(item => item.status === 'active')
    const lowStockItems = activeItems.filter(item => item.available_quantity <= item.minimum_threshold && item.available_quantity > 0)
    const outOfStockItems = activeItems.filter(item => item.available_quantity <= 0)
    const totalValue = activeItems.reduce((sum, item) => sum + (item.current_quantity * item.unit_cost), 0)

    setStats({
      total_items: activeItems.length,
      low_stock_items: lowStockItems.length,
      out_of_stock_items: outOfStockItems.length,
      total_value: totalValue,
      active_alerts: alerts.length
    })
  }

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.lta_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.airline_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.airline_code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && item.status === 'active') ||
                         (filterStatus === 'low_stock' && item.available_quantity <= item.minimum_threshold && item.available_quantity > 0) ||
                         (filterStatus === 'out_of_stock' && item.available_quantity <= 0)

    return matchesSearch && matchesFilter
  })

  const getStockStatusColor = (item: StockItem) => {
    if (item.available_quantity <= 0) return 'text-red-600 bg-red-100 dark:bg-red-900/30'
    if (item.available_quantity <= item.minimum_threshold) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
    return 'text-green-600 bg-green-100 dark:bg-green-900/30'
  }

  const getStockStatusLabel = (item: StockItem) => {
    if (item.available_quantity <= 0) return 'Épuisé'
    if (item.available_quantity <= item.minimum_threshold) return 'Stock bas'
    return 'En stock'
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-400">Chargement des données de stock...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion de Stock LTA</h2>
            <p className="text-gray-600 dark:text-gray-400">Suivi et gestion des stocks de billets LTA</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter LTA</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total LTA</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_items}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Stock bas</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.low_stock_items}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Épuisé</p>
              <p className="text-2xl font-bold text-red-600">{stats.out_of_stock_items}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Valeur totale</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_value)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Alertes actives</p>
              <p className="text-2xl font-bold text-orange-600">{alerts.length}</p>
            </div>
            <Bell className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-orange-500" />
              <span>Alertes actives ({alerts.length})</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`w-5 h-5 ${getAlertSeverityColor(alert.severity).split(' ')[0]}`} />
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{alert.message}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {new Date(alert.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getAlertSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher LTA, compagnie..."
                className="pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="low_stock">Stock bas</option>
                <option value="out_of_stock">Épuisés</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''} sur {stockItems.length}
          </div>
        </div>
      </div>

      {/* Stock Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  LTA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Compagnie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fournisseur
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-gray-900 dark:text-white font-medium">{item.lta_number}</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">{item.airline_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-gray-900 dark:text-white">{item.airline_name}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {item.stock_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {item.available_quantity} / {item.current_quantity}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Seuil: {item.minimum_threshold}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStockStatusColor(item)}`}>
                      {getStockStatusLabel(item)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatCurrency(item.current_quantity * item.unit_cost)}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {formatCurrency(item.unit_cost)} / unité
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-gray-900 dark:text-white">{item.supplier}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{item.location}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Aucun stock trouvé
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {searchTerm || filterStatus !== 'all' 
              ? 'Aucun résultat ne correspond à vos critères de recherche.'
              : 'Commencez par ajouter des LTA à votre stock.'
            }
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Ajouter votre premier LTA</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default StockDashboard