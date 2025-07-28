import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

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
}

const SortableTable: React.FC<SortableTableProps> = ({
  columns,
  data,
  defaultSort,
  onSortChange,
  className = ''
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(
    defaultSort || null
  )

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
    <div className={`overflow-x-auto ${className}`}>
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
          {sortedData.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
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
  )
}

export default SortableTable 