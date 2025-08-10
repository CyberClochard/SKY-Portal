import React, { useState, useEffect } from 'react';
import { Download, Printer, Edit, FileText, AlertCircle, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import BookingForm from './BookingForm';
import { CaseData } from '../types/booking';

// Configuration PDF.js
const configurePdfWorker = () => {
  // Vérifier le support des Web Workers
  if (typeof Worker !== 'undefined') {
    // Utiliser l'import direct avec ?url pour éviter les problèmes de résolution
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  } else {
    console.warn('⚠️ Web Workers non supportés - utilisation du fake worker');
  }
};

const BookingConfirmationTool: React.FC = () => {
  const [currentData, setCurrentData] = useState<CaseData | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);

  // Configuration PDF.js au montage du composant
  useEffect(() => {
    configurePdfWorker();
  }, []);

  // Fonction pour vérifier l'intégrité du PDF
  const validatePdfData = (arrayBuffer: ArrayBuffer): boolean => {
    try {
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Vérifier la signature PDF (%PDF)
      const firstBytes = Array.from(uint8Array.slice(0, 10)).map(b => String.fromCharCode(b)).join('');
      const hasPdfSignature = firstBytes.startsWith('%PDF');
      
      // Vérifier la taille minimale (un PDF valide doit faire au moins quelques KB)
      const hasValidSize = arrayBuffer.byteLength > 1000;
      
      // Vérifier la fin du PDF (%%EOF)
      const lastBytes = Array.from(uint8Array.slice(-10)).map(b => String.fromCharCode(b)).join('');
      const hasPdfEnding = lastBytes.includes('%%EOF');
      

      
      return hasPdfSignature && hasValidSize;
    } catch (error) {
      console.error('Erreur lors de la validation du PDF:', error);
      return false;
    }
  };

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

      // Envoyer la requête au webhook n8n
      let response;
      try {
        // Test de connectivité préalable
        
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
        
      } catch (fetchError) {
        console.error('Erreur de connexion au webhook:', fetchError);
        
        // Diagnostic détaillé de l'erreur
        let errorMessage = 'Erreur de connexion au serveur n8n:\n\n';
        
        if (fetchError instanceof Error) {
          const errorName = fetchError.name;
          const errorMsg = fetchError.message;
          
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

      if (!response.ok) {
        throw new Error(`Erreur webhook: ${response.status} ${response.statusText}`);
      }

      // Cloner la réponse pour pouvoir la lire plusieurs fois
      const responseClone = response.clone();
      
      // Lire d'abord comme ArrayBuffer pour analyser le contenu
      const arrayBuffer = await response.arrayBuffer();
      
      // Vérifier le type de contenu de la réponse
      const contentType = response.headers.get('content-type') || '';
      
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
      
      // Vérifier les premiers bytes pour détecter un PDF (signature PDF: %PDF)
      const uint8Array = new Uint8Array(arrayBuffer);
      const firstBytes = Array.from(uint8Array.slice(0, 10)).map(b => String.fromCharCode(b)).join('');
      const isPdfSignature = firstBytes.startsWith('%PDF');
      
      // Si c'est un PDF (par signature ou type de contenu)
      if (isPdfSignature || contentType.includes('application/pdf')) {
        // Valider l'intégrité du PDF avant de créer le blob
        if (!validatePdfData(arrayBuffer)) {
          throw new Error('Le PDF reçu semble corrompu ou invalide. Vérifiez la génération côté n8n.');
        }
        
        const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
        
        console.log('PDF détecté par signature ou type:', {
          isPdfSignature,
          contentType,
          blobSize: pdfBlob.size,
          blobType: pdfBlob.type,
          firstBytes,
          validationPassed: true
        });
        
        // Vérifier que le blob est vraiment un PDF en testant sa lecture
        try {
          const testReader = new FileReader();
          testReader.onload = () => {
            if (testReader.result instanceof ArrayBuffer) {
              const testArray = new Uint8Array(testReader.result);
              const testFirstBytes = Array.from(testArray.slice(0, 10)).map(b => String.fromCharCode(b)).join('');
              console.log('Test de lecture du blob - premiers bytes:', testFirstBytes);
              
              if (!testFirstBytes.startsWith('%PDF')) {
                console.error('Le blob créé ne semble pas être un PDF valide');
                setError('Le fichier généré ne semble pas être un PDF valide');
                return;
              }
            }
          };
          testReader.readAsArrayBuffer(pdfBlob);
        } catch (blobTestError) {
          console.error('Erreur lors du test de lecture du blob:', blobTestError);
        }
        
        setPdfBlob(pdfBlob);
        const url = URL.createObjectURL(pdfBlob);
        
        // Tester que l'URL est accessible
        try {
          const testResponse = await fetch(url);
          if (!testResponse.ok) {
            throw new Error(`Impossible d'accéder au blob URL: ${testResponse.status}`);
          }
          console.log('Blob URL test réussi:', url);
          
          // Tester que le contenu est bien un PDF
          const testBlob = await testResponse.blob();
          console.log('Test blob récupéré:', {
            size: testBlob.size,
            type: testBlob.type,
            matchesOriginal: testBlob.size === pdfBlob.size
          });
          
        } catch (testError) {
          console.error('Erreur lors du test du blob URL:', testError);
        }
        
        setPdfUrl(url);
        setCurrentData(data);
        setShowForm(false);
        setSuccess('Document PDF généré avec succès');
        return;
      }
      
      // Sinon, essayer de traiter comme JSON
      try {
        // Utiliser la réponse clonée pour lire comme texte
        const responseText = await responseClone.text();
        
        let result
        try {
          result = JSON.parse(responseText)
        } catch (parseError) {
          console.error('Erreur de parsing JSON:', parseError)
          // Si ce n'est ni PDF ni JSON valide, mais que le contenu semble être du binaire
          if (arrayBuffer.byteLength > 1000) {
            // Valider l'intégrité du PDF avant de créer le blob
            if (!validatePdfData(arrayBuffer)) {
              console.warn('Contenu binaire détecté mais validation PDF échouée');
              // Continuer quand même car c'est un fallback
            }
            
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
            
            console.log('PDF détecté par taille binaire:', {
              byteLength: arrayBuffer.byteLength,
              blobSize: pdfBlob.size,
              blobType: pdfBlob.type,
              validationPassed: validatePdfData(arrayBuffer)
            });
            
            setPdfBlob(pdfBlob);
            const url = URL.createObjectURL(pdfBlob);
            
            // Tester que l'URL est accessible
            try {
              const testResponse = await fetch(url);
              if (!testResponse.ok) {
                throw new Error(`Impossible d'accéder au blob URL: ${testResponse.status}`);
              }
              console.log('Blob URL test réussi (binaire):', url);
              
              // Tester que le contenu est bien un PDF
              const testBlob = await testResponse.blob();
              console.log('Test blob récupéré (binaire):', {
                size: testBlob.size,
                type: testBlob.type,
                matchesOriginal: testBlob.size === pdfBlob.size
              });
              
            } catch (testError) {
              console.error('Erreur lors du test du blob URL (binaire):', testError);
            }
            
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
    setUseIframeFallback(false);
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
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  };

  const previousPage = () => {
    changePage(-1);
  };

  const nextPage = () => {
    changePage(1);
  };

  const zoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const resetZoom = () => {
    setScale(1.0);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 print:p-0 print:bg-white">
      {showForm ? (
        <div className="max-w-6xl mx-auto">
          <BookingForm 
            onSubmit={handleFormSubmit} 
            initialData={currentData || undefined} 
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
                  {/* PDF Viewer embedded avec react-pdf */}
                  <div className="w-full h-[800px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {pdfBlob && pdfUrl ? (
                      <div className="w-full h-full flex flex-col">
                        {/* PDF Viewer Header avec contrôles */}
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Aperçu du document PDF
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({pdfBlob ? `${(pdfBlob.size / 1024).toFixed(1)} KB` : ''})
                              </span>
                            </div>
                            
                            {/* Contrôles de navigation et zoom */}
                            <div className="flex items-center space-x-3">
                              {/* Navigation des pages */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={previousPage}
                                  disabled={pageNumber <= 1}
                                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                  Précédent
                                </button>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  Page {pageNumber} sur {numPages || '...'}
                                </span>
                                <button
                                  onClick={nextPage}
                                  disabled={pageNumber >= (numPages || 1)}
                                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                  Suivant
                                </button>
                              </div>
                              
                              {/* Contrôles de zoom */}
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={zoomOut}
                                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                  -
                                </button>
                                <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px] text-center">
                                  {Math.round(scale * 100)}%
                                </span>
                                <button
                                  onClick={zoomIn}
                                  className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                >
                                  +
                                </button>
                                <button
                                  onClick={resetZoom}
                                  className="px-2 py-1 text-xs bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-300 dark:hover:bg-blue-600"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* PDF Content avec react-pdf */}
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto p-4">
                          <div className="flex justify-center">
                            {!useIframeFallback ? (
                              <>
                                {/* Vérification du worker PDF.js */}
                                {!pdfjs.GlobalWorkerOptions.workerSrc ? (
                                  <div className="text-center p-8 text-red-600 dark:text-red-400">
                                    <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                                    <p>Erreur de configuration PDF.js</p>
                                    <p className="text-sm mt-2">Le worker PDF.js n'est pas configuré</p>
                                    <button
                                      onClick={() => setUseIframeFallback(true)}
                                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Utiliser l'affichage iframe
                                    </button>
                                  </div>
                                ) : (
                                  <div>

                                    
                                    <Document
                                      file={pdfUrl}
                                      onLoadSuccess={onDocumentLoadSuccess}
                                                                            onLoadError={(error) => {
                                        console.error('Erreur de chargement du PDF:', error);
                                        setError('Erreur lors du chargement du PDF');
                                      }}

                                      loading={
                                        <div className="flex items-center justify-center p-8">
                                          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                                          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement du PDF...</span>
                                        </div>
                                      }
                                      error={
                                        <div className="text-center p-8 text-red-600 dark:text-red-400">
                                          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                                          <p>Erreur lors du chargement du PDF</p>
                                          <p className="text-sm mt-2">Utilisez les boutons d'action ci-dessous</p>

                                          <button
                                            onClick={() => setUseIframeFallback(true)}
                                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                          >
                                            Essayer l'affichage iframe
                                          </button>
                                        </div>
                                      }
                                    >
                                      <Page
                                        pageNumber={pageNumber}
                                        scale={scale}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        className="shadow-lg"

                                      />
                                    </Document>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full">
                                <div className="mb-4 text-center">
                                  <button
                                    onClick={() => setUseIframeFallback(false)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                  >
                                    Retour à react-pdf
                                  </button>
                                </div>
                                <iframe
                                  src={pdfUrl}
                                  className="w-full h-full border-0"
                                  title="Aperçu PDF"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Boutons d'action en bas */}
                        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex flex-wrap gap-3 justify-center">
                            <button 
                              onClick={handleDownloadPdf}
                              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                            >
                              <Download className="w-4 h-4" />
                              <span>Télécharger</span>
                            </button>
                            
                            <button 
                              onClick={handlePrintPdf}
                              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors text-sm"
                            >
                              <Printer className="w-4 h-4" />
                              <span>Imprimer</span>
                            </button>
                            
                            <button 
                              onClick={() => window.open(pdfUrl, '_blank')}
                              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ouvrir dans un nouvel onglet</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>Aucun document PDF à afficher</p>
                        </div>
                      </div>
                    )}
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
        </div>
      )}
    </div>
  );
};

export default BookingConfirmationTool;