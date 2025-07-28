import React, { useState, useCallback } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle, Euro, User, Hash, Calendar } from 'lucide-react'
import { InvoiceImportResult } from '../lib/supabase'

interface InvoiceImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (files: File[]) => Promise<InvoiceImportResult[]>
}

const InvoiceImportModal: React.FC<InvoiceImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [importResults, setImportResults] = useState<InvoiceImportResult[]>([])
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const pdfFiles = files.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length !== files.length) {
      setErrorMessage('Seuls les fichiers PDF sont acceptés')
      return
    }
    
    setSelectedFiles(prev => [...prev, ...pdfFiles])
    setErrorMessage('')
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const pdfFiles = files.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length !== files.length) {
      setErrorMessage('Seuls les fichiers PDF sont acceptés')
      return
    }
    
    setSelectedFiles(prev => [...prev, ...pdfFiles])
    setErrorMessage('')
  }, [])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleImport = async () => {
    if (selectedFiles.length === 0) return
    
    setIsUploading(true)
    setUploadStatus('idle')
    setErrorMessage('')
    setImportResults([])
    setCurrentProgress({ current: 0, total: selectedFiles.length })
    
    try {
      const results = await onImport(selectedFiles)
      setImportResults(results)
      
      const successCount = results.filter(r => r.success).length
      const errorCount = results.filter(r => !r.success).length
      
      if (errorCount === 0) {
        setUploadStatus('success')
      } else if (successCount === 0) {
        setUploadStatus('error')
      } else {
        setUploadStatus('success') // Succès partiel
      }
    } catch (error) {
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Erreur lors de l\'importation')
    } finally {
      setIsUploading(false)
      setCurrentProgress({ current: 0, total: 0 })
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Importer des factures PDF
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Glissez-déposez vos fichiers PDF ici
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              ou cliquez pour sélectionner des fichiers
            </p>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Sélectionner des fichiers
            </label>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Fichiers sélectionnés ({selectedFiles.length})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>Importation terminée !</span>
              </div>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isUploading && currentProgress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Traitement en cours...</span>
                <span>{currentProgress.current}/{currentProgress.total}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Rapport d'importation
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    ✅ {importResults.filter(r => r.success).length} succès
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    ❌ {importResults.filter(r => !r.success).length} échecs
                  </span>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {result.fileName}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        result.success
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {result.success ? 'SUCCÈS' : `ERREUR ${result.status}`}
                      </span>
                    </div>

                    {result.success && result.extractedData && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Données extraites :
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {result.extractedData.invoiceNumber && (
                            <div className="flex items-center space-x-2">
                              <Hash className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">Facture :</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.extractedData.invoiceNumber}
                              </span>
                            </div>
                          )}
                          {result.extractedData.ltaNumber && (
                            <div className="flex items-center space-x-2">
                              <Hash className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">LTA :</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.extractedData.ltaNumber}
                              </span>
                            </div>
                          )}
                          {result.extractedData.customer && (
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">Client :</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.extractedData.customer}
                              </span>
                            </div>
                          )}
                          {result.extractedData.amount && (
                            <div className="flex items-center space-x-2">
                              <Euro className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">Montant :</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('fr-FR', { 
                                  style: 'currency', 
                                  currency: 'EUR' 
                                }).format(result.extractedData.amount)}
                              </span>
                            </div>
                          )}
                          {result.extractedData.masterId && (
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">Dossier :</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.extractedData.masterId}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!result.success && result.error && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        <strong>Erreur :</strong> {result.error}
                      </div>
                    )}

                    {result.response && (
                      <details className="mt-3">
                        <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                          Voir la réponse complète
                        </summary>
                        <div className="mt-2 bg-white dark:bg-gray-800 p-2 rounded border text-xs font-mono text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                          {result.response}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            disabled={isUploading}
          >
            Annuler
          </button>
          <button
            onClick={handleImport}
            disabled={selectedFiles.length === 0 || isUploading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Importation...</span>
              </>
            ) : (
              <span>Importer ({selectedFiles.length})</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoiceImportModal 