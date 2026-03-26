import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// =============================================================
// iAgru - Utilitários de Exportação (PDF e Excel)
// =============================================================

interface ExportColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

interface ExportOptions {
  filename: string
  title: string
  columns: ExportColumn[]
  data: any[]
  getValue?: (item: any, key: string) => string
}

/** Exportar dados para Excel (.xlsx) */
export function exportToExcel({ filename, title, columns, data, getValue }: ExportOptions) {
  const headers = columns.map(c => c.label)
  const rows = data.map(item =>
    columns.map(col => {
      if (getValue) return getValue(item, col.key)
      const val = item[col.key]
      return val != null ? String(val) : ''
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Ajustar largura das colunas
  ws['!cols'] = columns.map((_, i) => {
    const maxLen = Math.max(
      headers[i].length,
      ...rows.map(r => String(r[i] || '').length)
    )
    return { wch: Math.min(maxLen + 2, 40) }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}

/** Exportar dados para PDF */
export function exportToPDF({ filename, title, columns, data, getValue }: ExportOptions) {
  const doc = new jsPDF({ orientation: data.length > 0 && columns.length > 6 ? 'landscape' : 'portrait' })

  // Título
  doc.setFontSize(16)
  doc.setTextColor(22, 163, 74) // green-600
  doc.text(`FretAgru - ${title}`, 14, 18)

  // Data de geração
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  const now = new Date()
  const dataStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  doc.text(`Gerado em ${dataStr}`, 14, 24)
  doc.text(`Total: ${data.length} registros`, 14, 29)

  // Tabela
  const headers = columns.map(c => c.label)
  const rows = data.map(item =>
    columns.map(col => {
      if (getValue) return getValue(item, col.key)
      const val = item[col.key]
      return val != null ? String(val) : ''
    })
  )

  const columnStyles: Record<number, any> = {}
  columns.forEach((col, i) => {
    if (col.align === 'right') columnStyles[i] = { halign: 'right' }
    else if (col.align === 'center') columnStyles[i] = { halign: 'center' }
  })

  autoTable(doc, {
    startY: 33,
    head: [headers],
    body: rows,
    columnStyles,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 },
  })

  // Rodapé
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `iAgru Ecossistema - Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    )
  }

  doc.save(`${filename}.pdf`)
}

/** Exportar romaneio individual como PDF formatado (documento oficial) */
export function generateRomaneioPDF(romaneio: any, helpers: {
  operacaoNome?: string
  ordemNome?: string
  origemNome?: string
  destinoNome?: string
  produtorNome?: string
  produtoNome?: string
  placaNome?: string
  motoristaNome?: string
  transportadoraNome?: string
  anoSafraNome?: string
  tipoTicketNome?: string
  tipoNfNome?: string
  contratoVendaNome?: string
  valorFrete?: string
  precoContratado?: string
}) {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' })
  
  const pageWidth = doc.internal.pageSize.width
  let yPos = 20

  // ==== CABEÇALHO ====
  doc.setFillColor(22, 163, 74) // green-600
  doc.rect(0, 0, pageWidth, 35, 'F')
  
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('ROMANEIO DE PESAGEM', pageWidth / 2, 15, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('iAgru - Sistema de Gestão Agrícola', pageWidth / 2, 23, { align: 'center' })
  
  const now = new Date()
  const dataEmissao = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  doc.setFontSize(8)
  doc.text(`Emitido em: ${dataEmissao}`, pageWidth / 2, 29, { align: 'center' })
  
  yPos = 45

  // ==== TICKET E DOCUMENTAÇÃO ====
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('IDENTIFICAÇÃO', 14, yPos)
  yPos += 2
  
  doc.setDrawColor(22, 163, 74)
  doc.setLineWidth(0.5)
  doc.line(14, yPos, pageWidth - 14, yPos)
  yPos += 6
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  const addField = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label + ':', 14, yPos)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const valueX = 14 + doc.getTextWidth(label + ': ')
    doc.text(value || '-', valueX, yPos)
    yPos += 5
  }
  
  addField('Ticket', romaneio.numero_ticket || 'Não informado', true)
  addField('Tipo Ticket', helpers.tipoTicketNome || '-')
  addField('NF-e', romaneio.nfe_numero || '-')
  addField('Tipo NF', helpers.tipoNfNome || '-')
  addField('Operação', helpers.operacaoNome || '-')
  addField('Ordem Carregamento', helpers.ordemNome || '-')
  
  yPos += 3

  // ==== PRODUTO E ORIGEM/DESTINO ====
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTO E ROTA', 14, yPos)
  yPos += 2
  doc.line(14, yPos, pageWidth - 14, yPos)
  yPos += 6
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  addField('Produto', helpers.produtoNome || '-', true)
  addField('Ano Safra', helpers.anoSafraNome || '-')
  addField('Origem', helpers.origemNome || '-')
  addField('Destino', helpers.destinoNome || '-')
  if (romaneio.data_saida_origem) {
    const dataSaida = romaneio.data_saida_origem.split('-').reverse().join('/')
    addField('Data Saída Origem', dataSaida)
  }
  if (romaneio.data_entrada_destino) {
    const dataEntrada = romaneio.data_entrada_destino.split('-').reverse().join('/')
    addField('Data Entrada Destino', dataEntrada)
  }
  
  yPos += 3

  // ==== PRODUTOR ====
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PRODUTOR', 14, yPos)
  yPos += 2
  doc.line(14, yPos, pageWidth - 14, yPos)
  yPos += 6
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  addField('Nome', helpers.produtorNome || romaneio.produtor || '-', true)
  addField('CPF/CNPJ', romaneio.cnpj_cpf || '-')
  
  yPos += 3

  // ==== TRANSPORTE ====
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('TRANSPORTE', 14, yPos)
  yPos += 2
  doc.line(14, yPos, pageWidth - 14, yPos)
  yPos += 6
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  addField('Placa', helpers.placaNome || romaneio.placa || '-', true)
  addField('Motorista', helpers.motoristaNome || '-')
  addField('Transportadora', helpers.transportadoraNome || '-')
  if (romaneio.transgenia) addField('Transgenia', romaneio.transgenia)
  
  yPos += 3

  // ==== PESAGEM ====
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('DADOS DE PESAGEM', 14, yPos)
  yPos += 2
  doc.line(14, yPos, pageWidth - 14, yPos)
  yPos += 6
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  
  const fmtKg = (v: any) => v != null ? Number(v).toLocaleString('pt-BR') + ' kg' : '-'
  const fmtPerc = (v: any) => v != null ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %' : '-'
  
  addField('Peso Bruto', fmtKg(romaneio.peso_bruto))
  addField('Tara', fmtKg(romaneio.tara))
  addField('Peso Líquido S/Desconto', fmtKg(romaneio.peso_liquido), true)
  
  yPos += 2
  
  // Descontos de qualidade
  const hasDescontos = romaneio.umidade_perc || romaneio.impureza_perc || romaneio.avariados_perc || 
    romaneio.ardidos_perc || romaneio.esverdeados_perc || romaneio.partidos_perc || romaneio.quebrados_perc
  
  if (hasDescontos) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Descontos de Qualidade:', 14, yPos)
    yPos += 5
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    if (romaneio.umidade_perc) addField('  Umidade', fmtPerc(romaneio.umidade_perc))
    if (romaneio.impureza_perc) addField('  Impureza', fmtPerc(romaneio.impureza_perc))
    if (romaneio.avariados_perc) addField('  Avariados', fmtPerc(romaneio.avariados_perc))
    if (romaneio.ardidos_perc) addField('  Ardidos', fmtPerc(romaneio.ardidos_perc))
    if (romaneio.esverdeados_perc) addField('  Esverdeados', fmtPerc(romaneio.esverdeados_perc))
    if (romaneio.partidos_perc) addField('  Partidos', fmtPerc(romaneio.partidos_perc))
    if (romaneio.quebrados_perc) addField('  Quebrados', fmtPerc(romaneio.quebrados_perc))
    
    yPos += 2
    if (romaneio.desconto_kg) addField('Total Descontado', fmtKg(romaneio.desconto_kg))
  }
  
  addField('Peso Líquido C/Desconto (Corrigido)', fmtKg(romaneio.peso_corrigido), true)
  
  yPos += 3

  // ==== VALOR DO FRETE ====
  if (helpers.valorFrete || helpers.precoContratado) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('VALOR DO FRETE', 14, yPos)
    yPos += 2
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 6
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    if (helpers.precoContratado) addField('Preço Contratado', helpers.precoContratado)
    if (helpers.valorFrete) addField('Valor Total do Frete', helpers.valorFrete, true)
    
    yPos += 3
  }

  // ==== CONTRATO DE VENDA ====
  if (helpers.contratoVendaNome) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTRATO DE VENDA', 14, yPos)
    yPos += 2
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 6
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    addField('Contrato', helpers.contratoVendaNome)
    
    yPos += 3
  }

  // ==== OBSERVAÇÕES ====
  if (romaneio.observacoes) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('OBSERVAÇÕES', 14, yPos)
    yPos += 2
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 6
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const splitObs = doc.splitTextToSize(romaneio.observacoes, pageWidth - 28)
    doc.text(splitObs, 14, yPos)
  }

  // ==== RODAPÉ ====
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `iAgru Ecossistema - FretAgru | Romaneio Ticket ${romaneio.numero_ticket || 'S/N'}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  doc.save(`Romaneio_${romaneio.numero_ticket || 'SemTicket'}_${Date.now()}.pdf`)
}
