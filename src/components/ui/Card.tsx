import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
}

interface CardHeaderProps {
  icon: React.ReactNode
  title: string
  actions?: React.ReactNode
}

interface CardContentProps {
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
    {children}
  </div>
)

export const CardHeader: React.FC<CardHeaderProps> = ({ icon, title, actions }) => (
  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
    <div className="flex items-center space-x-3">
      <div className="text-gray-600 dark:text-gray-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    {actions && (
      <div className="flex items-center space-x-2">
        {actions}
      </div>
    )}
  </div>
)

export const CardContent: React.FC<CardContentProps> = ({ children }) => (
  <div className="p-4">
    {children}
  </div>
) 