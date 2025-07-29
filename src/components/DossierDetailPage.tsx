import React, { useState, useEffect } from 'react'
import { useDossiersWithMode } from '../hooks/useDossierMode'
import DossierModeToggle from './DossierModeToggle'
import DossierPaymentForm from './DossierPaymentForm'
import { Euro, FileText, User, Calendar } from 'lucide-react'

interface DossierDetailPageProps {
  masterId: string
}

export const DossierDetailPage: React.FC<DossierDetailPageProps> = ({ masterId }) => {
  const [dossierData, setDossierData] = useState<any>(null)
  const { dossiers, refetch } = useDossiersWithMode()
  
  useEffect(() => {
    const dossier = dossiers.find(d => d.master_id === masterId)
    setDossierData(dossier || null)
  }, [dossiers, masterId])
  
  const handleModeChange = (newMode: boolean) => {
    // Rafraîchir les données après changement de mode
    refetch()
  }
  
  if (!dossierData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement du dossier...</span>
      </div>
    )
  }
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dossier {dossierData.master_name}
        </h1>
        <p className="text-gray-600">
          Client: {dossierData.customer_name}
        </p>
      </div>
      
      {/* Toggle mode du dossier */}
      <DossierModeToggle
        masterId={dossierData.master_id}
        masterName={dossierData.master_name}
        currentMode={dossierData.is_manual_mode}
        onModeChange={handleModeChange}
      />
      
      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-sm text-gray-600">Total facturé</div>
              <div className="text-xl font-bold">{formatCurrency(dossierData.total_invoiced)}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <Euro className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-sm text-gray-600">Total payé</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(dossierData.total_paid)}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-sm text-gray-600">Solde</div>
              <div className={`text-xl font-bold ${dossierData.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(dossierData.balance)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-sm text-gray-600">Factures</div>
              <div className="text-xl font-bold">{dossierData.invoice_count}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Statut du dossier */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Statut du dossier</h3>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            dossierData.dossier_status === 'paid' 
              ? 'bg-green-100 text-green-800'
              : dossierData.dossier_status === 'partial'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {dossierData.dossier_status === 'paid' && 'Payé'}
            {dossierData.dossier_status === 'partial' && 'Partiellement payé'}
            {dossierData.dossier_status === 'unpaid' && 'Non payé'}
          </span>
          
          {dossierData.is_manual_mode && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              Mode manuel
            </span>
          )}
        </div>
      </div>
      
      {/* Formulaire de paiement adaptatif */}
      <div className="bg-white p-6 rounded-lg shadow">
        <DossierPaymentForm
          masterId={dossierData.master_id}
          masterName={dossierData.master_name}
          customerId={dossierData.customer_id}
          onSuccess={() => refetch()}
        />
      </div>
      
      {/* Informations sur le mode */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          À propos du mode de gestion
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            <strong>Mode automatique :</strong> Les paiements sont automatiquement alloués aux factures 
            selon l'ordre chronologique et les montants restants.
          </p>
          <p>
            <strong>Mode manuel :</strong> Chaque paiement nécessite une allocation manuelle explicite 
            vers les factures choisies. Idéal pour les dossiers complexes ou spéciaux.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DossierDetailPage 