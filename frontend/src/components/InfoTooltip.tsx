import { Info } from 'lucide-react'
import { useState } from 'react'

interface InfoTooltipProps {
  text: string
  className?: string
}

export default function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-blue-500 hover:text-blue-700 focus:outline-none"
      >
        <Info className="w-4 h-4" />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap max-w-xs">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}
