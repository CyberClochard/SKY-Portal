import React from 'react'
import { X } from 'lucide-react'
import UnifiedOverrideControl from './UnifiedOverrideControl'

interface OverrideModalProps {
  isOpen: boolean
  dossierId: string
  onClose: () => void
  onStatusChange?: (newFactureStatus: string, newReglementStatus: string, isManual: boolean) => void
}

const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  dossierId,
  onClose,
  onStatusChange
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Contrôle des Overrides
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Dossier: {dossierId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <UnifiedOverrideControl
            dossierId={dossierId}
            onStatusChange={onStatusChange}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default OverrideModal 