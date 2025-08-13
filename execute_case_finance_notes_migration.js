const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

if (!supabaseUrl || supabaseServiceKey === 'your-service-role-key') {
  console.error('❌ Veuillez configurer les variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  try {
    console.log('🚀 Début de l\'exécution de la migration case_finance_notes...')
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250715000003_case_finance_notes.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📖 Lecture du fichier de migration...')
    console.log('📄 Contenu de la migration:')
    console.log('─'.repeat(50))
    console.log(migrationSQL)
    console.log('─'.repeat(50))
    
    // Exécuter la migration
    console.log('⚡ Exécution de la migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution de la migration:', error)
      throw error
    }
    
    console.log('✅ Migration exécutée avec succès!')
    console.log('📊 Résultat:', data)
    
    // Vérifier que la table a été créée
    console.log('🔍 Vérification de la création de la table...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('case_finance_notes')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Erreur lors de la vérification de la table:', tableError)
      throw tableError
    }
    
    console.log('✅ Table case_finance_notes créée avec succès!')
    console.log('📋 Structure de la table vérifiée')
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  }
}

// Exécuter la migration
executeMigration() 