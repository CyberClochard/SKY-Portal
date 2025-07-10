import React, { useState } from 'react'
import LoginForm from './LoginForm'
import SignUpForm from './SignUpForm'
import ForgotPasswordForm from './ForgotPasswordForm'

type AuthMode = 'login' | 'signup' | 'forgot-password'

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login')

  const renderForm = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginForm
            onToggleMode={() => setMode('signup')}
            onForgotPassword={() => setMode('forgot-password')}
          />
        )
      case 'signup':
        return (
          <SignUpForm
            onToggleMode={() => setMode('login')}
          />
        )
      case 'forgot-password':
        return (
          <ForgotPasswordForm
            onBack={() => setMode('login')}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {renderForm()}
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2025 SkyLogistics. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}

export default AuthPage