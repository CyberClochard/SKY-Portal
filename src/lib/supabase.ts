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

// Function to send PDF files to n8n webhook
export const sendPDFsToWebhook = async (files: File[]): Promise<{ fileName: string; response: string; status: number }[]> => {
  const webhookUrl = 'https://n8n.skylogistics.fr/webhook-test/7ec6deef-007b-4821-a3b4-30559bf5425c'
  
  try {
    console.log(`Envoi de ${files.length} fichiers PDF au webhook n8n`)
    
    // Envoyer chaque fichier individuellement et capturer les réponses
    const sendPromises = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileName', file.name)
      formData.append('fileSize', file.size.toString())
      formData.append('uploadedAt', new Date().toISOString())
      formData.append('totalFiles', files.length.toString())
      formData.append('fileIndex', (files.indexOf(file) + 1).toString())
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.text()
      console.log(`Fichier ${file.name} envoyé avec succès au webhook`)
      console.log(`Réponse du webhook pour ${file.name}:`, result)
      
      return {
        fileName: file.name,
        response: result,
        status: response.status
      }
    })
    
    const results = await Promise.all(sendPromises)
    console.log('Tous les fichiers ont été envoyés au webhook avec succès')
    return results
  } catch (error) {
    console.error('Erreur lors de l\'envoi au webhook:', error)
    throw new Error(`Erreur lors de l'envoi au webhook: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

// Alternative: Function to send all PDF files in a single request (if webhook supports it)
export const sendPDFsToWebhookBatch = async (files: File[]): Promise<void> => {
  const webhookUrl = 'https://n8n.skylogistics.fr/webhook-test/7ec6deef-007b-4821-a3b4-30559bf5425c'
  
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