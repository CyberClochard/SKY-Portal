const { createClient } = require('@supabase/supabase-js')

// Configuration Supabase
const supabaseUrl = 'https://supabase.skylogistics.fr'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ Erreur: Variable d\'environnement SUPABASE_SERVICE_ROLE_KEY manquante')
  console.log('💡 Définissez cette variable avec votre clé de service Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCaseFinanceSummary() {
  try {
    console.log('🔍 Vérification de la vue case_finance_summary...')
    
    // 1. Vérifier si la vue existe
    console.log('\n1️⃣ Vérification de l\'existence de la vue...')
    const { data: views, error: viewsError } = await supabase
      .from('information_schema.views')
      .select('table_name, view_definition')
      .eq('table_name', 'case_finance_summary')
    
    if (viewsError) {
      console.error('❌ Erreur lors de la vérification des vues:', viewsError)
    } else if (views && views.length > 0) {
      console.log('✅ Vue case_finance_summary trouvée')
      console.log('📋 Définition:', views[0].view_definition)
    } else {
      console.log('⚠️  Vue case_finance_summary non trouvée')
    }
    
    // 2. Vérifier si la table case_finance_notes existe
    console.log('\n2️⃣ Vérification de la table case_finance_notes...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_name', 'case_finance_notes')
    
    if (tablesError) {
      console.error('❌ Erreur lors de la vérification des tables:', tablesError)
    } else if (tables && tables.length > 0) {
      console.log('✅ Table case_finance_notes trouvée')
    } else {
      console.log('⚠️  Table case_finance_notes non trouvée')
    }
    
    // 3. Vérifier si la table customers existe
    console.log('\n3️⃣ Vérification de la table customers...')
    const { data: customersTable, error: customersError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_name', 'customers')
    
    if (customersError) {
      console.error('❌ Erreur lors de la vérification de customers:', customersError)
    } else if (customersTable && customersTable.length > 0) {
      console.log('✅ Table customers trouvée')
    } else {
      console.log('⚠️  Table customers non trouvée')
    }
    
    // 4. Vérifier si la table MASTER existe
    console.log('\n4️⃣ Vérification de la table MASTER...')
    const { data: masterTable, error: masterError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_name', 'MASTER')
    
    if (masterError) {
      console.error('❌ Erreur lors de la vérification de MASTER:', masterError)
    } else if (masterTable && masterTable.length > 0) {
      console.log('✅ Table MASTER trouvée')
    } else {
      console.log('⚠️  Table MASTER non trouvée')
    }
    
    // 5. Essayer de créer la vue si elle n'existe pas
    if (!views || views.length === 0) {
      console.log('\n5️⃣ Création de la vue case_finance_summary...')
      
      const createViewSQL = `
        CREATE OR REPLACE VIEW case_finance_summary AS
        SELECT 
          m.id as master_id,
          m."DOSSIER" as dossier,
          m."CLIENT" as client_id,
          m."NETPAYABLE" as net_payable,
          m."LTA" as lta,
          m."STATUS" as status,
          m."DATE" as date_operation,
          COALESCE(c.name, 'Client inconnu') as client_name,
          COALESCE(cfn.override_mode, false) as override_mode,
          COALESCE(cfn.notes, '') as notes,
          COALESCE(cfn.updated_at, m."DATE") as notes_last_updated
        FROM "MASTER" m
        LEFT JOIN customers c ON m."CLIENT" = c.id  
        LEFT JOIN case_finance_notes cfn ON m.id = cfn.master_id
        ORDER BY m."DATE" DESC
      `
      
      try {
        const { data: createResult, error: createError } = await supabase.rpc('exec_sql', { 
          sql: createViewSQL 
        })
        
        if (createError) {
          console.error('❌ Erreur lors de la création de la vue:', createError)
        } else {
          console.log('✅ Vue case_finance_summary créée avec succès')
        }
      } catch (execErr) {
        console.log('⚠️  Fonction exec_sql non disponible, essayons une approche différente')
        
        // Essayer de créer la vue directement
        try {
          const { error: directCreateError } = await supabase
            .from('case_finance_summary')
            .select('*')
            .limit(1)
          
          if (directCreateError) {
            console.error('❌ Impossible de créer la vue:', directCreateError)
          }
        } catch (directErr) {
          console.error('❌ Erreur lors de la création directe:', directErr)
        }
      }
    }
    
    // 6. Tester la vue
    console.log('\n6️⃣ Test de la vue case_finance_summary...')
    try {
      const { data: testData, error: testError } = await supabase
        .from('case_finance_summary')
        .select('*')
        .limit(1)
      
      if (testError) {
        console.error('❌ Erreur lors du test de la vue:', testError)
      } else {
        console.log('✅ Vue testée avec succès')
        if (testData && testData.length > 0) {
          console.log('📊 Colonnes disponibles:', Object.keys(testData[0]))
          console.log('📋 Premier enregistrement:', testData[0])
        }
      }
    } catch (testErr) {
      console.error('❌ Erreur lors du test:', testErr)
    }
    
  } catch (err) {
    console.error('💥 Erreur inattendue:', err)
  }
}

// Exécuter la vérification
checkCaseFinanceSummary()
  .then(() => {
    console.log('\n🎉 Vérification terminée')
  })
  .catch(err => {
    console.error('💥 Erreur fatale:', err)
    process.exit(1)
  }) 