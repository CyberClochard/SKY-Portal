// Types pour le système de gestion des règlements client

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  siret?: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  customer_id: string
  invoice_number: string
  amount_total: number
  amount_paid: number
  status: 'unpaid' | 'partial' | 'paid'
  due_date: string
  issued_date: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  customer_id: string
  amount: number
  payment_method: 'transfer' | 'check' | 'card' | 'cash' | 'other'
  status: 'pending' | 'completed' | 'cancelled'
  reference?: string
  notes?: string
  auto_allocate: boolean
  created_at: string
  updated_at: string
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  invoice_id: string
  amount_allocated: number
  created_at: string
}

export interface PaymentFormData {
  customer_id: string
  amount: number
  payment_method: Payment['payment_method']
  reference?: string
  notes?: string
  auto_allocate: boolean
}

export interface ManualAllocationItem {
  invoice_id: string
  amount_allocated: number
}

export interface InvoiceSummary {
  id: string
  customer_id: string
  invoice_number: string
  amount_total: number
  amount_paid: number
  status: 'unpaid' | 'partial' | 'paid'
  due_date: string
  issued_date: string
  created_at: string
  master_id?: string
  dossier_number?: string
  dossier_client?: string
  dossier_type?: string
  hum_name?: string
  depart?: string
  arrivee?: string
}

export interface PaymentAllocationDetails {
  id: string
  payment_id: string
  payment_amount: number
  payment_method: string
  payment_reference?: string
  invoice_id: string
  invoice_number: string
  amount_allocated: number
  allocation_date: string
}

export interface CustomerBalanceSummary {
  customer_id: string
  customer_name: string
  total_invoiced: number
  total_paid: number
  total_remaining: number
  unpaid_invoices_count: number
  overdue_invoices_count: number
}

// Types pour les composants UI
export interface PaymentFormProps {
  isOpen: boolean
  onClose: () => void
  customerId?: string
  onSuccess?: (payment: PaymentWithCustomer) => void
}

export interface ManualAllocationModalProps {
  isOpen: boolean
  payment: Payment | null
  onClose: () => void
  onSuccess?: () => void
}

export interface PaymentAllocationTableProps {
  paymentId: string
  onAllocationChange?: () => void
}

// Types pour les hooks
export interface UsePaymentsOptions {
  customerId?: string
  status?: Payment['status']
  limit?: number
}

// Interface étendue pour les paiements avec informations client
export interface PaymentWithCustomer extends Payment {
  customer?: Customer
}

export interface UseUnpaidInvoicesOptions {
  customerId?: string
  includePartial?: boolean
}

export interface UsePaymentAllocationsOptions {
  paymentId: string
}

export interface DossierPaymentData {
  customer_id: string
  amount: number
  payment_method: Payment['payment_method']
  reference?: string
  notes?: string
  manual_allocations?: ManualAllocationItem[]
}



 