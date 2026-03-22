import { ShoppingCart, Plus } from 'lucide-react'

export default function ContratosVenda() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Contratos de Venda</h1>
        </div>
        <button disabled className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg opacity-50 cursor-not-allowed text-sm sm:text-base whitespace-nowrap">
          <Plus className="w-4 h-4" /> Novo Contrato
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
        <ShoppingCart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Em Breve</h3>
        <p className="text-sm text-blue-600 max-w-lg mx-auto">
          Aqui você poderá cadastrar e gerenciar contratos de venda de commodities agrícolas
          (soja, milho, sorgo, feijão). Controle comprador, corretor, volume, preço,
          modalidade (FOB/CIF), datas de entrega e status do contrato.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-semibold text-gray-800">Negociação → Fixado → Execução → Liquidado</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Modalidades</p>
            <p className="font-semibold text-gray-800">FOB / CIF</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs text-gray-500">Unidades</p>
            <p className="font-semibold text-gray-800">R$/ton · R$/sc</p>
          </div>
        </div>
      </div>
    </div>
  )
}
