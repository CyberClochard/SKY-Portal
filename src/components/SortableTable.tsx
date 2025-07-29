import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortableColumn {
  key: string
  label: string
  sortable?: boolean
  format?: (value: any) => string | React.ReactNode
  align?: string
  width?: string
}

interface SortableTableProps {
  columns: SortableColumn[]
  data: any[]
  defaultSort?: { key: string; direction: SortDirection }
  onSortChange?: (key: string, direction: SortDirection) => void
  className?: string
  itemsPerPage?: number
}

const SortableTable: React.FC<SortableTableProps> = ({
  columns,
  data,
  defaultSort,
  onSortChange,
  className = '',
  itemsPerPage = 10
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort || null
  )
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key)
    if (!column?.sortable) return

    let direction: SortDirection = 'asc'
    
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = null
      }
    }

    const newSortConfig = direction ? { key, direction } : null
    setSortConfig(newSortConfig)
    onSortChange?.(key, direction)
  }

  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return []
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      // Gestion des valeurs null/undefined
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      // Tri des dates
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime()
      }

      // Tri des chaînes de caractères
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'fr')
        return sortConfig.direction === 'asc' ? comparison : -comparison
      }

      // Tri des nombres
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      // Tri par défaut
      const comparison = String(aValue).localeCompare(String(bValue), 'fr')
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig])

  // Calculs de pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = sortedData.slice(startIndex, endIndex)

  // Réinitialiser la page courante si elle dépasse le nombre total de pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />
    }
    
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-blue-600" />
    }
    
    if (sortConfig.direction === 'desc') {
      return <ChevronDown className="w-4 h-4 text-blue-600" />
    }
    
    return <ChevronUp className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="flex flex-col h-full">
      <div className={`overflow-x-auto flex-1 ${className}`}>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''
                  } ${column.width || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.map((row, idx) => (
              <tr key={startIndex + idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {columns.map((column, i) => (
                  <td
                    key={i}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white ${
                      column.align || ''
                    }`}
                  >
                    {column.format
                      ? column.format(row)
                      : row[column.key] === null || row[column.key] === undefined
                      ? '-'
                      : String(row[column.key] || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination fixe en bas */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Affichage de {startIndex + 1} à {Math.min(endIndex, sortedData.length)} sur {sortedData.length} résultats
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SortableTable 