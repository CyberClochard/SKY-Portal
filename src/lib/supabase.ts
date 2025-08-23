import { createClient } from '@supabase/supabase-js'

// Supabase configuration for SkyLogistics custom instance
// Using environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.skylogistics.fr'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1MTEyNTYyMCwiZXhwIjo0OTA2Nzk5MjIwLCJyb2xlIjoiYW5vbiJ9.KtZo2tsCZGadFu2ibWCiBVJ7OI1Ch7VZTELX5HZO97Y'

console.log('=== SUPABASE CONFIGURATION ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? '***LOADED***' : 'NOT LOADED');
console.log('Using env vars:', {
  url: !!import.meta.env.VITE_SUPABASE_URL,
  key: !!import.meta.env.VITE_SUPABASE_ANON_KEY
});

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0
})

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('awbStock124').select('*').limit(1)
    if (error) {
      console.error('Connection test failed:', error)
      return { success: false, error: error.message }
    }
    console.log('Connection test successful:', data)
    return { success: true, data }
  } catch (err) {
    console.error('Connection test error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// Test connection function for payments system
export const testPaymentsConnection = async () => {
  try {
    const { data, error } = await supabase.from('customers').select('*').limit(1)
    if (error) throw error
    return { success: true, message: 'Connexion OK', data }
  } catch (error) {
    return { success: false, message: 'Erreur de connexion', error }
  }
}

// Fonction de diagnostic avancée pour les types de données
export const testDataTypes = async () => {
  try {
    console.log('=== TEST DES TYPES DE DONNÉES ===')
    
    // Test des factures
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)
    
    if (invoicesError) {
      console.error('Erreur lors du test des factures:', invoicesError)
      return { success: false, error: invoicesError }
    }
    
    if (invoices && invoices.length > 0) {
      const invoice = invoices[0]
      console.log('Types des champs de facture:')
      console.log('- due_date:', typeof invoice.due_date, 'Valeur:', invoice.due_date)
      console.log('- issued_date:', typeof invoice.issued_date, 'Valeur:', invoice.issued_date)
      console.log('- created_at:', typeof invoice.created_at, 'Valeur:', invoice.created_at)
      console.log('- amount_total:', typeof invoice.amount_total, 'Valeur:', invoice.amount_total)
    }
    
    // Test de la vue invoice_summary
    const { data: summary, error: summaryError } = await supabase
      .from('invoice_summary')
      .select('*')
      .limit(1)
    
    if (summaryError) {
      console.error('Erreur lors du test de invoice_summary:', summaryError)
      return { success: false, error: summaryError }
    }
    
    if (summary && summary.length > 0) {
      const invoiceSummary = summary[0]
      console.log('Types des champs de invoice_summary:')
      console.log('- due_date:', typeof invoiceSummary.due_date, 'Valeur:', invoiceSummary.due_date)
      console.log('- issued_date:', typeof invoiceSummary.issued_date, 'Valeur:', invoiceSummary.issued_date)
      console.log('- created_at:', typeof invoiceSummary.created_at, 'Valeur:', invoiceSummary.created_at)
      console.log('- amount_total:', typeof invoiceSummary.amount_total, 'Valeur:', invoiceSummary.amount_total)
      console.log('- amount_remaining:', typeof invoiceSummary.amount_remaining, 'Valeur:', invoiceSummary.amount_remaining)
    }
    
    console.log('=== FIN TEST DES TYPES ===')
    return { success: true }
  } catch (error) {
    console.error('Erreur lors du test des types:', error)
    return { success: false, error }
  }
}

// Fonction spécifique pour tester la vue invoice_summary
export const testInvoiceSummary = async () => {
  try {
    console.log('=== TEST SPÉCIFIQUE INVOICE_SUMMARY ===')
    
    // Test 1: Vérifier si la vue existe
    const { data: testData, error: testError } = await supabase
      .from('invoice_summary')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.error('❌ Vue invoice_summary non trouvée:', testError)
      return { success: false, error: testError }
    }
    
    console.log('✅ Vue invoice_summary existe')
    
    // Test 2: Récupérer toutes les données
    const { data, error } = await supabase
      .from('invoice_summary')
      .select('*')
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des données:', error)
      return { success: false, error }
    }
    
    console.log(`✅ ${data?.length || 0} factures trouvées`)
    
    if (data && data.length > 0) {
      const firstInvoice = data[0]
      console.log('📋 Structure de la première facture:')
      console.log('- Clés disponibles:', Object.keys(firstInvoice))
      console.log('- due_date:', firstInvoice.due_date, '(type:', typeof firstInvoice.due_date, ')')
      console.log('- amount_total:', firstInvoice.amount_total, '(type:', typeof firstInvoice.amount_total, ')')
      console.log('- amount_remaining:', firstInvoice.amount_remaining, '(type:', typeof firstInvoice.amount_remaining, ')')
    }
    
    console.log('=== FIN TEST INVOICE_SUMMARY ===')
    return { success: true, data }
  } catch (error) {
    console.error('❌ Erreur lors du test invoice_summary:', error)
    return { success: false, error }
  }
}

// Interface for AirlinesDirectory table
export interface AirlineDirectory {
  id?: string
  prefix?: string
  code?: string
  name?: string
  country?: string
  [key: string]: any
}

// Interface for AWB stock tables
export interface AWBStockRecord {
  id?: string
  prefix?: string
  awb?: string
  isUsed?: boolean
  [key: string]: any
}

// Mapping of prefixes to their corresponding table names
const PREFIX_TO_TABLE: Record<string, string> = {
  '124': 'awbStock124',
  '235': 'awbStock235',
  '624': 'awbStock624'
}

// Get all available prefixes
export const getAvailablePrefixes = (): string[] => {
  return Object.keys(PREFIX_TO_TABLE)
}

// Get table name for a given prefix
const getTableNameForPrefix = (prefix: string): string => {
  const tableName = PREFIX_TO_TABLE[prefix]
  if (!tableName) {
    throw new Error(`Unsupported prefix: ${prefix}. Available prefixes: ${Object.keys(PREFIX_TO_TABLE).join(', ')}`)
  }
  return tableName
}

// Simple function to get airline by prefix
export const getAirlineByPrefix = async (prefix: string) => {
  try {
    console.log('Looking for airline with prefix:', prefix)
    
    const { data, error } = await supabase
      .from('AirlinesDirectory')
      .select('*')
      .eq('prefix', prefix)
      .single()

    if (error) {
      console.log('No airline found for prefix:', prefix)
      return null
    }

    console.log('Found airline:', data)
    return data

  } catch (err) {
    console.log('No airline found for prefix:', prefix)
    return null
  }
}

// Helper function to get AWB stock data for a specific prefix
export const getAWBStockByPrefix = async (prefix: string) => {
  try {
    const tableName = getTableNameForPrefix(prefix)
    console.log(`Fetching AWB stock data from table ${tableName}...`)
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error(`Error fetching AWB stock from ${tableName}:`, error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log(`AWB stock data fetched successfully from ${tableName}:`, data?.length || 0, 'records')
    return data || []
  } catch (err) {
    console.error(`Failed to fetch AWB stock for prefix ${prefix}:`, err)
    throw err
  }
}

// Helper function to insert AWB stock record
export const insertAWBStock = async (prefix: string, awbNumber: string, serialNumber: string, checkDigit: number) => {
  try {
    const tableName = getTableNameForPrefix(prefix)
    
    // For the stock tables, we store:
    // - prefix: the 3-digit prefix (e.g., "624")
    // - awb: the serial number + check digit (8 digits, e.g., "46549871")
    // - isUsed: false (default)
    const awbValue = serialNumber + checkDigit.toString()
    
    const stockData = {
      prefix: prefix,
      awb: awbValue,
      isUsed: false
    }

    console.log(`Inserting AWB into ${tableName}:`, stockData)

    const { data, error } = await supabase
      .from(tableName)
      .insert([stockData])
      .select()

    if (error) {
      console.error(`Error inserting into ${tableName}:`, error)
      throw error
    }

    console.log(`AWB inserted successfully into ${tableName}:`, data?.[0])
    return data?.[0]
  } catch (err) {
    console.error(`Failed to insert AWB for prefix ${prefix}:`, err)
    throw err
  }
}

// Helper function to check if AWB already exists
export const checkAWBExists = async (prefix: string, awbNumber: string): Promise<boolean> => {
  try {
    const tableName = getTableNameForPrefix(prefix)
    
    // Extract the 8-digit part (serial + check digit) from the full 11-digit AWB
    const awbValue = awbNumber.slice(3) // Remove the 3-digit prefix
    
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .eq('prefix', prefix)
      .eq('awb', awbValue)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`Error checking AWB existence in ${tableName}:`, error)
      return false
    }

    return !!data
  } catch (err) {
    console.error(`Failed to check AWB existence for prefix ${prefix}:`, err)
    return false
  }
}

// Helper function to update AWB stock
export const updateAWBStock = async (prefix: string, id: string, updates: Partial<AWBStockRecord>) => {
  try {
    const tableName = getTableNameForPrefix(prefix)
    
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('id', id)
      .select()

    if (error) {
      console.error(`Error updating ${tableName}:`, error)
      throw error
    }

    return data?.[0]
  } catch (err) {
    console.error(`Failed to update AWB stock for prefix ${prefix}:`, err)
    throw err
  }
}

// Helper function to delete AWB stock
export const deleteAWBStock = async (prefix: string, id: string) => {
  try {
    const tableName = getTableNameForPrefix(prefix)
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)

    if (error) {
      console.error(`Error deleting from ${tableName}:`, error)
      throw error
    }

    return true
  } catch (err) {
    console.error(`Failed to delete AWB stock for prefix ${prefix}:`, err)
    throw err
  }
}

// Helper function to search airlines by name or code
export const searchAirlines = async (searchTerm: string) => {
  try {
    console.log('Searching airlines with term:', searchTerm)
    const { data, error } = await supabase
      .from('AirlinesDirectory')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      .order('name')
      .limit(10)

    if (error) {
      console.error('Error searching airlines:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('Airlines search results:', data?.length || 0, 'records')
    return data || []
  } catch (err) {
    console.error('Failed to search airlines:', err)
    return []
  }
}

// Helper function to get airline by IATA code (2 letters)
export const getAirlineByCode = async (code: string) => {
  try {
    console.log('Looking for airline with IATA code:', code)
    
    const { data, error } = await supabase
      .from('AirlinesDirectory')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (error) {
      console.log('No airline found for IATA code:', code)
      return null
    }

    console.log('Found airline:', data)
    return data
  } catch (err) {
    console.error('Error fetching airline by code:', err)
    return null
  }
}

// Helper function to get all airlines
export const getAllAirlines = async () => {
  try {
    console.log('Fetching all airlines...')
    const { data, error } = await supabase
      .from('AirlinesDirectory')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching airlines:', error)
      throw new Error(`Database error: ${error.message}`)
    }

    console.log('All airlines fetched successfully:', data?.length || 0, 'records')
    return data || []
  } catch (err) {
    console.error('Failed to fetch airlines:', err)
    throw err
  }
}

export interface MasterRecord {
  [key: string]: any
}

// Function to upload invoice PDF files to Supabase Storage
export const uploadInvoicePDF = async (file: File, invoiceNumber?: string): Promise<string> => {
  try {
    const fileName = invoiceNumber 
      ? `invoices/${invoiceNumber}_${Date.now()}.pdf`
      : `invoices/${Date.now()}_${file.name}`
    
    const { data, error } = await supabase.storage
      .from('invoices')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading file:', error)
      throw new Error(`Erreur lors de l'upload: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName)

    console.log('File uploaded successfully:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (error) {
    console.error('Failed to upload invoice PDF:', error)
    throw error
  }
}

// Function to upload multiple invoice PDF files
export const uploadMultipleInvoicePDFs = async (files: File[]): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadInvoicePDF(file))
  return Promise.all(uploadPromises)
}

// Interface pour les résultats d'import de factures
export interface InvoiceImportResult {
  fileName: string
  success: boolean
  status: number
  response?: string
  error?: string
  extractedData?: {
    invoiceNumber?: string
    ltaNumber?: string
    customer?: string
    amount?: number
    masterId?: string
  }
}

// Function to send PDF files to n8n webhook - Traitement individuel
export const sendPDFsToWebhook = async (files: File[]): Promise<InvoiceImportResult[]> => {
  const webhookUrl = 'https://n8n.skylogistics.fr/webhook/7ec6deef-007b-4821-a3b4-30559bf5425c'
  const results: InvoiceImportResult[] = []
  
  console.log(`Traitement de ${files.length} fichiers PDF au webhook n8n`)
  
  // Traiter chaque fichier individuellement
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    console.log(`Traitement du fichier ${i + 1}/${files.length}: ${file.name}`)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('uploadedAt', new Date().toISOString())
      formData.append('totalFiles', files.length.toString())
      formData.append('fileIndex', (i + 1).toString())
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      })
      
      const responseText = await response.text()
      
      if (!response.ok) {
        results.push({
          fileName: file.name,
          success: false,
          status: response.status,
          error: `Erreur HTTP: ${response.status} ${response.statusText}`,
          response: responseText
        })
        console.log(`❌ Échec du traitement de ${file.name}: ${response.status}`)
        continue
      }
      
      // Essayer de parser la réponse JSON pour extraire les données
      let extractedData: any = {}
      try {
        const jsonResponse = JSON.parse(responseText)
        extractedData = {
          invoiceNumber: jsonResponse.invoice_number || jsonResponse.invoiceNumber,
          ltaNumber: jsonResponse.lta_number || jsonResponse.ltaNumber,
          customer: jsonResponse.customer || jsonResponse.customer_name,
          amount: jsonResponse.amount || jsonResponse.total_amount,
          masterId: jsonResponse.master_id || jsonResponse.masterId
        }
      } catch (parseError) {
        console.log(`Impossible de parser la réponse JSON pour ${file.name}:`, parseError)
      }
      
      results.push({
        fileName: file.name,
        success: true,
        status: response.status,
        response: responseText,
        extractedData
      })
      
      console.log(`✅ Succès du traitement de ${file.name}`)
      
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de ${file.name}:`, error)
      results.push({
        fileName: file.name,
        success: false,
        status: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      })
    }
  }
  
  console.log(`Traitement terminé: ${results.filter(r => r.success).length}/${files.length} succès`)
  return results
}

// Alternative: Function to send all PDF files in a single request (if webhook supports it)
export const sendPDFsToWebhookBatch = async (files: File[]): Promise<string> => {
  const webhookUrl = 'https://n8n.skylogistics.fr/webhook/7ec6deef-007b-4821-a3b4-30559bf5425c'
  
  try {
    console.log(`Envoi de ${files.length} fichiers PDF au webhook n8n en lot`)
    
    const formData = new FormData()
    formData.append('totalFiles', files.length.toString())
    formData.append('uploadedAt', new Date().toISOString())
    
    // Ajouter tous les fichiers au FormData
    files.forEach((file, index) => {
      formData.append(`file_${index}`, file)
      formData.append(`fileName_${index}`, file.name)
      formData.append(`fileSize_${index}`, file.size.toString())
    })
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
    }
    
    const result = await response.text()
    console.log('Tous les fichiers ont été envoyés au webhook en lot avec succès')
    return result
  } catch (error) {
    console.error('Erreur lors de l\'envoi au webhook en lot:', error)
    throw new Error(`Erreur lors de l'envoi au webhook: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

export const fixExistingPaymentAllocationStatus = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Début de la correction des statuts d\'allocation...')

    // 1. Récupérer tous les paiements qui ont des allocations mais auto_allocate = false
    const { data: paymentsWithAllocations, error: queryError } = await supabase
      .from('payments')
      .select(`
        id,
        auto_allocate,
        payment_allocations!inner(id)
      `)
      .eq('auto_allocate', false)

    if (queryError) {
      console.error('Erreur lors de la requête des paiements avec allocations:', queryError)
      return { success: false, message: `Erreur de requête: ${queryError.message}` }
    }

    if (!paymentsWithAllocations || paymentsWithAllocations.length === 0) {
      console.log('Aucun paiement à corriger trouvé')
      return { success: true, message: 'Aucun paiement à corriger trouvé' }
    }

    console.log(`${paymentsWithAllocations.length} paiements à corriger trouvés`)

    // 2. Mettre à jour le statut auto_allocate pour ces paiements
    const paymentIds = paymentsWithAllocations.map(p => p.id)
    const { error: updateError } = await supabase
      .from('payments')
      .update({ auto_allocate: true })
      .in('id', paymentIds)

    if (updateError) {
      console.error('Erreur lors de la mise à jour des paiements:', updateError)
      return { success: false, message: `Erreur de mise à jour: ${updateError.message}` }
    }

    console.log(`${paymentIds.length} paiements corrigés avec succès`)
    return { 
      success: true, 
      message: `${paymentIds.length} paiements corrigés avec succès` 
    }

  } catch (error) {
    console.error('Erreur lors de la correction des statuts:', error)
    return { 
      success: false, 
      message: `Erreur inattendue: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
    }
  }
}

// Interface pour les données de facturation à envoyer au webhook n8n
export interface InvoiceDataForWebhook {
  master_id: string
  dossier_number: string
  client_name?: string
  invoice_lines: {
    description: string
    quantity: number
    unit_price: number
    total_price: number
  }[]
  total_amount: number
  created_at: string
  source: string
}

// Function to test webhook connectivity
export const testWebhookConnectivity = async (): Promise<{ success: boolean; message: string; details?: any }> => {
  const webhookUrl = 'https://n8n.skylogistics.fr/webhook-test/490100a6-95d3-49ef-94a6-c897856cf9c9'
  
  try {
    console.log('🔍 Test de connectivité au webhook n8n...')
    console.log('🔗 URL testée:', webhookUrl)
    
    // Essayer d'abord avec le proxy local Vite
    const localProxyUrl = `/n8n-webhook/webhook-test/490100a6-95d3-49ef-94a6-c897856cf9c9`
    console.log('🔄 Tentative avec proxy local Vite:', localProxyUrl)
    
    const startTime = Date.now()
    const response = await fetch(localProxyUrl, {
      method: 'GET', // Test simple avec GET
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 secondes pour le proxy local
    })
    const endTime = Date.now()
    
    console.log('📥 Test de connectivité réussi via proxy local:', {
      status: response.status,
      statusText: response.statusText,
      responseTime: `${endTime - startTime}ms`,
      headers: Object.fromEntries(response.headers.entries())
    })
    
    return {
      success: true,
      message: `Connectivité OK via proxy local - Réponse ${response.status} en ${endTime - startTime}ms`,
      details: {
        status: response.status,
        responseTime: endTime - startTime,
        method: 'local-proxy'
      }
    }
    
  } catch (error) {
    console.error('❌ Test de connectivité échoué avec proxy local:', error)
    
    // Essayer avec le proxy CORS externe en fallback
    try {
      console.log('🔄 Tentative avec proxy CORS externe...')
      const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${webhookUrl}`
      
      const startTime = Date.now()
      const response = await fetch(corsProxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Origin': 'http://localhost:5173'
        },
        signal: AbortSignal.timeout(15000)
      })
      const endTime = Date.now()
      
      console.log('📥 Test de connectivité réussi via proxy CORS externe:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${endTime - startTime}ms`
      })
      
      return {
        success: true,
        message: `Connectivité OK via proxy CORS externe - Réponse ${response.status} en ${endTime - startTime}ms`,
        details: {
          status: response.status,
          responseTime: endTime - startTime,
          method: 'cors-proxy'
        }
      }
      
    } catch (corsError) {
      console.error('❌ Test de connectivité échoué avec tous les proxies:', corsError)
      
      let errorDetails = 'Erreur inconnue'
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorDetails = 'Timeout de la requête dépassé'
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          errorDetails = 'Erreur de réseau ou CORS - Vérifiez la connectivité internet et les restrictions CORS'
        } else {
          errorDetails = error.message
        }
      }
      
      return {
        success: false,
        message: `Test de connectivité échoué: ${errorDetails}`,
        details: { error: errorDetails }
      }
    }
  }
}

// Function to send invoice data to n8n webhook for PDF generation
export const sendInvoiceDataToWebhook = async (invoiceData: InvoiceDataForWebhook): Promise<{ success: boolean; message: string; response?: any; pdfBlob?: Blob; fileName?: string }> => {
  const webhookUrl = 'https://n8n.skylogistics.fr/webhook-test/490100a6-95d3-49ef-94a6-c897856cf9c9'
  
  try {
    console.log('📤 Envoi des données de facturation au webhook n8n:', invoiceData)
    console.log('🔗 URL du webhook:', webhookUrl)
    
    // Utiliser le proxy local Vite en priorité
    const localProxyUrl = `/n8n-webhook/webhook-test/490100a6-95d3-49ef-94a6-c897856cf9c9`
    console.log('🔄 Utilisation du proxy local Vite:', localProxyUrl)
    
    const response = await fetch(localProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json, */*',
      },
      body: JSON.stringify(invoiceData),
      // Ajouter un timeout pour éviter les blocages
      signal: AbortSignal.timeout(30000) // 30 secondes
    })
    
    console.log('📥 Statut de la réponse:', response.status, response.statusText)
    console.log('📥 Headers de la réponse:', Object.fromEntries(response.headers.entries()))
    console.log('📥 Content-Type de la réponse:', response.headers.get('content-type'))
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
    }
    
    // Vérifier si la réponse est un PDF binaire
    const contentType = response.headers.get('content-type')
    const isPDF = contentType && (contentType.includes('application/pdf') || contentType.includes('binary') || contentType.includes('octet-stream'))
    
    if (isPDF) {
      console.log('📄 Réponse détectée comme PDF binaire')
      
      // Récupérer le blob PDF
      const pdfBlob = await response.blob()
      console.log('📄 Blob PDF récupéré:', pdfBlob.size, 'bytes, type:', pdfBlob.type)
      
      // Générer un nom de fichier
      const fileName = `facture_${invoiceData.master_id}_${Date.now()}.pdf`
      
      console.log('✅ PDF binaire reçu avec succès du webhook n8n')
      return {
        success: true,
        message: 'Facture PDF générée avec succès par le workflow n8n',
        pdfBlob,
        fileName
      }
    } else {
      // Essayer de traiter comme du JSON ou du texte
      const responseText = await response.text()
      console.log('📥 Contenu de la réponse texte:', responseText)
      
      let responseData
      try {
        responseData = JSON.parse(responseText)
        console.log('✅ Réponse JSON parsée:', responseData)
      } catch (parseError) {
        console.log('⚠️ Réponse non-JSON du webhook:', responseText)
        responseData = { message: responseText }
      }
      
      console.log('✅ Données de facturation envoyées avec succès au webhook n8n')
      return {
        success: true,
        message: 'Facture envoyée au webhook n8n avec succès',
        response: responseData
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi au webhook n8n:', error)
    
    // Détails de l'erreur selon le type
    let errorDetails = 'Erreur inconnue'
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorDetails = 'Timeout de la requête (30s dépassé)'
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorDetails = 'Erreur de réseau ou CORS'
      } else {
        errorDetails = error.message
      }
    }
    
    return {
      success: false,
      message: `Erreur lors de l'envoi au webhook: ${errorDetails}`
    }
  }
}