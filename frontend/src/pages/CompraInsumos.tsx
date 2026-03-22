import { Package, Plus } from 'lucide-react'

export default function CompraInsumos() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Compra de Insumos</h1>
        </div>
        <button disabled className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 sm:px-4 rounded-lg opacity-50 cursor-not-allowed text-sm sm:text-base whitespace-nowrap">
          <Plus className="w-4 h-4" /> Nova Compra
        </button>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-8 text-center">
        <Package className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-indigo-800 mb-2">Em Breve</h3>
        <p className="text-sm text-indigo-600 max-w-lg mx-auto">
          Aqui você poderá cadastrar e gerenciar contratos de compra de insumos agrícolas
          (fertilizantes, defensivos, sementes, etc.). Controle fornecedor, produto,
          quantidade, preço, safra e status da entrega.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-semibold text-gray-800">Pendente → Entregue → Pago</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-gray-500">Categorias</p>
            <p className="font-semibold text-gray-800">Fertilizante · Defensivo · Semente</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="text-xs text-gray-500">Unidades</p>
            <p className="font-semibold text-gray-800">R$/ton · R$/l · R$/kg</p>
          </div>
        </div>
      </div>
    </div>
  )
}
