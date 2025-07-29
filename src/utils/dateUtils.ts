/**
 * Utilitaires pour le formatage des dates
 */

// Fonction pour essayer de récupérer une date valide à partir de différentes sources
const tryParseDate = (dateInput: any): Date | null => {
  if (!dateInput) return null
  
  // Si c'est déjà un objet Date valide
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput
  }
  
  // Si c'est une chaîne
  if (typeof dateInput === 'string') {
    // Essayer différents formats
    const formats = [
      // Format ISO standard
      (str: string) => new Date(str),
      // Format français DD/MM/YYYY
      (str: string) => {
        const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (match) {
          const [, day, month, year] = match
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
        return null
      },
      // Format YYYY-MM-DD
      (str: string) => {
        const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
        if (match) {
          const [, year, month, day] = match
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }
        return null
      }
    ]
    
    for (const format of formats) {
      try {
        const date = format(dateInput)
        if (date && !isNaN(date.getTime())) {
          return date
        }
      } catch {
        continue
      }
    }
  }
  
  return null
}

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    console.warn('Date vide ou null reçue:', dateString)
    return '-'
  }
  
  try {
    // Essayer de récupérer une date valide
    const parsedDate = tryParseDate(dateString)
    
    if (parsedDate) {
      return parsedDate.toLocaleDateString('fr-FR')
    }
    
    // Si on n'a pas pu parser, essayer le constructeur Date standard
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('fr-FR')
    }
    
    console.warn('Date invalide reçue:', dateString, 'Type:', typeof dateString)
    return '-'
  } catch (error) {
    console.error('Erreur de formatage de date:', error, 'Date reçue:', dateString, 'Type:', typeof dateString)
    return '-'
  }
}

export const formatDateTime = (dateString: string | null | undefined): string => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    console.warn('Date vide ou null reçue:', dateString)
    return '-'
  }
  
  try {
    // Essayer de récupérer une date valide
    const parsedDate = tryParseDate(dateString)
    
    if (parsedDate) {
      return parsedDate.toLocaleString('fr-FR')
    }
    
    // Si on n'a pas pu parser, essayer le constructeur Date standard
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('fr-FR')
    }
    
    console.warn('Date invalide reçue:', dateString, 'Type:', typeof dateString)
    return '-'
  } catch (error) {
    console.error('Erreur de formatage de date:', error, 'Date reçue:', dateString, 'Type:', typeof dateString)
    return '-'
  }
}

export const isValidDate = (dateString: string | null | undefined): boolean => {
  if (!dateString || dateString === 'null' || dateString === 'undefined') {
    return false
  }
  
  try {
    const parsedDate = tryParseDate(dateString)
    if (parsedDate) return true
    
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  } catch {
    return false
  }
} 