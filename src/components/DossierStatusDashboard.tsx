import React from 'react'
import { useDossierStatusWithCash } from '../hooks/useCashSettlements'
import { DossierStatusWithCash } from '../types/payments'

interface DossierStatusDashboardProps {
  onDossierClick?: (masterId: string) => void
}

export const DossierStatusDashboard: React.FC<DossierStatusDashboardProps> = ({ onDossierClick }) => {
  const { dossiers, loading } = useDossierStatusWithCash()
  
  const getStatusBadge = (status: string, hasCash: boolean, hasInvoices: boolean) => {
    switch (status) {
      case 'cash_settled':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
            💵 Réglé espèces
          </span>
        )
      case 'no_activity':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            📝 Disponible pour règlement espèces
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            ⚪ Aucune activité
          </span>
        )
    }
  }
  
  const getFinancialSummary = (dossier: DossierStatusWithCash) => {
    if (dossier.dossier_status === 'cash_settled') {
      return `${dossier.total_cash_settlements.toFixed(2)}€ espèces`
    }
    
    if (dossier.dossier_status === 'no_activity') {
      return 'Aucun règlement espèces'
    }
    
    return 'Aucune activité'
  }
  
  if (loading) return <div>Chargement...</div>
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Statut des dossiers</h2>
      
             {/* Métriques */}
       <div className="grid grid-cols-2 gap-4">
         <div className="bg-orange-50 p-4 rounded-lg">
           <div className="text-sm text-orange-600">Réglés espèces</div>
           <div className="text-2xl font-bold text-orange-900">
             {dossiers.filter(d => d.dossier_status === 'cash_settled').length}
           </div>
         </div>
         <div className="bg-blue-50 p-4 rounded-lg">
           <div className="text-sm text-blue-600">Disponibles pour règlement</div>
           <div className="text-2xl font-bold text-blue-900">
             {dossiers.filter(d => d.dossier_status === 'no_activity').length}
           </div>
         </div>
       </div>
      
      {/* Liste des dossiers */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dossier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Résumé financier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dernière activité
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dossiers.map((dossier) => (
              <tr 
                key={dossier.master_id} 
                className={`hover:bg-gray-50 ${onDossierClick ? 'cursor-pointer' : ''}`}
                onClick={() => onDossierClick?.(dossier.master_id)}
              >
                                 <td className="px-6 py-4 whitespace-nowrap">
                   <div className="font-medium text-gray-900">
                     {dossier.dossier_number || dossier.master_id}
                   </div>
                   <div className="text-sm text-gray-500">{dossier.customer_name}</div>
                 </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(dossier.dossier_status, dossier.has_cash_settlements, dossier.has_invoices)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getFinancialSummary(dossier)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dossier.last_cash_settlement_date && (
                    <div>Espèces: {new Date(dossier.last_cash_settlement_date).toLocaleDateString()}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DossierStatusDashboard 