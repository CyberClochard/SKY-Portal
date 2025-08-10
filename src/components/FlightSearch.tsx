import React, { useState } from 'react'
import { Plane, Search, Clock, MapPin, Calendar, AlertCircle, CheckCircle, RefreshCw, Filter, Download, Settings, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react'

interface FlightSegment {
  flightNumber: string
  departureAirport: string
  departureTime: string
  arrivalAirport: string
  arrivalTime: string
  aircraftType?: string
}

interface FlightResult {
  // Legacy format support
  'Flight Number'?: string
  'Departure Time'?: string
  'Arrival Time'?: string
  'Aircraft Type'?: string
  
  // New connection flight format
  'FlightNumberS0'?: string
  'AirportOfDepartureS0'?: string
  'DepartureTimeS0'?: string
  'AirportOfArrivalS0'?: string
  'ArrivalTimeS0'?: string
  'AircraftTypeS0'?: string
  
  'FlightNumberS1'?: string
  'AirportOfDepartureS1'?: string
  'DepartureTimeS1'?: string
  'AirportOfArrivalS1'?: string
  'ArrivalTimeS1'?: string
  'AircraftTypeS1'?: string
}

interface FlightSearchProps {
  n8nBaseUrl?: string
}

function FlightSearch({ n8nBaseUrl }: FlightSearchProps) {
  const [searchForm, setSearchForm] = useState({
    originCode: 'ORY', // Default to ORY
    destinationCode: '',
    departureDate: '',
    directFlightsOnly: true, // New toggle for direct flights
    selectedAirline: 'all', // New airline filter
  })
  
  const [results, setResults] = useState<FlightResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [lastSearchTime, setLastSearchTime] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  // Get n8n configuration from localStorage (same as CASS processor)
  const getN8nConfig = () => {
    const baseUrl = localStorage.getItem('n8n_base_url') || 'https://n8n.skylogistics.fr'
    return baseUrl
  }

  // Available origin airports
  const originAirports = [
    { code: 'ORY', name: 'Paris Orly', city: 'Paris' },
    { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris' }
  ]

  // Available airlines for filtering
  const availableAirlines = [
    { code: 'all', name: 'Toutes les compagnies' },
    { code: 'AH', name: 'Air Algérie' },
    { code: 'TK', name: 'Turkish Airlines' },
    { code: 'PC', name: 'Pegasus Airlines' },
    { code: 'TU', name: 'Tunisair' },
    { code: 'AT', name: 'Royal Air Maroc' },
    { code: 'QR', name: 'Qatar Airways' },
    { code: 'VF', name: 'AJet' },
    { code: 'SS', name: 'Corsair' },
    { code: 'HC', name: 'Air Sénégal' },
    { code: '5O', name: 'ASL Airlines France' },
    { code: 'PK', name: 'Pakistan International Airlines' },
    { code: 'ET', name: 'Ethiopian Airlines' },
    { code: 'MS', name: 'EgyptAir' }
  ]

  // Common airport codes for quick selection (removed GHB and TMR)
  const popularDestinations = [
    { code: 'ALG', name: 'Alger', country: 'Algérie' },
    { code: 'ORN', name: 'Oran', country: 'Algérie' },
    { code: 'CZL', name: 'Constantine', country: 'Algérie' },
    { code: 'AAE', name: 'Annaba', country: 'Algérie' },
    { code: 'TLM', name: 'Tlemcen', country: 'Algérie' },
    { code: 'BJA', name: 'Béjaïa', country: 'Algérie' },
    { code: 'IST', name: 'Istanbul', country: 'Turquie' },
    { code: 'SAW', name: 'Istanbul Sabiha', country: 'Turquie' },
    { code: 'AYT', name: 'Antalya', country: 'Turquie' },
    { code: 'ESB', name: 'Ankara', country: 'Turquie' },
  ]

  // Aircraft type mapping - IATA codes to full aircraft names
  const aircraftTypeMapping: Record<string, string> = {
    // Airbus A320 Family
    '320': 'Airbus A320',
    '321': 'Airbus A321',
    '319': 'Airbus A319',
    '318': 'Airbus A318',
    '32A': 'Airbus A320',
    '32B': 'Airbus A321',
    '32S': 'Airbus A320neo',
    '32N': 'Airbus A320neo',
    '32Q': 'Airbus A321neo',
    
    // Airbus A330 Family
    '330': 'Airbus A330',
    '332': 'Airbus A330-200',
    '333': 'Airbus A330-300',
    '338': 'Airbus A330-800neo',
    '339': 'Airbus A330-900neo',
    
    // Airbus A340 Family
    '340': 'Airbus A340',
    '342': 'Airbus A340-200',
    '343': 'Airbus A340-300',
    '345': 'Airbus A340-500',
    '346': 'Airbus A340-600',
    
    // Airbus A350 Family
    '350': 'Airbus A350',
    '351': 'Airbus A350-1000',
    '359': 'Airbus A350-900',
    
    // Airbus A380
    '380': 'Airbus A380',
    '388': 'Airbus A380-800',
    
    // Boeing 737 Family
    '737': 'Boeing 737',
    '73G': 'Boeing 737-700',
    '73H': 'Boeing 737-800',
    '73J': 'Boeing 737-900',
    '73W': 'Boeing 737-700',
    '738': 'Boeing 737-800',
    '739': 'Boeing 737-900',
    '73C': 'Boeing 737-300',
    '73S': 'Boeing 737-700',
    '7M7': 'Boeing 737 MAX 7',
    '7M8': 'Boeing 737 MAX 8',
    '7M9': 'Boeing 737 MAX 9',
    
    // Boeing 747 Family
    '747': 'Boeing 747',
    '74F': 'Boeing 747-8F',
    '748': 'Boeing 747-8',
    '744': 'Boeing 747-400',
    '74M': 'Boeing 747-400',
    
    // Boeing 757 Family
    '757': 'Boeing 757',
    '752': 'Boeing 757-200',
    '753': 'Boeing 757-300',
    
    // Boeing 767 Family
    '767': 'Boeing 767',
    '762': 'Boeing 767-200',
    '763': 'Boeing 767-300',
    '764': 'Boeing 767-400',
    
    // Boeing 777 Family
    '777': 'Boeing 777',
    '772': 'Boeing 777-200',
    '773': 'Boeing 777-300',
    '77L': 'Boeing 777-200LR',
    '77W': 'Boeing 777-300ER',
    '778': 'Boeing 777-8',
    '779': 'Boeing 777-9',
    
    // Boeing 787 Family
    '787': 'Boeing 787',
    '788': 'Boeing 787-8',
    '789': 'Boeing 787-9',
    '781': 'Boeing 787-10',
    
    // Embraer Family
    'E70': 'Embraer E170',
    'E75': 'Embraer E175',
    'E90': 'Embraer E190',
    'E95': 'Embraer E195',
    'ER3': 'Embraer ERJ-135',
    'ER4': 'Embraer ERJ-145',
    'ERD': 'Embraer ERJ-145',
    'ERJ': 'Embraer ERJ-145',
    
    // Bombardier Family
    'CR2': 'Bombardier CRJ-200',
    'CR7': 'Bombardier CRJ-700',
    'CR9': 'Bombardier CRJ-900',
    'CRK': 'Bombardier CRJ-1000',
    'DH4': 'De Havilland Dash 8-400',
    'DH8': 'De Havilland Dash 8',
    
    // ATR Family
    'AT7': 'ATR 72',
    'AT5': 'ATR 42',
    'ATR': 'ATR 72',
    
    // Other Aircraft
    'SU9': 'Sukhoi Superjet 100',
    'CS1': 'Airbus A220-100',
    'CS3': 'Airbus A220-300',
    '223': 'Airbus A220-300',
    '221': 'Airbus A220-100',
    
    // Freighter variants
    '74Y': 'Boeing 747-8F',
    '76Y': 'Boeing 767-300F',
    '77Y': 'Boeing 777F',
    '32P': 'Airbus A320P2F',
    
    // Regional jets
    'F70': 'Fokker 70',
    'F100': 'Fokker 100',
    'BA1': 'BAe 146-100',
    'BA2': 'BAe 146-200',
    'BA3': 'BAe 146-300',
    
    // Turboprops
    'SF3': 'Saab 340',
    'SF4': 'Saab 2000',
    'BEC': 'Beechcraft 1900',
    'BE1': 'Beechcraft 1900'
  }

  // Function to get aircraft full name
  const getAircraftName = (aircraftCode?: string): string => {
    if (!aircraftCode) return 'Non spécifié'
    
    const cleanCode = aircraftCode.trim().toUpperCase()
    const fullName = aircraftTypeMapping[cleanCode]
    
    if (fullName) {
      return fullName
    }
    
    // If not found in mapping, return the code with a note
    return `${cleanCode} (Type non reconnu)`
  }

  // Function to get aircraft manufacturer
  const getAircraftManufacturer = (aircraftCode?: string): string => {
    if (!aircraftCode) return ''
    
    const fullName = getAircraftName(aircraftCode)
    
    if (fullName.includes('Airbus')) return 'Airbus'
    if (fullName.includes('Boeing')) return 'Boeing'
    if (fullName.includes('Embraer')) return 'Embraer'
    if (fullName.includes('Bombardier')) return 'Bombardier'
    if (fullName.includes('ATR')) return 'ATR'
    if (fullName.includes('Sukhoi')) return 'Sukhoi'
    if (fullName.includes('Fokker')) return 'Fokker'
    if (fullName.includes('BAe')) return 'BAe'
    if (fullName.includes('Saab')) return 'Saab'
    if (fullName.includes('Beechcraft')) return 'Beechcraft'
    if (fullName.includes('De Havilland')) return 'De Havilland'
    
    return 'Autre'
  }

  // Function to parse flight data and determine if it's direct or connection
  const parseFlightData = (flight: FlightResult): { segments: FlightSegment[], isDirect: boolean } => {
    const segments: FlightSegment[] = []
    
    // Check for new connection format first
    if (flight.FlightNumberS0) {
      // First segment
      segments.push({
        flightNumber: flight.FlightNumberS0,
        departureAirport: flight.AirportOfDepartureS0 || '',
        departureTime: flight.DepartureTimeS0 || '',
        arrivalAirport: flight.AirportOfArrivalS0 || '',
        arrivalTime: flight.ArrivalTimeS0 || '',
        aircraftType: flight.AircraftTypeS0
      })
      
      // Second segment (if exists)
      if (flight.FlightNumberS1) {
        segments.push({
          flightNumber: flight.FlightNumberS1,
          departureAirport: flight.AirportOfDepartureS1 || '',
          departureTime: flight.DepartureTimeS1 || '',
          arrivalAirport: flight.AirportOfArrivalS1 || '',
          arrivalTime: flight.ArrivalTimeS1 || '',
          aircraftType: flight.AircraftTypeS1
        })
      }
    }
    // Fallback to legacy format
    else if (flight['Flight Number']) {
      segments.push({
        flightNumber: flight['Flight Number'],
        departureAirport: searchForm.originCode,
        departureTime: flight['Departure Time'] || '',
        arrivalAirport: searchForm.destinationCode,
        arrivalTime: flight['Arrival Time'] || '',
        aircraftType: flight['Aircraft Type']
      })
    }
    
    return {
      segments,
      isDirect: segments.length === 1
    }
  }

  // Check if form is valid
  const isFormValid = searchForm.originCode.trim().length === 3 && 
                     searchForm.destinationCode.trim().length === 3 && 
                     searchForm.departureDate.trim() !== ''

  // Get current n8n configuration
  const currentN8nBaseUrl = getN8nConfig()
  const isN8nConfigured = currentN8nBaseUrl && currentN8nBaseUrl.trim() !== ''

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString)
      return {
        date: date.toLocaleDateString('fr-FR'),
        time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }
    } catch {
      return { date: 'N/A', time: 'N/A' }
    }
  }

  const calculateDuration = (departure: string, arrival: string) => {
    try {
      const dep = new Date(departure)
      const arr = new Date(arrival)
      const diffMs = arr.getTime() - dep.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    } catch {
      return 'N/A'
    }
  }

  const calculateLayoverTime = (firstArrival: string, secondDeparture: string) => {
    try {
      const arr = new Date(firstArrival)
      const dep = new Date(secondDeparture)
      const diffMs = dep.getTime() - arr.getTime()
      const hours = Math.floor(diffMs / (1000 * 60 * 60))
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${hours}h ${minutes}m`
    } catch {
      return 'N/A'
    }
  }

  const getOriginAirportName = (code: string) => {
    const airport = originAirports.find(a => a.code === code)
    return airport ? `${airport.code} - ${airport.name}` : code
  }

  const searchFlights = async () => {
    if (!isFormValid) {
      setError('Veuillez remplir tous les champs requis')
      return
    }

    if (!isN8nConfigured) {
      setError('Configuration n8n requise pour effectuer la recherche. Veuillez configurer n8n dans la section Workflows.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    setDebugInfo(null)

    try {
      const webhookUrl = `${currentN8nBaseUrl}/webhook/1f5a8aaf-64cd-49a2-b56c-95d7554a17dc`
      
      console.log('Sending request to:', webhookUrl)
      console.log('Request data:', {
        originCode: searchForm.originCode.toUpperCase(),
        destinationCode: searchForm.destinationCode.toUpperCase(),
        departureDate: searchForm.departureDate,
        directFlightsOnly: searchForm.directFlightsOnly,
        selectedAirline: searchForm.selectedAirline,
      })

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'originlocationcode': searchForm.originCode.toUpperCase(),
          'destinationlocationcode': searchForm.destinationCode.toUpperCase(),
          'date': searchForm.departureDate,
          'directflightsonly': searchForm.directFlightsOnly.toString(),
          'selectedairline': searchForm.selectedAirline,
        },
        body: JSON.stringify({
          originCode: searchForm.originCode.toUpperCase(),
          destinationCode: searchForm.destinationCode.toUpperCase(),
          departureDate: searchForm.departureDate,
          directFlightsOnly: searchForm.directFlightsOnly,
          selectedAirline: searchForm.selectedAirline,
          source: 'SkyLogistics Dashboard',
          timestamp: new Date().toISOString()
        })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }

      // Get response text first to debug
      const responseText = await response.text()
      console.log('Raw response:', responseText)

      // Store debug info
      setDebugInfo({
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        rawResponse: responseText,
        url: webhookUrl
      })

      // Try to parse JSON
      let data
      if (responseText.trim() === '') {
        // Empty response - show no flights found
        setResults([])
        setSuccess('Aucun vol trouvé pour cette recherche')
        setLastSearchTime(new Date().toLocaleString('fr-FR'))
        return
      }

      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        setError(`Réponse JSON invalide du workflow n8n. Réponse reçue: "${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}"`)
        return
      }

      console.log('Parsed data:', data)
      
      // Handle different response formats
      let flights: FlightResult[] = []
      
      if (Array.isArray(data)) {
        flights = data
      } else if (data && Array.isArray(data.flights)) {
        flights = data.flights
      } else if (data && Array.isArray(data.data)) {
        flights = data.data
      } else if (data && data.message) {
        // Workflow returned a message (possibly an error)
        setError(`Message du workflow: ${data.message}`)
        setResults([])
        return
      } else {
        // Unknown format
        setError(`Format de réponse inattendu du workflow. Données reçues: ${JSON.stringify(data).substring(0, 200)}`)
        setResults([])
        return
      }

      // Validate flight data structure (support both formats)
      const validFlights = flights.filter(flight => {
        // New format validation
        if (flight.FlightNumberS0 && flight.DepartureTimeS0 && flight.ArrivalTimeS0) {
          return true
        }
        // Legacy format validation
        if (flight['Flight Number'] && flight['Departure Time'] && flight['Arrival Time']) {
          return true
        }
        return false
      })

      if (validFlights.length > 0) {
        setResults(validFlights)
        setSuccess(`${validFlights.length} vol(s) trouvé(s)`)
        setLastSearchTime(new Date().toLocaleString('fr-FR'))
      } else if (flights.length > 0) {
        setError(`Données de vol invalides reçues. Format attendu: nouveau format avec segments S0/S1 ou ancien format`)
        setResults([])
      } else {
        // No flights found
        setResults([])
        setSuccess('Aucun vol trouvé pour cette recherche')
        setLastSearchTime(new Date().toLocaleString('fr-FR'))
      }

    } catch (err) {
      console.error('Search error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Erreur lors de la recherche: ${errorMessage}`)
      setResults([])
    } finally {
      setLoading(false)
      setTimeout(() => setSuccess(null), 5000)
    }
  }

  const exportResults = () => {
    if (results.length === 0) return

    const csvContent = [
      ['Type', 'Numéro de Vol', 'Départ', 'Arrivée', 'Heure de Départ', 'Heure d\'Arrivée', 'Durée', 'Type d\'Avion'].join(','),
      ...results.map(flight => {
        const { segments, isDirect } = parseFlightData(flight)
        
        if (isDirect && segments.length > 0) {
          const segment = segments[0]
          return [
            'Direct',
            segment.flightNumber,
            segment.departureAirport,
            segment.arrivalAirport,
            segment.departureTime,
            segment.arrivalTime,
            calculateDuration(segment.departureTime, segment.arrivalTime),
            getAircraftName(segment.aircraftType)
          ].join(',')
        } else if (segments.length > 1) {
          return [
            'Avec escale',
            segments.map(s => s.flightNumber).join(' + '),
            segments[0].departureAirport,
            segments[segments.length - 1].arrivalAirport,
            segments[0].departureTime,
            segments[segments.length - 1].arrivalTime,
            calculateDuration(segments[0].departureTime, segments[segments.length - 1].arrivalTime),
            segments.map(s => getAircraftName(s.aircraftType)).join(' + ')
          ].join(',')
        }
        return ''
      }).filter(row => row !== '')
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `vols_${searchForm.originCode}_${searchForm.destinationCode}_${searchForm.departureDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recherche de Vols</h2>
            <p className="text-gray-600 dark:text-gray-400">Trouvez les vols depuis Paris (ORY/CDG)</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {lastSearchTime && (
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Dernière recherche</p>
              <p className="text-gray-900 dark:text-white font-medium">{lastSearchTime}</p>
            </div>
          )}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            isN8nConfigured 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isN8nConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isN8nConfigured ? 'n8n configuré' : 'Configuration requise'}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erreur de recherche</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
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

      {/* Debug Info (only show when there's an error and debug data) */}
      {debugInfo && error && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
              Informations de débogage (cliquez pour développer)
            </summary>
            <div className="space-y-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded">
              <p><strong>URL:</strong> {debugInfo.url}</p>
              <p><strong>Status:</strong> {debugInfo.status}</p>
              <p><strong>Headers:</strong> {JSON.stringify(debugInfo.headers, null, 2)}</p>
              <p><strong>Réponse brute:</strong></p>
              <pre className="whitespace-pre-wrap break-all">{debugInfo.rawResponse}</pre>
            </div>
          </details>
        </div>
      )}

      {/* Search Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Paramètres de recherche</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {/* Origin Airport */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Départ *
            </label>
            <select
              value={searchForm.originCode}
              onChange={(e) => setSearchForm(prev => ({ ...prev, originCode: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {originAirports.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.code} - {airport.name}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Destination *
            </label>
            <input
              type="text"
              value={searchForm.destinationCode}
              onChange={(e) => setSearchForm(prev => ({ ...prev, destinationCode: e.target.value.toUpperCase() }))}
              placeholder="ALG, ORN, CZL..."
              maxLength={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Date de départ *
            </label>
            <input
              type="date"
              value={searchForm.departureDate}
              onChange={(e) => setSearchForm(prev => ({ ...prev, departureDate: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Airline Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Plane className="w-4 h-4 inline mr-1" />
              Compagnie
            </label>
            <select
              value={searchForm.selectedAirline}
              onChange={(e) => setSearchForm(prev => ({ ...prev, selectedAirline: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableAirlines.map((airline) => (
                <option key={airline.code} value={airline.code}>
                  {airline.code === 'all' ? airline.name : `${airline.code} - ${airline.name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={searchFlights}
              disabled={loading || !isFormValid || !isN8nConfigured}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Rechercher</span>
            </button>
          </div>
        </div>

        {/* Flight Options */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Options de vol</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Choisissez le type de vols à rechercher
              </p>
            </div>
            
            {/* Direct Flights Toggle */}
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium transition-colors ${
                !searchForm.directFlightsOnly 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                Avec escales
              </span>
              
              <button
                onClick={() => setSearchForm(prev => ({ ...prev, directFlightsOnly: !prev.directFlightsOnly }))}
                className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  searchForm.directFlightsOnly 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label="Toggle direct flights only"
              >
                <span
                  className={`inline-block w-5 h-5 bg-white rounded-full shadow-lg transform transition-transform duration-200 ${
                    searchForm.directFlightsOnly ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
                
                {/* Toggle Icons */}
                <div className="absolute inset-0 flex items-center justify-between px-1 pointer-events-none">
                  {searchForm.directFlightsOnly ? (
                    <ToggleRight className="w-3 h-3 text-white ml-0.5" />
                  ) : (
                    <ToggleLeft className="w-3 h-3 text-gray-400 mr-0.5" />
                  )}
                </div>
              </button>
              
              <span className={`text-sm font-medium transition-colors ${
                searchForm.directFlightsOnly 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                Vols directs
              </span>
            </div>
          </div>
          
          {/* Toggle Description */}
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            {searchForm.directFlightsOnly ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Recherche limitée aux vols directs uniquement</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span>Recherche incluant les vols avec escales</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Destination Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Destinations populaires
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {popularDestinations.map((dest) => (
              <button
                key={dest.code}
                onClick={() => setSearchForm(prev => ({ ...prev, destinationCode: dest.code }))}
                className={`p-2 text-xs rounded-lg border transition-colors ${
                  searchForm.destinationCode === dest.code
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <div className="font-medium">{dest.code}</div>
                <div className="text-xs opacity-75">{dest.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Info */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>
              {searchForm.directFlightsOnly ? 'Vols directs' : 'Vols directs et avec escales'} • 
              {searchForm.selectedAirline === 'all' ? 'Toutes compagnies' : availableAirlines.find(a => a.code === searchForm.selectedAirline)?.name} • 
              1 passager adulte
            </span>
          </div>
          <div className="text-xs">
            Recherche depuis: {getOriginAirportName(searchForm.originCode)}
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Résultats de recherche ({results.length} vol{results.length > 1 ? 's' : ''})
              </h3>
              <div className="flex items-center space-x-3">
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
                  searchForm.directFlightsOnly 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    searchForm.directFlightsOnly ? 'bg-blue-500' : 'bg-orange-500'
                  }`}></div>
                  <span>{searchForm.directFlightsOnly ? 'Vols directs' : 'Tous types de vols'}</span>
                </div>
                {searchForm.selectedAirline !== 'all' && (
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                    <Plane className="w-3 h-3" />
                    <span>{availableAirlines.find(a => a.code === searchForm.selectedAirline)?.name}</span>
                  </div>
                )}
                <button
                  onClick={exportResults}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Exporter CSV</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {results.map((flight, index) => {
                const { segments, isDirect } = parseFlightData(flight)
                
                if (segments.length === 0) return null

                // Calculate total duration
                const totalDuration = calculateDuration(
                  segments[0].departureTime, 
                  segments[segments.length - 1].arrivalTime
                )

                return (
                  <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    {isDirect ? (
                      // Direct Flight Layout
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        {/* Flight Info */}
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {segments[0].flightNumber}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Vol direct</p>
                          </div>
                        </div>

                        {/* Departure */}
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatDateTime(segments[0].departureTime).time}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {segments[0].departureAirport}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDateTime(segments[0].departureTime).date}
                          </p>
                        </div>

                        {/* Duration */}
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-2 mb-1">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{totalDuration}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">Direct</p>
                        </div>

                        {/* Arrival */}
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatDateTime(segments[0].arrivalTime).time}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {segments[0].arrivalAirport}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDateTime(segments[0].arrivalTime).date}
                          </p>
                        </div>

                        {/* Aircraft Type */}
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-2 mb-1">
                            <div className={`w-3 h-3 rounded-full ${
                              getAircraftManufacturer(segments[0].aircraftType) === 'Airbus' ? 'bg-blue-500' :
                              getAircraftManufacturer(segments[0].aircraftType) === 'Boeing' ? 'bg-green-500' :
                              getAircraftManufacturer(segments[0].aircraftType) === 'Embraer' ? 'bg-purple-500' :
                              getAircraftManufacturer(segments[0].aircraftType) === 'Bombardier' ? 'bg-orange-500' :
                              'bg-gray-500'
                            }`}></div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getAircraftManufacturer(segments[0].aircraftType)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {getAircraftName(segments[0].aircraftType)}
                          </p>
                          {segments[0].aircraftType && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                              Code: {segments[0].aircraftType}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Connection Flight Layout
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                              <Plane className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {segments.map(s => s.flightNumber).join(' + ')}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Vol avec {segments.length - 1} escale{segments.length > 2 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Durée totale: {totalDuration}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              {segments.length} segment{segments.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Flight Segments */}
                        <div className="space-y-3">
                          {segments.map((segment, segmentIndex) => (
                            <div key={segmentIndex}>
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                {/* Segment Info */}
                                <div className="flex items-center space-x-2">
                                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                      {segmentIndex + 1}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                      {segment.flightNumber}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                      Segment {segmentIndex + 1}
                                    </p>
                                  </div>
                                </div>

                                {/* Departure */}
                                <div className="text-center">
                                  <p className="font-bold text-gray-900 dark:text-white">
                                    {formatDateTime(segment.departureTime).time}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {segment.departureAirport}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {formatDateTime(segment.departureTime).date}
                                  </p>
                                </div>

                                {/* Arrow */}
                                <div className="flex justify-center">
                                  <ArrowRight className="w-4 h-4 text-gray-400" />
                                </div>

                                {/* Arrival */}
                                <div className="text-center">
                                  <p className="font-bold text-gray-900 dark:text-white">
                                    {formatDateTime(segment.arrivalTime).time}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {segment.arrivalAirport}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {formatDateTime(segment.arrivalTime).date}
                                  </p>
                                </div>

                                {/* Duration */}
                                <div className="text-center">
                                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {calculateDuration(segment.departureTime, segment.arrivalTime)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">Durée</p>
                                </div>

                                {/* Aircraft */}
                                <div className="text-center">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {getAircraftName(segment.aircraftType)}
                                  </p>
                                  {segment.aircraftType && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                                      {segment.aircraftType}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Layover Info */}
                              {segmentIndex < segments.length - 1 && (
                                <div className="flex items-center justify-center py-2">
                                  <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      Escale à {segment.arrivalAirport} - {calculateLayoverTime(segment.arrivalTime, segments[segmentIndex + 1].departureTime)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* No Results State */}
      {!loading && results.length === 0 && lastSearchTime && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <Plane className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucun vol trouvé</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Aucun vol {searchForm.directFlightsOnly ? 'direct' : ''} n'a été trouvé pour cette destination et cette date.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {searchForm.directFlightsOnly 
              ? 'Essayez de désactiver l\'option "Vols directs" pour inclure les vols avec escales.'
              : 'Essayez une autre date, un autre aéroport de départ ou vérifiez le code de destination.'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default FlightSearch