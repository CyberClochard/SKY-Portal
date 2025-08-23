import React, { useState } from 'react'
import { Download, FileText, Eye, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from './ui/Card'

interface InvoicePDFDownloadProps {
  pdfBlob?: Blob
  fileName?: string
  onClose?: () => void
  isVisible: boolean
}

export const InvoicePDFDownload: React.FC<InvoicePDFDownloadProps> = ({
  pdfBlob,
  fileName,
  onClose,
  isVisible
}) => {
  const [isLoading, setIsLoading] = useState(false)

  console.log('🔍 InvoicePDFDownload - Props reçues:', {
    isVisible,
    hasPdfBlob: !!pdfBlob,
    pdfBlobSize: pdfBlob?.size,
    fileName
  })

  if (!isVisible || !pdfBlob) {
    console.log('🔍 InvoicePDFDownload - Composant masqué:', { isVisible, hasPdfBlob: !!pdfBlob })
    return null
  }

  console.log('🔍 InvoicePDFDownload - Composant affiché avec succès')

  const handleDownload = () => {
    if (!pdfBlob) return

    setIsLoading(true)
    try {
      // Créer un lien de téléchargement directement depuis le blob
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || `facture_${Date.now()}.pdf`
      
      // Déclencher le téléchargement
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Nettoyer l'URL
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewPDF = () => {
    if (pdfBlob) {
      // Créer une URL temporaire pour afficher le PDF
      const url = window.URL.createObjectURL(pdfBlob)
      window.open(url, '_blank')
      // Nettoyer l'URL après un délai
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader 
          icon={<FileText className="w-5 h-5 text-green-600" />}
          title="Facture PDF Générée"
          actions={
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          }
        />
        
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-green-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Facture générée avec succès !
              </h3>
              <p className="text-gray-600 mt-1">
                Votre facture PDF a été créée par le workflow n8n
              </p>
            </div>

            {fileName && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Nom du fichier :</p>
                <p className="font-mono text-sm text-gray-800">{fileName}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={handleViewPDF}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>Voir le PDF</span>
            </button>
            
            <button
              onClick={handleDownload}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>
                {isLoading ? 'Téléchargement...' : 'Télécharger'}
              </span>
            </button>
          </div>

          <div className="text-center">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              Fermer
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
