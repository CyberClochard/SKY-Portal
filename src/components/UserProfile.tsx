import React, { useState } from 'react'
import { User, Mail, Calendar, Shield, LogOut, Edit, Save, X } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'
import { useAuth } from '../contexts/AuthContext'

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    role: user?.user_metadata?.role || 'user'
  })

  const handleSignOut = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut()
    }
  }

  const handleSave = () => {
    // Here you would typically update the user profile in Supabase
    // For now, we'll just close the edit mode
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData({
      fullName: user?.user_metadata?.full_name || '',
      role: user?.user_metadata?.role || 'user'
    })
    setIsEditing(false)
  }



  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur'
      case 'manager': return 'Gestionnaire'
      case 'user': return 'Utilisateur'
      default: return 'Utilisateur'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'manager': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'user': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  if (!user) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profil utilisateur</h3>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Annuler</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Avatar and Name */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editData.fullName}
                onChange={(e) => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nom complet"
              />
            ) : (
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user.user_metadata?.full_name || 'Utilisateur'}
              </h4>
            )}
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.user_metadata?.role || 'user')}`}>
                {getRoleLabel(user.user_metadata?.role || 'user')}
              </span>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-gray-900 dark:text-white">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Membre depuis</p>
              <p className="text-gray-900 dark:text-white">{formatDate(user.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
              <p className="text-gray-900 dark:text-white">
                {user.email_confirmed_at ? 'Email confirmé' : 'Email non confirmé'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">ID Utilisateur</p>
              <p className="text-gray-900 dark:text-white font-mono text-xs">
                {user.id.substring(0, 8)}...
              </p>
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfile