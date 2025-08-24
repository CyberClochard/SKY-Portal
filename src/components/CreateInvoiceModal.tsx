import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { sendInvoiceDataToWebhook } from '../lib/supabase';
import { FileText, Truck, Calculator } from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated?: (pdfBlob: Blob, fileName: string) => void;
  dossierData?: any; // Données du dossier récupérées du webhook
}

interface InvoiceData {
  // Card 1: Informations de facturation
  clientName: string;
  clientAddress: string;
  clientPostalCode: string;
  clientCity: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  dossierNumber: string;
  
  // Card 2: Transport
  ltaNumber: string;
  packaging: string;
  routing: string;
  
  // Card 3: Lignes de facturation
  invoiceLines: InvoiceLine[];
}

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: number;
  totalHT: number;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose, onInvoiceGenerated, dossierData }) => {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    clientName: '',
    clientAddress: '',
    clientPostalCode: '',
    clientCity: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
    dossierNumber: '',
    ltaNumber: '',
    packaging: '',
    routing: '',
    invoiceLines: [
      {
        id: '1',
        description: '',
        quantity: 1,
        unitPrice: 0,
        tvaRate: 20,
        totalHT: 0
      }
    ]
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');

  // Pré-remplir les champs quand les données du dossier sont reçues
  useEffect(() => {
    if (dossierData) {
      console.log('🔄 Pré-remplissage des champs avec les données du dossier:', dossierData)
      
      // Extraire les informations principales du premier objet
      const mainData = dossierData[0] || dossierData;
      
      // Extraire les lignes de facturation (objets avec lines_*)
      const invoiceLines = dossierData.filter((item: any) => 
        item.lines_description && item.lines_quantity && item.lines_unit_price
      );
      
      setInvoiceData(prev => ({
        ...prev,
        // Card 1: Informations de facturation
        clientName: mainData.client_name || prev.clientName,
        clientAddress: mainData.client_adresse || prev.clientAddress,
        clientCity: mainData.client_city || prev.clientCity,
        dossierNumber: mainData.master_id || prev.dossierNumber,
        
        // Card 2: Transport
        ltaNumber: mainData.lta || prev.ltaNumber,
        packaging: mainData.hum_name || prev.packaging, // hum_name = nom du chauffeur/colisageur
        routing: mainData.routing || prev.routing,
        // Pré-remplir les lignes de facturation si disponibles
        invoiceLines: invoiceLines.length > 0 ? 
          invoiceLines.map((line: any, index: number) => ({
            id: (index + 1).toString(),
            description: line.lines_description || '',
            quantity: parseInt(line.lines_quantity) || 1,
            unitPrice: parseFloat(line.lines_unit_price) || 0,
            tvaRate: 20, // Valeur par défaut
            totalHT: parseFloat(line.lines_total_price) || 0
          })) : prev.invoiceLines
      }))
      
      console.log('✅ Champs pré-remplis:', {
        clientName: mainData.client_name,
        clientAddress: mainData.client_adresse,
        clientCity: mainData.client_city,
        dossierNumber: mainData.master_id,
        ltaNumber: mainData.lta,
        packaging: mainData.hum_name,
        routing: mainData.routing,
        linesCount: invoiceLines.length
      })
    }
  }, [dossierData]);

  // Calculer le total HT automatiquement
  const calculateTotalHT = (lines: InvoiceLine[]) => {
    return lines.reduce((total, line) => total + line.totalHT, 0);
  };

  // Calculer le total TTC
  const calculateTotalTTC = () => {
    const totalHT = calculateTotalHT(invoiceData.invoiceLines);
    const totalTVA = invoiceData.invoiceLines.reduce((total, line) => {
      return total + (line.totalHT * line.tvaRate / 100);
    }, 0);
    return totalHT + totalTVA;
  };

  // Mettre à jour une ligne de facturation
  const updateInvoiceLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      invoiceLines: prev.invoiceLines.map(line => {
        if (line.id === id) {
          const updatedLine = { ...line, [field]: value };
          // Recalculer le total HT
          if (field === 'quantity' || field === 'unitPrice') {
            updatedLine.totalHT = updatedLine.quantity * updatedLine.unitPrice;
          }
          return updatedLine;
        }
        return line;
      })
    }));
  };

  // Ajouter une nouvelle ligne
  const addInvoiceLine = () => {
    const newId = (invoiceData.invoiceLines.length + 1).toString();
    setInvoiceData(prev => ({
      ...prev,
      invoiceLines: [
        ...prev.invoiceLines,
        {
          id: newId,
          description: '',
          quantity: 1,
          unitPrice: 0,
          tvaRate: 20,
          totalHT: 0
        }
      ]
    }));
  };

  // Supprimer une ligne
  const removeInvoiceLine = (id: string) => {
    if (invoiceData.invoiceLines.length > 1) {
      setInvoiceData(prev => ({
        ...prev,
        invoiceLines: prev.invoiceLines.filter(line => line.id !== id)
      }));
    }
  };

  // Valider et générer la facture
  const handleGenerateInvoice = async () => {
    // Validation basique
    if (!invoiceData.clientName || !invoiceData.dossierNumber) {
      setMessage('Veuillez remplir au minimum le nom du client et le numéro de dossier.');
      return;
    }

    if (invoiceData.invoiceLines.some(line => !line.description || line.unitPrice <= 0)) {
      setMessage('Veuillez remplir toutes les lignes de facturation avec description et prix.');
      return;
    }

    setIsGenerating(true);
    setMessage('');

    try {
      // Préparer les données pour le webhook selon l'interface attendue
      const webhookData = {
        master_id: invoiceData.dossierNumber,
        dossier_number: invoiceData.dossierNumber,
        client_name: invoiceData.clientName,
        invoice_lines: invoiceData.invoiceLines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          total_price: line.totalHT
        })),
        total_amount: calculateTotalTTC(),
        created_at: new Date().toISOString(),
        source: 'SkyLogistics WebApp - Modal Création'
      };

      const result = await sendInvoiceDataToWebhook(webhookData);
      
      if (result.success && result.pdfBlob) {
        // Notifier le composant parent de la génération réussie
        if (onInvoiceGenerated) {
          onInvoiceGenerated(result.pdfBlob, result.fileName || `facture_${invoiceData.dossierNumber}.pdf`);
        }
        // Fermer ce modal
        onClose();
      } else {
        setMessage(`Erreur lors de la génération: ${result.message || 'Erreur inconnue'}`);
      }
    } catch (error) {
      setMessage(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Créer une facture</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
          >
            ×
          </button>
        </div>

        {/* Card 1: Informations de facturation */}
        <Card className="mb-6">
          <CardHeader icon={<FileText className="w-5 h-5 text-blue-600" />} title="Informations de facturation" />
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du client *
                </label>
                <input
                  type="text"
                  value={invoiceData.clientName}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom du client"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° de dossier *
                </label>
                <input
                  type="text"
                  value={invoiceData.dossierNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dossierNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="AE25/0880"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse du client
                </label>
                <input
                  type="text"
                  value={invoiceData.clientAddress}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Adresse complète"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  value={invoiceData.clientPostalCode}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientPostalCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="75001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={invoiceData.clientCity}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, clientCity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paris"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° de facture
                </label>
                <input
                  type="text"
                  value={invoiceData.invoiceNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="FAC-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de facture
                </label>
                <input
                  type="date"
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Transport */}
        <Card className="mb-6">
          <CardHeader icon={<Truck className="w-5 h-5 text-green-600" />} title="Transport" />
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° LTA
                </label>
                <input
                  type="text"
                  value={invoiceData.ltaNumber}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, ltaNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Numéro LTA"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colisage
                </label>
                <input
                  type="text"
                  value={invoiceData.packaging}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, packaging: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type de colisage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing
                </label>
                <input
                  type="text"
                  value={invoiceData.routing}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, routing: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Itinéraire"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Lignes de facturation */}
        <Card className="mb-6">
          <CardHeader icon={<Calculator className="w-5 h-5 text-purple-600" />} title="Lignes de facturation" />
          <CardContent>
            <div className="space-y-4">
              {invoiceData.invoiceLines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-6 gap-3 items-end border-b pb-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description article {index + 1}
                    </label>
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateInvoiceLine(line.id, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Description de l'article"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Qté
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateInvoiceLine(line.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prix unit HT
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateInvoiceLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      TVA (%)
                    </label>
                    <select
                      value={line.tvaRate}
                      onChange={(e) => updateInvoiceLine(line.id, 'tvaRate', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>0%</option>
                      <option value={5.5}>5.5%</option>
                      <option value={10}>10%</option>
                      <option value={20}>20%</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total HT
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md text-sm">
                        {line.totalHT.toFixed(2)} €
                      </div>
                    </div>
                    {invoiceData.invoiceLines.length > 1 && (
                      <button
                        onClick={() => removeInvoiceLine(line.id)}
                        className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              <button
                onClick={addInvoiceLine}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Ajouter une ligne
              </button>
            </div>

            {/* Totaux */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-end space-x-8">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total HT</div>
                  <div className="text-lg font-semibold">{calculateTotalHT(invoiceData.invoiceLines).toFixed(2)} €</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total TTC</div>
                  <div className="text-lg font-semibold">{calculateTotalTTC().toFixed(2)} €</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message d'erreur/succès */}
        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.includes('Erreur') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleGenerateInvoice}
            disabled={isGenerating}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isGenerating ? 'Génération...' : 'Valider et générer la facture'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
