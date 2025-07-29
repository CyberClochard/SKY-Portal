import React, { useState, useEffect } from 'react'
import { supabase, testPaymentsConnection, testDataTypes, testInvoiceSummary, fixExistingPaymentAllocationStatus } from '../lib/supabase'
import { AlertCircle, CheckCircle, Loader2, Database, TestTube, FileText, Wrench } from 'lucide-react'

interface DatabaseDiagnosticProps {
  onDataFixed?: () => void
}

const DatabaseDiagnostic: React.FC<DatabaseDiagnosticProps> = ({ onDataFixed }) => {
  const [diagnostics, setDiagnostics] = useState<{
    connection: { success: boolean; message: string; data?: any; error?: any }
    tables: { success: boolean; message: string; data?: any; error?: any }
    testData: { success: boolean; message: string; data?: any; error?: any }
  }>({
    connection: { success: false, message: 'Non testé' },
    tables: { success: false, message: 'Non testé' },
    testData: { success: false, message: 'Non testé' }
  })
  const [loading, setLoading] = useState(false)
  const [dataTypesResult, setDataTypesResult] = useState<any>(null)
  const [fixResult, setFixResult] = useState<{ success: boolean; message: string } | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    
    // Test de connexion
    const connectionResult = await testPaymentsConnection()
    setDiagnostics(prev => ({ ...prev, connection: connectionResult }))
    
    // Test des tables
    if (connectionResult.success) {
      try {
        const { data, error } = await supabase.from('customers').select('count').limit(1)
        const tablesResult = {
          success: !error,
          message: error ? 'Tables non trouvées' : 'Tables OK',
          data: data,
          error: error
        }
        setDiagnostics(prev => ({ ...prev, tables: tablesResult }))
      } catch (err) {
        setDiagnostics(prev => ({ 
          ...prev, 
          tables: { success: false, message: 'Erreur lors du test des tables', error: err } 
        }))
      }
    }
    
    setLoading(false)
  }

  const runDataTypesTest = async () => {
    setLoading(true)
    const result = await testDataTypes()
    setDataTypesResult(result)
    setLoading(false)
  }

  const runInvoiceSummaryTest = async () => {
    setLoading(true)
    const result = await testInvoiceSummary()
    setDataTypesResult(result)
    setLoading(false)
  }

  const runFixAllocationStatus = async () => {
    setLoading(true)
    const result = await fixExistingPaymentAllocationStatus()
    setFixResult(result)
    setLoading(false)
    
    // Si la correction a réussi, notifier le composant parent
    if (result.success && onDataFixed) {
      onDataFixed()
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Diagnostic de la Base de Données</h3>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          {diagnostics.connection.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-sm">
            <strong>Connexion Supabase:</strong> {diagnostics.connection.message}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {diagnostics.tables.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-sm">
            <strong>Tables du système de paiements:</strong> {diagnostics.tables.message}
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Retester
        </button>
        
        <button
          onClick={runDataTypesTest}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
          Test Types de Données
        </button>
        
        <button
          onClick={runInvoiceSummaryTest}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Test Invoice Summary
        </button>
        
        <button
          onClick={runFixAllocationStatus}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          Corriger Statuts Allocation
        </button>
      </div>
      
      {dataTypesResult && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Résultat du test des types:</h4>
          <pre className="text-xs text-gray-700 overflow-auto">
            {JSON.stringify(dataTypesResult, null, 2)}
          </pre>
        </div>
      )}
      
      {fixResult && (
        <div className={`mt-4 p-3 rounded-md ${
          fixResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <h4 className={`font-medium mb-2 ${
            fixResult.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {fixResult.success ? 'Correction réussie' : 'Erreur de correction'}
          </h4>
          <p className={`text-sm ${
            fixResult.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {fixResult.message}
          </p>
        </div>
      )}
      
      {!diagnostics.connection.success && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="font-medium text-yellow-800 mb-2">Problème détecté</h4>
          <p className="text-sm text-yellow-700 mb-3">
            Les tables du système de paiements ne sont pas créées. Veuillez exécuter le script SQL dans Supabase.
          </p>
          <div className="text-xs text-yellow-600">
            <p><strong>Solution:</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Allez sur votre instance Supabase</li>
              <li>Ouvrez l'éditeur SQL</li>
              <li>Copiez et exécutez le contenu du fichier <code>init-payments-db.sql</code></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatabaseDiagnostic 