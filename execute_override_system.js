const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuration Supabase
const supabaseUrl = 'https://supabase.skylogistics.fr';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeOverrideSystem() {
  try {
    console.log('🚀 Exécution du système d\'override unifié...');
    
    // Lire le fichier SQL
    const sqlContent = fs.readFileSync('unified_override_system.sql', 'utf8');
    
    // Diviser le script en sections
    const sections = sqlContent.split('-- SCRIPT');
    
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const scriptNumber = section.split(':')[0].trim();
      const sqlScript = section.split('\n').slice(1).join('\n').trim();
      
      console.log(`\n📝 Exécution du SCRIPT ${scriptNumber}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: sqlScript });
        
        if (error) {
          console.error(`❌ Erreur dans le SCRIPT ${scriptNumber}:`, error);
        } else {
          console.log(`✅ SCRIPT ${scriptNumber} exécuté avec succès`);
        }
      } catch (err) {
        console.error(`❌ Erreur d'exécution du SCRIPT ${scriptNumber}:`, err.message);
      }
    }
    
    console.log('\n🎉 Système d\'override unifié installé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Vérifier si la clé de service est fournie
if (!process.env.SUPABASE_SERVICE_KEY) {
  console.log('⚠️  Veuillez définir la variable d\'environnement SUPABASE_SERVICE_KEY');
  console.log('   Exemple: SUPABASE_SERVICE_KEY=your-key node execute_override_system.js');
  process.exit(1);
}

executeOverrideSystem(); 