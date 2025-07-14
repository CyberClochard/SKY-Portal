import React, { useState, useEffect } from 'react'
import { Search, Filter, Download, RefreshCw, Eye, Edit, Trash2, Plus, ChevronLeft, ChevronRight, FileText, AlertCircle, Save, X, Check, Settings, Columns, Calendar, User, MapPin, Plane } from 'lucide-react'
import { supabase } from '../lib/supabase'
import CasePage from './CasePage'

interface MasterRecord {
  [key: string]: any
}

interface NewDossierFormData {
  DATE: string
  CLIENT: string
  DEPART: string
  ARRIVEE: string
  LTA: string
  TYPE: string
  [key: string]: string
}

const DataTable: React.FC = () => {
  const [data, setData] = useState<MasterRecord[]>([])
  const [filteredData, setFilteredData] = useState<MasterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('DOSSIER')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showCasePage, setShowCasePage] = useState<string | null>(null)
  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<MasterRecord>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showNewDossierModal, setShowNewDossierModal] = useState(false)
  const [newDossierData, setNewDossierData] = useState<NewDossierFormData>({
    DATE: '',
    CLIENT: '',
    DEPART: '',
    ARRIVEE: '',
    LTA: '',
    TYPE: '',
  })
  const [creatingDossier, setCreatingDossier] = useState(false)

  // Load data from Supabase MASTER table
  useEffect(() => {
    loadMasterData()
  }, [])

  const loadMasterData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading data from MASTER table...')
      
      const { data: masterData, error: masterError } = await supabase
        .from('MASTER')
        .select('*')
        .order('DOSSIER', { ascending: false })

      if (masterError) {
        console.error('Error loading MASTER data:', masterError)
        setError(`Erreur lors du chargement des données: ${masterError.message}`)
        return
      }

      console.log('MASTER data loaded:', masterData?.length || 0, 'records')
      
      if (masterData && masterData.length > 0) {
        // Get column names from the first record
        const columns = Object.keys(masterData[0]).filter(key => key !== 'id')
        setTableColumns(columns)
        
        // Set all columns as visible by default
        setVisibleColumns(new Set(columns))
        
        setData(masterData)
        setFilteredData(masterData)
      } else {
        setData([])
        setFilteredData([])
        setError('Aucune donnée trouvée dans la table MASTER')
      }

    } catch (err) {
      console.error('Failed to load MASTER data:', err)
      setError('Erreur de connexion à la base de données')
    } finally {
      setLoading(false)
    }
  }

  // Initialize new dossier form
  const initializeNewDossier = () => {
    const today = new Date().toISOString().split('T')[0]
    setNewDossierData({
      DATE: today,
      CLIENT: '',
      DEPART: '',
      ARRIVEE: '',
      LTA: '',
      TYPE: 'Standard',
    })
    setShowNewDossierModal(true)
  }

  // Handle new dossier form changes
  const handleNewDossierChange = (field: string, value: string) => {
    setNewDossierData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Create new dossier
  const createNewDossier = async () => {
    // Validate required fields
    const requiredFields = ['DATE', 'CLIENT']
    const missingFields = requiredFields.filter(field => !newDossierData[field]?.trim())
    
    if (missingFields.length > 0) {
      setError(`Champs requis manquants: ${missingFields.join(', ')}`)
      return
    }

    setCreatingDossier(true)
    setError(null)

    try {
      // Prepare data with only user-provided fields
      const userData = {}
      
      // Only include fields that have values
      if (newDossierData.DATE) userData.DATE = newDossierData.DATE
      if (newDossierData.CLIENT) userData.CLIENT = newDossierData.CLIENT
      if (newDossierData.DEPART) userData.DEPART = newDossierData.DEPART
      if (newDossierData.ARRIVEE) userData.ARRIVEE = newDossierData.ARRIVEE
      if (newDossierData.LTA) userData.LTA = newDossierData.LTA
      if (newDossierData.TYPE) userData.TYPE = newDossierData.TYPE

      const { data: insertedData, error: insertError } = await supabase
        .from('MASTER')
        .insert([userData])
        .select()

      if (insertError) {
        setError(`Erreur lors de la création: ${insertError.message}`)
        return
      }

      // Add to local data
      if (insertedData && insertedData[0]) {
        setData(prevData => [insertedData[0], ...prevData])
        setShowNewDossierModal(false)
        
        // Reset form
        setNewDossierData({
          DATE: '',
          CLIENT: '',
          DEPART: '',
          ARRIVEE: '',
          LTA: '',
          TYPE: '',
        })
      }

    } catch (err) {
      setError('Erreur lors de la création du dossier')
    } finally {
      setCreatingDossier(false)
    }
  }

  // Search and filter
  useEffect(() => {
    let filtered = data.filter(record =>
      Object.values(record).some(value => {
        if (value === null || value === undefined) return false
        return value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      })
    )

    // Sort
    if (sortField && filtered.length > 0) {
      filtered.sort((a, b) => {
        const aValue = a[sortField]
        const bValue = b[sortField]
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }

    setFilteredData(filtered)
    setCurrentPage(1)
  }, [data, searchTerm, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleRowSelect = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedRows.size === currentPageData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(currentPageData.map(record => record.id || record.DOSSIER)))
    }
  }

  const handleViewCase = (dossier: string) => {
    setShowCasePage(dossier)
  }

  const handleBackFromCase = () => {
    setShowCasePage(null)
  }

  const handleEditRow = (record: MasterRecord) => {
    const recordId = record.id || record.DOSSIER
    setEditingRow(recordId)
    setEditingData({ ...record })
  }

  const handleSaveEdit = async () => {
    if (!editingRow || !editingData) return

    try {
      const { error } = await supabase
        .from('MASTER')
        .update(editingData)
        .eq('DOSSIER', editingData.DOSSIER)

      if (error) {
        setError(`Erreur lors de la sauvegarde: ${error.message}`)
        return
      }

      // Update local data
      setData(prevData => 
        prevData.map(record => 
          (record.id || record.DOSSIER) === editingRow ? editingData : record
        )
      )

      setEditingRow(null)
      setEditingData({})
    } catch (err) {
      setError('Erreur lors de la sauvegarde')
    }
  }

  const handleCancelEdit = () => {
    setEditingRow(null)
    setEditingData({})
  }

  const handleDeleteRow = async (dossier: string) => {
    try {
      const { error } = await supabase
        .from('MASTER')
        .delete()
        .eq('DOSSIER', dossier)

      if (error) {
        setError(`Erreur lors de la suppression: ${error.message}`)
        return
      }

      // Update local data
      setData(prevData => prevData.filter(record => record.DOSSIER !== dossier))
      setShowDeleteConfirm(null)
      setEditingRow(null)
    } catch (err) {
      setError('Erreur lors de la suppression')
    }
  }

  const handleColumnToggle = (column: string) => {
    const newVisible = new Set(visibleColumns)
    if (newVisible.has(column)) {
      newVisible.delete(column)
    } else {
      newVisible.add(column)
    }
    setVisibleColumns(newVisible)
  }

  const exportToCSV = () => {
    const visibleColumnsArray = Array.from(visibleColumns)
    if (visibleColumnsArray.length === 0) return

    const headers = visibleColumnsArray
    const csvContent = [
      headers.join(','),
      ...filteredData.map(record => 
        headers.map(header => {
          const value = record[header]
          return `"${value || ''}"`
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `operations_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) return '-'
    
    // Handle text date fields (DATE and DATE2) - display as-is since they're text
    if ((columnName === 'DATE' || columnName === 'DATE2') && typeof value === 'string') {
      return value // Display the text date as stored
    }
    
    // Format currency
    if (columnName.toLowerCase().includes('payable') || columnName.toLowerCase().includes('amount')) {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(value)
      }
    }
    
    return value.toString()
  }

  const handleEditFieldChange = (field: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPageData = filteredData.slice(startIndex, endIndex)

  // Get visible columns array
  const visibleColumnsArray = tableColumns.filter(col => visibleColumns.has(col))

  // If showing case page, render it instead
  if (showCasePage) {
    return <CasePage dossier={showCasePage} onBack={handleBackFromCase} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Opérations</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des dossiers et opérations logistiques - Table MASTER
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
          <button 
            onClick={initializeNewDossier}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau dossier</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* New Dossier Modal */}
      {showNewDossierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Nouveau Dossier</h3>
                    <p className="text-gray-600 dark:text-gray-400">Créer un nouveau dossier dans la table MASTER</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewDossierModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newDossierData.DATE}
                    onChange={(e) => handleNewDossierChange('DATE', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client *
                  </label>
                  <input
                    type="text"
                    value={newDossierData.CLIENT}
                    onChange={(e) => handleNewDossierChange('CLIENT', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nom du client"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Départ
                  </label>
                  <input
                    type="text"
                    value={newDossierData.DEPART}
                    onChange={(e) => handleNewDossierChange('DEPART', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ORY, CDG..."
                    maxLength={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Arrivée
                  </label>
                  <input
                    type="text"
                    value={newDossierData.ARRIVEE}
                    onChange={(e) => handleNewDossierChange('ARRIVEE', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ALG, TUN..."
                    maxLength={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    LTA (AWB)
                  </label>
                  <input
                    type="text"
                    value={newDossierData.LTA}
                    onChange={(e) => handleNewDossierChange('LTA', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12412345675"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowNewDossierModal(false)}
                  disabled={creatingDossier}
                  className="px-6 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={createNewDossier}
                  disabled={creatingDossier}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {creatingDossier ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{creatingDossier ? 'Création...' : 'Créer le dossier'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher dans les opérations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filtres</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Rows per page selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Lignes par page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Column selector */}
            <div className="relative">
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Columns className="w-4 h-4" />
                <span>Colonnes ({visibleColumns.size})</span>
              </button>

              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Sélectionner les colonnes</h3>
                  </div>
                  <div className="p-2">
                    {tableColumns.map((column) => (
                      <label key={column} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column)}
                          onChange={() => handleColumnToggle(column)}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{column}</span>
                      </label>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowColumnSelector(false)}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredData.length} résultat{filteredData.length > 1 ? 's' : ''}
            </span>
            {selectedRows.size > 0 && (
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {selectedRows.size} sélectionné{selectedRows.size > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={loadMasterData}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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
              Êtes-vous sûr de vouloir supprimer le dossier <strong>{showDeleteConfirm}</strong> ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteRow(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Chargement des données MASTER...</p>
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucune donnée</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {error ? 'Erreur de chargement des données' : 'Aucun enregistrement trouvé dans la table MASTER'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="relative">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="sticky left-0 z-20 px-6 py-3 text-left bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === currentPageData.length && currentPageData.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      {visibleColumnsArray.map((column) => (
                        <th
                          key={column}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
                          onClick={() => handleSort(column)}
                        >
                          <div className="flex items-center space-x-1">
                            <span>{column}</span>
                            {sortField === column && (
                              <span className="text-blue-500">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="sticky right-0 z-20 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {currentPageData.map((record, index) => {
                      const recordId = record.id || record.DOSSIER || index.toString()
                      const dossier = record.DOSSIER || `Record-${index + 1}`
                      const isEditing = editingRow === recordId
                      
                      return (
                        <tr
                          key={recordId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(recordId)}
                              onChange={() => handleRowSelect(recordId)}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          {visibleColumnsArray.map((column) => (
                            <td key={column} className="px-6 py-4 whitespace-nowrap">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingData[column] || ''}
                                  onChange={(e) => handleEditFieldChange(column, e.target.value)}
                                  className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                <div className={`text-sm ${
                                  column === 'DOSSIER' ? 'font-medium text-gray-900 dark:text-white' :
                                  column === 'DATE' || column === 'DATE2' ? 'text-gray-900 dark:text-white font-mono' :
                                  column.toLowerCase().includes('payable') ? 'font-medium text-gray-900 dark:text-white' :
                                  column === 'DEPART' || column === 'ARRIVEE' ? 'font-mono text-gray-900 dark:text-white' :
                                  'text-gray-900 dark:text-white'
                                }`}>
                                  {formatCellValue(record[column], column)}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="sticky right-0 z-10 px-6 py-4 whitespace-nowrap text-sm font-medium bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg">
                            <div className="flex items-center space-x-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={handleSaveEdit}
                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                    title="Sauvegarder"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-900/20"
                                    title="Annuler"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(dossier)}
                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleViewCase(dossier)}
                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    title="Voir le dossier"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEditRow(record)}
                                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-900/20"
                                    title="Modifier"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} résultats
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
                                ? 'bg-blue-600 text-white'
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
      {selectedRows.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRows.size} élément{selectedRows.size > 1 ? 's' : ''} sélectionné{selectedRows.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                Exporter sélection
              </button>
              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                Supprimer
              </button>
              <button
                onClick={() => setSelectedRows(new Set())}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable