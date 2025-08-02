const fs = require('fs');

// Configuration Supabase
const supabaseUrl = 'https://supabase.skylogistics.fr';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.log('❌ Veuillez définir SUPABASE_SERVICE_KEY');
  console.log('   Exemple: SUPABASE_SERVICE_KEY=your-key node execute_sql_direct.js');
  process.exit(1);
}

async function executeSQL(sql) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Exécution du système d\'override unifié...');
  
  // Lire le fichier SQL
  const sqlContent = fs.readFileSync('unified_override_system.sql', 'utf8');
  
  // Exécuter le script complet
  console.log('📝 Exécution du script SQL...');
  
  const result = await executeSQL(sqlContent);
  
  if (result.success) {
    console.log('✅ Script exécuté avec succès !');
    console.log('📊 Résultat:', result.data);
  } else {
    console.log('❌ Erreur lors de l\'exécution:', result.error);
  }
}

main().catch(console.error); 