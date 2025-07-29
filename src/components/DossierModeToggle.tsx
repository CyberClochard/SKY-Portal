import React, { useState } from 'react'
import { useDossierMode } from '../hooks/useDossierMode'
import { Settings, CheckCircle, AlertCircle } from 'lucide-react'

interface DossierModeToggleProps {
  masterId: string
  masterName: string
  currentMode: boolean
  onModeChange?: (newMode: boolean) => void
}

export const DossierModeToggle: React.FC<DossierModeToggleProps> = ({
  masterId,
  masterName,
  currentMode,
  onModeChange
}) => {
  const [isManual, setIsManual] = useState(currentMode)
  const [showSuccess, setShowSuccess] = useState(false)
  const { setDossierMode, loading } = useDossierMode()
  
  const handleToggle = async () => {
    const newMode = !isManual
    
    const result = await setDossierMode(
      masterId, 
      newMode, 
      'current_user' // À remplacer par l'utilisateur connecté
    )
    
    if (result.success) {
      setIsManual(newMode)
      onModeChange?.(newMode)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    }
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`manual-mode-${masterId}`}
              checked={isManual}
              onChange={handleToggle}
              disabled={loading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label 
              htmlFor={`manual-mode-${masterId}`} 
              className="ml-2 text-sm font-medium text-gray-700"
            >
              Mode manuel
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            {isManual ? (
              <Settings className="w-4 h-4 text-orange-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
            <span className={`text-sm font-medium ${
              isManual ? 'text-orange-600' : 'text-green-600'
            }`}>
              {isManual ? 'Manuel' : 'Automatique'}
            </span>
          </div>
        </div>
        
        {isManual && (
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
            Mode manuel
          </span>
        )}
      </div>
      
      <div className="mt-3">
        <div className="text-sm text-gray-600">
          <strong>{masterName}</strong>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {isManual 
            ? '⚙️ Les paiements nécessiteront une allocation manuelle'
            : '🤖 Les paiements seront alloués automatiquement'
          }
        </div>
      </div>
      
      {showSuccess && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">
              Mode {isManual ? 'manuel' : 'automatique'} activé avec succès
            </span>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Mise à jour en cours...</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DossierModeToggle 