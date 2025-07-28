import React, { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import DataTable from './components/DataTable'
import FlightSearch from './components/FlightSearch'
import CassFileProcessor from './components/CassFileProcessor'
import AWBValidation from './components/AWBValidation'
import ReservationForm from './components/ReservationForm'
import NewReservationPage from './components/NewReservationPage'
import BookingConfirmationTool from './components/BookingConfirmationTool'
import Settings from './components/Settings'
import UserProfile from './components/UserProfile'
import FacturationPage from './components/FacturationPage'
import PaymentsPage from './components/PaymentsPage'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
 
  // Get n8n base URL from localStorage for workflows
  const n8nBaseUrl = localStorage.getItem('n8n_base_url') || ''

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'data':
        return <DataTable />
      case 'flights':
        return <FlightSearch n8nBaseUrl={n8nBaseUrl} />
      case 'cass':
        return <CassFileProcessor n8nBaseUrl={n8nBaseUrl} />
      case 'awb-validation':
        return <AWBValidation />
      case 'new-reservation':
        return <NewReservationPage n8nBaseUrl={n8nBaseUrl} />
      case 'booking-confirmation':
        return <BookingConfirmationTool />
      case 'facturation':
        return <FacturationPage />
      case 'payments':
        return <PaymentsPage />
      case 'settings':
        return <Settings />
      case 'profile':
        return <UserProfile />
      default:
        return <Dashboard />
    }
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex transition-colors duration-300">
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={setActiveTab}
              isCollapsed={sidebarCollapsed}
              setIsCollapsed={setSidebarCollapsed}
            />
            <main className="flex-1 overflow-auto">
              {/* Mobile padding to account for floating menu button */}
              <div className="p-4 md:p-8 pt-20 md:pt-8">
                {renderContent()}
              </div>
            </main>
          </div>
        </ProtectedRoute>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
