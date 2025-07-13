import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Plane, User, MapPin, Calendar, Phone, Mail } from 'lucide-react'
import ReservationForm from './ReservationForm'

interface NewReservationPageProps {
  n8nBaseUrl?: string
}

interface OlivierRahmetFormData {
  compagnie: string
  client: string
  nomDefunt: string
  aeroportDepart: string
  aeroportArrivee: string
  vol1: string
  dateVol1: string
  vol2: string
  dateVol2: string
  destinataire: string
  telephone: string
}

const NewReservationPage: React.FC<NewReservationPageProps> = ({ n8nBaseUrl }) => {
  const [airAlgerieExpanded, setAirAlgerieExpanded] = useState(true)
  const [olivierRahmetExpanded, setOlivierRahmetExpanded] = useState(true)
  const [olivierRahmetData, setOlivierRahmetData] = useState<OlivierRahmetFormData>({
    compagnie: '',
    client: '',
    nomDefunt: '',
    aeroportDepart: '',
    aeroportArrivee: '',
    vol1: '',
    dateVol1: '',
    vol2: '',
    dateVol2: '',
    destinataire: '',
    telephone: '+90'
  })
  const [isSubmittingOlivierRahmet, setIsSubmittingOlivierRahmet] = useState(false)
  const [olivierRahmetError, setOlivierRahmetError] = useState<string | null>(null)
  const [olivierRahmetSuccess, setOlivierRahmetSuccess] = useState<string | null>(null)

  // Handle company change and auto-fill departure airport
  const handleCompagnieChange = (compagnie: string) => {
    const aeroportDepart = compagnie === 'Pegasus Airlines' ? 'ORY' : compagnie === 'Turkish Airlines' ? 'CDG' : ''
    setOlivierRahmetData(prev => ({
      ...prev,
      compagnie,
      aeroportDepart
    }))
  }

  // Handle phone input to maintain +90 prefix
  const handleTelephoneChange = (value: string) => {
    if (!value.startsWith('+90')) {
      value = '+90' + value.replace(/^\+90/, '')
    }
    setOlivierRahmetData(prev => ({
      ...prev,
      telephone: value
    }))
  }

  // Get client email variables
  const getClientVariables = () => {
    const clientMail = olivierRahmetData.client === 'PF OLIVIER' 
      ? 'olivierfcf@gmail.com,karasu.seyithan@icloud.com,eroglu9104@gmail.com,adem-yilmaz@outlook.fr'
      : olivierRahmetData.client === 'PF RAHMET'
      ? 'pfrahmet@gmail.com'
      : ''
    
    return {
      clientMail,
      skyMail: 'reservation@skymasters.fr'
    }
  }

  // Submit Olivier/Rahmet form
  const handleOlivierRahmetSubmit = async () => {
    setIsSubmittingOlivierRahmet(true)
    setOlivierRahmetError(null)
    setOlivierRahmetSuccess(null)

    // Validation
    const requiredFields = ['compagnie', 'client', 'nomDefunt', 'aeroportDepart', 'aeroportArrivee', 'vol1', 'dateVol1']
    const missingFields = requiredFields.filter(field => !olivierRahmetData[field])
    
    if (missingFields.length > 0) {
      setOlivierRahmetError(`Champs requis manquants: ${missingFields.join(', ')}`)
      setIsSubmittingOlivierRahmet(false)
      return
    }

    try {
      const variables = getClientVariables()
      
      // Prepare data for webhook
      const webhookData = {
        // Form data
        compagnie: olivierRahmetData.compagnie,
        client: olivierRahmetData.client,
        nomDefunt: olivierRahmetData.nomDefunt,
        aeroportDepart: olivierRahmetData.aeroportDepart,
        aeroportArrivee: olivierRahmetData.aeroportArrivee.toUpperCase(),
        vol1: olivierRahmetData.vol1.toUpperCase(),
        dateVol1: olivierRahmetData.dateVol1,
        vol2: olivierRahmetData.vol2.toUpperCase(),
        dateVol2: olivierRahmetData.dateVol2,
        destinataire: olivierRahmetData.destinataire,
        telephone: olivierRahmetData.telephone,
        
        // Variables
        clientMail: variables.clientMail,
        skyMail: variables.skyMail,
        
        // Metadata
        timestamp: new Date().toISOString(),
        source: 'SkyLogistics Dashboard - Olivier/Rahmet',
        formType: 'olivier-rahmet'
      }

      console.log('Envoi des données Olivier/Rahmet:', webhookData)

      const webhookUrl = 'https://n8n.skylogistics.fr/webhook/8ca35e2a-cb37-46ae-bb74-36c983d172d6'
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
      })

      if (!response.ok) {
        throw new Error(`Erreur webhook: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('Réponse webhook Olivier/Rahmet:', result)

      setOlivierRahmetSuccess(`Réservation créée avec succès pour ${olivierRahmetData.nomDefunt}`)
      
      // Reset form
      setOlivierRahmetData({
        compagnie: '',
        client: '',
        nomDefunt: '',
        aeroportDepart: '',
        aeroportArrivee: '',
        vol1: '',
        dateVol1: '',
        vol2: '',
        dateVol2: '',
        destinataire: '',
        telephone: '+90'
      })

    } catch (err) {
      console.error('Erreur Olivier/Rahmet:', err)
      setOlivierRahmetError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSubmittingOlivierRahmet(false)
      setTimeout(() => setOlivierRahmetSuccess(null), 5000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Air Algérie Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plane className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Air Algérie</h3>
                <p className="text-gray-600 dark:text-gray-400">Créer une demande de réservation Air Algérie</p>
              </div>
            </div>
            <button
              onClick={() => setAirAlgerieExpanded(!airAlgerieExpanded)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {airAlgerieExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Rétracter</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Développer</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {airAlgerieExpanded && (
          <div className="p-6">
            <ReservationForm n8nBaseUrl={n8nBaseUrl} />
          </div>
        )}
      </div>

      {/* Olivier / Rahmet Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Olivier / Rahmet</h3>
                <p className="text-gray-600 dark:text-gray-400">Réservations Pegasus Airlines et Turkish Airlines</p>
              </div>
            </div>
            <button
              onClick={() => setOlivierRahmetExpanded(!olivierRahmetExpanded)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {olivierRahmetExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Rétracter</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Développer</span>
                </>
              )}
            </button>
          </div>
        </div>

        {olivierRahmetExpanded && (
          <div className="p-6">
            {/* Messages */}
            {olivierRahmetError && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
                  <span className="text-sm">{olivierRahmetError}</span>
                </div>
              </div>
            )}

            {olivierRahmetSuccess && (
              <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <span className="text-sm">{olivierRahmetSuccess}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-6">
              {/* Company and Client */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Plane className="w-4 h-4 inline mr-2" />
                    Compagnie Aérienne *
                  </label>
                  <select
                    value={olivierRahmetData.compagnie}
                    onChange={(e) => handleCompagnieChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    disabled={isSubmittingOlivierRahmet}
                  >
                    <option value="">Sélectionner une compagnie</option>
                    <option value="Pegasus Airlines">Pegasus Airlines</option>
                    <option value="Turkish Airlines">Turkish Airlines</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Client *
                  </label>
                  <select
                    value={olivierRahmetData.client}
                    onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, client: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    disabled={isSubmittingOlivierRahmet}
                  >
                    <option value="">Sélectionner un client</option>
                    <option value="PF OLIVIER">PF OLIVIER</option>
                    <option value="PF RAHMET">PF RAHMET</option>
                  </select>
                </div>
              </div>

              {/* Deceased Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom du défunt *
                </label>
                <input
                  type="text"
                  value={olivierRahmetData.nomDefunt}
                  onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, nomDefunt: e.target.value }))}
                  placeholder="Nom complet du défunt"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  disabled={isSubmittingOlivierRahmet}
                />
              </div>

              {/* Airports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Aéroport de départ *
                  </label>
                  <select
                    value={olivierRahmetData.aeroportDepart}
                    onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, aeroportDepart: e.target.value }))}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    disabled={isSubmittingOlivierRahmet}
                  >
                    <option value="">Sélectionner un aéroport</option>
                    <option value="ORY">ORY - Paris-Orly</option>
                    <option value="CDG">CDG - Paris-Charles de Gaulle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Aéroport d'arrivée *
                  </label>
                  <input
                    type="text"
                    value={olivierRahmetData.aeroportArrivee}
                    onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, aeroportArrivee: e.target.value.toUpperCase() }))}
                    placeholder="Ex: KYA"
                    maxLength={3}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-mono"
                    disabled={isSubmittingOlivierRahmet}
                  />
                </div>
              </div>

              {/* Flights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Plane className="w-4 h-4 inline mr-2" />
                      Vol 1 *
                    </label>
                    <input
                      type="text"
                      value={olivierRahmetData.vol1}
                      onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, vol1: e.target.value.toUpperCase() }))}
                      placeholder="Ex: PC1234"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-mono"
                      disabled={isSubmittingOlivierRahmet}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date du vol 1 *
                    </label>
                    <input
                      type="date"
                      value={olivierRahmetData.dateVol1}
                      onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, dateVol1: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                      disabled={isSubmittingOlivierRahmet}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Plane className="w-4 h-4 inline mr-2" />
                      Vol 2
                    </label>
                    <input
                      type="text"
                      value={olivierRahmetData.vol2}
                      onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, vol2: e.target.value.toUpperCase() }))}
                      placeholder="Ex: TK5678"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-mono"
                      disabled={isSubmittingOlivierRahmet}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date du vol 2
                    </label>
                    <input
                      type="date"
                      value={olivierRahmetData.dateVol2}
                      onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, dateVol2: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                      disabled={isSubmittingOlivierRahmet}
                    />
                  </div>
                </div>
              </div>

              {/* Recipient and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Destinataire
                  </label>
                  <input
                    type="text"
                    value={olivierRahmetData.destinataire}
                    onChange={(e) => setOlivierRahmetData(prev => ({ ...prev, destinataire: e.target.value }))}
                    placeholder="Nom du destinataire"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                    disabled={isSubmittingOlivierRahmet}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={olivierRahmetData.telephone}
                    onChange={(e) => handleTelephoneChange(e.target.value)}
                    placeholder="+90 555 123 4567"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-mono"
                    disabled={isSubmittingOlivierRahmet}
                  />
                </div>
              </div>

              {/* Variables Info */}
              {olivierRahmetData.client && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">Variables email configurées :</p>
                      <p className="text-blue-700 dark:text-blue-300">
                        <strong>Client :</strong> {getClientVariables().clientMail}
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        <strong>Sky :</strong> {getClientVariables().skyMail}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleOlivierRahmetSubmit}
                  disabled={isSubmittingOlivierRahmet}
                  className="flex items-center space-x-3 px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-lg font-medium shadow-lg hover:shadow-xl"
                >
                  {isSubmittingOlivierRahmet ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plane className="w-5 h-5" />
                  )}
                  <span>
                    {isSubmittingOlivierRahmet ? 'Création en cours...' : 'Créer la réservation'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NewReservationPage