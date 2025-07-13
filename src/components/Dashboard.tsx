import React from 'react'
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react'

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Dossiers',
      value: '1,234',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      color: 'blue'
    },
    {
      title: 'Clients Actifs',
      value: '89',
      change: '+5%',
      trend: 'up',
      icon: Users,
      color: 'green'
    },
    {
      title: 'Expéditions',
      value: '456',
      change: '+8%',
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Revenus',
      value: '€125K',
      change: '+15%',
      trend: 'up',
      icon: BarChart3,
      color: 'orange'
    }
  ]

  const recentActivity = [
    { id: 1, action: 'Nouveau dossier créé', dossier: 'AE25/0023', time: '2 min' },
    { id: 2, action: 'Expédition livrée', dossier: 'AE25/0022', time: '15 min' },
    { id: 3, action: 'Client ajouté', dossier: 'NOUVEAU CLIENT', time: '1h' },
    { id: 4, action: 'Rapport généré', dossier: 'RAPPORT_JAN', time: '2h' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Vue d'ensemble de vos données logistiques</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Dernière mise à jour</p>
          <p className="text-gray-900 dark:text-white font-medium">{new Date().toLocaleString('fr-FR')}</p>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            blue: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
            green: 'text-green-500 bg-green-50 dark:bg-green-500/10',
            purple: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
            orange: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10'
          }
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-green-500 text-sm font-medium">{stat.change}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">vs mois dernier</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Activité Récente</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg transition-colors duration-300">
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">{activity.action}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{activity.dossier}</p>
                </div>
                <span className="text-gray-500 dark:text-gray-400 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors">
            Voir toute l'activité →
          </button>
        </div>

        {/* Graphiques et aperçu des données */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique des performances */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Performances Mensuelles</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Graphique des performances</p>
                <p className="text-gray-500 dark:text-gray-500 text-sm">Intégration des graphiques à venir</p>
              </div>
            </div>
          </div>

          {/* Aperçu des données */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Aperçu des Données</h3>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Voir tous les détails
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors duration-300">
                <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-2">Expéditions Aujourd'hui</h4>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">24</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors duration-300">
                <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-2">En Transit</h4>
                <p className="text-3xl font-bold text-yellow-500">12</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 transition-colors duration-300">
                <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-2">Livrées</h4>
                <p className="text-3xl font-bold text-green-500">156</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard