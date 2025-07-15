import React, { useState } from 'react'
import { Plane, User, MapPin, Calendar, Send, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface ReservationFormData {
  humName: string
  departureAirport: string
  destinationAirport: string
  desiredFlight: string
  departureDate: string
}

interface ReservationFormProps {
  n8nBaseUrl?: string
}

const ReservationForm: React.FC<ReservationFormProps> = ({ n8nBaseUrl }) => {
  const [formData, setFormData] = useState<ReservationFormData>({
    humName: '',
    departureAirport: '',
    destinationAirport: '',
    desiredFlight: '',
    departureDate: ''
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Common destination airports (examples)
  const commonDestinations = [
    { code: 'ALG', name: 'Alger - Houari Boumediene' },
    { code: 'ORA', name: 'Oran - Ahmed Ben Bella' },
    { code: 'CZL', name: 'Constantine - Mohamed Boudiaf' },
    { code: 'TUN', name: 'Tunis - Carthage' },
    { code: 'CMN', name: 'Casablanca - Mohammed V' },
    { code: 'RAK', name: 'Marrakech - Menara' }
  ]

  const handleInputChange = (field: keyof ReservationFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear messages when user starts typing
    if (error) setError(null)
    if (success) setSuccess(null)
  }


  const validateForm = (): string[] => {
    const errors: string[] = []
    
    if (!formData.humName.trim()) {
      errors.push('Le nom HUM est requis')
    }
    
    if (!formData.departureAirport) {
      errors.push('L\'aéroport de départ est requis')
    } else if (formData.departureAirport.length !== 3) {
      errors.push('Le code aéroport de départ doit contenir 3 lettres')
    }
    
    if (!formData.destinationAirport) {
      errors.push('L\'aéroport de destination est requis')
    } else if (formData.destinationAirport.length !== 3) {
      errors.push('Le code aéroport de destination doit contenir 3 lettres')
    }
    
    if (!formData.desiredFlight.trim()) {
      errors.push('Le vol souhaité est requis')
    }
    
    if (!formData.departureDate) {
      errors.push('La date de départ est requise')
    } else {
      const selectedDate = new Date(formData.departureDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        errors.push('La date de départ ne peut pas être dans le passé')
      }
    }
    
    return errors
  }

  const submitReservation = async () => {
    // Validate form
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Prepare data for n8n workflow
      const workflowData = {
        humName: formData.humName.trim(),
        departureAirport: formData.departureAirport,
        destinationAirport: formData.destinationAirport.toUpperCase(),
        desiredFlight: formData.desiredFlight.trim(),
        departureDate: formData.departureDate,
        timestamp: new Date().toISOString(),
        source: 'SkyLogistics Dashboard',
        airline: 'Air Algérie', // Only Air Algérie supported for now
        airlineCode: 'AH'
      }

      console.log('Submitting reservation to n8n:', workflowData)

      // Updated production webhook URL
      const webhookUrl = 'https://n8n.skylogistics.fr/webhook/1ca86556-aa65-4bf9-8a26-5ef6b8d59d79'
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflowData)
      })

      console.log('n8n response status:', response.status)

      if (!response.ok) {
        throw new Error(`Erreur workflow n8n: ${response.status} ${response.statusText}`)
      }

      const responseText = await response.text()
      console.log('n8n raw response:', responseText)

      let workflowResult
      try {
        workflowResult = JSON.parse(responseText)
      } catch (jsonError) {
        // If response is not JSON, treat as success with text response
        workflowResult = { 
          success: true, 
          message: responseText || 'Réservation soumise avec succès',
          data: workflowData
        }
      }

      console.log('n8n workflow result:', workflowResult)

      setResult(workflowResult)
      
      if (workflowResult.success !== false) {
        setSuccess(
          workflowResult.message || 
          `Réservation créée avec succès pour ${formData.humName}. ${workflowResult.awbNumber ? `AWB assigné: ${workflowResult.awbNumber}` : ''}`
        )
        
        // Reset form on success
        setFormData({
          humName: '',
          departureAirport: '',
          destinationAirport: '',
          desiredFlight: '',
          departureDate: ''
        })
      } else {
        setError(workflowResult.message || 'Erreur lors de la création de la réservation')
      }

    } catch (err) {
      console.error('Reservation submission error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(`Erreur lors de la soumission: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
      
      // Clear success message after 5 seconds
      if (success) {
        setTimeout(() => setSuccess(null), 5000)
      }
    }
  }

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Plane className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Nouvelle Réservation</h3>
          <p className="text-gray-600 dark:text-gray-400">Créer une demande de réservation Air Algérie</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
            <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erreur de soumission</p>
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

      {/* Form */}
      <div className="space-y-6">
        {/* HUM Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Nom HUM *
          </label>
          <input
            type="text"
            value={formData.humName}
            onChange={(e) => handleInputChange('humName', e.target.value)}
            placeholder="Nom du passager"
            className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            disabled={isSubmitting}
          />
        </div>

        {/* Airports */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departure Airport */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Aéroport de départ *
            </label>
            <input
              type="text"
              value={formData.departureAirport}
              onChange={(e) => handleInputChange('departureAirport', e.target.value.toUpperCase())}
              placeholder="Code IATA (ex: ORY, CDG)"
              maxLength={3}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
              disabled={isSubmitting}
            />
          </div>

          {/* Destination Airport */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-2" />
              Aéroport de destination *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.destinationAirport}
                onChange={(e) => handleInputChange('destinationAirport', e.target.value.toUpperCase())}
                placeholder="Code IATA (ex: ALG)"
                maxLength={3}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {/* Flight and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Desired Flight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Plane className="w-4 h-4 inline mr-2" />
              Vol souhaité *
            </label>
            <input
              type="text"
              value={formData.desiredFlight}
              onChange={(e) => handleInputChange('desiredFlight', e.target.value.toUpperCase())}
              placeholder="Ex: AH1006"
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-mono"
              disabled={isSubmitting}
            />
          </div>

          {/* Departure Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date de départ *
            </label>
            <input
              type="date"
              value={formData.departureDate}
              onChange={(e) => handleInputChange('departureDate', e.target.value)}
              min={today}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={submitReservation}
            disabled={isSubmitting}
            className="flex items-center space-x-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-lg font-medium shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            <span>
              {isSubmitting ? 'Création en cours...' : 'Créer la réservation'}
            </span>
          </button>
        </div>
      </div>

      {/* Workflow Result Details */}
      {result && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Détails de la réservation:
          </h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            {result.awbNumber && (
              <p><strong>AWB assigné:</strong> {result.awbNumber}</p>
            )}
            {result.dossierNumber && (
              <p><strong>Numéro de dossier:</strong> {result.dossierNumber}</p>
            )}
            {result.bookingReference && (
              <p><strong>Référence de réservation:</strong> {result.bookingReference}</p>
            )}
            <p><strong>Statut:</strong> {result.success !== false ? 'Créée avec succès' : 'Erreur'}</p>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium mb-1">
              Informations importantes:
            </p>
            <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Seule la compagnie Air Algérie est actuellement supportée</li>
              <li>• Saisissez les codes IATA des aéroports (3 lettres chacun)</li>
              <li>• Un AWB sera automatiquement assigné depuis le stock disponible</li>
              <li>• Une demande de réservation sera envoyée à la compagnie aérienne</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReservationForm