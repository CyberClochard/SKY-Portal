import React, { useState } from 'react'
import DossierModeToggle from './DossierModeToggle'
import { useDossiersWithMode } from '../hooks/useDossierMode'

export const DossierModeTest: React.FC = () => {
  const { dossiers, loading } = useDossiersWithMode()
  const [selectedDossier, setSelectedDossier] = useState<string>('')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement des dossiers...</span>
      </div>
    )
  }

  const selectedDossierData = dossiers.find(d => d.master_id === selectedDossier)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-medium text-blue-800 mb-2">
          🧪 Test du Mode Manuel par Dossier
        </h2>
        <p className="text-blue-700 text-sm">
          Ce composant permet de tester la fonctionnalité de toggle du mode manuel/automatique par dossier.
        </p>
      </div>

      {/* Sélection du dossier */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sélectionner un dossier</h3>
        
        {dossiers.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            Aucun dossier trouvé. Assurez-vous que la base de données est correctement configurée.
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="dossier-select" className="block text-sm font-medium text-gray-700">
              Choisir un dossier :
            </label>
            <select
              id="dossier-select"
              value={selectedDossier}
              onChange={(e) => setSelectedDossier(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Sélectionner un dossier --</option>
              {dossiers.map((dossier) => (
                <option key={dossier.master_id} value={dossier.master_id}>
                  {dossier.master_name} - {dossier.customer_name} 
                  ({dossier.is_manual_mode ? 'Manuel' : 'Auto'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toggle pour le dossier sélectionné */}
      {selectedDossierData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Toggle Mode - {selectedDossierData.master_name}
          </h3>
          
          <DossierModeToggle
            masterId={selectedDossierData.master_id}
            masterName={selectedDossierData.master_name}
            currentMode={selectedDossierData.is_manual_mode}
            onModeChange={(newMode) => {
              console.log(`Mode changé pour ${selectedDossierData.master_name}: ${newMode ? 'Manuel' : 'Auto'}`)
            }}
          />
        </div>
      )}

      {/* Informations sur les dossiers */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Liste des dossiers</h3>
        
        {dossiers.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            Aucun dossier disponible
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dossier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Solde
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dossiers.map((dossier) => (
                  <tr key={dossier.master_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dossier.master_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dossier.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        dossier.is_manual_mode
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {dossier.is_manual_mode ? 'Manuel' : 'Auto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        dossier.dossier_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : dossier.dossier_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {dossier.dossier_status === 'paid' && 'Payé'}
                        {dossier.dossier_status === 'partial' && 'Partiel'}
                        {dossier.dossier_status === 'unpaid' && 'Non payé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(dossier.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-yellow-800 font-medium mb-2">Instructions de test</h3>
        <div className="text-yellow-700 text-sm space-y-1">
          <p>1. Sélectionnez un dossier dans la liste déroulante</p>
          <p>2. Utilisez le toggle pour changer le mode (Auto ↔ Manuel)</p>
          <p>3. Vérifiez que le changement est bien sauvegardé</p>
          <p>4. Testez avec différents dossiers</p>
        </div>
      </div>
    </div>
  )
}

export default DossierModeTest 