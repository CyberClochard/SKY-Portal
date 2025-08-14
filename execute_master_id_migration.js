const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration Supabase
const supabaseUrl = 'https://supabase.skylogistics.fr'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Erreur: Variable d\'environnement SUPABASE_SERVICE_ROLE_KEY manquante')
  console.log('💡 Définissez cette variable avec votre clé de service Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  try {
    console.log('🚀 Début de la migration: Ajout du champ master_id à la table invoices')
    
    // Lire le script SQL
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'add_master_id_to_invoices_direct.sql'), 
      'utf8'
    )
    
    console.log('📖 Script SQL chargé, exécution...')
    
    // Exécuter le script SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript })
    
    if (error) {
      console.error('❌ Erreur lors de l\'exécution:', error)
      return false
    }
    
    console.log('✅ Migration exécutée avec succès!')
    console.log('📊 Résultats:', data)
    
    // Vérifier que la colonne a été ajoutée
    console.log('🔍 Vérification de la colonne master_id...')
    
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'invoices')
      .eq('column_name', 'master_id')
    
    if (checkError) {
      console.error('❌ Erreur lors de la vérification:', checkError)
      return false
    }
    
    if (columns && columns.length > 0) {
      console.log('✅ Colonne master_id ajoutée avec succès:')
      console.log('   - Nom:', columns[0].column_name)
      console.log('   - Type:', columns[0].data_type)
      console.log('   - Nullable:', columns[0].is_nullable)
    } else {
      console.log('⚠️  Colonne master_id non trouvée')
      return false
    }
    
    return true
    
  } catch (err) {
    console.error('❌ Erreur inattendue:', err)
    return false
  }
}

// Exécuter la migration
executeMigration()
  .then(success => {
    if (success) {
      console.log('🎉 Migration terminée avec succès!')
      console.log('💡 Vous pouvez maintenant utiliser le champ master_id dans vos factures')
    } else {
      console.log('💥 Migration échouée')
      process.exit(1)
    }
  })
  .catch(err => {
    console.error('💥 Erreur fatale:', err)
    process.exit(1)
  }) 