import { createClient } from '@supabase/supabase-js'

// Supabase configuration for SkyLogistics custom instance
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);

console.log('Supabase Config:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey?.length || 0
})

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey,
    env: import.meta.env
  })
}

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