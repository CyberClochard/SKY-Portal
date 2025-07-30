import React, { useState, useEffect } from 'react'
import { Database, Settings, Home, ChevronLeft, Menu, Plane, Upload, X, CheckSquare, FileText, User, LogOut, Plus, Euro, DollarSign } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const { user, signOut } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setIsCollapsed(true)
        setMobileMenuOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsCollapsed])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && mobileMenuOpen) {
        const sidebar = document.getElementById('mobile-sidebar')
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setMobileMenuOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, mobileMenuOpen])

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'data', icon: Database, label: 'Opérations' },
    { id: 'flights', icon: Plane, label: 'Recherche Vols' },
    { id: 'cass', icon: Upload, label: 'Fichier CASS' },
    { id: 'awb-validation', icon: CheckSquare, label: 'AWB Stock' },
    { id: 'new-reservation', icon: Plus, label: 'Nouvelle Réservation' },
    { id: 'booking-confirmation', icon: FileText, label: 'Confirmation Réservation' },
    { id: 'facturation', icon: Euro, label: 'Facturation' },
    { id: 'payments', icon: Euro, label: 'Règlements' },
    { id: 'cash-settlements', icon: DollarSign, label: 'Règlements Espèces' },
    { id: 'settings', icon: Settings, label: 'Paramètres' },
  ]

  const handleMenuItemClick = (tabId: string) => {
    setActiveTab(tabId)
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleSignOut = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await signOut()
    }
  }

  const getUserInitials = (user: any) => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Mobile Menu Button (visible only on mobile)
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="fixed top-4 left-4 z-50 w-12 h-12 bg-theme-primary hover:opacity-90 text-white rounded-lg shadow-lg flex items-center justify-center md:hidden transition-all duration-200"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Mobile Sidebar */}
        <div
          id="mobile-sidebar"
          className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Mobile Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">SkyLogistics</h1>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">Dashboard Mobile</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Mobile Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Thème</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleMenuItemClick(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-theme-primary text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${
                        item.id === 'flights' && !isActive ? 'text-blue-500' : 
                        item.id === 'cass' && !isActive ? 'text-orange-500' :
                        item.id === 'awb-validation' && !isActive ? 'text-purple-500' :
                        item.id === 'new-reservation' && !isActive ? 'text-blue-500' :
                        item.id === 'new-reservation' && !isActive ? 'text-blue-500' :
                        item.id === 'booking-confirmation' && !isActive ? 'text-green-500' :
                        ''
                      }`} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Mobile User Profile */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getUserInitials(user)}</span>
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white text-sm font-medium">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">En ligne</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop Sidebar (existing code with responsive improvements)
  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out relative hidden md:flex`}>
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 z-10 shadow-sm"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <Menu className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Header */}
      <div className={`p-6 border-b border-gray-200 dark:border-gray-800 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-theme-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">SkyLogistics</h1>
                <span className="text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">Dashboard</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Theme Toggle */}
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Thème</span>
            <ThemeToggle />
          </div>
        )}
        
        {/* Collapsed Theme Toggle */}
        {isCollapsed && (
          <div className="flex justify-center mt-2">
            <ThemeToggle />
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className={`flex-1 ${isCollapsed ? 'p-2' : 'p-4'} overflow-y-auto`}>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'} rounded-lg transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-theme-primary text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${
                    item.id === 'flights' && !isActive ? 'text-blue-500' : 
                    item.id === 'cass' && !isActive ? 'text-orange-500' :
                    item.id === 'awb-validation' && !isActive ? 'text-purple-500' :
                    item.id === 'booking-confirmation' && !isActive ? 'text-green-500' :
                    item.id === 'roadmap' && !isActive ? 'text-purple-500' : ''
                  }`} />
                  {!isCollapsed && (
                    <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                      {item.label}
                      <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 dark:border-r-gray-700"></div>
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      
      {/* User Profile */}
      <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-gray-200 dark:border-gray-800`}>
        <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg ${isCollapsed ? 'p-2' : 'p-3'} transition-colors duration-300`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-medium">{getUserInitials(user)}</span>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-gray-900 dark:text-white text-sm font-medium whitespace-nowrap">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">En ligne</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={handleSignOut}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar