import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../frontend/.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) env[key.trim()] = vals.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function main() {
  console.log('=== VARREDURA DE VINCULOS ===\n')

  // 1. Buscar romaneios com placa TEXT mas sem veiculo_id
  const { data: romaneios } = await supabase.from('romaneios').select('id, placa, motorista, transportadora, produto, produtor, fornecedor_destinatario, veiculo_id, motorista_id, transportadora_id, produto_id, produtor_id, destinatario_id')
  const { data: veiculos } = await supabase.from('veiculos').select('id, placa, cadastro_id')
  const { data: cadastros } = await supabase.from('cadastros').select('id, nome, nome_fantasia, tipos')
  const { data: produtos } = await supabase.from('produtos').select('id, nome')

  console.log(`Total romaneios: ${romaneios.length}`)
  console.log(`Total veiculos: ${veiculos.length}`)
  console.log(`Total cadastros: ${cadastros.length}`)
  console.log(`Total produtos: ${produtos.length}\n`)

  // === PLACAS ===
  const semVeiculo = romaneios.filter(r => r.placa && r.placa.trim() && !r.veiculo_id)
  const placasOrfas = [...new Set(semVeiculo.map(r => r.placa.trim().toUpperCase()))]
  const placasExistentes = veiculos.map(v => v.placa.toUpperCase())
  const placasNovas = placasOrfas.filter(p => !placasExistentes.includes(p))
  const placasParaVincular = placasOrfas.filter(p => placasExistentes.includes(p))

  console.log(`--- PLACAS ---`)
  console.log(`Romaneios sem veiculo_id: ${semVeiculo.length}`)
  console.log(`Placas unicas orfas: ${placasOrfas.length}`)
  console.log(`Placas que JA existem em veiculos (so vincular): ${placasParaVincular.length}`)
  console.log(`Placas NOVAS (precisa criar veiculo): ${placasNovas.length}`)
  if (placasNovas.length) console.log(`  -> ${placasNovas.join(', ')}`)

  // Criar veiculos faltantes
  if (placasNovas.length) {
    // Buscar ou criar cadastro generico
    let { data: generico } = await supabase.from('cadastros').select('id').eq('nome', 'Proprietário Não Identificado').single()
    if (!generico) {
      const { data: novo } = await supabase.from('cadastros').insert({
        nome: 'Proprietário Não Identificado', nome_fantasia: 'Prop. Desconhecido',
        uf: 'GO', cidade: 'Não Informada', tipos: ['Motorista'], ativo: true
      }).select().single()
      generico = novo
      console.log(`  Cadastro generico criado: ${generico.id}`)
    }

    for (const placa of placasNovas) {
      // Tentar encontrar motorista pelo nome TEXT do romaneio
      const rom = semVeiculo.find(r => r.placa.trim().toUpperCase() === placa)
      let cadastroId = generico.id
      if (rom?.motorista?.trim()) {
        const mot = cadastros.find(c =>
          c.nome?.toLowerCase().includes(rom.motorista.trim().toLowerCase()) ||
          c.nome_fantasia?.toLowerCase().includes(rom.motorista.trim().toLowerCase())
        )
        if (mot) cadastroId = mot.id
      }
      const { data: novoVeic, error } = await supabase.from('veiculos').insert({
        cadastro_id: cadastroId, placa, tipo_caminhao: 'Carreta', eixos: 6,
        peso_pauta_kg: 37000, observacoes: 'Criado automaticamente a partir de romaneio antigo'
      }).select().single()
      if (error) {
        console.log(`  ERRO ao criar veiculo ${placa}: ${error.message}`)
      } else {
        console.log(`  Veiculo criado: ${placa} -> ${novoVeic.id}`)
        veiculos.push(novoVeic)
      }
    }
  }

  // Vincular romaneios -> veiculos
  let vinculados = 0
  for (const rom of semVeiculo) {
    const placa = rom.placa.trim().toUpperCase()
    const veic = veiculos.find(v => v.placa.toUpperCase() === placa)
    if (veic) {
      const { error } = await supabase.from('romaneios').update({ veiculo_id: veic.id }).eq('id', rom.id)
      if (!error) vinculados++
    }
  }
  console.log(`  Romaneios vinculados a veiculos: ${vinculados}\n`)

  // === MOTORISTAS ===
  const semMotorista = romaneios.filter(r => r.motorista?.trim() && !r.motorista_id)
  console.log(`--- MOTORISTAS ---`)
  console.log(`Romaneios sem motorista_id: ${semMotorista.length}`)
  let motVinc = 0
  for (const rom of semMotorista) {
    const nome = rom.motorista.trim().toLowerCase()
    const cad = cadastros.find(c =>
      (c.tipos || []).includes('Motorista') && (
        c.nome?.toLowerCase() === nome ||
        c.nome_fantasia?.toLowerCase() === nome ||
        c.nome?.toLowerCase().includes(nome)
      )
    )
    if (cad) {
      const { error } = await supabase.from('romaneios').update({ motorista_id: cad.id }).eq('id', rom.id)
      if (!error) motVinc++
    }
  }
  console.log(`  Vinculados: ${motVinc}\n`)

  // === TRANSPORTADORAS ===
  const semTransp = romaneios.filter(r => r.transportadora?.trim() && !r.transportadora_id)
  console.log(`--- TRANSPORTADORAS ---`)
  console.log(`Romaneios sem transportadora_id: ${semTransp.length}`)
  let trVinc = 0
  for (const rom of semTransp) {
    const nome = rom.transportadora.trim().toLowerCase()
    const cad = cadastros.find(c =>
      (c.tipos || []).includes('Transportadora') && (
        c.nome?.toLowerCase() === nome ||
        c.nome_fantasia?.toLowerCase() === nome ||
        c.nome?.toLowerCase().includes(nome)
      )
    )
    if (cad) {
      const { error } = await supabase.from('romaneios').update({ transportadora_id: cad.id }).eq('id', rom.id)
      if (!error) trVinc++
    }
  }
  console.log(`  Vinculados: ${trVinc}\n`)

  // === PRODUTOS ===
  const semProduto = romaneios.filter(r => r.produto?.trim() && !r.produto_id)
  console.log(`--- PRODUTOS ---`)
  console.log(`Romaneios sem produto_id: ${semProduto.length}`)
  let prVinc = 0
  for (const rom of semProduto) {
    const nome = rom.produto.trim().toLowerCase()
    const prod = produtos.find(p =>
      p.nome?.toLowerCase() === nome ||
      p.nome?.toLowerCase().includes(nome) ||
      nome.includes(p.nome?.toLowerCase())
    )
    if (prod) {
      const { error } = await supabase.from('romaneios').update({ produto_id: prod.id }).eq('id', rom.id)
      if (!error) prVinc++
    }
  }
  console.log(`  Vinculados: ${prVinc}\n`)

  // === PRODUTORES ===
  const semProdutor = romaneios.filter(r => r.produtor?.trim() && !r.produtor_id)
  console.log(`--- PRODUTORES ---`)
  console.log(`Romaneios sem produtor_id: ${semProdutor.length}`)
  let pdVinc = 0
  for (const rom of semProdutor) {
    const nome = rom.produtor.trim().toLowerCase()
    const cad = cadastros.find(c =>
      (c.tipos || []).includes('Produtor') && (
        c.nome?.toLowerCase() === nome ||
        c.nome_fantasia?.toLowerCase() === nome ||
        c.nome?.toLowerCase().includes(nome)
      )
    )
    if (cad) {
      const { error } = await supabase.from('romaneios').update({ produtor_id: cad.id }).eq('id', rom.id)
      if (!error) pdVinc++
    }
  }
  console.log(`  Vinculados: ${pdVinc}\n`)

  // === DESTINOS ===
  const semDestino = romaneios.filter(r => r.fornecedor_destinatario?.trim() && !r.destinatario_id)
  console.log(`--- DESTINOS ---`)
  console.log(`Romaneios sem destinatario_id: ${semDestino.length}`)
  let dsVinc = 0
  const destNaoEncontrados = []
  for (const rom of semDestino) {
    const nome = rom.fornecedor_destinatario.trim().toLowerCase()
    const cad = cadastros.find(c =>
      c.nome?.toLowerCase() === nome ||
      c.nome_fantasia?.toLowerCase() === nome ||
      c.nome?.toLowerCase().includes(nome) ||
      c.nome_fantasia?.toLowerCase()?.includes(nome)
    )
    if (cad) {
      const { error } = await supabase.from('romaneios').update({ destinatario_id: cad.id }).eq('id', rom.id)
      if (!error) dsVinc++
    } else {
      if (!destNaoEncontrados.includes(rom.fornecedor_destinatario.trim()))
        destNaoEncontrados.push(rom.fornecedor_destinatario.trim())
    }
  }
  console.log(`  Vinculados: ${dsVinc}`)
  if (destNaoEncontrados.length) console.log(`  Nao encontrados: ${destNaoEncontrados.join(', ')}`)

  // === RELATORIO FINAL ===
  console.log('\n=== RELATORIO FINAL ===')
  const { data: final } = await supabase.from('romaneios').select('id, placa, motorista, transportadora, produto, produtor, fornecedor_destinatario, veiculo_id, motorista_id, transportadora_id, produto_id, produtor_id, destinatario_id')
  const fPlaca = final.filter(r => r.placa?.trim() && !r.veiculo_id)
  const fMot = final.filter(r => r.motorista?.trim() && !r.motorista_id)
  const fTr = final.filter(r => r.transportadora?.trim() && !r.transportadora_id)
  const fPr = final.filter(r => r.produto?.trim() && !r.produto_id)
  const fPd = final.filter(r => r.produtor?.trim() && !r.produtor_id)
  const fDs = final.filter(r => r.fornecedor_destinatario?.trim() && !r.destinatario_id)
  console.log(`Placas sem vinculo: ${fPlaca.length}`)
  console.log(`Motoristas sem vinculo: ${fMot.length}`)
  console.log(`Transportadoras sem vinculo: ${fTr.length}`)
  console.log(`Produtos sem vinculo: ${fPr.length}`)
  console.log(`Produtores sem vinculo: ${fPd.length}`)
  console.log(`Destinos sem vinculo: ${fDs.length}`)
  console.log('\n=== CONCLUIDO ===')
}

main().catch(e => console.error('ERRO:', e))
