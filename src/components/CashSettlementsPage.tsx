import React, { useState } from 'react'
import DossierStatusDashboard from './DossierStatusDashboard'
import DossierPage from './DossierPage'

const CashSettlementsPage: React.FC = () => {
  const [selectedDossier, setSelectedDossier] = useState<string | null>(null)

  // Si un dossier est sélectionné, afficher la page du dossier
  if (selectedDossier) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSelectedDossier(null)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            ← Retour au dashboard
          </button>
          <h1 className="text-2xl font-bold">Règlements Espèces</h1>
        </div>
        <DossierPage masterId={selectedDossier} />
      </div>
    )
  }

  // Sinon, afficher le dashboard avec possibilité de cliquer sur un dossier
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Règlements Espèces</h1>
        <div className="text-sm text-gray-600">
          Gestion des règlements espèces hors comptabilité
        </div>
      </div>
      
      <div className="bg-orange-50 border border-orange-200 p-4 rounded-md">
        <div className="flex items-center space-x-2">
          <span className="text-orange-600">💵</span>
          <div>
            <h3 className="font-medium text-orange-900">Règlements Espèces</h3>
            <p className="text-sm text-orange-700">
              Cette section permet de tracer les dossiers réglés en espèces sans passer par le système de facturation officiel.
            </p>
          </div>
        </div>
      </div>

      <DossierStatusDashboard onDossierClick={setSelectedDossier} />
    </div>
  )
}

export default CashSettlementsPage 