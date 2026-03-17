import { X, Pencil } from 'lucide-react'

interface ViewModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  children: React.ReactNode
}

export default function ViewModal({ title, isOpen, onClose, onEdit, children }: ViewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Pencil className="w-4 h-4" /> Editar Lançamento
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: React.ReactNode
  full?: boolean
}

export function Field({ label, value, full }: FieldProps) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-xs font-medium text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '-'}</dd>
    </div>
  )
}
