const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = 'https://humble-resonance.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Veuillez définir SUPABASE_SERVICE_KEY');
  console.log('Exemple: set SUPABASE_SERVICE_KEY=votre_clé_ici && node execute_finance_notes_sql.cjs');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeFinanceNotesSQL() {
  try {
    console.log('🚀 Exécution du script SQL pour le système de notes finance...');
    
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'create_finance_notes_system.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Contenu SQL lu:', sqlContent.length, 'caractères');
    
    // Diviser le SQL en commandes individuelles
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`🔧 Exécution de ${sqlCommands.length} commandes SQL...`);
    
    // Exécuter chaque commande
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.trim()) {
        console.log(`\n📝 Commande ${i + 1}:`, command.substring(0, 100) + '...');
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: command });
          
          if (error) {
            console.error(`❌ Erreur commande ${i + 1}:`, error);
          } else {
            console.log(`✅ Commande ${i + 1} exécutée avec succès`);
          }
        } catch (err) {
          console.error(`❌ Erreur lors de l'exécution de la commande ${i + 1}:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Script SQL terminé !');
    console.log('💡 Vérifiez maintenant l\'onglet Facturation dans votre application');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution:', error);
  }
}

// Exécuter le script
executeFinanceNotesSQL(); 