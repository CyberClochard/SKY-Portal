import React, { useEffect } from 'react'
import { useDossierStatusWithCash, useCashSettlements } from '../hooks/useCashSettlements'
import { DossierStatusWithCash } from '../types/payments'
import CashSettlementForm from './CashSettlementForm'

interface DossierPageProps {
  masterId: string
}

export const DossierPage: React.FC<DossierPageProps> = ({ masterId }) => {
  const { dossiers, refetch: refetchStatus } = useDossierStatusWithCash()
  const { cashSettlements, fetchCashSettlements } = useCashSettlements()
  
  const dossierData = dossiers.find(d => d.master_id === masterId)
  
  useEffect(() => {
    fetchCashSettlements(masterId)
  }, [masterId])
  
  const handleSuccess = () => {
    refetchStatus()
    fetchCashSettlements(masterId)
  }
  
  if (!dossierData) return <div>Dossier non trouvé</div>
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'cash_settled':
        return (
          <span className="px-3 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full">
            💵 Réglé en espèces
          </span>
        )
      case 'invoiced_paid':
        return (
          <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
            ✅ Facturé & payé
          </span>
        )
      case 'invoiced_partial':
        return (
          <span className="px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 rounded-full">
            ⏳ Partiellement payé
          </span>
        )
      case 'invoiced_unpaid':
        return (
          <span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
            ❌ Facturé impayé
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full">
            ⚪ Aucune activité
          </span>
        )
    }
  }
  
  return (
    <div className="space-y-6">
             <h1 className="text-2xl font-bold">Dossier {dossierData.dossier_number || dossierData.master_id}</h1>
      
      {/* Statut du dossier */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Statut financier</h3>
            <p className="text-sm text-gray-600">{dossierData.customer_name}</p>
          </div>
          <div>
            {getStatusBadge(dossierData.dossier_status)}
          </div>
        </div>
        
                 {/* Résumé financier */}
         <div className="mt-4 grid grid-cols-1 gap-4">
           {dossierData.has_cash_settlements ? (
             <div>
               <div className="text-sm text-gray-600">Espèces (hors compta)</div>
               <div className="text-lg font-bold text-orange-600">{dossierData.total_cash_settlements.toFixed(2)}€</div>
             </div>
           ) : (
             <div>
               <div className="text-sm text-gray-600">Aucun règlement espèces</div>
               <div className="text-lg font-bold text-gray-500">0.00€</div>
             </div>
           )}
         </div>
      </div>
      
      {/* Formulaire règlement espèces */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Enregistrer un règlement espèces</h3>
                 <CashSettlementForm
           masterId={masterId}
           masterName={dossierData.dossier_number || dossierData.master_id}
           customerId={dossierData.customer_id || ''}
           onSuccess={handleSuccess}
         />
      </div>
      
      {/* Historique des règlements espèces */}
      {cashSettlements.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Règlements espèces enregistrés</h3>
          <div className="space-y-2">
            {cashSettlements.map((settlement) => (
              <div key={settlement.id} className="flex justify-between items-center p-3 bg-orange-50 rounded-md">
                <div>
                  <div className="font-medium text-orange-900">{settlement.amount.toFixed(2)}€</div>
                  <div className="text-sm text-orange-700">
                    {new Date(settlement.settlement_date).toLocaleDateString()}
                    {settlement.notes && ` • ${settlement.notes}`}
                  </div>
                </div>
                <div className="text-xs text-orange-600">
                  Hors comptabilité
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DossierPage 