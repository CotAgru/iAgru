import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Warehouse, ArrowRight } from 'lucide-react'

export default function UnidadesArmazenadoras() {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Redirecionar automaticamente para /cadastros com filtro tipo=Armazem
    const timer = setTimeout(() => {
      navigate('/cadastros?tipo=Armazem')
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [navigate])
  
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg border border-blue-200">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-blue-100 rounded-full">
            <Warehouse className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Redirecionando...</h2>
        <p className="text-gray-600 mb-4">
          O cadastro de armazéns agora está integrado na tela de <strong>Cadastros</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Você será redirecionado automaticamente em 2 segundos.
        </p>
        <button 
          onClick={() => navigate('/cadastros?tipo=Armazem')}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ir agora <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
