import { supabase } from '../lib/supabase'

function throwIfError({ data, error }: any) {
  if (error) throw error
  return data
}

// === CADASTROS (unificado: fornecedores + locais) ===
export const getCadastros = async () =>
  throwIfError(await supabase.from('cadastros').select('*').order('nome'))

export const getCadastro = async (id: string) =>
  throwIfError(await supabase.from('cadastros').select('*').eq('id', id).single())

export const createCadastro = async (data: any) =>
  throwIfError(await supabase.from('cadastros').insert(data).select().single())

export const updateCadastro = async (id: string, data: any) =>
  throwIfError(await supabase.from('cadastros').update(data).eq('id', id).select().single())

export const deleteCadastro = async (id: string) =>
  throwIfError(await supabase.from('cadastros').delete().eq('id', id))

// === VEICULOS ===
export const getVeiculos = async () => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*, cadastros(nome, nome_fantasia)')
    .order('placa')
  if (error) throw error
  return data.map((v: any) => ({ ...v, proprietario_nome: v.cadastros?.nome_fantasia || v.cadastros?.nome }))
}

export const getVeiculo = async (id: string) =>
  throwIfError(await supabase.from('veiculos').select('*').eq('id', id).single())

export const createVeiculo = async (data: any) =>
  throwIfError(await supabase.from('veiculos').insert(data).select().single())

export const updateVeiculo = async (id: string, data: any) =>
  throwIfError(await supabase.from('veiculos').update(data).eq('id', id).select().single())

export const deleteVeiculo = async (id: string) =>
  throwIfError(await supabase.from('veiculos').delete().eq('id', id))

// === PRODUTOS ===
export const getProdutos = async () =>
  throwIfError(await supabase.from('produtos').select('*').order('nome'))

export const getProduto = async (id: string) =>
  throwIfError(await supabase.from('produtos').select('*').eq('id', id).single())

export const createProduto = async (data: any) =>
  throwIfError(await supabase.from('produtos').insert(data).select().single())

export const updateProduto = async (id: string, data: any) =>
  throwIfError(await supabase.from('produtos').update(data).eq('id', id).select().single())

export const deleteProduto = async (id: string) =>
  throwIfError(await supabase.from('produtos').delete().eq('id', id))

// === PRECOS CONTRATADOS ===
export const getPrecos = async () => {
  const { data, error } = await supabase
    .from('precos_contratados')
    .select(`
      *,
      origem:cadastros!precos_contratados_origem_id_fkey(nome, nome_fantasia),
      destino:cadastros!precos_contratados_destino_id_fkey(nome, nome_fantasia),
      produtos(nome, tipo),
      fornecedor:cadastros!precos_contratados_fornecedor_id_fkey(nome, nome_fantasia)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((p: any) => ({
    ...p,
    origem_nome: p.origem?.nome_fantasia || p.origem?.nome,
    destino_nome: p.destino?.nome_fantasia || p.destino?.nome,
    produto_nome: p.produtos?.nome,
    produto_tipo: p.produtos?.tipo,
    fornecedor_nome: p.fornecedor?.nome_fantasia || p.fornecedor?.nome,
  }))
}

export const getPreco = async (id: string) =>
  throwIfError(await supabase.from('precos_contratados').select('*').eq('id', id).single())

export const createPreco = async (data: any) =>
  throwIfError(await supabase.from('precos_contratados').insert(data).select().single())

export const updatePreco = async (id: string, data: any) =>
  throwIfError(await supabase.from('precos_contratados').update(data).eq('id', id).select().single())

export const deletePreco = async (id: string) =>
  throwIfError(await supabase.from('precos_contratados').delete().eq('id', id))

// === ANO SAFRA ===
export const getAnosSafra = async () =>
  throwIfError(await supabase.from('ano_safra').select('*').order('nome'))

export const createAnoSafra = async (data: any) =>
  throwIfError(await supabase.from('ano_safra').insert(data).select().single())

export const updateAnoSafra = async (id: string, data: any) =>
  throwIfError(await supabase.from('ano_safra').update(data).eq('id', id).select().single())

export const deleteAnoSafra = async (id: string) =>
  throwIfError(await supabase.from('ano_safra').delete().eq('id', id))

// === TIPOS NF ===
export const getTiposNf = async () =>
  throwIfError(await supabase.from('tipos_nf').select('*').order('nome'))

export const createTipoNf = async (data: any) =>
  throwIfError(await supabase.from('tipos_nf').insert(data).select().single())

export const updateTipoNf = async (id: string, data: any) =>
  throwIfError(await supabase.from('tipos_nf').update(data).eq('id', id).select().single())

export const deleteTipoNf = async (id: string) =>
  throwIfError(await supabase.from('tipos_nf').delete().eq('id', id))

// === TIPOS TICKET ===
export const getTiposTicket = async () =>
  throwIfError(await supabase.from('tipos_ticket').select('*').order('nome'))

export const createTipoTicket = async (data: any) =>
  throwIfError(await supabase.from('tipos_ticket').insert(data).select().single())

export const updateTipoTicket = async (id: string, data: any) =>
  throwIfError(await supabase.from('tipos_ticket').update(data).eq('id', id).select().single())

export const deleteTipoTicket = async (id: string) =>
  throwIfError(await supabase.from('tipos_ticket').delete().eq('id', id))

// === TIPOS CAMINHAO ===
export const getTiposCaminhao = async () =>
  throwIfError(await supabase.from('tipos_caminhao').select('*').order('nome'))

export const createTipoCaminhao = async (data: any) =>
  throwIfError(await supabase.from('tipos_caminhao').insert(data).select().single())

export const updateTipoCaminhao = async (id: string, data: any) =>
  throwIfError(await supabase.from('tipos_caminhao').update(data).eq('id', id).select().single())

export const deleteTipoCaminhao = async (id: string) =>
  throwIfError(await supabase.from('tipos_caminhao').delete().eq('id', id))

// === OPERACOES ===
export const getOperacoes = async () => {
  const { data, error } = await supabase
    .from('operacoes')
    .select('*, ano_safra(id, nome)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((o: any) => ({ ...o, ano_safra_nome: o.ano_safra?.nome || null }))
}

export const createOperacao = async (data: any) =>
  throwIfError(await supabase.from('operacoes').insert(data).select().single())

export const updateOperacao = async (id: string, data: any) =>
  throwIfError(await supabase.from('operacoes').update(data).eq('id', id).select().single())

export const deleteOperacao = async (id: string) =>
  throwIfError(await supabase.from('operacoes').delete().eq('id', id))

// === ORDENS DE CARREGAMENTO ===
export const getOrdens = async () => {
  const { data, error } = await supabase
    .from('ordens_carregamento')
    .select(`
      *,
      origem:cadastros!ordens_carregamento_origem_id_fkey(nome, nome_fantasia),
      destino:cadastros!ordens_carregamento_destino_id_fkey(nome, nome_fantasia),
      produtos(nome, tipo),
      operacoes(id, nome)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((o: any) => ({
    ...o,
    origem_nome: o.origem?.nome_fantasia || o.origem?.nome,
    destino_nome: o.destino?.nome_fantasia || o.destino?.nome,
    produto_nome: o.produtos?.nome,
    operacao_nome: o.operacoes?.nome || null,
  }))
}

export const createOrdem = async (data: any) =>
  throwIfError(await supabase.from('ordens_carregamento').insert(data).select().single())

export const updateOrdem = async (id: string, data: any) =>
  throwIfError(await supabase.from('ordens_carregamento').update(data).eq('id', id).select().single())

export const deleteOrdem = async (id: string) =>
  throwIfError(await supabase.from('ordens_carregamento').delete().eq('id', id))

// === ORDEM_TRANSPORTADORES (junction) ===
export const getOrdemTransportadores = async (ordemId: string) => {
  const { data, error } = await supabase
    .from('ordem_transportadores')
    .select(`
      *,
      transportador:cadastros!ordem_transportadores_transportador_id_fkey(id, nome, nome_fantasia),
      motorista:cadastros!ordem_transportadores_motorista_id_fkey(id, nome, nome_fantasia),
      veiculos(id, placa, tipo_caminhao)
    `)
    .eq('ordem_id', ordemId)
  if (error) throw error
  return data
}

export const addOrdemTransportador = async (data: any) =>
  throwIfError(await supabase.from('ordem_transportadores').insert(data).select().single())

export const removeOrdemTransportador = async (id: string) =>
  throwIfError(await supabase.from('ordem_transportadores').delete().eq('id', id))

// === ROMANEIOS ===
export const getRomaneios = async () => {
  const { data, error } = await supabase
    .from('romaneios')
    .select(`
      *,
      ordens_carregamento(numero_ordem_fmt, nome_ordem, origem_id, destino_id, produto_id,
        origem:cadastros!ordens_carregamento_origem_id_fkey(id, nome, nome_fantasia),
        destino:cadastros!ordens_carregamento_destino_id_fkey(id, nome, nome_fantasia),
        produtos(id, nome)
      ),
      tipos_nf(id, nome),
      tipos_ticket(id, nome),
      ano_safra(id, nome)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((r: any) => ({
    ...r,
    ordem_nome: r.ordens_carregamento?.nome_ordem || r.ordens_carregamento?.numero_ordem_fmt || null,
  }))
}

export const createRomaneio = async (data: any) =>
  throwIfError(await supabase.from('romaneios').insert(data).select().single())

export const updateRomaneio = async (id: string, data: any) =>
  throwIfError(await supabase.from('romaneios').update(data).eq('id', id).select().single())

export const deleteRomaneio = async (id: string) =>
  throwIfError(await supabase.from('romaneios').delete().eq('id', id))

// === UPLOAD IMAGEM ROMANEIO (Supabase Storage) ===
// === CULTURAS (universal) ===
export const getCulturas = async () =>
  throwIfError(await supabase.from('culturas').select('*').order('nome'))

export const createCultura = async (data: any) =>
  throwIfError(await supabase.from('culturas').insert(data).select().single())

export const updateCultura = async (id: string, data: any) =>
  throwIfError(await supabase.from('culturas').update(data).eq('id', id).select().single())

export const deleteCultura = async (id: string) =>
  throwIfError(await supabase.from('culturas').delete().eq('id', id))

// === TIPOS SAFRA (universal) ===
export const getTiposSafra = async () =>
  throwIfError(await supabase.from('tipos_safra').select('*').order('nome'))

export const createTipoSafra = async (data: any) =>
  throwIfError(await supabase.from('tipos_safra').insert(data).select().single())

export const updateTipoSafra = async (id: string, data: any) =>
  throwIfError(await supabase.from('tipos_safra').update(data).eq('id', id).select().single())

export const deleteTipoSafra = async (id: string) =>
  throwIfError(await supabase.from('tipos_safra').delete().eq('id', id))

// === SAFRAS (universal — combina ano_safra + cultura + tipo_safra) ===
export const getSafras = async () => {
  const { data, error } = await supabase
    .from('safras')
    .select('*, ano_safra:ano_safra(nome), culturas(nome), tipos_safra(nome)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((s: any) => ({
    ...s,
    ano_safra_nome: s.ano_safra?.nome,
    cultura_nome: s.culturas?.nome,
    tipo_safra_nome: s.tipos_safra?.nome,
  }))
}

export const createSafra = async (data: any) =>
  throwIfError(await supabase.from('safras').insert(data).select().single())

export const updateSafra = async (id: string, data: any) =>
  throwIfError(await supabase.from('safras').update(data).eq('id', id).select().single())

export const deleteSafra = async (id: string) =>
  throwIfError(await supabase.from('safras').delete().eq('id', id))

export const getSafraByAegroKey = async (aegroKey: string) => {
  const { data } = await supabase.from('safras').select('id').eq('aegro_crop_key', aegroKey).maybeSingle()
  return data
}

export const upsertSafraFromAegro = async (aegroKey: string, payload: any) => {
  const existing = await getSafraByAegroKey(aegroKey)
  if (existing) {
    return throwIfError(await supabase.from('safras').update(payload).eq('id', existing.id).select().single())
  }
  return throwIfError(await supabase.from('safras').insert({ ...payload, aegro_crop_key: aegroKey }).select().single())
}

// === CONTRATOS DE VENDA (ContAgru) ===
export const getContratosVenda = async () => {
  const { data, error } = await supabase
    .from('contratos_venda')
    .select(`
      *,
      comprador:cadastros!contratos_venda_comprador_id_fkey(nome, nome_fantasia),
      corretor:cadastros!contratos_venda_corretor_id_fkey(nome, nome_fantasia),
      produtos(nome, tipo),
      safras(nome),
      local_entrega:cadastros!contratos_venda_local_entrega_id_fkey(nome, nome_fantasia)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((c: any) => ({
    ...c,
    comprador_nome: c.comprador?.nome_fantasia || c.comprador?.nome,
    corretor_nome: c.corretor?.nome_fantasia || c.corretor?.nome,
    produto_nome: c.produtos?.nome,
    safra_nome: c.safras?.nome,
    local_entrega_nome: c.local_entrega?.nome_fantasia || c.local_entrega?.nome,
  }))
}

export const createContratoVenda = async (data: any) =>
  throwIfError(await supabase.from('contratos_venda').insert(data).select().single())

export const updateContratoVenda = async (id: string, data: any) =>
  throwIfError(await supabase.from('contratos_venda').update(data).eq('id', id).select().single())

export const deleteContratoVenda = async (id: string) =>
  throwIfError(await supabase.from('contratos_venda').delete().eq('id', id))

// === COMPRA DE INSUMOS (ContAgru) ===
export const getComprasInsumo = async () => {
  const { data, error } = await supabase
    .from('contratos_compra_insumo')
    .select(`
      *,
      fornecedor:cadastros!contratos_compra_insumo_fornecedor_id_fkey(nome, nome_fantasia),
      produtos(nome, tipo),
      safras(nome)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((c: any) => ({
    ...c,
    fornecedor_nome: c.fornecedor?.nome_fantasia || c.fornecedor?.nome,
    produto_nome: c.produtos?.nome,
    safra_nome: c.safras?.nome,
  }))
}

export const createCompraInsumo = async (data: any) =>
  throwIfError(await supabase.from('contratos_compra_insumo').insert(data).select().single())

export const updateCompraInsumo = async (id: string, data: any) =>
  throwIfError(await supabase.from('contratos_compra_insumo').update(data).eq('id', id).select().single())

export const deleteCompraInsumo = async (id: string) =>
  throwIfError(await supabase.from('contratos_compra_insumo').delete().eq('id', id))

// === INTEGRAÇÕES ===
export const getIntegracoes = async () => {
  const { data, error } = await supabase.from('integracoes').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const getIntegracaoByProvedor = async (provedor: string) => {
  const { data, error } = await supabase.from('integracoes').select('*').eq('provedor', provedor).maybeSingle()
  if (error) throw error
  return data
}

export const upsertIntegracao = async (provedor: string, payload: any) => {
  const existing = await getIntegracaoByProvedor(provedor)
  if (existing) {
    return throwIfError(await supabase.from('integracoes').update(payload).eq('id', existing.id).select().single())
  }
  return throwIfError(await supabase.from('integracoes').insert({ provedor, ...payload }).select().single())
}

export const deleteIntegracao = async (id: string) =>
  throwIfError(await supabase.from('integracoes').delete().eq('id', id))

// === UPLOAD IMAGEM ROMANEIO ===
export const uploadRomaneioImage = async (base64DataUrl: string, romaneioId?: string): Promise<string> => {
  
  const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    throw new Error('Formato de imagem inválido')
  }
  
  const mimeType = match[1]
  const ext = mimeType.split('/')[1] || 'jpeg'
  
  const byteString = atob(match[2])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  const blob = new Blob([ab], { type: mimeType })

  const fileName = `${romaneioId || crypto.randomUUID()}_${Date.now()}.${ext}`
  
  const { data, error } = await supabase.storage
    .from('romaneios-img')
    .upload(fileName, blob, { contentType: mimeType, upsert: true })
  
  if (error) {
    throw new Error(`Erro ao fazer upload: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from('romaneios-img')
    .getPublicUrl(fileName)
  
  return urlData.publicUrl
}
