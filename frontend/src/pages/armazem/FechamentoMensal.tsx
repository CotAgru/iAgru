import { useEffect, useState, useMemo } from 'react'
import { FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, Filter, Printer, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  getRomaneiosArmazem, getCobrancas, getQuebraTecnica,
  getUnidadesArmazenadoras, getProdutos, getCadastros,
} from '../../services/api'
import { fmtDec, fmtBRL, fmtData, fmtInt } from '../../utils/format'

type SortDir = 'asc' | 'desc'

interface ExtratoRow {
  depositante_id: string
  depositante_nome: string
  entradas_kg: number
  saidas_kg: number
  saldo_kg: number
  quebra_kg: number
  qtd_entradas: number
  qtd_saidas: number
  total_cobrancas: number
  total_pago: number
  total_aberto: number
}

export default function FechamentoMensal() {
  const [romaneios, setRomaneios] = useState<any[]>([])
  const [cobrancas, setCobrancas] = useState<any[]>([])
  const [quebras, setQuebras] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [cadastros, setCadastros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unidadeSel, setUnidadeSel] = useState('KG')
  const [mesAno, setMesAno] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroDepositante, setFiltroDepositante] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ col: string; dir: SortDir }>({ col: 'saldo_kg', dir: 'desc' })

  const load = async () => {
    setLoading(true)
    try {
      const [r, c, q, u, p, ca] = await Promise.all([
        getRomaneiosArmazem(), getCobrancas(), getQuebraTecnica(),
        getUnidadesArmazenadoras(), getProdutos(), getCadastros(),
      ])
      setRomaneios(r)
      setCobrancas(c)
      setQuebras(q)
      setUnidades(u)
      setProdutos(p)
      setCadastros(ca)
    } catch (e: any) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const conv = (kg: number) => {
    if (unidadeSel === 'SC') return kg / 60
    if (unidadeSel === 'TN') return kg / 1000
    return kg
  }

  const mesSel = mesAno ? mesAno.split('-') : [null, null]
  const mesInicio = mesAno ? `${mesAno}-01` : null
  const mesFim = mesAno ? new Date(parseInt(mesSel[0]!), parseInt(mesSel[1]!), 0).toISOString().split('T')[0] : null

  // Construir extrato por depositante
  const extrato = useMemo(() => {
    const map: Record<string, ExtratoRow> = {}
    const ativos = romaneios.filter(r => r.status !== 'cancelado')

    // Movimentações até o final do mês selecionado
    const movs = mesAno ? ativos.filter(r => r.data_emissao && r.data_emissao <= mesFim!) : ativos

    movs.forEach(r => {
      const id = r.depositante_id
      if (!map[id]) {
        map[id] = {
          depositante_id: id,
          depositante_nome: r.depositante_nome || 'Sem depositante',
          entradas_kg: 0, saidas_kg: 0, saldo_kg: 0, quebra_kg: 0,
          qtd_entradas: 0, qtd_saidas: 0,
          total_cobrancas: 0, total_pago: 0, total_aberto: 0,
        }
      }
      if (r.tipo === 'entrada') {
        map[id].entradas_kg += r.peso_corrigido || 0
        map[id].qtd_entradas++
      } else if (r.tipo === 'saida') {
        map[id].saidas_kg += r.peso_corrigido || 0
        map[id].qtd_saidas++
      }
    })

    // Quebras até o mês
    const quebrasFiltradas = mesAno ? quebras.filter(q => q.data_calculo && q.data_calculo <= mesFim!) : quebras
    quebrasFiltradas.forEach(q => {
      const id = q.depositante_id
      if (map[id]) map[id].quebra_kg += q.quebra_kg || 0
    })

    // Cobranças do mês
    const cobMes = mesAno
      ? cobrancas.filter(c => c.periodo_inicio && c.periodo_inicio >= mesInicio! && c.periodo_inicio <= mesFim!)
      : cobrancas
    cobMes.forEach(c => {
      const id = c.depositante_id
      if (!map[id]) {
        map[id] = {
          depositante_id: id,
          depositante_nome: c.depositante_nome || 'Sem depositante',
          entradas_kg: 0, saidas_kg: 0, saldo_kg: 0, quebra_kg: 0,
          qtd_entradas: 0, qtd_saidas: 0,
          total_cobrancas: 0, total_pago: 0, total_aberto: 0,
        }
      }
      map[id].total_cobrancas += c.valor_total || 0
      if (c.status === 'pago') map[id].total_pago += c.valor_total || 0
      if (c.status === 'aberto') map[id].total_aberto += c.valor_total || 0
    })

    // Calcular saldo
    Object.values(map).forEach(row => {
      row.saldo_kg = row.entradas_kg - row.saidas_kg - row.quebra_kg
    })

    return Object.values(map)
  }, [romaneios, cobrancas, quebras, mesAno])

  const filtered = useMemo(() => {
    if (!filtroDepositante) return extrato
    return extrato.filter(e => e.depositante_nome.toLowerCase().includes(filtroDepositante.toLowerCase()))
  }, [extrato, filtroDepositante])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a: any, b: any) => {
      const va = a[sort.col], vb = b[sort.col]
      if (typeof va === 'number' && typeof vb === 'number') return sort.dir === 'asc' ? va - vb : vb - va
      return sort.dir === 'asc' ? String(va || '').localeCompare(String(vb || '')) : String(vb || '').localeCompare(String(va || ''))
    })
    return arr
  }, [filtered, sort])

  const totais = useMemo(() => ({
    entradas_kg: filtered.reduce((s, r) => s + r.entradas_kg, 0),
    saidas_kg: filtered.reduce((s, r) => s + r.saidas_kg, 0),
    saldo_kg: filtered.reduce((s, r) => s + r.saldo_kg, 0),
    quebra_kg: filtered.reduce((s, r) => s + r.quebra_kg, 0),
    total_cobrancas: filtered.reduce((s, r) => s + r.total_cobrancas, 0),
    total_pago: filtered.reduce((s, r) => s + r.total_pago, 0),
    total_aberto: filtered.reduce((s, r) => s + r.total_aberto, 0),
  }), [filtered])

  // Detalhe das cobranças de um depositante no mês
  const cobDetalhe = useMemo(() => {
    if (!expandedId) return []
    const mesCobrancas = mesAno
      ? cobrancas.filter(c => c.periodo_inicio && c.periodo_inicio >= mesInicio! && c.periodo_inicio <= mesFim!)
      : cobrancas
    return mesCobrancas.filter(c => c.depositante_id === expandedId)
  }, [expandedId, cobrancas, mesAno])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = (row?: ExtratoRow) => {
    const doc = new jsPDF()
    const titulo = row
      ? `Extrato — ${row.depositante_nome} — ${mesLabel}`
      : `Fechamento Mensal — ${mesLabel}`

    doc.setFontSize(14)
    doc.text(titulo, 14, 18)
    doc.setFontSize(8)
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 24)

    if (row) {
      // Extrato individual
      doc.setFontSize(10)
      doc.text(`Depositante: ${row.depositante_nome}`, 14, 34)
      doc.text(`Entradas: ${fmtDec(conv(row.entradas_kg))} ${unidadeSel}  |  Saídas: ${fmtDec(conv(row.saidas_kg))} ${unidadeSel}  |  Quebra: ${fmtDec(conv(row.quebra_kg))} ${unidadeSel}  |  Saldo: ${fmtDec(conv(row.saldo_kg))} ${unidadeSel}`, 14, 40)

      // Cobranças do depositante
      const cobDep = (mesAno
        ? cobrancas.filter(c => c.periodo_inicio && c.periodo_inicio >= mesInicio! && c.periodo_inicio <= mesFim!)
        : cobrancas
      ).filter(c => c.depositante_id === row.depositante_id)

      if (cobDep.length > 0) {
        autoTable(doc, {
          startY: 46,
          head: [['Categoria', 'Descrição', 'Volume (kg)', 'Valor Unit.', 'Valor Total', 'Status']],
          body: cobDep.map((c: any) => [
            c.categoria || '',
            c.descricao || '',
            c.volume_base ? fmtDec(c.volume_base) : '',
            c.valor_unitario ? fmtBRL(c.valor_unitario) : '',
            c.valor_total ? fmtBRL(c.valor_total) : '',
            c.status || '',
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [217, 119, 6] },
        })
      }

      const totalCob = cobDep.reduce((s: number, c: any) => s + (c.valor_total || 0), 0)
      const finalY = (doc as any).lastAutoTable?.finalY || 60
      doc.setFontSize(10)
      doc.text(`Total Cobranças: ${fmtBRL(totalCob)}`, 14, finalY + 8)
    } else {
      // Resumo geral
      autoTable(doc, {
        startY: 30,
        head: [['Depositante', `Entradas (${unidadeSel})`, `Saídas (${unidadeSel})`, `Quebra (${unidadeSel})`, `Saldo (${unidadeSel})`, 'Cobranças (R$)', 'Pago (R$)', 'Em Aberto (R$)']],
        body: sorted.map(r => [
          r.depositante_nome,
          fmtDec(conv(r.entradas_kg)),
          fmtDec(conv(r.saidas_kg)),
          fmtDec(conv(r.quebra_kg)),
          fmtDec(conv(r.saldo_kg)),
          fmtBRL(r.total_cobrancas),
          fmtBRL(r.total_pago),
          fmtBRL(r.total_aberto),
        ]),
        foot: [[
          `TOTAL (${sorted.length})`,
          fmtDec(conv(totais.entradas_kg)),
          fmtDec(conv(totais.saidas_kg)),
          fmtDec(conv(totais.quebra_kg)),
          fmtDec(conv(totais.saldo_kg)),
          fmtBRL(totais.total_cobrancas),
          fmtBRL(totais.total_pago),
          fmtBRL(totais.total_aberto),
        ]],
        styles: { fontSize: 7 },
        headStyles: { fillColor: [217, 119, 6] },
        footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
      })
    }

    const nomeArq = row
      ? `extrato-${row.depositante_nome.replace(/\s/g, '_')}-${mesAno}.pdf`
      : `fechamento-${mesAno}.pdf`
    doc.save(nomeArq)
  }

  const SortHeader = ({ label, col }: { label: string; col: string }) => (
    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
      onClick={() => setSort({ col, dir: sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc' })}>
      <span className="flex items-center gap-1">
        {label}
        {sort.col === col ? (sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )

  const mesLabel = mesAno ? new Date(parseInt(mesSel[0]!), parseInt(mesSel[1]!) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : 'Todos'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>

  return (
    <div className="space-y-6">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-gray-50 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 py-3 mb-4 border-b border-gray-200 shadow-sm flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-amber-600" /> Fechamento Mensal
        </h1>
        <div className="flex items-center gap-2">
          <input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" />
          {['KG', 'SC', 'TN'].map(u => (
            <button key={u} onClick={() => setUnidadeSel(u)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${unidadeSel === u ? 'bg-amber-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'}`}>
              {u}
            </button>
          ))}
          <button onClick={() => handleExportPDF()} className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-700" title="Exportar PDF">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={handlePrint} className="p-2 border rounded-lg hover:bg-gray-100" title="Imprimir">
            <Printer className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Saldo Estoque</p>
          <p className="text-lg font-bold text-amber-700">{fmtDec(conv(totais.saldo_kg))} {unidadeSel}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Quebra Técnica</p>
          <p className="text-lg font-bold text-red-600">{fmtDec(conv(totais.quebra_kg))} {unidadeSel}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Cobranças do Mês</p>
          <p className="text-lg font-bold text-gray-700">{fmtBRL(totais.total_cobrancas)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-500">Em Aberto</p>
          <p className="text-lg font-bold text-yellow-700">{fmtBRL(totais.total_aberto)}</p>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <input value={filtroDepositante} onChange={e => setFiltroDepositante(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm" placeholder="Buscar depositante..." />
        <span className="text-xs text-gray-500">{fmtInt(filtered.length)} depositantes — {mesLabel}</span>
      </div>

      {/* Tabela Extrato */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-gray-50">
            <SortHeader label="Depositante" col="depositante_nome" />
            <SortHeader label={`Entradas (${unidadeSel})`} col="entradas_kg" />
            <SortHeader label={`Saídas (${unidadeSel})`} col="saidas_kg" />
            <SortHeader label={`Quebra (${unidadeSel})`} col="quebra_kg" />
            <SortHeader label={`Saldo (${unidadeSel})`} col="saldo_kg" />
            <SortHeader label="Cobranças (R$)" col="total_cobrancas" />
            <SortHeader label="Pago (R$)" col="total_pago" />
            <SortHeader label="Em Aberto (R$)" col="total_aberto" />
          </tr></thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Sem dados para o período</td></tr>
            ) : sorted.map(row => (
              <>
                <tr key={row.depositante_id} className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === row.depositante_id ? null : row.depositante_id)}>
                  <td className="px-2 py-2 font-medium">{row.depositante_nome}</td>
                  <td className="px-2 py-2 text-right text-green-600">{fmtDec(conv(row.entradas_kg))}</td>
                  <td className="px-2 py-2 text-right text-red-600">{fmtDec(conv(row.saidas_kg))}</td>
                  <td className="px-2 py-2 text-right text-orange-600">{fmtDec(conv(row.quebra_kg))}</td>
                  <td className="px-2 py-2 text-right font-bold">{fmtDec(conv(row.saldo_kg))}</td>
                  <td className="px-2 py-2 text-right">{fmtBRL(row.total_cobrancas)}</td>
                  <td className="px-2 py-2 text-right text-green-600">{fmtBRL(row.total_pago)}</td>
                  <td className="px-2 py-2 text-right text-yellow-700 font-semibold">{fmtBRL(row.total_aberto)}</td>
                </tr>
                {expandedId === row.depositante_id && (
                  <tr key={`${row.depositante_id}-det`}>
                    <td colSpan={8} className="bg-amber-50/50 px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-gray-700">Cobranças do mês — {row.depositante_nome}</h3>
                        <button onClick={(e) => { e.stopPropagation(); handleExportPDF(row) }} className="flex items-center gap-1 bg-amber-600 text-white px-2 py-1 rounded text-xs hover:bg-amber-700">
                          <Download className="w-3 h-3" /> PDF Extrato
                        </button>
                      </div>
                      {cobDetalhe.length === 0 ? (
                        <p className="text-xs text-gray-400">Nenhuma cobrança no período</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead><tr className="border-b">
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">Categoria</th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">Descrição</th>
                            <th className="px-2 py-1 text-right font-semibold text-gray-600">Volume (kg)</th>
                            <th className="px-2 py-1 text-right font-semibold text-gray-600">Valor Unit.</th>
                            <th className="px-2 py-1 text-right font-semibold text-gray-600">Valor Total</th>
                            <th className="px-2 py-1 text-left font-semibold text-gray-600">Status</th>
                          </tr></thead>
                          <tbody>
                            {cobDetalhe.map((c: any) => (
                              <tr key={c.id} className="border-b hover:bg-white">
                                <td className="px-2 py-1 capitalize">{c.categoria}</td>
                                <td className="px-2 py-1">{c.descricao || '-'}</td>
                                <td className="px-2 py-1 text-right">{c.volume_base ? fmtDec(c.volume_base) : '-'}</td>
                                <td className="px-2 py-1 text-right">{c.valor_unitario ? fmtBRL(c.valor_unitario) : '-'}</td>
                                <td className="px-2 py-1 text-right font-medium">{c.valor_total ? fmtBRL(c.valor_total) : '-'}</td>
                                <td className="px-2 py-1">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${c.status === 'pago' ? 'bg-green-100 text-green-700' : c.status === 'aberto' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot><tr className="bg-gray-50 font-semibold border-t-2">
              <td className="px-2 py-2">TOTAL ({fmtInt(sorted.length)})</td>
              <td className="px-2 py-2 text-right text-green-700">{fmtDec(conv(totais.entradas_kg))}</td>
              <td className="px-2 py-2 text-right text-red-700">{fmtDec(conv(totais.saidas_kg))}</td>
              <td className="px-2 py-2 text-right text-orange-700">{fmtDec(conv(totais.quebra_kg))}</td>
              <td className="px-2 py-2 text-right text-amber-700">{fmtDec(conv(totais.saldo_kg))}</td>
              <td className="px-2 py-2 text-right">{fmtBRL(totais.total_cobrancas)}</td>
              <td className="px-2 py-2 text-right text-green-700">{fmtBRL(totais.total_pago)}</td>
              <td className="px-2 py-2 text-right text-yellow-700">{fmtBRL(totais.total_aberto)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
