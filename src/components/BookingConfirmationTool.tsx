import React, { useState, useRef } from 'react';
import { Download, Printer, Edit, FileText, AlertCircle, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import BookingForm from './BookingForm';
import { CaseData } from '../types/booking';

const BookingConfirmationTool: React.FC = () => {
  const [currentData, setCurrentData] = useState<CaseData | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const handleFormSubmit = async (data: CaseData) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    setPdfBlob(null)
    setPdfUrl(null)

    try {
      // Préparer les données pour le webhook n8n avec le nouveau format
      const hasConnection = data.flights.length > 1
      
      // Prepare flight 2 data conditionally
      const flight2Data = hasConnection ? {
        airline2: data.flights[1]?.airline || '',
        flightNumber2: data.flights[1]?.flightNumber || '',
        departureAirport2: data.flights[1]?.departure.airport || '',
        departureAirportCode2: data.flights[1]?.departure.airportCode || '',
        departureDate2: data.flights[1]?.departure.date || '',
        departureTime2: data.flights[1]?.departure.time || '',
        arrivalAirport2: data.flights[1]?.arrival.airport || '',
        arrivalAirportCode2: data.flights[1]?.arrival.airportCode || '',
        arrivalDate2: data.flights[1]?.arrival.date || '',
        arrivalTime2: data.flights[1]?.arrival.time || '',
      } : {};

      const webhookData = {
        // Basic info
        deceasedName: data.deceased.name,
        ltaNumber: data.awbNumber,
        connectionFlight: hasConnection,
        
        // Flight 1 - Always present
        airline1: data.flights[0]?.airline || '',
        flightNumber1: data.flights[0]?.flightNumber || '',
        departureAirport1: data.flights[0]?.departure.airport || '',
        departureAirportCode1: data.flights[0]?.departure.airportCode || '',
        departureDate1: data.flights[0]?.departure.date || '',
        departureTime1: data.flights[0]?.departure.time || '',
        arrivalAirport1: data.flights[0]?.arrival.airport || '',
        arrivalAirportCode1: data.flights[0]?.arrival.airportCode || '',
        arrivalDate1: data.flights[0]?.arrival.date || '',
        arrivalTime1: data.flights[0]?.arrival.time || '',
        
        // Flight 2 - Only when connection is enabled
        ...flight2Data,
        
        // Metadata
        timestamp: new Date().toISOString(),
        source: 'SkyLogistics Dashboard'
      }

      console.log('Envoi des données au webhook n8n:', webhookData);

      // Envoyer la requête au webhook n8n
      let response;
      try {
        // Test de connectivité préalable
        console.log('Test de connectivité vers n8n.skylogistics.fr...');
        
        const webhookUrl = 'https://n8n.skylogistics.fr/webhook/1af37111-e368-4545-a1e5-b07066c5dcaa';
        
        response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/pdf, application/json, */*'
          },
          body: JSON.stringify(webhookData),
          signal: AbortSignal.timeout(45000) // 45 second timeout
        });
        
        console.log('Connexion établie avec n8n, statut:', response.status);
        
      } catch (fetchError) {
        console.error('Erreur de connexion au webhook:', fetchError);
        
        // Diagnostic détaillé de l'erreur
        let errorMessage = 'Erreur de connexion au serveur n8n:\n\n';
        
        if (fetchError instanceof Error) {
          const errorName = fetchError.name;
          const errorMsg = fetchError.message;
          
          console.log('Type d\'erreur:', errorName, 'Message:', errorMsg);
          
          if (errorName === 'AbortError' || errorName === 'TimeoutError') {
            errorMessage += '⏱️ TIMEOUT (45s dépassé)\n';
            errorMessage += '• Le serveur n8n met trop de temps à répondre\n';
            errorMessage += '• Vérifiez que n8n.skylogistics.fr est en ligne\n';
            errorMessage += '• Le workflow n8n pourrait être bloqué ou très lent\n\n';
            errorMessage += '🔧 Solutions:\n';
            errorMessage += '1. Vérifiez l\'état du serveur n8n\n';
            errorMessage += '2. Optimisez le workflow n8n\n';
            errorMessage += '3. Augmentez les ressources du serveur';
          } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            errorMessage += '🌐 PROBLÈME DE CONNECTIVITÉ\n\n';
            errorMessage += '❌ Impossible d\'atteindre https://n8n.skylogistics.fr\n\n';
            errorMessage += '🔍 Vérifications nécessaires:\n';
            errorMessage += '1. ✅ Connexion internet active\n';
            errorMessage += '2. 🌍 Serveur n8n.skylogistics.fr accessible\n';
            errorMessage += '3. 🔒 Configuration CORS du serveur n8n\n';
            errorMessage += '4. 🚫 Pas de blocage par firewall/proxy\n\n';
            errorMessage += '🛠️ Tests à effectuer:\n';
            errorMessage += '• Ouvrir https://n8n.skylogistics.fr dans le navigateur\n';
            errorMessage += '• Vérifier les logs du serveur n8n\n';
            errorMessage += '• Tester depuis un autre réseau';
          } else if (errorMsg.includes('CORS')) {
            errorMessage += '🚫 ERREUR CORS\n\n';
            errorMessage += 'Le serveur n8n bloque les requêtes cross-origin.\n\n';
            errorMessage += '🔧 Configuration n8n requise:\n';
            errorMessage += '• Ajouter "https://localhost:5173" aux origines CORS\n';
            errorMessage += '• Variable d\'environnement: CORS_ORIGINS\n';
            errorMessage += '• Redémarrer n8n après modification';
          } else {
            errorMessage += `❓ ERREUR INCONNUE\n\n`;
            errorMessage += `Type: ${errorName}\n`;
            errorMessage += `Message: ${errorMsg}\n\n`;
            errorMessage += '🔧 Actions suggérées:\n';
            errorMessage += '• Vérifier les logs du serveur n8n\n';
            errorMessage += '• Tester la connectivité réseau\n';
            errorMessage += '• Contacter l\'administrateur système';
          }
        } else {
          errorMessage += `❓ Erreur non identifiée: ${String(fetchError)}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('Réponse du webhook:', response.status, response.statusText);
      console.log('Headers de réponse:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`Erreur webhook: ${response.status} ${response.statusText}`);
      }

      // Vérifier le type de contenu de la réponse
      const contentType = response.headers.get('content-type') || '';
      console.log('Type de contenu de la réponse:', contentType);
      
      // Vérifier si c'est une réponse JSON vide malgré un PDF généré
      if (contentType.includes('application/json') && arrayBuffer.byteLength <= 10) {
        const textContent = new TextDecoder().decode(arrayBuffer);
        if (textContent.trim() === '{}' || textContent.trim() === '') {
          throw new Error(`Le workflow n8n a généré un PDF mais le nœud "Respond to Webhook" est mal configuré. 
            
Veuillez vérifier dans n8n :
1. Le nœud "Respond to Webhook" doit renvoyer le fichier PDF (pas "First Incoming Item")
2. Configurez "Respond With" vers "Binary File" ou le fichier PDF spécifique
3. Le PDF généré fait 122 kB et est disponible dans le workflow

Configuration actuelle : Renvoie "${textContent}" au lieu du PDF binaire.`);
        }
      }

      // Cloner la réponse pour pouvoir la lire plusieurs fois
      const responseClone = response.clone();
      
      // Lire d'abord comme ArrayBuffer pour analyser le contenu
      const arrayBuffer = await response.arrayBuffer();
      console.log('Taille du contenu reçu:', arrayBuffer.byteLength, 'bytes');
      
      // Vérifier les premiers bytes pour détecter un PDF (signature PDF: %PDF)
      const uint8Array = new Uint8Array(arrayBuffer);
      const firstBytes = Array.from(uint8Array.slice(0, 10)).map(b => String.fromCharCode(b)).join('');
      console.log('Premiers caractères du contenu:', firstBytes);
      const isPdfSignature = firstBytes.startsWith('%PDF');
      console.log('Signature PDF détectée:', isPdfSignature);
      
      // Si c'est un PDF (par signature ou type de contenu)
      if (isPdfSignature || contentType.includes('application/pdf')) {
        console.log('Traitement comme PDF...');
        const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
        console.log('PDF Blob créé:', pdfBlob.size, 'bytes, type:', pdfBlob.type);
        
        setPdfBlob(pdfBlob);
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setCurrentData(data);
        setShowForm(false);
        setSuccess('Document PDF généré avec succès');
        return;
      }
      
      // Sinon, essayer de traiter comme JSON
      console.log('Pas de PDF détecté, traitement comme JSON...');
      try {
        // Utiliser la réponse clonée pour lire comme texte
        const responseText = await responseClone.text();
        console.log('Contenu reçu (texte):', responseText.substring(0, 500))
        
        let result
        try {
          result = JSON.parse(responseText)
          console.log('Réponse JSON parsée:', result)
        } catch (parseError) {
          console.error('Erreur de parsing JSON:', parseError)
          // Si ce n'est ni PDF ni JSON valide, mais que le contenu semble être du binaire
          if (arrayBuffer.byteLength > 1000) {
            console.log('Contenu binaire détecté, tentative de traitement comme PDF...');
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
            setPdfBlob(pdfBlob);
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            setCurrentData(data);
            setShowForm(false);
            setSuccess('Document PDF généré avec succès (détection binaire)');
            return;
          }
          throw new Error(`Réponse invalide du webhook. Type: ${contentType}, Taille: ${arrayBuffer.byteLength} bytes, Début: "${responseText.substring(0, 200)}..."`)
        }
        
        // Traiter la réponse JSON
        if (result.error || result.success === false) {
          throw new Error(result.message || result.error || 'Erreur lors de la génération du document')
        }
        
        // Vérifier si la réponse est vide
        if (Object.keys(result).length === 0) {
          throw new Error('Le webhook n8n a répondu avec un objet vide. Vérifiez que le workflow génère bien un PDF et le renvoie dans la réponse.')
        }
        
        if (result.pdfUrl) {
          // URL PDF dans la réponse JSON
          console.log('URL PDF reçue:', result.pdfUrl)
          const pdfResponse = await fetch(result.pdfUrl)
          if (pdfResponse.ok) {
            const pdfBlob = await pdfResponse.blob()
            setPdfBlob(pdfBlob)
            const url = URL.createObjectURL(pdfBlob)
            setPdfUrl(url)
            setCurrentData(data)
            setShowForm(false)
            setSuccess('Document PDF téléchargé avec succès')
          } else {
            throw new Error(`PDF non accessible à l'URL: ${result.pdfUrl}`)
          }
        } else if (result.pdfData) {
          // Données PDF en base64
          console.log('Données PDF base64 reçues')
          const binaryString = atob(result.pdfData)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const pdfBlob = new Blob([bytes], { type: 'application/pdf' })
          setPdfBlob(pdfBlob)
          const url = URL.createObjectURL(pdfBlob)
          setPdfUrl(url)
          setCurrentData(data)
          setShowForm(false)
          setSuccess('Document PDF généré avec succès')
        } else {
          // Pas de PDF trouvé dans la réponse
          console.warn('Aucun PDF trouvé dans la réponse:', result)
          setCurrentData(data)
          setShowForm(false)
          setError(result.message || 'Le workflow a démarré mais aucun PDF n\'a été généré. Vérifiez la configuration du webhook n8n.')
        }
        
      } catch (processingError) {
        console.error('Erreur de traitement de la réponse:', processingError)
        throw processingError
      }

    } catch (err) {
      console.error('Erreur lors de la génération du document:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur lors de la génération: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditForm = () => {
    setShowForm(true);
    setError(null);
    setSuccess(null);
    setPdfBlob(null)
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
    }
  };

  const handleDownloadPdf = () => {
    if (pdfBlob && currentData) {
      const link = document.createElement('a');
      link.href = pdfUrl!;
      link.download = `confirmation-transport-${currentData.deceased.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrintPdf = () => {
    if (pdfUrl) {
      // Ouvrir le PDF dans une nouvelle fenêtre pour impression
      const printWindow = window.open(pdfUrl, '_blank', 'width=800,height=600')
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus()
            printWindow.print()
          }, 500)
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 print:p-0 print:bg-white">
      {showForm ? (
        <div className="max-w-6xl mx-auto">
          <BookingForm 
            onSubmit={handleFormSubmit} 
            initialData={currentData} 
            isSubmitting={isGenerating}
          />
        </div>
      ) : (
        <div className="max-w-none">
          {/* Messages */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 max-w-6xl mx-auto">
              <div className="flex items-start space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Erreur de génération</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 max-w-6xl mx-auto">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>{success}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mb-6 print:hidden max-w-6xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Confirmation de Transport Funéraire
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {currentData ? `Document pour ${currentData.deceased.name}` : 'Document généré'}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleEditForm}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  
                  {pdfBlob && pdfUrl && (
                    <>
                      <button 
                        onClick={handleDownloadPdf}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Télécharger</span>
                      </button>
                      
                      <button 
                        onClick={handlePrintPdf}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Imprimer</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          {pdfBlob && pdfUrl ? (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-900 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Aperçu du document PDF
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Document prêt</span>
                    </div>
                  </div>
                </div>
                
                <div className="relative">
                  {/* PDF Viewer avec fallback */}
                  <div className="w-full h-[800px] bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                        <FileText className="w-10 h-10 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Document PDF généré avec succès
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Le document est prêt à être téléchargé ou imprimé.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                          Taille: {pdfBlob ? `${(pdfBlob.size / 1024).toFixed(1)} KB` : 'Inconnue'}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button 
                          onClick={handleDownloadPdf}
                          className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          <span>Télécharger le PDF</span>
                        </button>
                        
                        <button 
                          onClick={handlePrintPdf}
                          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
                        >
                          <Printer className="w-5 h-5" />
                          <span>Ouvrir et Imprimer</span>
                        </button>
                        
                        <button 
                          onClick={() => window.open(pdfUrl, '_blank')}
                          className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                          <span>Ouvrir dans un nouvel onglet</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {isGenerating ? 'Génération en cours...' : 'Aucun document à afficher'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isGenerating 
                    ? 'Le document PDF est en cours de génération par le workflow n8n.'
                    : 'Le document PDF sera affiché ici une fois généré avec succès.'
                  }
                </p>
                {isGenerating && (
                  <div className="mt-4">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin mx-auto" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Debug Info (en développement) */}
          {(process.env.NODE_ENV === 'development' || true) && (
            <div className="mt-6 max-w-6xl mx-auto">
              <details className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <summary className="cursor-pointer font-medium text-gray-900 dark:text-white mb-2">
                  Informations de débogage
                </summary>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p><strong>PDF Blob:</strong> {pdfBlob ? `${pdfBlob.size} bytes` : 'Aucun'}</p>
                  <p><strong>PDF URL:</strong> {pdfUrl ? 'Généré' : 'Aucune'}</p>
                  <p><strong>Données actuelles:</strong> {currentData ? 'Présentes' : 'Aucunes'}</p>
                  <p><strong>État génération:</strong> {isGenerating ? 'En cours' : 'Terminé'}</p>
                  <p><strong>Erreur:</strong> {error || 'Aucune'}</p>
                  <p><strong>Succès:</strong> {success || 'Aucun'}</p>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingConfirmationTool;