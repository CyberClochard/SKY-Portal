import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader } from './ui/Card'
import { Plus, Edit, Trash2, Save, X, FileText } from 'lucide-react'

interface FinanceNote {
  id: string
  master_dossier: string
  notes: string
  created_at: string
  created_by: string
  updated_at?: string
  updated_by?: string
}

interface FinanceNotesCardProps {
  dossierId: string
}

const FinanceNotesCard: React.FC<FinanceNotesCardProps> = ({ dossierId }) => {
  const [notes, setNotes] = useState<FinanceNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Charger les notes existantes
  const loadNotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('case_finance_notes')
        .select('*')
        .eq('master_dossier', dossierId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Erreur lors du chargement des notes:', fetchError)
        throw new Error(`Erreur lors du chargement: ${fetchError.message}`)
      }

      setNotes(data || [])
    } catch (err) {
      console.error('Erreur dans loadNotes:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Créer une nouvelle note
  const createNote = async () => {
    if (!newNoteText.trim()) return

    try {
      setSubmitting(true)
      setError(null)

      const { data, error: insertError } = await supabase
        .from('case_finance_notes')
        .insert({
          master_dossier: dossierId,
          notes: newNoteText.trim()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Erreur lors de la création de la note:', insertError)
        throw new Error(`Erreur lors de la création: ${insertError.message}`)
      }

      // Ajouter la nouvelle note à la liste
      setNotes(prevNotes => [data, ...prevNotes])
      
      // Réinitialiser le formulaire
      setNewNoteText('')
      setIsAddingNote(false)
    } catch (err) {
      console.error('Erreur dans createNote:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  // Modifier une note
  const updateNote = async (noteId: string) => {
    if (!editingNoteText.trim()) return

    try {
      setSubmitting(true)
      setError(null)

      const { error: updateError } = await supabase
        .from('case_finance_notes')
        .update({ notes: editingNoteText.trim() })
        .eq('id', noteId)

      if (updateError) {
        console.error('Erreur lors de la modification de la note:', updateError)
        throw new Error(`Erreur lors de la modification: ${updateError.message}`)
      }

      // Mettre à jour la note dans la liste
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId 
            ? { ...note, notes: editingNoteText.trim() }
            : note
        )
      )
      
      // Sortir du mode édition
      setEditingNoteId(null)
      setEditingNoteText('')
    } catch (err) {
      console.error('Erreur dans updateNote:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  // Supprimer une note
  const deleteNote = async (noteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) return

    try {
      setSubmitting(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('case_finance_notes')
        .delete()
        .eq('id', noteId)

      if (deleteError) {
        console.error('Erreur lors de la suppression de la note:', deleteError)
        throw new Error(`Erreur lors de la suppression: ${deleteError.message}`)
      }

      // Retirer la note de la liste
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
    } catch (err) {
      console.error('Erreur dans deleteNote:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSubmitting(false)
    }
  }

  // Entrer en mode édition
  const startEditing = (note: FinanceNote) => {
    setEditingNoteId(note.id)
    setEditingNoteText(note.notes)
  }

  // Annuler l'édition
  const cancelEditing = () => {
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Charger les notes au montage
  useEffect(() => {
    if (dossierId) {
      loadNotes()
    }
  }, [dossierId])

  if (loading) {
    return (
      <Card>
        <CardHeader icon={<FileText className="w-5 h-5" />} title="Notes" />
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement des notes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader 
        icon={<FileText className="w-5 h-5" />} 
        title="Notes"
        actions={
          <button 
            onClick={() => setIsAddingNote(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Nouvelle note
          </button>
        }
      />
      <CardContent>
        {/* Message d'erreur */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
          </div>
        )}

        {/* Formulaire d'ajout de note */}
        {isAddingNote && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-start space-x-3">
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Saisissez votre note..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={3}
                disabled={submitting}
              />
              <div className="flex flex-col space-y-2">
                <button
                  onClick={createNote}
                  disabled={submitting || !newNoteText.trim()}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNoteText('')
                  }}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des notes */}
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              {editingNoteId === note.id ? (
                // Mode édition
                <div className="space-y-3">
                  <textarea
                    value={editingNoteText}
                    onChange={(e) => setEditingNoteText(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={3}
                    disabled={submitting}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => updateNote(note.id)}
                      disabled={submitting || !editingNoteText.trim()}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                    >
                      <Save className="w-3 h-3 inline mr-1" />
                      Enregistrer
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={submitting}
                      className="px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                    >
                      <X className="w-3 h-3 inline mr-1" />
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                // Mode affichage
                <div>
                  <div className="text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
                    {note.notes}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span>Créé par {note.created_by}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(note.created_at)}</span>
                      {note.updated_at && note.updated_by && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Modifié par {note.updated_by} le {formatDate(note.updated_at)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditing(note)}
                        disabled={submitting}
                        className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        disabled={submitting}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Message si aucune note */}
          {notes.length === 0 && !isAddingNote && (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              Aucune note enregistrée
              <button 
                onClick={() => setIsAddingNote(true)}
                className="block mx-auto mt-2 text-blue-600 hover:text-blue-800"
              >
                + Ajouter la première note
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default FinanceNotesCard 