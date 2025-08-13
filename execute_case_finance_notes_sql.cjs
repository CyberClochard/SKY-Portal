const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration Supabase
const supabaseUrl = 'https://supabase.skylogistics.fr'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Erreur: Variable d\'environnement SUPABASE_SERVICE_ROLE_KEY manquante')
  console.log('💡 Ajoutez cette variable dans votre fichier .env ou dans les variables d\'environnement de votre système')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  try {
    console.log('🚀 Début de l\'exécution de la migration case_finance_notes...')
    
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'supabase', 'migrations', '20250715000003_case_finance_notes.sql')
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8')
    
    console.log('📖 Contenu du fichier SQL lu avec succès')
    
    // Exécuter le SQL
    console.log('⚡ Exécution du SQL dans Supabase...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution:', error)
      throw error
    }
    
    console.log('✅ Migration exécutée avec succès!')
    console.log('📊 Résultat:', data)
    
    // Vérifier que la table a été créée
    console.log('🔍 Vérification de la création de la table...')
    const { data: tableCheck, error: checkError } = await supabase
      .from('case_finance_notes')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Erreur lors de la vérification de la table:', checkError)
    } else {
      console.log('✅ Table case_finance_notes accessible avec succès')
      console.log('📋 Structure de la table:', tableCheck)
    }
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error)
    process.exit(1)
  }
}

// Exécuter la migration
executeMigration() 