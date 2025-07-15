import React, { useState, useEffect } from 'react'
import { Package, CheckCircle, XCircle, AlertTriangle, RefreshCw, Plus, Calculator, Hash, List, FileText, X, Edit, Trash2, Eye } from 'lucide-react'
import { getAirlineByPrefix, insertAWBStock, checkAWBExists, getAvailablePrefixes, getAWBStockByPrefix } from '../lib/supabase'

interface AWBSeriesData {
  prefix: string
  firstSerial: string
  lastSerial?: string
  quantity?: number
  airlineCode?: string
  airlineName?: string
  manualNumbers?: string[]
}

interface AWBValidationResult {
  isValid: boolean
  awbNumber: string
  prefix: string
  serialNumber: string
  checkDigit: number
  calculatedCheckDigit: number
  errors: string[]
  alreadyExists?: boolean
}

interface StockSummary {
  prefix: string
  airlineName: string
  available: number
  total: number
}

const AWBValidation: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMethod, setAddMethod] = useState<'range' | 'quantity' | 'manual'>('range')
  const [awbSeriesData, setAwbSeriesData] = useState<AWBSeriesData>({
    prefix: '',
    firstSerial: '',
    lastSerial: '',
    quantity: 1,
    airlineCode: '',
    airlineName: '',
    manualNumbers: []
  })
  const [manualInput, setManualInput] = useState('')
  const [validationResults, setValidationResults] = useState<AWBValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [addingStock, setAddingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([])
  const [loadingStock, setLoadingStock] = useState(true)
  const [showStockDetails, setShowStockDetails] = useState<string | null>(null)
  const [stockDetails, setStockDetails] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [updatingStock, setUpdatingStock] = useState<string | null>(null)

  // Get available prefixes (only those with Supabase tables)
  const availablePrefixes = getAvailablePrefixes()

  // Airline data mapping - only for prefixes we have tables for
  const airlineData: Record<string, { name: string; code: string }> = {
    '124': { name: 'Air Algérie', code: 'AH' },
    '235': { name: 'THY - Turkish Airlines', code: 'TK' },
    '624': { name: 'Pegasus Airlines', code: 'PC' }
  }

  // Load stock summary on component mount
  useEffect(() => {
    loadStockSummary()
  }, [])

  // Look up airline when prefix changes
  useEffect(() => {
    if (awbSeriesData.prefix && awbSeriesData.prefix.length === 3) {
      const airline = airlineData[awbSeriesData.prefix]
      if (airline) {
        setAwbSeriesData(prev => ({
          ...prev,
          airlineCode: airline.code,
          airlineName: airline.name
        }))
      } else {
        setAwbSeriesData(prev => ({
          ...prev,
          airlineCode: '',
          airlineName: ''
        }))
      }
    }
  }, [awbSeriesData.prefix])

  const loadStockSummary = async () => {
    setLoadingStock(true)
    try {
      const summaries: StockSummary[] = []
      
      // Only load data for prefixes we have tables for
      for (const prefix of availablePrefixes) {
        const airline = airlineData[prefix]
        if (!airline) continue // Skip if we don't have airline data
        
        let available = 0
        let total = 0
        
        try {
          const stockData = await getAWBStockByPrefix(prefix)
          total = stockData.length
          available = stockData.filter(item => !item.isUsed).length
        } catch (err) {
          console.warn(`Could not load stock for prefix ${prefix}:`, err)
        }
        
        summaries.push({
          prefix,
          airlineName: airline.name,
          available,
          total
        })
      }
      
      setStockSummary(summaries)
    } catch (err) {
      console.error('Error loading stock summary:', err)
      setError('Erreur lors du chargement du stock')
    } finally {
      setLoadingStock(false)
    }
  }

  // AWB Check Digit Validation
  const validateAWBCheckDigit = async (awbNumber: string): Promise<AWBValidationResult> => {
    const errors: string[] = []
    
    // Remove any spaces or dashes
    const cleanAWB = awbNumber.replace(/[\s-]/g, '')

    // Check if it's exactly 11 digits
    if (!/^\d{11}$/.test(cleanAWB)) {
      errors.push('Le numéro AWB doit contenir exactement 11 chiffres')
      return {
        isValid: false,
        awbNumber: cleanAWB,
        prefix: '',
        serialNumber: '',
        checkDigit: 0,
        calculatedCheckDigit: 0,
        errors
      }
    }

    // Extract components
    const prefix = cleanAWB.substring(0, 3)
    const serialNumber = cleanAWB.substring(3, 10)
    const checkDigit = parseInt(cleanAWB.substring(10, 11))

    // Calculate check digit
    const serialNum = parseInt(serialNumber)
    const calculatedCheckDigit = serialNum % 7

    // Validate check digit
    if (checkDigit !== calculatedCheckDigit) {
      errors.push(`Check digit incorrect. Calculé: ${calculatedCheckDigit}, Fourni: ${checkDigit}`)
    }

    // Check if AWB already exists in database
    let alreadyExists = false
    if (errors.length === 0) {
      try {
        alreadyExists = await checkAWBExists(prefix, cleanAWB)
        if (alreadyExists) {
          errors.push('Ce numéro AWB existe déjà dans le stock')
        }
      } catch (err) {
        console.error('Error checking AWB existence:', err)
      }
    }

    return {
      isValid: errors.length === 0,
      awbNumber: cleanAWB,
      prefix,
      serialNumber,
      checkDigit,
      calculatedCheckDigit,
      errors,
      alreadyExists
    }
  }

  // Generate AWB number with correct check digit
  const generateAWBNumber = (prefix: string, serialNumber: string): string => {
    const paddedSerial = serialNumber.padStart(7, '0')
    const checkDigit = parseInt(paddedSerial) % 7
    return `${prefix}${paddedSerial}${checkDigit}`
  }

  // Generate AWB series based on method
  const generateAWBSeries = async (): Promise<string[]> => {
    const { prefix, firstSerial, lastSerial, quantity, manualNumbers } = awbSeriesData
    
    if (!prefix || prefix.length !== 3) {
      throw new Error('Le préfixe doit contenir exactement 3 chiffres')
    }

    // Check if prefix is supported
    if (!availablePrefixes.includes(prefix)) {
      throw new Error(`Préfixe ${prefix} non supporté. Préfixes disponibles: ${availablePrefixes.join(', ')}`)
    }

    let awbNumbers: string[] = []

    switch (addMethod) {
      case 'range':
        if (!firstSerial || !lastSerial) {
          throw new Error('Numéros de série de début et fin requis')
        }
        
        const firstNum = parseInt(firstSerial)
        const lastNum = parseInt(lastSerial)
        
        if (firstNum >= lastNum) {
          throw new Error('Le numéro de fin doit être supérieur au numéro de début')
        }
        
        if (lastNum - firstNum > 1000) {
          throw new Error('Maximum 1000 AWB par série')
        }

        for (let i = firstNum; i <= lastNum; i++) {
          const awb = generateAWBNumber(prefix, i.toString())
          awbNumbers.push(awb)
        }
        break

      case 'quantity':
        if (!firstSerial || !quantity || quantity < 1) {
          throw new Error('Numéro de série de début et quantité requis')
        }
        
        if (quantity > 1000) {
          throw new Error('Maximum 1000 AWB par série')
        }

        const startNum = parseInt(firstSerial)
        for (let i = 0; i < quantity; i++) {
          const awb = generateAWBNumber(prefix, (startNum + i).toString())
          awbNumbers.push(awb)
        }
        break

      case 'manual':
        if (!manualNumbers || manualNumbers.length === 0) {
          throw new Error('Aucun numéro AWB saisi')
        }
        
        awbNumbers = manualNumbers.filter(awb => awb.trim() !== '')
        break
    }

    return awbNumbers
  }

  // Validate all AWB numbers in series
  const validateAWBSeries = async () => {
    setIsValidating(true)
    setValidationResults([])
    setError(null)

    try {
      const awbNumbers = await generateAWBSeries()
      const results: AWBValidationResult[] = []

      for (const awb of awbNumbers) {
        const validation = await validateAWBCheckDigit(awb)
        results.push(validation)
      }

      setValidationResults(results)

      // Check if all are valid
      const invalidCount = results.filter(r => !r.isValid).length
      if (invalidCount > 0) {
        setError(`${invalidCount} AWB(s) invalide(s) détecté(s). Veuillez corriger avant de continuer.`)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la validation')
    } finally {
      setIsValidating(false)
    }
  }

  // Parse manual input
  const parseManualInput = (input: string) => {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '')
    setAwbSeriesData(prev => ({ ...prev, manualNumbers: lines }))
  }

  // Add AWB stock to database
  const handleAddAWBStock = async () => {
    if (validationResults.length === 0) {
      setError('Veuillez d\'abord valider les numéros AWB')
      return
    }

    const invalidResults = validationResults.filter(r => !r.isValid)
    if (invalidResults.length > 0) {
      setError('Impossible d\'ajouter des AWB invalides')
      return
    }

    setAddingStock(true)
    setError(null)

    try {
      let successCount = 0
      let errorCount = 0
      let duplicateCount = 0

      for (const result of validationResults) {
        try {
          await insertAWBStock(result.prefix, result.awbNumber, result.serialNumber, result.checkDigit)
          successCount++
        } catch (err) {
          console.error('Error adding AWB:', result.awbNumber, err)
          if (err instanceof Error && err.message.includes('duplicate')) {
            duplicateCount++
          } else {
            errorCount++
          }
        }
      }

      if (successCount > 0) {
        setSuccess(`${successCount} AWB ajoutés avec succès au stock!`)
        
        // Reload stock summary
        await loadStockSummary()
        
        if (errorCount === 0 && duplicateCount === 0) {
          // Reset form on complete success
          setAwbSeriesData({
            prefix: '',
            firstSerial: '',
            lastSerial: '',
            quantity: 1,
            airlineCode: '',
            airlineName: '',
            manualNumbers: []
          })
          setManualInput('')
          setValidationResults([])
          setAddMethod('range')
          setShowAddForm(false)
        }
      }

      if (errorCount > 0 || duplicateCount > 0) {
        let errorMsg = `${successCount} AWB ajoutés avec succès`
        if (duplicateCount > 0) errorMsg += `, ${duplicateCount} doublons ignorés`
        if (errorCount > 0) errorMsg += `, ${errorCount} erreurs`
        setError(errorMsg)
      }

    } catch (err) {
      setError('Erreur lors de l\'ajout des AWB')
    } finally {
      setAddingStock(false)
      setTimeout(() => setSuccess(null), 5000)
    }
  }

  // Load stock details for a specific prefix
  const loadStockDetails = async (prefix: string) => {
    setLoadingDetails(true)
    try {
      const stockData = await getAWBStockByPrefix(prefix)
      setStockDetails(stockData)
      setShowStockDetails(prefix)
    } catch (err) {
      console.error('Error loading stock details:', err)
      setError('Erreur lors du chargement des détails du stock')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Toggle isUsed status for an AWB
  const toggleAWBUsed = async (prefix: string, id: string, currentStatus: boolean) => {
    setUpdatingStock(id)
    try {
      await updateAWBStock(prefix, id, { isUsed: !currentStatus })
      
      // Refresh stock details
      await loadStockDetails(prefix)
      
      // Refresh stock summary
      await loadStockSummary()
      
      setSuccess(`AWB ${!currentStatus ? 'marqué comme utilisé' : 'marqué comme disponible'}`)
    } catch (err) {
      console.error('Error updating AWB status:', err)
      setError('Erreur lors de la mise à jour du statut AWB')
    } finally {
      setUpdatingStock(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AWB stock numbers</h2>
            <p className="text-gray-600 dark:text-gray-400">View and modify numbers for airline</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <XCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Stock Summary Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Airline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loadingStock ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Chargement du stock...</span>
                    </div>
                  </td>
                </tr>
              ) : stockSummary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Aucun stock AWB disponible</p>
                      <p className="text-sm">Cliquez sur "Add" pour ajouter du stock</p>
                    </div>
                  </td>
                </tr>
              ) : (
                stockSummary.map((stock) => (
                  <tr key={stock.prefix} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {stock.airlineName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white font-mono">
                        {stock.prefix}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {stock.available}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setAwbSeriesData(prev => ({ 
                              ...prev, 
                              prefix: stock.prefix,
                              airlineCode: airlineData[stock.prefix]?.code || '',
                              airlineName: stock.airlineName
                            }))
                            setShowAddForm(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Ajouter du stock"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => loadStockDetails(stock.prefix)}
                          disabled={loadingDetails}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
                          title="Voir les détails"
                        >
                          {loadingDetails && showStockDetails === stock.prefix ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Add AWB stock numbers
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setValidationResults([])
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Airline Prefix */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Airline prefix
                </label>
                <div className="flex items-center space-x-4">
                  <select
                    value={awbSeriesData.prefix}
                    onChange={(e) => setAwbSeriesData(prev => ({ ...prev, prefix: e.target.value }))}
                    className="w-48 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Sélectionner un préfixe</option>
                    {availablePrefixes.map(prefix => (
                      <option key={prefix} value={prefix}>{prefix}</option>
                    ))}
                  </select>
                  {awbSeriesData.airlineName && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ {awbSeriesData.airlineName} ({awbSeriesData.airlineCode})
                    </p>
                  )}
                </div>
              </div>

              {/* Method Selection */}
              <div className="space-y-4">
                {/* Add range */}
                <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  addMethod === 'range' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="addMethod"
                    value="range"
                    checked={addMethod === 'range'}
                    onChange={(e) => setAddMethod(e.target.value as any)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Hash className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 dark:text-white">Add range</span>
                    </div>
                    
                    {addMethod === 'range' && (
                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            First serial number
                          </label>
                          <input
                            type="text"
                            value={awbSeriesData.firstSerial}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                              setAwbSeriesData(prev => ({ ...prev, firstSerial: value }))
                            }}
                            placeholder="1234567"
                            maxLength={7}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Last serial number
                          </label>
                          <input
                            type="text"
                            value={awbSeriesData.lastSerial}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                              setAwbSeriesData(prev => ({ ...prev, lastSerial: value }))
                            }}
                            placeholder="1234600"
                            maxLength={7}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* Add quantity */}
                <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  addMethod === 'quantity' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="addMethod"
                    value="quantity"
                    checked={addMethod === 'quantity'}
                    onChange={(e) => setAddMethod(e.target.value as any)}
                    className="mt-1 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calculator className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">Add quantity</span>
                    </div>
                    
                    {addMethod === 'quantity' && (
                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            First serial number
                          </label>
                          <input
                            type="text"
                            value={awbSeriesData.firstSerial}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 7)
                              setAwbSeriesData(prev => ({ ...prev, firstSerial: value }))
                            }}
                            placeholder="1234567"
                            maxLength={7}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={awbSeriesData.quantity}
                            onChange={(e) => {
                              const value = Math.max(1, Math.min(1000, parseInt(e.target.value) || 1))
                              setAwbSeriesData(prev => ({ ...prev, quantity: value }))
                            }}
                            min="1"
                            max="1000"
                            className="w-32 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                {/* Add single numbers */}
                <label className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  addMethod === 'manual' 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <input
                    type="radio"
                    name="addMethod"
                    value="manual"
                    checked={addMethod === 'manual'}
                    onChange={(e) => setAddMethod(e.target.value as any)}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <List className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-900 dark:text-white">Add single numbers</span>
                    </div>
                    
                    {addMethod === 'manual' && (
                      <div className="mt-4">
                        <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 h-32 border border-gray-300 dark:border-gray-600">
                          <label className="block text-sm text-red-600 dark:text-red-400 font-medium mb-2">
                            Numbers
                          </label>
                          <textarea
                            value={manualInput}
                            onChange={(e) => {
                              setManualInput(e.target.value)
                              parseManualInput(e.target.value)
                            }}
                            placeholder="12412345675&#10;12412345682&#10;12412345699"
                            className="w-full h-16 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-mono text-sm"
                          />
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            enter one complete AWB number per line (11 digits)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Validation Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={validateAWBSeries}
                  disabled={isValidating || !awbSeriesData.prefix}
                  className="flex items-center space-x-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-lg font-medium"
                >
                  {isValidating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  <span>Validate AWB Numbers</span>
                </button>
              </div>

              {/* Validation Results */}
              {validationResults.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Validation Results ({validationResults.length} AWB)
                    </h4>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {validationResults.filter(r => r.isValid).length} valid
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600 font-medium">
                          {validationResults.filter(r => !r.isValid).length} invalid
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {validationResults.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          result.isValid
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {result.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className="font-mono text-sm font-medium">
                            {result.awbNumber}
                          </span>
                          {result.isValid && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              Check digit: {result.checkDigit} ✓
                            </span>
                          )}
                        </div>
                        {!result.isValid && (
                          <div className="text-sm text-red-600 dark:text-red-400">
                            {result.errors.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add to Stock Button */}
                  {validationResults.filter(r => r.isValid).length > 0 && (
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={handleAddAWBStock}
                        disabled={addingStock || validationResults.some(r => !r.isValid)}
                        className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                      >
                        {addingStock ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>+ Add to Stock ({validationResults.filter(r => r.isValid).length} AWB)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AWB Format Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          AWB Format Information
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>• <strong>Structure:</strong> 11 digits total (e.g., 12412345675)</p>
          <p>• <strong>Prefix:</strong> First 3 digits (124) - Airline code</p>
          <p>• <strong>Serial number:</strong> Next 7 digits (1234567) - Sequential numbering</p>
          <p>• <strong>Check digit:</strong> Last digit (5) - Remainder of serial number ÷ 7</p>
          <p>• <strong>Calculation:</strong> 1234567 ÷ 7 = 176366 remainder 5</p>
          <p>• <strong>Storage format:</strong> Prefix in 'prefix' column, Serial+CheckDigit in 'awb' column</p>
          <p>• <strong>Available prefixes:</strong> {availablePrefixes.join(', ')}</p>
          <p>• <strong>Tables:</strong> awbStock124, awbStock235, awbStock624</p>
        </div>
      </div>
    </div>
  )
}

export default AWBValidation