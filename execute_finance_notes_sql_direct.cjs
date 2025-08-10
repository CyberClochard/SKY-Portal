const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration Supabase
const supabaseUrl = 'https://humble-resonance.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Veuillez définir SUPABASE_SERVICE_KEY');
  console.log('Exemple: $env:SUPABASE_SERVICE_KEY="votre_clé_ici"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeFinanceNotesSQL() {
  try {
    console.log('🚀 Exécution du script SQL pour le système de notes finance...');
    
    // Lire le fichier SQL sécurisé
    const sqlFilePath = path.join(__dirname, 'create_finance_notes_system_safe.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📄 Contenu SQL lu:', sqlContent.length, 'caractères');
    
    // Diviser le SQL en commandes individuelles (en respectant les blocs DO)
    const sqlCommands = [];
    let currentCommand = '';
    let inDoBlock = false;
    let braceCount = 0;
    
    const lines = sqlContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('DO $$')) {
        inDoBlock = true;
        braceCount = 0;
        currentCommand = line;
      } else if (inDoBlock) {
        currentCommand += '\n' + line;
        if (trimmedLine.includes('$$')) {
          braceCount++;
          if (braceCount >= 2) {
            inDoBlock = false;
            sqlCommands.push(currentCommand);
            currentCommand = '';
          }
        }
      } else if (trimmedLine.startsWith('--') || trimmedLine === '') {
        // Ignorer les commentaires et lignes vides
        continue;
      } else if (trimmedLine.endsWith(';')) {
        currentCommand += line;
        if (currentCommand.trim()) {
          sqlCommands.push(currentCommand);
          currentCommand = '';
        }
      } else {
        currentCommand += line + '\n';
      }
    }
    
    // Ajouter la dernière commande si elle existe
    if (currentCommand.trim()) {
      sqlCommands.push(currentCommand);
    }
    
    console.log(`🔧 Exécution de ${sqlCommands.length} commandes SQL...`);
    
    // Exécuter chaque commande via l'API REST
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.trim()) {
        console.log(`\n📝 Commande ${i + 1}:`, command.substring(0, 100).replace(/\s+/g, ' ') + '...');
        
        try {
          // Utiliser l'API REST pour exécuter le SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ sql_query: command })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erreur HTTP ${response.status}:`, errorText);
          } else {
            const result = await response.json();
            console.log(`✅ Commande ${i + 1} exécutée avec succès`);
            if (result && result.length > 0) {
              console.log(`📊 Résultat:`, result);
            }
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