import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { X, Info, Euro, FileText, Calendar, User, MapPin, Package, Truck, Building, Phone, Mail, Clock, AlertCircle, Save, Edit, Plus, Download, Upload, Plane, Ship, Trash2, Calculator, Receipt, CreditCard, Check } from 'lucide-react'
import { formatDate } from '../utils/dateUtils'
import { supabase } from '../lib/supabase'
import UnifiedOverrideControl from './UnifiedOverrideControl'
import FinanceNotesCard from './FinanceNotesCard'
import { InvoiceLinesManager } from './InvoiceLinesManager'
import CreateInvoiceModal from './CreateInvoiceModal'
import { fetchDossierData } from '../lib/supabase'


// Types pour les templates
type DossierType = 'HUM' | 'CARGO'
type CargoMode = 'AÉRIEN' | 'MARITIME' | 'ROUTIER'

interface CaseModalProps {
  isOpen: boolean
  dossier: string
  onClose: () => void
}

interface CaseData {
  [key: string]: any
}

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'file'
  required?: boolean
  visible?: boolean
  options?: string[]
  defaultValue?: any
  conditional?: {
    dependsOn: string
    showWhen: any[]
  }
}

interface DossierTemplate {
  type: DossierType
  mode?: CargoMode
  fields: {
    general: FieldConfig[]
    finances: FieldConfig[]
    documents: DocumentConfig[]
  }
}

interface DocumentConfig {
  id: string
  name: string
  fileName: string
  uploadDate: string
  size: number
  type: string
}

// Interfaces pour les composants de cards
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

interface FormGridProps {
  children: React.ReactNode
  cols: 1 | 2 | 3
}

interface FormFieldProps {
  label: string
  value: any
  onChange?: (value: any) => void
  type?: 'text' | 'number' | 'select' | 'textarea'
  readOnly?: boolean
  fullWidth?: boolean
  unit?: string
  placeholder?: string
}

interface ModeSelectorProps {
  value: CargoMode
  onChange: (mode: CargoMode) => void
  options: { value: CargoMode, label: string, icon: React.ReactNode }[]
}

interface Colis {
  id: string
  poids: number
  dimensions: string
}

interface ColisageManagerProps {
  colis: Colis[]
  onUpdate: (colis: Colis[]) => void
}

// Interfaces pour les données financières
interface LigneVente {
  id: string
  designation: string
  montantHT: number
  quantite: number
  prixUnitaire: number
  tauxTVA: number
  montantTVA: number
  montantTTC: number
}

interface VentesData {
  lignes: LigneVente[]
  tauxTVA: number
  montantTVA: number
  montantTTC: number
  statutFacturation: 'devis' | 'facture_envoyee' | 'payee'
  dateDevis?: string
  dateFacture?: string
  numeroFacture?: string
}

interface LigneAchat {
  id: string
  categorie: string
  description: string
  montant: number
  fournisseur?: string
  datePrevu?: string
  dateReel?: string
}

interface Reglement {
  id: string
  date: string
  montant: number
  mode: 'virement' | 'cheque' | 'cb' | 'especes' | 'autre'
  reference: string
  statut: 'en_attente' | 'recu' | 'encaisse'
  notes?: string
}

const CaseModal: React.FC<CaseModalProps> = ({ isOpen, dossier, onClose }) => {
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [dossierType, setDossierType] = useState<DossierType>('HUM')
  const [cargoMode, setCargoMode] = useState<CargoMode>('AÉRIEN')
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingData, setEditingData] = useState<CaseData>({})
  const [originalData, setOriginalData] = useState<CaseData>({})
  const [documents, setDocuments] = useState<DocumentConfig[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [documentName, setDocumentName] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [colis, setColis] = useState<Colis[]>([])
  const [ventesData, setVentesData] = useState<VentesData>({
    lignes: [],
    tauxTVA: 20,
    montantTVA: 0,
    montantTTC: 0,
    statutFacturation: 'devis'
  })
  const [achatsPrevisionnels, setAchatsPrevisionnels] = useState<LigneAchat[]>([])
  const [achatsReels, setAchatsReels] = useState<LigneAchat[]>([])
  const [reglements, setReglements] = useState<Reglement[]>([])
  
  // États initiaux pour la comparaison
  const [initialVentesData, setInitialVentesData] = useState<VentesData>({
    lignes: [],
    tauxTVA: 20,
    montantTVA: 0,
    montantTTC: 0,
    statutFacturation: 'devis'
  })
  const [initialAchatsPrevisionnels, setInitialAchatsPrevisionnels] = useState<LigneAchat[]>([])
  const [initialAchatsReels, setInitialAchatsReels] = useState<LigneAchat[]>([])
  const [initialReglements, setInitialReglements] = useState<Reglement[]>([])
  const [isManualMode, setIsManualMode] = useState(false)
  
  // États pour le modal de création de facture
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false)
  const [showPDFDownload, setShowPDFDownload] = useState(false)
  const [pdfBlob, setPdfBlob] = useState<Blob | undefined>(undefined)
  const [pdfFileName, setPdfFileName] = useState('')
  
  // États pour les données du dossier récupérées
  const [dossierData, setDossierData] = useState<any>(null)
  const [isLoadingDossierData, setIsLoadingDossierData] = useState(false)
  
  // États pour la sélection de clients
  const [customers, setCustomers] = useState<{ name: string }[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<{ name: string }[]>([])
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false)
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState<number>(-1)



  // Callback pour gérer la facture générée
  const handleInvoiceGenerated = (pdfBlob: Blob, fileName: string) => {
    setPdfBlob(pdfBlob)
    setPdfFileName(fileName)
    setShowPDFDownload(true)
  }

  // Configuration des onglets
  const tabs = [
    { id: 'general', label: 'Général', icon: Info },
    { id: 'finances', label: 'Finances', icon: Euro },
    { id: 'documents', label: 'Documents', icon: FileText }
  ]

  // Templates de configuration pour chaque type de dossier
  const getDossierTemplate = (type: DossierType, mode?: CargoMode): DossierTemplate => {
    if (type === 'HUM') {
      return {
        type: 'HUM',
        fields: {
          general: [
            { key: 'DATE', label: 'Date de création du dossier', type: 'text', required: true },
            { key: 'CLIENT', label: 'Client', type: 'text', required: true },
            { key: 'NOM', label: 'Nom du défunt', type: 'text', required: true },
            { key: 'LTA', label: 'N° de LTA', type: 'text' },
            { key: 'POIDS', label: 'Poids', type: 'text' },
            { key: 'COMPAGNIE', label: 'Compagnie aérienne', type: 'text' },
            { key: 'ROUTING', label: 'Routing', type: 'text' }
          ],
          finances: [
            { key: 'DEVIS', label: 'Générer un devis', type: 'text' },
            { key: 'FACTURE', label: 'Générer une facture', type: 'text' },
            { key: 'ACHATS_PREV', label: 'Achats prévisionnels', type: 'textarea' },
            { key: 'ACHATS_REELS', label: 'Achats réels', type: 'textarea' },
            { key: 'REGLEMENTS', label: 'Règlements', type: 'textarea' }
          ],
          documents: []
        }
      }
    } else {
      return {
        type: 'CARGO',
        mode,
        fields: {
          general: [
            { key: 'MODE', label: 'Mode', type: 'select', options: ['AÉRIEN', 'MARITIME', 'ROUTIER'], required: true },
            { key: 'DATE', label: 'Date de création du dossier', type: 'text', required: true },
            { key: 'CLIENT', label: 'Client', type: 'text', required: true },
            { key: 'COLISAGE', label: 'Colisage', type: 'textarea' },
            { 
              key: 'REF_TRANSPORT', 
              label: mode === 'AÉRIEN' ? 'N° de LTA' : mode === 'MARITIME' ? 'N° de BL' : 'Référence transport',
              type: 'text',
              conditional: { dependsOn: 'MODE', showWhen: ['AÉRIEN', 'MARITIME'] }
            },
            { 
              key: 'TRANSPORTEUR', 
              label: mode === 'AÉRIEN' ? 'Compagnie aérienne' : mode === 'MARITIME' ? 'Compagnie maritime' : 'Transporteur',
              type: 'text'
            },
            { key: 'ROUTING', label: 'Routing', type: 'text' }
          ],
          finances: [
            { key: 'DEVIS', label: 'Générer un devis', type: 'text' },
            { key: 'FACTURE', label: 'Générer une facture', type: 'text' },
            { key: 'ACHATS_PREV', label: 'Achats prévisionnels', type: 'textarea' },
            { key: 'ACHATS_REELS', label: 'Achats réels', type: 'textarea' },
            { key: 'REGLEMENTS', label: 'Règlements', type: 'textarea' }
          ],
          documents: []
        }
      }
    }
  }

  // Charger les données du dossier
  useEffect(() => {
    if (isOpen && dossier) {
      loadCaseData()
      loadCustomers()
    }
  }, [isOpen, dossier])

  // Gestion de la fermeture avec ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Vérifier s'il y a des modifications non sauvegardées
        const hasUnsavedChanges = hasChanges || 
          // Vérifier les modifications dans l'onglet Général
          (Object.keys(originalData).length > 0 && Object.keys(editingData).length > 0 && JSON.stringify(editingData) !== JSON.stringify(originalData)) ||
          // Vérifier les modifications dans l'onglet Finances
          JSON.stringify(ventesData) !== JSON.stringify(initialVentesData) ||
          JSON.stringify(achatsPrevisionnels) !== JSON.stringify(initialAchatsPrevisionnels) ||
          JSON.stringify(achatsReels) !== JSON.stringify(initialAchatsReels) ||
          JSON.stringify(reglements) !== JSON.stringify(initialReglements) ||
          // Vérifier les modifications dans l'onglet Documents
          documents.length > 0
        
        console.log('Détection des modifications:', {
          hasChanges,
          originalDataKeys: Object.keys(originalData).length,
          editingDataKeys: Object.keys(editingData).length,
          editingDataChanged: Object.keys(originalData).length > 0 && Object.keys(editingData).length > 0 ? JSON.stringify(editingData) !== JSON.stringify(originalData) : false,
          ventesDataChanged: JSON.stringify(ventesData) !== JSON.stringify(initialVentesData),
          achatsPrevisionnelsChanged: JSON.stringify(achatsPrevisionnels) !== JSON.stringify(initialAchatsPrevisionnels),
          achatsReelsChanged: JSON.stringify(achatsReels) !== JSON.stringify(initialAchatsReels),
          reglementsChanged: JSON.stringify(reglements) !== JSON.stringify(initialReglements),
          documents: documents.length > 0,
          hasUnsavedChanges
        })
        
        if (hasUnsavedChanges) {
          if (confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) {
            onClose()
          }
        } else {
          onClose()
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      return () => document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, hasChanges, editingData, originalData, ventesData, initialVentesData, achatsPrevisionnels, initialAchatsPrevisionnels, achatsReels, initialAchatsReels, reglements, initialReglements, documents, onClose])

  // Désactiver la molette de souris sur les champs numériques
  useEffect(() => {
    const preventWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
        e.preventDefault()
      }
    }

    document.addEventListener('wheel', preventWheel, { passive: false })
    return () => document.removeEventListener('wheel', preventWheel)
  }, [])



  const loadCaseData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('Loading case data for dossier:', dossier)
      
      const { data: caseRecord, error: caseError } = await supabase
        .from('MASTER')
        .select('*')
        .eq('DOSSIER', dossier)
        .single()

      if (caseError) {
        console.error('Error loading case data:', caseError)
        setError(`Erreur lors du chargement du dossier: ${caseError.message}`)
        return
      }

      console.log('Case data loaded:', caseRecord)
      setCaseData(caseRecord)
      setEditingData(caseRecord)
      setOriginalData(caseRecord) // Sauvegarder les données originales
      
      // Déterminer le type de dossier
      const type = caseRecord.TYPE || 'HUM'
      setDossierType(type as DossierType)
      
      // Pour CARGO, déterminer le mode
      if (type === 'CARGO') {
        const mode = caseRecord.MODE || 'AÉRIEN'
        setCargoMode(mode as CargoMode)
      }



    } catch (err) {
      console.error('Failed to load case data:', err)
      setError('Erreur de connexion à la base de données')
    } finally {
      setLoading(false)
    }
  }

  // Charger la liste des clients
  const loadCustomers = async () => {
    try {
      console.log('Loading customers...')
      
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('name')
        .order('name', { ascending: true })

      if (customersError) {
        console.error('Error loading customers:', customersError)
        return
      }

      console.log('Customers loaded:', customersData?.length || 0, 'customers')
      setCustomers(customersData || [])
      setFilteredCustomers(customersData || [])
    } catch (err) {
      console.error('Failed to load customers:', err)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // Vérifier s'il y a des modifications non sauvegardées
      const hasUnsavedChanges = hasChanges || 
        // Vérifier les modifications dans l'onglet Général
        (Object.keys(originalData).length > 0 && Object.keys(editingData).length > 0 && JSON.stringify(editingData) !== JSON.stringify(originalData)) ||
        // Vérifier les modifications dans l'onglet Finances
        JSON.stringify(ventesData) !== JSON.stringify(initialVentesData) ||
        JSON.stringify(achatsPrevisionnels) !== JSON.stringify(initialAchatsPrevisionnels) ||
        JSON.stringify(achatsReels) !== JSON.stringify(initialAchatsReels) ||
        JSON.stringify(reglements) !== JSON.stringify(initialReglements) ||
        // Vérifier les modifications dans l'onglet Documents
        documents.length > 0
      
      if (hasUnsavedChanges) {
        if (confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) {
          onClose()
        }
      } else {
        onClose()
      }
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSaveChanges = async () => {
    try {
      const { error } = await supabase
        .from('MASTER')
        .update(editingData)
        .eq('DOSSIER', dossier)

      if (error) {
        setError(`Erreur lors de la sauvegarde: ${error.message}`)
        return
      }

      setCaseData(editingData)
      setOriginalData(editingData) // Mettre à jour les données originales après sauvegarde
      // Réinitialiser les états initiaux des finances
      setInitialVentesData(ventesData)
      setInitialAchatsPrevisionnels(achatsPrevisionnels)
      setInitialAchatsReels(achatsReels)
      setInitialReglements(reglements)
      setHasChanges(false)
      setIsEditing(false)
    } catch (err) {
      setError('Erreur lors de la sauvegarde')
    }
  }

  // Fonctions de gestion des documents
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setUploadingFile(files[0])
      setShowUploadModal(true)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setUploadingFile(files[0])
      setShowUploadModal(true)
    }
  }

  const handleUploadDocument = () => {
    if (!uploadingFile || !documentName.trim()) return

    const newDocument: DocumentConfig = {
      id: Date.now().toString(),
      name: documentName.trim(),
      fileName: uploadingFile.name,
      uploadDate: new Date().toISOString(),
      size: uploadingFile.size,
      type: uploadingFile.type
    }

    setDocuments(prev => [...prev, newDocument])
    setUploadingFile(null)
    setDocumentName('')
    setShowUploadModal(false)
  }

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Fonctions utilitaires pour les cards
  const getTransportIcon = (mode: CargoMode) => {
    switch (mode) {
      case 'AÉRIEN': return <Plane className="w-5 h-5" />
      case 'MARITIME': return <Ship className="w-5 h-5" />
      case 'ROUTIER': return <Truck className="w-5 h-5" />
    }
  }

  const getTransporteurLabel = (mode: CargoMode) => {
    switch (mode) {
      case 'AÉRIEN': return 'Compagnie aérienne'
      case 'MARITIME': return 'Compagnie maritime'
      case 'ROUTIER': return 'Transporteur'
    }
  }

  const calculateTotals = (colis: Colis[]) => {
    const totalColis = colis.length
    const totalPoids = colis.reduce((sum, c) => sum + c.poids, 0)
    return { totalColis, totalPoids }
  }

  // Fonctions utilitaires pour les finances
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const calculateTVA = (montantHT: number, tauxTVA: number): number => {
    return montantHT * (tauxTVA / 100)
  }

  const calculateTTC = (montantHT: number, montantTVA: number): number => {
    return montantHT + montantTVA
  }

  const updateVentesData = useCallback((newData: Partial<VentesData>) => {
    setVentesData(prev => {
      const updated = { ...prev, ...newData }
      // Recalculer les totaux basés sur les lignes
      const totalHT = updated.lignes.reduce((sum, ligne) => sum + ligne.montantHT, 0)
      updated.montantTVA = calculateTVA(totalHT, updated.tauxTVA)
      updated.montantTTC = calculateTTC(totalHT, updated.montantTVA)
      return updated
    })
    setHasChanges(true)
  }, [])

  const addLigneVente = useCallback(() => {
    const newLigne: LigneVente = {
      id: Date.now().toString(),
      designation: '',
      montantHT: 0,
      quantite: 1,
      prixUnitaire: 0,
      tauxTVA: 20,
      montantTVA: 0,
      montantTTC: 0
    }
    setVentesData(prev => {
      const updated = { ...prev, lignes: [...prev.lignes, newLigne] }
      // Recalculer les totaux globaux
      const totalHT = updated.lignes.reduce((sum, ligne) => sum + ligne.montantHT, 0)
      const totalTVA = updated.lignes.reduce((sum, ligne) => sum + ligne.montantTVA, 0)
      const totalTTC = updated.lignes.reduce((sum, ligne) => sum + ligne.montantTTC, 0)
      updated.montantTVA = totalTVA
      updated.montantTTC = totalTTC
      return updated
    })
    setHasChanges(true)
  }, [])

  const updateLigneVente = useCallback((id: string, field: keyof LigneVente, value: any) => {
    setVentesData(prev => {
      const updatedLignes = prev.lignes.map(ligne => {
        if (ligne.id === id) {
          const updated = { ...ligne, [field]: value }
          // Recalculer le montant HT si quantité ou prix unitaire change
          if (field === 'quantite' || field === 'prixUnitaire') {
            updated.montantHT = updated.quantite * updated.prixUnitaire
          }
          // Recalculer la TVA et TTC de la ligne si HT ou taux TVA change
          if (field === 'quantite' || field === 'prixUnitaire' || field === 'tauxTVA') {
            updated.montantTVA = calculateTVA(updated.montantHT, updated.tauxTVA)
            updated.montantTTC = calculateTTC(updated.montantHT, updated.montantTVA)
          }
          return updated
        }
        return ligne
      })
      
      // Recalculer les totaux globaux
      const totalHT = updatedLignes.reduce((sum, ligne) => sum + ligne.montantHT, 0)
      const totalTVA = updatedLignes.reduce((sum, ligne) => sum + ligne.montantTVA, 0)
      const totalTTC = updatedLignes.reduce((sum, ligne) => sum + ligne.montantTTC, 0)
      
      return {
        ...prev,
        lignes: updatedLignes,
        montantTVA: totalTVA,
        montantTTC: totalTTC
      }
    })
    setHasChanges(true)
  }, [])

  const deleteLigneVente = useCallback((id: string) => {
    setVentesData(prev => {
      const updatedLignes = prev.lignes.filter(ligne => ligne.id !== id)
      // Recalculer les totaux globaux
      const totalHT = updatedLignes.reduce((sum, ligne) => sum + ligne.montantHT, 0)
      const totalTVA = updatedLignes.reduce((sum, ligne) => sum + ligne.montantTVA, 0)
      const totalTTC = updatedLignes.reduce((sum, ligne) => sum + ligne.montantTTC, 0)
      return {
        ...prev,
        lignes: updatedLignes,
        montantTVA: totalTVA,
        montantTTC: totalTTC
      }
    })
    setHasChanges(true)
  }, [])

  // Fonctions de gestion des achats
  const ajouterLignePrevisionnelle = useCallback(() => {
    const newLigne: LigneAchat = {
      id: Date.now().toString(),
      categorie: 'transport',
      description: '',
      montant: 0
    }
    setAchatsPrevisionnels(prev => [...prev, newLigne])
    setHasChanges(true)
  }, [])

  const updateLignePrev = useCallback((ligne: LigneAchat) => {
    setAchatsPrevisionnels(prev => prev.map(l => l.id === ligne.id ? ligne : l))
    setHasChanges(true)
  }, [])

  const deleteLignePrev = useCallback((id: string) => {
    setAchatsPrevisionnels(prev => prev.filter(l => l.id !== id))
    setHasChanges(true)
  }, [])

  const ajouterLigneReelle = useCallback(() => {
    const newLigne: LigneAchat = {
      id: Date.now().toString(),
      categorie: 'transport',
      description: '',
      montant: 0
    }
    setAchatsReels(prev => [...prev, newLigne])
    setHasChanges(true)
  }, [])

  const updateLigneReel = useCallback((ligne: LigneAchat) => {
    setAchatsReels(prev => prev.map(l => l.id === ligne.id ? ligne : l))
    setHasChanges(true)
  }, [])

  const deleteLigneReel = useCallback((id: string) => {
    setAchatsReels(prev => prev.filter(l => l.id !== id))
    setHasChanges(true)
  }, [])

  // Fonctions de gestion des règlements
  const ajouterReglement = useCallback(() => {
    const newReglement: Reglement = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      montant: 0,
      mode: 'virement',
      reference: '',
      statut: 'en_attente'
    }
    setReglements(prev => [...prev, newReglement])
    setHasChanges(true)
  }, [])

  const updateReglement = useCallback((reglement: Reglement) => {
    setReglements(prev => prev.map(r => r.id === reglement.id ? reglement : r))
    setHasChanges(true)
  }, [])

  const deleteReglement = useCallback((id: string) => {
    setReglements(prev => prev.filter(r => r.id !== id))
    setHasChanges(true)
  }, [])

  // Composants de base pour les cards
  const Card: React.FC<CardProps> = ({ children, className = "" }) => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mb-4 ${className}`}>
      {children}
    </div>
  )

  const CardHeader: React.FC<CardHeaderProps> = ({ icon, title, actions }) => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        <div className="text-blue-600 dark:text-blue-400">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )

  const CardContent: React.FC<CardContentProps> = ({ children }) => (
    <div className="p-4">
      {children}
    </div>
  )

  const FormGrid: React.FC<FormGridProps> = ({ children, cols }) => (
    <div className={`grid gap-4 ${
      cols === 2 ? 'grid-cols-1 md:grid-cols-2' :
      cols === 3 ? 'grid-cols-1 md:grid-cols-3' :
      'grid-cols-1'
    }`}>
      {children}
    </div>
  )

  const FormField: React.FC<FormFieldProps> = ({
    label, value, onChange, type = 'text', readOnly = false, 
    fullWidth = false, unit, placeholder
  }) => {
    // Gestion spéciale pour le champ CLIENT
    if (label === 'Client' && !readOnly) {
      return (
        <div className={fullWidth ? 'col-span-full' : ''}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
          <div className="relative">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => {
                const inputValue = e.target.value
                onChange?.(inputValue)
                // Filtrer les suggestions
                if (inputValue) {
                  setFilteredCustomers(customers.filter(c => 
                    c.name.toLowerCase().includes(inputValue.toLowerCase())
                  ))
                } else {
                  setFilteredCustomers(customers)
                }
                setSelectedCustomerIndex(-1)
              }}
              onFocus={() => {
                setShowCustomerSuggestions(true)
                // Si il y a déjà une valeur, appliquer le filtre
                if (value) {
                  setFilteredCustomers(customers.filter(c => 
                    c.name.toLowerCase().includes(value.toLowerCase())
                  ))
                } else {
                  setFilteredCustomers(customers)
                }
                setSelectedCustomerIndex(-1)
              }}
              onBlur={() => {
                setTimeout(() => setShowCustomerSuggestions(false), 200)
              }}
              onKeyDown={(e) => {
                if (!showCustomerSuggestions || filteredCustomers.length === 0) return
                
                switch (e.key) {
                  case 'ArrowDown':
                    e.preventDefault()
                    setSelectedCustomerIndex(prev => 
                      prev < filteredCustomers.length - 1 ? prev + 1 : 0
                    )
                    break
                  case 'ArrowUp':
                    e.preventDefault()
                    setSelectedCustomerIndex(prev => 
                      prev > 0 ? prev - 1 : filteredCustomers.length - 1
                    )
                    break
                  case 'Enter':
                    e.preventDefault()
                    if (selectedCustomerIndex >= 0 && selectedCustomerIndex < filteredCustomers.length) {
                      const selectedCustomer = filteredCustomers[selectedCustomerIndex]
                      onChange?.(selectedCustomer.name)
                      setShowCustomerSuggestions(false)
                      setSelectedCustomerIndex(-1)
                    }
                    break
                  case 'Escape':
                    e.preventDefault()
                    setShowCustomerSuggestions(false)
                    setSelectedCustomerIndex(-1)
                    break
                }
              }}
              placeholder="Tapez pour rechercher un client..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            />
            
            {/* Suggestions de clients */}
            {showCustomerSuggestions && filteredCustomers.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((customer, index) => (
                  <button
                    key={customer.name}
                    type="button"
                    onClick={() => {
                      onChange?.(customer.name)
                      setShowCustomerSuggestions(false)
                      setSelectedCustomerIndex(-1)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                      index === selectedCustomerIndex
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            )}
            
            {/* Message si aucun client trouvé */}
            {showCustomerSuggestions && value && filteredCustomers.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aucun client trouvé avec "{value}"
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // Rendu normal pour les autres champs
    return (
      <div className={fullWidth ? 'col-span-full' : ''}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <div className="relative">
          <input
            type={type}
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            readOnly={readOnly}
            placeholder={placeholder}
            className={`
              w-full px-3 py-2 border border-gray-300 dark:border-gray-600 
              rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              ${readOnly ? 'bg-gray-50 dark:bg-gray-700 text-gray-500' : 'bg-white dark:bg-gray-800'}
              dark:text-white
            `}
          />
          {unit && (
            <span className="absolute right-3 top-2 text-sm text-gray-500">
              {unit}
            </span>
          )}
        </div>
      </div>
    )
  }

  const ModeSelector: React.FC<ModeSelectorProps> = ({ value, onChange, options }) => (
    <div className="flex space-x-2">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors
            ${value === option.value 
              ? 'bg-blue-600 text-white border-blue-600' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )

  const ColisageManager: React.FC<ColisageManagerProps> = ({ colis, onUpdate }) => {
    const addColis = () => {
      const newColis: Colis = {
        id: Date.now().toString(),
        poids: 0,
        dimensions: ''
      }
      onUpdate([...colis, newColis])
    }

    const updateColis = (id: string, field: keyof Colis, value: any) => {
      const updated = colis.map(c => 
        c.id === id ? { ...c, [field]: value } : c
      )
      onUpdate(updated)
    }

    const removeColis = (id: string) => {
      onUpdate(colis.filter(c => c.id !== id))
    }

    return (
      <div className="space-y-3">
        {colis.map((c, index) => (
          <div key={c.id} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">Colis {index + 1}</span>
              {colis.length > 1 && (
                <button 
                  onClick={() => removeColis(c.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField 
                label="Poids (kg)" 
                type="number"
                value={c.poids}
                onChange={(v) => updateColis(c.id, 'poids', Number(v))}
              />
              <FormField 
                label="Dimensions (LxlxH cm)" 
                value={c.dimensions}
                placeholder="120x80x60"
                onChange={(v) => updateColis(c.id, 'dimensions', v)}
              />
            </div>
          </div>
        ))}
        
        <button 
          onClick={addColis}
          className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Ajouter un colis
        </button>
      </div>
    )
  }

  // Composants pour les finances
  const StatutBadge: React.FC<{ statut: VentesData['statutFacturation'] }> = ({ statut }) => {
    const styles: Record<VentesData['statutFacturation'], string> = {
      devis: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      facture_envoyee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      payee: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    }
    
    const labels: Record<VentesData['statutFacturation'], string> = {
      devis: 'Devis',
      facture_envoyee: 'Facture envoyée',
      payee: 'Payée'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
        {labels[statut]}
      </span>
    )
  }

  const ModePaiementBadge: React.FC<{ mode: Reglement['mode'] }> = ({ mode }) => {
    const icons: Record<Reglement['mode'], string> = {
      virement: '🏦',
      cheque: '💳',
      cb: '💴',
      especes: '💵',
      autre: '💰'
    }
    
    return (
      <span className="flex items-center space-x-1 text-sm">
        <span>{icons[mode]}</span>
        <span className="capitalize">{mode}</span>
      </span>
    )
  }

  const StatutReglementBadge: React.FC<{ statut: Reglement['statut'] }> = ({ statut }) => {
    const styles: Record<Reglement['statut'], string> = {
      en_attente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      recu: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      encaisse: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    }
    
    const labels: Record<Reglement['statut'], string> = {
      en_attente: 'En attente',
      recu: 'Reçu',
      encaisse: 'Encaissé'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[statut]}`}>
        {labels[statut]}
      </span>
    )
  }

  const EcartBudgetaire: React.FC<{ previsionnel: number, reel: number }> = ({ previsionnel, reel }) => {
    const ecart = reel - previsionnel
    const pourcentage = previsionnel > 0 ? (ecart / previsionnel) * 100 : 0
    
    return (
      <div className={`text-sm flex items-center justify-between ${
        ecart > 0 ? 'text-red-600 dark:text-red-400' : ecart < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
      }`}>
        <span>Écart budgétaire:</span>
        <span className="font-medium">
          {ecart > 0 ? '+' : ''}{formatCurrency(ecart)} ({pourcentage.toFixed(1)}%)
        </span>
      </div>
    )
  }

  const LigneAchatPrevisionnel = React.memo<{
    ligne: LigneAchat
    onUpdate: (ligne: LigneAchat) => void
    onDelete: (id: string) => void
  }>(({ ligne, onUpdate, onDelete }) => {
    const [localValue, setLocalValue] = useState(ligne)
    const [isEditing, setIsEditing] = useState(false)

    const handleChange = (field: keyof LigneAchat, value: any) => {
      setLocalValue(prev => ({ ...prev, [field]: value }))
      setIsEditing(true)
    }

    const handleValidate = () => {
      onUpdate(localValue)
      setIsEditing(false)
    }

    const handleDelete = () => {
      onDelete(ligne.id)
    }

    // Synchroniser avec les props si elles changent
    useEffect(() => {
      setLocalValue(ligne)
      setIsEditing(false)
    }, [ligne.id])

    return (
      <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <select 
            value={localValue.categorie}
            onChange={(e) => handleChange('categorie', e.target.value)}
            className="text-sm font-medium bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
          >
            <option value="transport">Transport</option>
            <option value="manutention">Manutention</option>
            <option value="taxes">Taxes</option>
            <option value="douane">Douane</option>
            <option value="assurance">Assurance</option>
            <option value="autre">Autre</option>
          </select>
          <div className="flex space-x-2">
            {isEditing && (
              <button 
                onClick={handleValidate}
                className="text-green-600 hover:text-green-800"
                title="Valider les modifications"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Description"
            value={localValue.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={localValue.montant}
              onChange={(e) => handleChange('montant', Number(e.target.value))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full pr-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <span className="absolute right-2 top-1 text-xs text-gray-500">€</span>
          </div>
        </div>
      </div>
    )
  })

  const LigneAchatReel = React.memo<{
    ligne: LigneAchat
    onUpdate: (ligne: LigneAchat) => void
    onDelete: (id: string) => void
  }>(({ ligne, onUpdate, onDelete }) => {
    const [localValue, setLocalValue] = useState(ligne)
    const [isEditing, setIsEditing] = useState(false)

    const handleChange = (field: keyof LigneAchat, value: any) => {
      setLocalValue(prev => ({ ...prev, [field]: value }))
      setIsEditing(true)
    }

    const handleValidate = () => {
      onUpdate(localValue)
      setIsEditing(false)
    }

    const handleDelete = () => {
      onDelete(ligne.id)
    }

    // Synchroniser avec les props si elles changent
    useEffect(() => {
      setLocalValue(ligne)
      setIsEditing(false)
    }, [ligne.id])

    return (
      <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <select 
            value={localValue.categorie}
            onChange={(e) => handleChange('categorie', e.target.value)}
            className="text-sm font-medium bg-transparent border-none focus:ring-0 text-gray-900 dark:text-white"
          >
            <option value="transport">Transport</option>
            <option value="manutention">Manutention</option>
            <option value="taxes">Taxes</option>
            <option value="douane">Douane</option>
            <option value="assurance">Assurance</option>
            <option value="autre">Autre</option>
          </select>
          <div className="flex space-x-2">
            {isEditing && (
              <button 
                onClick={handleValidate}
                className="text-green-600 hover:text-green-800"
                title="Valider les modifications"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            placeholder="Description"
            value={localValue.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={localValue.montant}
              onChange={(e) => handleChange('montant', Number(e.target.value))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full pr-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <span className="absolute right-2 top-1 text-xs text-gray-500">€</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Fournisseur"
            value={localValue.fournisseur || ''}
            onChange={(e) => handleChange('fournisseur', e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <input
            type="date"
            value={localValue.dateReel || ''}
            onChange={(e) => handleChange('dateReel', e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>
    )
  })

  const LigneVenteComponent = React.memo<{
    ligne: LigneVente
    index: number
    onUpdate: (id: string, field: keyof LigneVente, value: any) => void
    onDelete: (id: string) => void
    formatCurrency: (amount: number) => string
  }>(({ ligne, index, onUpdate, onDelete, formatCurrency }) => {
    const [localValue, setLocalValue] = useState(ligne)
    const [isEditing, setIsEditing] = useState(false)

    const handleChange = (field: keyof LigneVente, value: any) => {
      setLocalValue(prev => ({ ...prev, [field]: value }))
      setIsEditing(true)
    }

    const handleValidate = () => {
      // Mettre à jour tous les champs modifiés
      Object.keys(localValue).forEach(key => {
        const fieldKey = key as keyof LigneVente
        if (localValue[fieldKey] !== ligne[fieldKey]) {
          onUpdate(ligne.id, fieldKey, localValue[fieldKey])
        }
      })
      setIsEditing(false)
    }

    const handleDelete = () => {
      onDelete(ligne.id)
    }

    // Synchroniser avec les props si elles changent
    useEffect(() => {
      setLocalValue(ligne)
      setIsEditing(false)
    }, [ligne.id])

    return (
      <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm">Ligne {index + 1}</span>
          <div className="flex space-x-2">
            {isEditing && (
              <button 
                onClick={handleValidate}
                className="text-green-600 hover:text-green-800"
                title="Valider les modifications"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-800"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Désignation
            </label>
            <input
              type="text"
              value={localValue.designation}
              onChange={(e) => handleChange('designation', e.target.value)}
              placeholder="Description du produit/service"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantité
            </label>
            <input
              type="number"
              value={localValue.quantite}
              onChange={(e) => handleChange('quantite', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prix unitaire
            </label>
            <div className="relative">
              <input
                type="number"
                value={localValue.prixUnitaire}
                onChange={(e) => handleChange('prixUnitaire', Number(e.target.value))}
                className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">€</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total HT
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white font-medium">
              {formatCurrency(localValue.montantHT)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Taux TVA
            </label>
            <select
              value={localValue.tauxTVA}
              onChange={(e) => handleChange('tauxTVA', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>0%</option>
              <option value={5.5}>5.5%</option>
              <option value={20}>20%</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total TTC
            </label>
            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-900 dark:text-blue-300 font-medium">
              {formatCurrency(localValue.montantTTC)}
            </div>
          </div>
        </div>
      </div>
    )
  })

  const formatValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-'
    
    if ((key === 'DATE' || key === 'DATE2') && typeof value === 'string') {
      return value
    }
    
    if (key.toLowerCase().includes('payable') || key.toLowerCase().includes('amount')) {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(value)
      }
      if (typeof value === 'string' && value.includes('€')) {
        return value
      }
    }
    
    return value.toString()
  }

  const renderField = (field: FieldConfig) => {
    const value = editingData[field.key] || ''
    const isVisible = field.conditional 
      ? field.conditional.showWhen.includes(editingData[field.conditional.dependsOn])
      : true

    if (!isVisible) return null

    if (isEditing) {
      switch (field.type) {
        case 'select':
          return (
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          )
        case 'textarea':
          return (
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )
        default:
          return (
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )
      }
    } else {
      return (
        <div className="text-gray-900 dark:text-white">
          {formatValue(value, field.key)}
        </div>
      )
    }
  }

  const renderGeneralTab = () => {
    if (!caseData) return null

    return (
      <div className="space-y-4">
        {/* Card 1: Informations Dossier (toujours affichée) */}
        <Card>
          <CardHeader icon={<Calendar className="w-5 h-5" />} title="Informations Dossier" />
          <CardContent>
            <FormGrid cols={2}>
              <FormField 
                label="Date de création" 
                value={editingData.DATE || caseData.DATE} 
                readOnly 
              />
              <FormField 
                label="Client" 
                value={editingData.CLIENT || caseData.CLIENT} 
                onChange={(value) => handleFieldChange('CLIENT', value)}
              />
              <FormField 
                label="N° Dossier" 
                value={editingData.DOSSIER || caseData.DOSSIER} 
                readOnly 
              />
            </FormGrid>
          </CardContent>
        </Card>

        {/* Card 2: Conditionnelle selon le type */}
        {dossierType === 'HUM' && (
          <Card>
            <CardHeader icon={<User className="w-5 h-5" />} title="Défunt" />
            <CardContent>
              <FormField 
                label="Nom du défunt" 
                value={editingData.NOM || caseData.NOM || ''} 
                onChange={(value) => handleFieldChange('NOM', value)}
              />
            </CardContent>
          </Card>
        )}

        {dossierType === 'CARGO' && (
          <Card>
            <CardHeader icon={<Truck className="w-5 h-5" />} title="Mode de Transport" />
            <CardContent>
              <ModeSelector 
                value={cargoMode}
                onChange={setCargoMode}
                options={[
                  { value: 'AÉRIEN', label: 'Aérien', icon: <Plane className="w-4 h-4" /> },
                  { value: 'MARITIME', label: 'Maritime', icon: <Ship className="w-4 h-4" /> },
                  { value: 'ROUTIER', label: 'Routier', icon: <Truck className="w-4 h-4" /> }
                ]}
              />
            </CardContent>
          </Card>
        )}

        {/* Card 3: Transport (contenu conditionnel) */}
        <Card>
          <CardHeader icon={getTransportIcon(cargoMode)} title="Transport" />
          <CardContent>
            <FormGrid cols={2}>
              {dossierType === 'HUM' ? (
                <>
                  <FormField 
                    label="N° LTA" 
                    value={caseData.LTA || ''} 
                    onChange={(value) => handleFieldChange('LTA', value)}
                  />
                  <FormField 
                    label="Compagnie aérienne" 
                    value={caseData.COMPAGNIE || ''} 
                    onChange={(value) => handleFieldChange('COMPAGNIE', value)}
                  />
                </>
              ) : (
                <>
                  {cargoMode !== 'ROUTIER' && (
                    <FormField 
                      label={cargoMode === 'AÉRIEN' ? 'N° LTA' : 'N° BL'} 
                      value={caseData.REF_TRANSPORT || ''} 
                      onChange={(value) => handleFieldChange('REF_TRANSPORT', value)}
                    />
                  )}
                  <FormField 
                    label={getTransporteurLabel(cargoMode)} 
                    value={caseData.TRANSPORTEUR || ''} 
                    onChange={(value) => handleFieldChange('TRANSPORTEUR', value)}
                  />
                </>
              )}
            </FormGrid>
            <FormField 
              label="Routing" 
              value={caseData.ROUTING || ''} 
              onChange={(value) => handleFieldChange('ROUTING', value)}
              fullWidth 
            />
          </CardContent>
        </Card>

        {/* Card 4: Colis/Colisage (contenu conditionnel) */}
        {dossierType === 'HUM' && (
          <Card>
            <CardHeader icon={<Package className="w-5 h-5" />} title="Colis" />
            <CardContent>
              <FormField 
                label="Poids" 
                value={caseData.POIDS || ''} 
                type="number"
                unit="kg"
                onChange={(value) => handleFieldChange('POIDS', value)}
              />
              <div className="text-sm text-gray-500 mt-2">
                1 colis - 200x60x40cm (dimensions standard)
              </div>
            </CardContent>
          </Card>
        )}

        {dossierType === 'CARGO' && (
          <Card>
            <CardHeader icon={<Package className="w-5 h-5" />} title="Colisage" />
            <CardContent>
              <ColisageManager 
                colis={colis}
                onUpdate={setColis}
              />
              {colis.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Total: {calculateTotals(colis).totalColis} colis - {calculateTotals(colis).totalPoids}kg
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderFinancesTab = () => {
    // Calculs automatiques
    const totalPrevisionnel = achatsPrevisionnels.reduce((sum, ligne) => sum + ligne.montant, 0)
    const totalReel = achatsReels.reduce((sum, ligne) => sum + ligne.montant, 0)
    const totalReglements = reglements.reduce((sum, reg) => sum + reg.montant, 0)
    const soldeRestant = ventesData.montantTTC - totalReglements

    return (
      <div className="space-y-4">
        {/* Contrôle unifié des overrides */}
        <UnifiedOverrideControl 
          dossierId={dossier}
          onInitialStatus={(factureStatus, reglementStatus, isManual) => {
            console.log('Statut initial reçu:', { factureStatus, reglementStatus, isManual })
            setIsManualMode(isManual)
          }}
          onStatusChange={(newFactureStatus, newReglementStatus, isManual) => {
            console.log('Statuts modifiés:', { newFactureStatus, newReglementStatus, isManual })
            setIsManualMode(isManual)
            // Ici on pourrait déclencher un refresh des données si nécessaire
          }}
        />
        
        {/* Card 1: Ventes (pleine largeur) */}
        <Card>
          <CardHeader 
            icon={<Euro className="w-5 h-5" />} 
            title="Ventes - Lignes de facturation"
            actions={
              <button
                onClick={async () => {
                  setIsLoadingDossierData(true)
                  try {
                    console.log('🔄 Récupération des données du dossier avant ouverture du modal...')
                    const result = await fetchDossierData(dossier)
                    
                    if (result.success && result.data) {
                      console.log('✅ Données du dossier récupérées:', result.data)
                      setDossierData(result.data)
                      setIsCreateInvoiceModalOpen(true)
                    } else {
                      console.error('❌ Erreur lors de la récupération des données:', result.message)
                      alert(`Erreur lors de la récupération des données du dossier: ${result.message}`)
                    }
                  } catch (error) {
                    console.error('❌ Erreur inattendue:', error)
                    alert('Erreur inattendue lors de la récupération des données du dossier')
                  } finally {
                    setIsLoadingDossierData(false)
                  }
                }}
                disabled={isLoadingDossierData}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                  isLoadingDossierData 
                    ? 'bg-green-400 cursor-not-allowed' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
                title="Créer une facture pour ce dossier"
              >
                {isLoadingDossierData ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 mr-1 border-b-2 border-white"></div>
                    Chargement...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-1" />
                    Créer Facture
                  </>
                )}
              </button>
            }
          />
          <CardContent>
            <InvoiceLinesManager 
              masterId={dossier}
              onUpdate={() => {
                // Rafraîchir les données si nécessaire
                console.log('Lignes de facturation mises à jour')
              }}
            />
          </CardContent>
        </Card>

        {/* Cards 2 & 3: Achats (layout horizontal) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card Achats Prévisionnels */}
          <Card>
            <CardHeader 
              icon={<Calculator className="w-5 h-5" />} 
              title="Achats Prévisionnels"
              actions={
                <button onClick={ajouterLignePrevisionnelle} className="text-blue-600 hover:text-blue-800">
                  <Plus className="w-4 h-4" />
                </button>
              }
            />
            <CardContent>
              <div className="space-y-3">
                {achatsPrevisionnels.map((ligne) => (
                  <LigneAchatPrevisionnel 
                    key={ligne.id} 
                    ligne={ligne} 
                    onUpdate={updateLignePrev}
                    onDelete={deleteLignePrev}
                  />
                ))}
                
                {achatsPrevisionnels.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun achat prévisionnel
                    <button 
                      onClick={ajouterLignePrevisionnelle}
                      className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter le premier
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Prévisionnel:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalPrevisionnel)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Achats Réels */}
          <Card>
            <CardHeader 
              icon={<Receipt className="w-5 h-5" />} 
              title="Achats Réels"
              actions={
                <div className="flex space-x-2">
                  <button onClick={ajouterLigneReelle} className="text-blue-600 hover:text-blue-800">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              }
            />
            <CardContent>
              <div className="space-y-3">
                {achatsReels.map((ligne) => (
                  <LigneAchatReel 
                    key={ligne.id} 
                    ligne={ligne} 
                    onUpdate={updateLigneReel}
                    onDelete={deleteLigneReel}
                  />
                ))}
                
                {achatsReels.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Aucun achat réel
                    <button 
                      onClick={ajouterLigneReelle}
                      className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
                    >
                      + Ajouter le premier
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Total Réel:</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalReel)}
                  </span>
                </div>
                
                {/* Comparaison avec prévisionnel */}
                <EcartBudgetaire previsionnel={totalPrevisionnel} reel={totalReel} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card 4: Règlements ou Notes selon le mode */}
        {isManualMode ? (
          // Mode manuel : Affichage de la carte Notes
          <FinanceNotesCard masterId={caseData?.id || ''} dossierNumber={dossier} />
        ) : (
          // Mode automatique : Affichage de la carte Règlements
          <Card>
            <CardHeader 
              icon={<CreditCard className="w-5 h-5" />} 
              title="Règlements"
              actions={
                <button onClick={ajouterReglement} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                  + Nouveau règlement
                </button>
              }
            />
            <CardContent>

              {/* Tableau des règlements */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Montant</th>
                      <th className="text-left py-2">Mode</th>
                      <th className="text-left py-2">Référence</th>
                      <th className="text-left py-2">Statut</th>
                      <th className="text-left py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reglements.map((reglement) => (
                    <tr key={reglement.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2">
                        <input
                          type="date"
                          value={reglement.date}
                          onChange={(e) => updateReglement({...reglement, date: e.target.value})}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2">
                        <div className="relative">
                          <input
                            type="number"
                            value={reglement.montant}
                            onChange={(e) => updateReglement({...reglement, montant: Number(e.target.value)})}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-20 pr-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <span className="absolute right-2 top-1 text-xs text-gray-500">€</span>
                        </div>
                      </td>
                      <td className="py-2">
                        <select
                          value={reglement.mode}
                          onChange={(e) => updateReglement({...reglement, mode: e.target.value as Reglement['mode']})}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="virement">Virement</option>
                          <option value="cheque">Chèque</option>
                          <option value="cb">Carte bancaire</option>
                          <option value="especes">Espèces</option>
                          <option value="autre">Autre</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <input
                          type="text"
                          value={reglement.reference}
                          onChange={(e) => updateReglement({...reglement, reference: e.target.value})}
                          placeholder="Référence"
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="py-2">
                        <select
                          value={reglement.statut}
                          onChange={(e) => updateReglement({...reglement, statut: e.target.value as Reglement['statut']})}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="en_attente">En attente</option>
                          <option value="recu">Reçu</option>
                          <option value="encaisse">Encaissé</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <div className="flex space-x-1">
                          <button onClick={() => deleteReglement(reglement.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reglements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Aucun règlement enregistré
              </div>
            )}

            {/* Résumé financier */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalReglements)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total reçu</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(ventesData.montantTTC)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Montant facture</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${
                    soldeRestant > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {formatCurrency(soldeRestant)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Solde restant</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    )
  }

  const renderDocumentsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestion documentaire</h3>
          <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Sélectionner un fichier</span>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="*/*"
            />
          </label>
        </div>

        {/* Zone de drag & drop */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Glissez-déposez vos documents ici
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Ou cliquez sur le bouton ci-dessus pour sélectionner un fichier
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Formats acceptés : Tous les types de fichiers
          </p>
        </div>

        {/* Liste des documents */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Documents uploadés ({documents.length})
            </h4>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">{doc.name}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {doc.fileName} • {formatFileSize(doc.size)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Uploadé le {formatDate(doc.uploadDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal de nommage du document */}
        {showUploadModal && uploadingFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nommer le document</h3>
                  <p className="text-gray-600 dark:text-gray-400">Donnez un nom à votre document</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom du document *
                  </label>
                  <input
                    type="text"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Ex: Facture client, AWB, Certificat..."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Fichier sélectionné :</strong> {uploadingFile.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Taille :</strong> {formatFileSize(uploadingFile.size)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setUploadingFile(null)
                    setDocumentName('')
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={!documentName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  Uploader
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleOverlayClick}>
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header du modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Dossier {dossier}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {caseData?.CLIENT} • {formatValue(caseData?.DATE, 'DATE')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                dossierType === 'HUM' 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
              }`}>
                {dossierType}
              </span>
              {dossierType === 'CARGO' && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  {cargoMode}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </button>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>{isEditing ? 'Annuler' : 'Modifier'}</span>
            </button>
            <button
              onClick={() => {
                // Vérifier s'il y a des modifications non sauvegardées
                const hasUnsavedChanges = hasChanges || 
                  // Vérifier les modifications dans l'onglet Général
                  (Object.keys(originalData).length > 0 && Object.keys(editingData).length > 0 && JSON.stringify(editingData) !== JSON.stringify(originalData)) ||
                  // Vérifier les modifications dans l'onglet Finances
                  JSON.stringify(ventesData) !== JSON.stringify(initialVentesData) ||
                  JSON.stringify(achatsPrevisionnels) !== JSON.stringify(initialAchatsPrevisionnels) ||
                  JSON.stringify(achatsReels) !== JSON.stringify(initialAchatsReels) ||
                  JSON.stringify(reglements) !== JSON.stringify(initialReglements) ||
                  // Vérifier les modifications dans l'onglet Documents
                  documents.length > 0
                
                if (hasUnsavedChanges) {
                  if (confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) {
                    onClose()
                  }
                } else {
                  onClose()
                }
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation onglets */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenu avec scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Chargement du dossier {dossier}...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Erreur de chargement
                </h2>
                <p className="text-gray-600 dark:text-gray-400">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'general' && renderGeneralTab()}
              {activeTab === 'finances' && renderFinancesTab()}
              {activeTab === 'documents' && renderDocumentsTab()}
            </>
          )}
        </div>

        {/* Modals */}
        {/* Create Invoice Modal */}
        <CreateInvoiceModal
          isOpen={isCreateInvoiceModalOpen}
          onClose={() => setIsCreateInvoiceModalOpen(false)}
          onInvoiceGenerated={handleInvoiceGenerated}
          dossierData={dossierData}
        />

        {/* PDF Download Modal */}
        {showPDFDownload && pdfBlob && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl mx-4 p-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <FileText className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Facture générée avec succès !
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Votre facture PDF a été créée par le workflow n8n
                  </p>
                </div>

                {pdfFileName && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Nom du fichier :</p>
                    <p className="font-mono text-sm text-gray-800">{pdfFileName}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => {
                    if (pdfBlob) {
                      const url = window.URL.createObjectURL(pdfBlob)
                      window.open(url, '_blank')
                      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
                    }
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <span>Voir le PDF</span>
                </button>
                
                <button
                  onClick={() => {
                    if (pdfBlob) {
                      const url = window.URL.createObjectURL(pdfBlob)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = pdfFileName || `facture_${dossier}.pdf`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      window.URL.revokeObjectURL(url)
                    }
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <span>Télécharger</span>
                </button>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setShowPDFDownload(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CaseModal 