import { X, Pencil } from 'lucide-react'

interface ViewModalProps {
  title: string
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  children: React.ReactNode
  extraButtons?: React.ReactNode
}

export default function ViewModal({ title, isOpen, onClose, onEdit, children, extraButtons }: ViewModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-4xl sm:max-h-[92vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header - Mobile otimizado */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-4 sm:py-5 shadow-lg z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          {/* Botões de ação */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button onClick={onEdit}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-blue-700 rounded-lg hover:bg-blue-50 font-semibold shadow-md transition-all">
              <Pencil className="w-4 h-4" /> Editar Lançamento
            </button>
            {extraButtons}
          </div>
        </div>
        
        {/* Content - Scroll otimizado */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-gray-50 max-h-[calc(100vh-140px)] sm:max-h-[calc(92vh-160px)]">
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
  highlight?: boolean
}

export function Field({ label, value, full, highlight }: FieldProps) {
  return (
    <div className={`${full ? 'col-span-full' : ''} ${highlight ? 'bg-blue-50 p-3 rounded-lg border border-blue-200' : ''}`}>
      <dt className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{label}</dt>
      <dd className={`text-sm sm:text-base font-medium ${highlight ? 'text-blue-900' : 'text-gray-900'}`}>
        {value || <span className="text-gray-400 italic">Não informado</span>}
      </dd>
    </div>
  )
}

// Componente Section para agrupar campos
export function Section({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        {icon && <div className="text-blue-600">{icon}</div>}
        <h3 className="text-base sm:text-lg font-bold text-gray-800">{title}</h3>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {children}
      </dl>
    </div>
  )
}
