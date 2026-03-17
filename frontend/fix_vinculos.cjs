const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envContent = fs.readFileSync('.env', 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) env[key.trim()] = vals.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function main() {
  console.log('=== VARREDURA AUTOMATICA DE VINCULOS ===\n')

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
  console.log(`--- PLACAS ---`)
  console.log(`Romaneios com placa sem veiculo_id: ${semVeiculo.length}`)
  if (semVeiculo.length > 0) {
    const placas = [...new Set(semVeiculo.map(r => r.placa.trim().toUpperCase()))]
    console.log(`Placas unicas: ${placas.join(', ')}`)
    let vinc = 0
    for (const rom of semVeiculo) {
      const placa = rom.placa.trim().toUpperCase()
      const veic = veiculos.find(v => v.placa.toUpperCase() === placa)
      if (veic) {
        await supabase.from('romaneios').update({ veiculo_id: veic.id }).eq('id', rom.id)
        vinc++
      }
    }
    console.log(`Vinculados: ${vinc}`)
  }

  // === MOTORISTAS ===
  const semMotorista = romaneios.filter(r => r.motorista?.trim() && !r.motorista_id)
  console.log(`\n--- MOTORISTAS ---`)
  console.log(`Romaneios sem motorista_id: ${semMotorista.length}`)
  if (semMotorista.length > 0) {
    let vinc = 0
    for (const rom of semMotorista) {
      const nome = rom.motorista.trim().toLowerCase()
      const cad = cadastros.find(c =>
        (c.tipos || []).includes('Motorista') && (
          c.nome?.toLowerCase() === nome ||
          c.nome_fantasia?.toLowerCase() === nome ||
          c.nome?.toLowerCase().includes(nome) ||
          c.nome_fantasia?.toLowerCase()?.includes(nome)
        )
      )
      if (cad) {
        await supabase.from('romaneios').update({ motorista_id: cad.id }).eq('id', rom.id)
        vinc++
      }
    }
    console.log(`Vinculados: ${vinc}`)
  }

  // === TRANSPORTADORAS ===
  const semTransp = romaneios.filter(r => r.transportadora?.trim() && !r.transportadora_id)
  console.log(`\n--- TRANSPORTADORAS ---`)
  console.log(`Romaneios sem transportadora_id: ${semTransp.length}`)
  if (semTransp.length > 0) {
    let vinc = 0
    for (const rom of semTransp) {
      const nome = rom.transportadora.trim().toLowerCase()
      const cad = cadastros.find(c =>
        (c.tipos || []).includes('Transportadora') && (
          c.nome?.toLowerCase() === nome ||
          c.nome_fantasia?.toLowerCase() === nome ||
          c.nome?.toLowerCase().includes(nome) ||
          c.nome_fantasia?.toLowerCase()?.includes(nome)
        )
      )
      if (cad) {
        await supabase.from('romaneios').update({ transportadora_id: cad.id }).eq('id', rom.id)
        vinc++
      }
    }
    console.log(`Vinculados: ${vinc}`)
  }

  // === PRODUTOS ===
  const semProduto = romaneios.filter(r => r.produto?.trim() && !r.produto_id)
  console.log(`\n--- PRODUTOS ---`)
  console.log(`Romaneios sem produto_id: ${semProduto.length}`)
  if (semProduto.length > 0) {
    let vinc = 0
    for (const rom of semProduto) {
      const nome = rom.produto.trim().toLowerCase()
      const prod = produtos.find(p =>
        p.nome?.toLowerCase() === nome ||
        p.nome?.toLowerCase().includes(nome) ||
        nome.includes(p.nome?.toLowerCase())
      )
      if (prod) {
        await supabase.from('romaneios').update({ produto_id: prod.id }).eq('id', rom.id)
        vinc++
      }
    }
    console.log(`Vinculados: ${vinc}`)
  }

  // === PRODUTORES ===
  const semProdutor = romaneios.filter(r => r.produtor?.trim() && !r.produtor_id)
  console.log(`\n--- PRODUTORES ---`)
  console.log(`Romaneios sem produtor_id: ${semProdutor.length}`)
  if (semProdutor.length > 0) {
    let vinc = 0
    for (const rom of semProdutor) {
      const nome = rom.produtor.trim().toLowerCase()
      const cad = cadastros.find(c =>
        (c.tipos || []).includes('Produtor') && (
          c.nome?.toLowerCase() === nome ||
          c.nome_fantasia?.toLowerCase() === nome ||
          c.nome?.toLowerCase().includes(nome) ||
          c.nome_fantasia?.toLowerCase()?.includes(nome)
        )
      )
      if (cad) {
        await supabase.from('romaneios').update({ produtor_id: cad.id }).eq('id', rom.id)
        vinc++
      }
    }
    console.log(`Vinculados: ${vinc}`)
  }

  // === DESTINOS ===
  const semDestino = romaneios.filter(r => r.fornecedor_destinatario?.trim() && !r.destinatario_id)
  console.log(`\n--- DESTINOS ---`)
  console.log(`Romaneios sem destinatario_id: ${semDestino.length}`)
  if (semDestino.length > 0) {
    const destUnicos = [...new Set(semDestino.map(r => r.fornecedor_destinatario.trim()))]
    console.log(`Destinos unicos: ${destUnicos.join(', ')}`)
    let vinc = 0
    const naoEncontrados = []
    for (const rom of semDestino) {
      const nome = rom.fornecedor_destinatario.trim().toLowerCase()
      const cad = cadastros.find(c =>
        c.nome?.toLowerCase() === nome ||
        c.nome_fantasia?.toLowerCase() === nome ||
        c.nome?.toLowerCase().includes(nome) ||
        c.nome_fantasia?.toLowerCase()?.includes(nome)
      )
      if (cad) {
        await supabase.from('romaneios').update({ destinatario_id: cad.id }).eq('id', rom.id)
        vinc++
      } else {
        if (!naoEncontrados.includes(rom.fornecedor_destinatario.trim()))
          naoEncontrados.push(rom.fornecedor_destinatario.trim())
      }
    }
    console.log(`Vinculados: ${vinc}`)
    if (naoEncontrados.length) console.log(`Nao encontrados: ${naoEncontrados.join(', ')}`)
  }

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
