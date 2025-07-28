import React, { useState } from 'react'
import { Search, Filter, X, Calendar, Euro, User } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface SearchAndFiltersProps {
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  filters?: {
    [key: string]: {
      label: string
      options: FilterOption[]
      value: string
      onChange: (value: string) => void
    }
  }
  onClearAll?: () => void
  showFilters?: boolean
  onToggleFilters?: () => void
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchPlaceholder = "Rechercher...",
  searchValue,
  onSearchChange,
  filters = {},
  onClearAll,
  showFilters = false,
  onToggleFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleClearAll = () => {
    onSearchChange('')
    Object.values(filters).forEach(filter => {
      filter.onChange('')
    })
    onClearAll?.()
  }

  const hasActiveFilters = searchValue || Object.values(filters).some(filter => filter.value)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Barre de recherche principale */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`px-3 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
                hasActiveFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtres</span>
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1">
                  {Object.values(filters).filter(f => f.value).length + (searchValue ? 1 : 0)}
                </span>
              )}
            </button>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section des filtres */}
      {isExpanded && Object.keys(filters).length > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(filters).map(([key, filter]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {filter.label}
                </label>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                      {option.count !== undefined && ` (${option.count})`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicateurs de filtres actifs */}
      {hasActiveFilters && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filtres actifs :</span>
            
            {searchValue && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Recherche: "{searchValue}"
                <button
                  onClick={() => onSearchChange('')}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {Object.entries(filters).map(([key, filter]) => {
              if (!filter.value) return null
              const selectedOption = filter.options.find(opt => opt.value === filter.value)
              return (
                <span key={key} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
                  {filter.label}: {selectedOption?.label || filter.value}
                  <button
                    onClick={() => filter.onChange('')}
                    className="ml-1 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchAndFilters 