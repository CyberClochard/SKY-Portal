import React, { useState } from 'react';
import { User, Plane, FileText, Save, Calendar, MapPin, ToggleLeft, ToggleRight, Search, X, RefreshCw } from 'lucide-react';
import { CaseData } from '../types/booking';
import { getAirlineByCode } from '../lib/supabase';

interface FlightAutoCompleteData {
  carrierCode: string;
  flightNumber: string;
  scheduledDepartureDate: string;
}

interface FlightAutoCompleteModal {
  isOpen: boolean;
  flightIndex: number;
  onClose: () => void;
  onComplete: (flightIndex: number, data: any) => void;
}

const FlightAutoCompleteModal: React.FC<FlightAutoCompleteModal> = ({ 
  isOpen, 
  flightIndex, 
  onClose, 
  onComplete 
}) => {
  const [formData, setFormData] = useState<FlightAutoCompleteData>({
    carrierCode: '',
    flightNumber: '',
    scheduledDepartureDate: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof FlightAutoCompleteData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'carrierCode' ? value.toUpperCase().slice(0, 2) : 
               field === 'flightNumber' ? value.replace(/\D/g, '').slice(0, 4) : 
               value
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.carrierCode || formData.carrierCode.length !== 2) {
      setError('Le code transporteur doit contenir exactement 2 lettres');
      return;
    }
    if (!formData.flightNumber || formData.flightNumber.length === 0) {
      setError('Le numéro de vol est requis');
      return;
    }
    if (!formData.scheduledDepartureDate) {
      setError('La date de départ est requise');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const webhookUrl = 'https://n8n.skylogistics.fr/webhook/4c6e1f03-c2e9-42f3-9359-e9a956eccf5d';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          carrierCode: formData.carrierCode,
          flightNumber: formData.flightNumber,
          scheduledDepartureDate: formData.scheduledDepartureDate,
          timestamp: new Date().toISOString(),
          source: 'SkyLogistics Dashboard - Flight AutoComplete'
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`Erreur webhook: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Réponse auto-complétion vol:', result);

      if (result.error || result.success === false) {
        throw new Error(result.message || result.error || 'Erreur lors de la recherche du vol');
      }

      // Appeler la fonction de complétion avec les données reçues
      onComplete(flightIndex, result);
      onClose();
      
      // Reset form
      setFormData({
        carrierCode: '',
        flightNumber: '',
        scheduledDepartureDate: ''
      });

    } catch (err) {
      console.error('Erreur auto-complétion vol:', err);
      
      // Diagnostic détaillé de l'erreur
      let errorMessage = 'Erreur de connexion au serveur n8n:\n\n';
      
      if (err instanceof Error) {
        const errorName = err.name;
        const errorMsg = err.message;
        
        console.log('Type d\'erreur auto-complétion:', errorName, 'Message:', errorMsg);
        
        if (errorName === 'AbortError' || errorName === 'TimeoutError') {
          errorMessage += '⏱️ TIMEOUT (30s dépassé)\n';
          errorMessage += '• Le serveur n8n met trop de temps à répondre\n';
          errorMessage += '• Vérifiez que n8n.skylogistics.fr est en ligne\n';
          errorMessage += '• Le workflow d\'auto-complétion pourrait être lent\n\n';
          errorMessage += '🔧 Solutions:\n';
          errorMessage += '1. Vérifiez l\'état du serveur n8n\n';
          errorMessage += '2. Optimisez le workflow d\'auto-complétion\n';
          errorMessage += '3. Réessayez dans quelques instants';
        } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          errorMessage += '🌐 PROBLÈME DE CONNECTIVITÉ\n\n';
          errorMessage += '❌ Impossible d\'atteindre https://n8n.skylogistics.fr\n\n';
          errorMessage += '🔍 Vérifications nécessaires:\n';
          errorMessage += '1. ✅ Connexion internet active\n';
          errorMessage += '2. 🌍 Serveur n8n.skylogistics.fr accessible\n';
          errorMessage += '3. 🔒 Configuration CORS du serveur n8n\n';
          errorMessage += '4. 🚫 Pas de blocage par firewall/proxy\n\n';
          errorMessage += '🛠️ Configuration CORS n8n requise:\n';
          errorMessage += '• Variable: CORS_ORIGINS=https://localhost:5173\n';
          errorMessage += '• Redémarrer n8n après modification\n\n';
          errorMessage += '🧪 Tests à effectuer:\n';
          errorMessage += '• Ouvrir https://n8n.skylogistics.fr dans le navigateur\n';
          errorMessage += '• Vérifier les logs du serveur n8n\n';
          errorMessage += '• Tester depuis un autre réseau';
        } else if (errorMsg.includes('CORS')) {
          errorMessage += '🚫 ERREUR CORS\n\n';
          errorMessage += 'Le serveur n8n bloque les requêtes cross-origin.\n\n';
          errorMessage += '🔧 Configuration n8n requise:\n';
          errorMessage += '• Ajouter "https://localhost:5173" aux origines CORS\n';
          errorMessage += '• Variable d\'environnement: CORS_ORIGINS\n';
          errorMessage += '• Redémarrer n8n après modification\n\n';
          errorMessage += '📝 Exemple de configuration:\n';
          errorMessage += 'CORS_ORIGINS=https://localhost:5173,https://yourdomain.com';
        } else {
          errorMessage += `❓ ERREUR INCONNUE\n\n`;
          errorMessage += `Type: ${errorName}\n`;
          errorMessage += `Message: ${errorMsg}\n\n`;
          errorMessage += '🔧 Actions suggérées:\n';
          errorMessage += '• Vérifier les logs du serveur n8n\n';
          errorMessage += '• Tester la connectivité réseau\n';
          errorMessage += '• Vérifier l\'URL du webhook\n';
          errorMessage += '• Contacter l\'administrateur système';
        }
      } else {
        errorMessage += `❓ Erreur non identifiée: ${String(err)}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      carrierCode: '',
      flightNumber: '',
      scheduledDepartureDate: ''
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Auto-complétion Vol {flightIndex + 1}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">Rechercher les informations de vol</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Code Transporteur *
            </label>
            <input
              type="text"
              value={formData.carrierCode}
              onChange={(e) => handleInputChange('carrierCode', e.target.value)}
              placeholder="AH, AF, TU..."
              maxLength={2}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2 lettres majuscules (ex: AH, AF)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Numéro de Vol *
            </label>
            <input
              type="text"
              value={formData.flightNumber}
              onChange={(e) => handleInputChange('flightNumber', e.target.value)}
              placeholder="1061, 634..."
              maxLength={4}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
              disabled={isLoading}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maximum 4 chiffres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date de Départ Prévue *
            </label>
            <input
              type="date"
              value={formData.scheduledDepartureDate}
              onChange={(e) => handleInputChange('scheduledDepartureDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>{isLoading ? 'Recherche...' : 'Rechercher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BookingFormProps {
  onSubmit: (data: CaseData) => void;
  initialData?: CaseData;
  isSubmitting?: boolean;
}

const BookingForm: React.FC<BookingFormProps> = ({ onSubmit, initialData, isSubmitting = false }) => {
  const [autoCompleteModal, setAutoCompleteModal] = useState<{
    isOpen: boolean;
    flightIndex: number;
  }>({
    isOpen: false,
    flightIndex: 0
  });

  // Générer une date par défaut (dans 3 jours)
  const getDefaultDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 3)
    return date.toISOString().split('T')[0]
  }

  // Générer une heure par défaut
  const getDefaultTime = (baseHour: number) => {
    return `${baseHour.toString().padStart(2, '0')}:30`
  }

  const [hasConnection, setHasConnection] = useState(false)
  const [isDraft, setIsDraft] = useState(false) // true = draft, false = confirmation
  const [formData, setFormData] = useState<CaseData>(
    initialData || {
      dossierNumber: `DOS-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`,
      awbNumber: `12412345${Math.floor(Math.random() * 90) + 10}${Math.floor(Math.random() * 10)}`,
      clientName: 'Pompes Funèbres Martin & Associés',
      clientContact: {
        email: 'contact@pf-martin.fr',
        phone: '+33 1 42 85 67 89'
      },
      bookingReference: `REF-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      bookingDate: new Date().toISOString().split('T')[0],
      flights: [{
        flightNumber: 'AH1006',
        airline: 'Air Algérie',
        departure: {
          airport: 'Paris-Orly',
          airportCode: 'ORY',
          date: getDefaultDate(),
          time: getDefaultTime(14)
        },
        arrival: {
          airport: 'Alger - Houari Boumediene',
          airportCode: 'ALG',
          date: getDefaultDate(),
          time: getDefaultTime(16)
        },
        aircraft: 'Boeing 737-800',
        duration: '2h 30m'
      }],
      deceased: {
        id: '1',
        name: 'Ahmed Ben Mohamed',
        type: 'HUM',
        ticketNumber: `TKT-${Math.floor(Math.random() * 900000) + 100000}`,
        specialRequirements: 'Transport réfrigéré requis - Manipulation avec précaution'
      },
      deliveryInfo: {
        date: (() => {
          const deliveryDate = new Date()
          deliveryDate.setDate(deliveryDate.getDate() + 4)
          return deliveryDate.toISOString().split('T')[0]
        })(),
        time: '10:00',
        location: 'Funérarium Central, 123 Avenue de la République, 16000 Alger'
      },
      specialInstructions: 'Coordonner avec l\'équipe de réception à l\'arrivée. Contact local requis 2h avant l\'atterrissage.',
      emergencyContact: {
        name: 'Fatima Ben Mohamed',
        phone: '+213 21 45 67 89'
      },
      createdAt: new Date().toISOString(),
      status: 'confirmed'
    }
  );

  // Initialize connection flight data when toggle is activated
  const initializeConnectionFlight = () => {
    if (!hasConnection) {
      // Add second flight with default connection data
      const connectionDate = new Date(formData.flights[0].departure.date)
      connectionDate.setHours(connectionDate.getHours() + 3) // 3 hours later for connection
      
      const finalDate = new Date(connectionDate)
      finalDate.setHours(finalDate.getHours() + 2) // 2 hours for second flight
      
      setFormData(prev => ({
        ...prev,
        flights: [
          {
            ...prev.flights[0],
            arrival: {
              airport: 'Paris-Charles de Gaulle',
              airportCode: 'CDG',
              date: connectionDate.toISOString().split('T')[0],
              time: `${(parseInt(prev.flights[0].departure.time.split(':')[0]) + 2).toString().padStart(2, '0')}:45`
            }
          },
          {
            flightNumber: 'AF1395',
            airline: 'Air France',
            departure: {
              airport: 'Paris-Charles de Gaulle',
              airportCode: 'CDG',
              date: connectionDate.toISOString().split('T')[0],
              time: `${(parseInt(prev.flights[0].departure.time.split(':')[0]) + 4).toString().padStart(2, '0')}:15`
            },
            arrival: {
              airport: 'Alger - Houari Boumediene',
              airportCode: 'ALG',
              date: finalDate.toISOString().split('T')[0],
              time: `${(parseInt(prev.flights[0].departure.time.split(':')[0]) + 6).toString().padStart(2, '0')}:30`
            },
            aircraft: 'Airbus A320',
            duration: '2h 15m'
          }
        ]
      }))
    } else {
      // Remove second flight
      setFormData(prev => ({
        ...prev,
        flights: [prev.flights[0]]
      }))
    }
    setHasConnection(!hasConnection)
  }

  const handleFlightChange = (flightIndex: number, field: string, value: string, section?: string) => {
    setFormData(prev => ({
      ...prev,
      flights: prev.flights.map((flight, index) => 
        index === flightIndex ? {
          ...flight,
          ...(section ? {
            [section]: {
              ...flight[section as keyof typeof flight],
              [field]: value
            }
          } : {
            [field]: value
          })
        } : flight
      )
    }));
  };

  const handleAutoComplete = async (flightIndex: number, flightData: any) => {
    console.log('Auto-complétion reçue pour vol', flightIndex + 1, ':', flightData);
    
    // Mapper les données reçues du webhook vers les champs du formulaire
    // Variables reçues: N° de vol, codeDepart, aeroportDepart, dateDepart, heureDepart, 
    // codeArrivée, aeroportArrivee, dateArrivée, heureArrivee
    
    // Fonction helper pour convertir le format de date DD/MM/YYYY vers YYYY-MM-DD
    const convertDateFormat = (dateStr: string) => {
      if (!dateStr) return '';
      // Format reçu: "19/07/2025" -> Format requis: "2025-07-19"
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateStr; // Retourner tel quel si le format n'est pas reconnu
    };

    // Fonction helper pour extraire le code compagnie aérienne et mapper vers le nom
    const mapAirlineFromFlightNumber = async (flightNumber: string) => {
      if (!flightNumber || flightNumber.length < 2) {
        return formData.flights[flightIndex].airline;
      }
      
      try {
        // Extraire les 2 premiers caractères comme code IATA
        const airlineCode = flightNumber.substring(0, 2).toUpperCase();
        console.log('Code compagnie extrait:', airlineCode);
        
        // Rechercher la compagnie dans AirlinesDirectory
        const airline = await getAirlineByCode(airlineCode);
        
        if (airline && airline.name) {
          console.log('Compagnie trouvée:', airline.name);
          return airline.name;
        } else {
          console.log('Aucune compagnie trouvée pour le code:', airlineCode);
          return formData.flights[flightIndex].airline;
        }
      } catch (error) {
        console.error('Erreur lors du mapping de la compagnie:', error);
        return formData.flights[flightIndex].airline;
      }
    };

    // Mapper automatiquement la compagnie aérienne
    const airlineName = await mapAirlineFromFlightNumber(flightData['N° de vol']);

    const updatedFlight = {
      ...formData.flights[flightIndex],
      // Mapping des champs selon les variables reçues du webhook
      flightNumber: flightData['N° de vol'] || formData.flights[flightIndex].flightNumber,
      // Mapping automatique de la compagnie aérienne à partir du N° de vol
      airline: airlineName,
      // Note: aircraft et duration ne sont pas fournis, on garde les valeurs existantes
      aircraft: formData.flights[flightIndex].aircraft,
      duration: formData.flights[flightIndex].duration,
      departure: {
        ...formData.flights[flightIndex].departure,
        airport: flightData.aeroportDepart || formData.flights[flightIndex].departure.airport,
        airportCode: flightData.codeDepart || formData.flights[flightIndex].departure.airportCode,
        date: convertDateFormat(flightData.dateDepart) || formData.flights[flightIndex].departure.date,
        time: flightData.heureDepart || formData.flights[flightIndex].departure.time,
      },
      arrival: {
        ...formData.flights[flightIndex].arrival,
        airport: flightData.aeroportArrivee || formData.flights[flightIndex].arrival.airport,
        airportCode: flightData['codeArrivée'] || formData.flights[flightIndex].arrival.airportCode,
        date: convertDateFormat(flightData['dateArrivée']) || formData.flights[flightIndex].arrival.date,
        time: flightData.heureArrivee || formData.flights[flightIndex].arrival.time,
      }
    };

    setFormData(prev => ({
      ...prev,
      flights: prev.flights.map((flight, index) => 
        index === flightIndex ? updatedFlight : flight
      )
    }));
  };

  const openAutoComplete = (flightIndex: number) => {
    setAutoCompleteModal({
      isOpen: true,
      flightIndex
    });
  };

  const closeAutoComplete = () => {
    setAutoCompleteModal({
      isOpen: false,
      flightIndex: 0
    });
  };

  const handleDeceasedChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      deceased: {
        ...prev.deceased,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare data with simplified variable structure for webhook
    const webhookData = {
      // Basic info
      deceasedName: formData.deceased.name,
      ltaNumber: formData.awbNumber,
      connectionFlight: hasConnection,
      draft: isDraft,
      
      // Flight 1 - Always present
      airline1: formData.flights[0]?.airline || '',
      flightNumber1: formData.flights[0]?.flightNumber || '',
      departureAirport1: formData.flights[0]?.departure.airport || '',
      departureAirportCode1: formData.flights[0]?.departure.airportCode || '',
      departureDate1: formData.flights[0]?.departure.date || '',
      departureTime1: formData.flights[0]?.departure.time || '',
      arrivalAirport1: formData.flights[0]?.arrival.airport || '',
      arrivalAirportCode1: formData.flights[0]?.arrival.airportCode || '',
      arrivalDate1: formData.flights[0]?.arrival.date || '',
      arrivalTime1: formData.flights[0]?.arrival.time || '',
      
      // Flight 2 - Only when connection is enabled
      ...(hasConnection && formData.flights.length > 1 ? {
        airline2: formData.flights[1]?.airline || '',
        flightNumber2: formData.flights[1]?.flightNumber || '',
        departureAirport2: formData.flights[1]?.departure.airport || '',
        departureAirportCode2: formData.flights[1]?.departure.airportCode || '',
        departureDate2: formData.flights[1]?.departure.date || '',
        departureTime2: formData.flights[1]?.departure.time || '',
        arrivalAirport2: formData.flights[1]?.arrival.airport || '',
        arrivalAirportCode2: formData.flights[1]?.arrival.airportCode || '',
        arrivalDate2: formData.flights[1]?.arrival.date || '',
        arrivalTime2: formData.flights[1]?.arrival.time || '',
      } : {}),
      
      // Metadata
      timestamp: new Date().toISOString(),
      source: 'SkyLogistics Dashboard'
    };
    
    console.log('Webhook data prepared:', webhookData);
    onSubmit(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirmation de Transport Funéraire</h2>
          <p className="text-gray-600 dark:text-gray-400">Remplissez les informations pour générer le document</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations du défunt */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informations du défunt</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nom du défunt *
              </label>
              <input
                type="text"
                required
                value={formData.deceased.name}
                onChange={(e) => handleDeceasedChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                placeholder="Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                N° de LTA *
              </label>
              <input
                type="text"
                required
                value={formData.awbNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, awbNumber: e.target.value }))}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors font-mono"
                placeholder="AWB-987654321"
              />
            </div>
          </div>
        </div>

        {/* Informations de vol */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Plane className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informations de vol</h3>
            </div>
            
            {/* Toggles Container */}
            <div className="flex flex-col space-y-3">
              {/* Connection Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Vol direct</span>
                <button
                  type="button"
                  onClick={initializeConnectionFlight}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    hasConnection ? 'bg-blue-600' : 'bg-orange-500 dark:bg-orange-600'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      hasConnection ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connexion</span>
              </div>

              {/* Draft/Confirmation Toggle */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Draft</span>
                <button
                  type="button"
                  onClick={() => setIsDraft(!isDraft)}
                  className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    !isDraft ? 'bg-green-600' : 'bg-purple-500 dark:bg-purple-600'
                  }`}
                >
                  <span
                    className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                      !isDraft ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirmation</span>
              </div>
            </div>
          </div>

          {/* Flight 1 */}
          <div className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                {hasConnection ? 'Vol 1 (Premier segment)' : 'Vol direct'}
              </h4>
              
              {/* Auto-Complete Button for Flight 1 */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => openAutoComplete(0)}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors text-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>Auto-complétion</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    N° de vol *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.flights[0]?.flightNumber || ''}
                    onChange={(e) => handleFlightChange(0, 'flightNumber', e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors font-mono"
                    placeholder="AF1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Compagnie aérienne *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.flights[0]?.airline || ''}
                    onChange={(e) => handleFlightChange(0, 'airline', e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Air France"
                  />
                </div>
              </div>

              {/* Flight 1 Route */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Departure */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Départ</h5>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.flights[0]?.departure.airportCode || ''}
                        onChange={(e) => handleFlightChange(0, 'airportCode', e.target.value.toUpperCase(), 'departure')}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors font-mono text-center"
                        placeholder="CDG"
                        maxLength={3}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Aéroport *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.flights[0]?.departure.airport || ''}
                        onChange={(e) => handleFlightChange(0, 'airport', e.target.value, 'departure')}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                        placeholder="Charles de Gaulle"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.flights[0]?.departure.date || ''}
                        onChange={(e) => handleFlightChange(0, 'date', e.target.value, 'departure')}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Heure *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.flights[0]?.departure.time || ''}
                        onChange={(e) => handleFlightChange(0, 'time', e.target.value, 'departure')}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Arrival (Connection or Final) */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className={`w-3 h-3 rounded-full ${hasConnection ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <h5 className="font-medium text-gray-900 dark:text-white">
                      {hasConnection ? 'Connexion' : 'Arrivée'}
                    </h5>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.flights[0]?.arrival.airportCode || ''}
                        onChange={(e) => handleFlightChange(0, 'airportCode', e.target.value.toUpperCase(), 'arrival')}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors font-mono text-center ${
                          hasConnection ? 'focus:ring-yellow-500' : 'focus:ring-red-500'
                        }`}
                        placeholder="JFK"
                        maxLength={3}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Aéroport *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.flights[0]?.arrival.airport || ''}
                        onChange={(e) => handleFlightChange(0, 'airport', e.target.value, 'arrival')}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                          hasConnection ? 'focus:ring-yellow-500' : 'focus:ring-red-500'
                        }`}
                        placeholder="John F. Kennedy"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.flights[0]?.arrival.date || ''}
                        onChange={(e) => handleFlightChange(0, 'date', e.target.value, 'arrival')}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                          hasConnection ? 'focus:ring-yellow-500' : 'focus:ring-red-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Heure *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.flights[0]?.arrival.time || ''}
                        onChange={(e) => handleFlightChange(0, 'time', e.target.value, 'arrival')}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                          hasConnection ? 'focus:ring-yellow-500' : 'focus:ring-red-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flight 2 (Connection) */}
            {hasConnection && formData.flights.length > 1 && (
              <div className="border-l-4 border-purple-500 pl-4 mt-8">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  Vol 2 (Segment de connexion)
                </h4>
                
                {/* Auto-Complete Button for Flight 2 */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => openAutoComplete(1)}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors text-sm"
                  >
                    <Search className="w-4 h-4" />
                    <span>Auto-complétion</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      N° de vol *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.flights[1]?.flightNumber || ''}
                      onChange={(e) => handleFlightChange(1, 'flightNumber', e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-mono"
                      placeholder="AF1395"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Compagnie aérienne *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.flights[1]?.airline || ''}
                      onChange={(e) => handleFlightChange(1, 'airline', e.target.value)}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                      placeholder="Air France"
                    />
                  </div>
                </div>

                {/* Flight 2 Route */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Departure from Connection */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Départ (Connexion)</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.flights[1]?.departure.airportCode || ''}
                          onChange={(e) => handleFlightChange(1, 'airportCode', e.target.value.toUpperCase(), 'departure')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors font-mono text-center"
                          placeholder="CDG"
                          maxLength={3}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Aéroport *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.flights[1]?.departure.airport || ''}
                          onChange={(e) => handleFlightChange(1, 'airport', e.target.value, 'departure')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors"
                          placeholder="Charles de Gaulle"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.flights[1]?.departure.date || ''}
                          onChange={(e) => handleFlightChange(1, 'date', e.target.value, 'departure')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heure *
                        </label>
                        <input
                          type="time"
                          required
                          value={formData.flights[1]?.departure.time || ''}
                          onChange={(e) => handleFlightChange(1, 'time', e.target.value, 'departure')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Final Arrival */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <h5 className="font-medium text-gray-900 dark:text-white">Arrivée finale</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.flights[1]?.arrival.airportCode || ''}
                          onChange={(e) => handleFlightChange(1, 'airportCode', e.target.value.toUpperCase(), 'arrival')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors font-mono text-center"
                          placeholder="ALG"
                          maxLength={3}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Aéroport *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.flights[1]?.arrival.airport || ''}
                          onChange={(e) => handleFlightChange(1, 'airport', e.target.value, 'arrival')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                          placeholder="Alger - Houari Boumediene"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.flights[1]?.arrival.date || ''}
                          onChange={(e) => handleFlightChange(1, 'date', e.target.value, 'arrival')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Heure *
                        </label>
                        <input
                          type="time"
                          required
                          value={formData.flights[1]?.arrival.time || ''}
                          onChange={(e) => handleFlightChange(1, 'time', e.target.value, 'arrival')}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-center pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-lg font-medium shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{isSubmitting ? 'Génération en cours...' : 'Générer le document'}</span>
          </button>
        </div>
      </form>

      {/* Auto-Complete Modal */}
      <FlightAutoCompleteModal
        isOpen={autoCompleteModal.isOpen}
        flightIndex={autoCompleteModal.flightIndex}
        onClose={closeAutoComplete}
        onComplete={handleAutoComplete}
      />
    </div>
  );
};

export default BookingForm;