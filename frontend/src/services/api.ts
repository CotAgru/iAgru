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

// Cadastros com vínculo Aegro
export const getImportedAegroCadastros = async () => {
  const { data } = await supabase.from('cadastros').select('id, aegro_company_key, nome, nome_fantasia, cpf_cnpj, telefone1, uf, cidade, tipos').not('aegro_company_key', 'is', null)
  return data || []
}

export const upsertCadastroAegroKey = async (id: string, aegroKey: string) =>
  throwIfError(await supabase.from('cadastros').update({ aegro_company_key: aegroKey, tipo_cadastro: 'api', origem_cadastro: 'aegro' }).eq('id', id).select().single())

export const createCadastroFromAegro = async (data: any) =>
  throwIfError(await supabase.from('cadastros').insert({ ...data, tipo_cadastro: 'api', origem_cadastro: 'aegro' }).select().single())

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
    .select('*, ano_safra(id, nome), operacao_safras(id, safra_id, safras(id, nome))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((o: any) => ({
    ...o,
    ano_safra_nome: o.ano_safra?.nome || null,
    safra_ids: (o.operacao_safras || []).map((os: any) => os.safra_id),
    safras_nomes: (o.operacao_safras || []).map((os: any) => os.safras?.nome).filter(Boolean),
  }))
}

export const createOperacao = async (data: any) =>
  throwIfError(await supabase.from('operacoes').insert(data).select().single())

export const updateOperacao = async (id: string, data: any) =>
  throwIfError(await supabase.from('operacoes').update(data).eq('id', id).select().single())

export const deleteOperacao = async (id: string) =>
  throwIfError(await supabase.from('operacoes').delete().eq('id', id))

// === JUNCTION: OPERACAO_SAFRAS ===
export const getOperacaoSafras = async (operacaoId: string) =>
  throwIfError(await supabase.from('operacao_safras').select('*, safras(id, nome)').eq('operacao_id', operacaoId))

export const syncOperacaoSafras = async (operacaoId: string, safraIds: string[]) => {
  await supabase.from('operacao_safras').delete().eq('operacao_id', operacaoId)
  if (safraIds.length > 0) {
    const rows = safraIds.map(sid => ({ operacao_id: operacaoId, safra_id: sid }))
    const { error } = await supabase.from('operacao_safras').insert(rows)
    if (error) throw error
  }
}

// === JUNCTION: CONTRATO_VENDA_SAFRAS ===
export const syncContratoVendaSafras = async (contratoId: string, safraIds: string[]) => {
  await supabase.from('contrato_venda_safras').delete().eq('contrato_venda_id', contratoId)
  if (safraIds.length > 0) {
    const rows = safraIds.map(sid => ({ contrato_venda_id: contratoId, safra_id: sid }))
    const { error } = await supabase.from('contrato_venda_safras').insert(rows)
    if (error) throw error
  }
}

// === JUNCTION: CONTRATO_COMPRA_SAFRAS ===
export const syncContratoCompraSafras = async (contratoId: string, safraIds: string[]) => {
  await supabase.from('contrato_compra_safras').delete().eq('contrato_compra_insumo_id', contratoId)
  if (safraIds.length > 0) {
    const rows = safraIds.map(sid => ({ contrato_compra_insumo_id: contratoId, safra_id: sid }))
    const { error } = await supabase.from('contrato_compra_safras').insert(rows)
    if (error) throw error
  }
}

// === JUNCTION: ROMANEIO_SAFRAS ===
export const syncRomaneioSafras = async (romaneioId: string, safraIds: string[]) => {
  await supabase.from('romaneio_safras').delete().eq('romaneio_id', romaneioId)
  if (safraIds.length > 0) {
    const rows = safraIds.map(sid => ({ romaneio_id: romaneioId, safra_id: sid }))
    const { error } = await supabase.from('romaneio_safras').insert(rows)
    if (error) throw error
  }
}

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
      ano_safra(id, nome),
      romaneio_safras(id, safra_id, safras(id, nome))
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((r: any) => ({
    ...r,
    ordem_nome: r.ordens_carregamento?.nome_ordem || r.ordens_carregamento?.numero_ordem_fmt || null,
    safra_ids: (r.romaneio_safras || []).map((rs: any) => rs.safra_id),
    safras_nomes: (r.romaneio_safras || []).map((rs: any) => rs.safras?.nome).filter(Boolean),
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

export const getImportedAegroSafras = async () => {
  const { data } = await supabase.from('safras').select('id, aegro_crop_key, nome, cultura_id, tipo_safra_id, ano_safra_id, area_ha, data_inicio, data_fim').not('aegro_crop_key', 'is', null)
  return data || []
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
      ano_safra(nome),
      contrato_venda_safras(id, safra_id, safras(id, nome)),
      local_entrega:cadastros!contratos_venda_local_entrega_id_fkey(nome, nome_fantasia),
      unidades_medida(nome, simbolo, grupo, fator_conversao)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((c: any) => ({
    ...c,
    comprador_nome: c.comprador?.nome_fantasia || c.comprador?.nome,
    corretor_nome: c.corretor?.nome_fantasia || c.corretor?.nome,
    produto_nome: c.produtos?.nome,
    ano_safra_nome: c.ano_safra?.nome,
    safra_ids: (c.contrato_venda_safras || []).map((s: any) => s.safra_id),
    safras_nomes: (c.contrato_venda_safras || []).map((s: any) => s.safras?.nome).filter(Boolean),
    local_entrega_nome: c.local_entrega?.nome_fantasia || c.local_entrega?.nome,
    volume_tons: c.quantidade || 0,
    preco_valor: c.valor_unitario || 0,
    preco_unidade: c.unidades_medida?.simbolo || '',
    unidade_nome: c.unidades_medida?.nome || '',
    unidade_fator: c.unidades_medida?.fator_conversao || 1,
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
      ano_safra(nome),
      contrato_compra_safras(id, safra_id, safras(id, nome)),
      unidades_medida(nome, simbolo, grupo, fator_conversao)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((c: any) => ({
    ...c,
    fornecedor_nome: c.fornecedor?.nome_fantasia || c.fornecedor?.nome,
    produto_nome: c.produtos?.nome,
    ano_safra_nome: c.ano_safra?.nome,
    safra_ids: (c.contrato_compra_safras || []).map((s: any) => s.safra_id),
    safras_nomes: (c.contrato_compra_safras || []).map((s: any) => s.safras?.nome).filter(Boolean),
    volume_tons: c.quantidade || 0,
    preco_valor: c.valor_unitario || 0,
    preco_unidade: c.unidades_medida?.simbolo || '',
    unidade_nome: c.unidades_medida?.nome || '',
    unidade_fator: c.unidades_medida?.fator_conversao || 1,
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

// === UPLOAD IMAGEM/PDF ROMANEIO ===
export const uploadRomaneioImage = async (base64DataUrl: string, romaneioId?: string): Promise<string> => {
  
  const match = base64DataUrl.match(/^data:((image\/\w+)|(application\/pdf));base64,(.+)$/)
  if (!match) {
    throw new Error('Formato de arquivo inválido. Aceito: imagens ou PDF')
  }
  
  const mimeType = match[1]
  const ext = mimeType === 'application/pdf' ? 'pdf' : (mimeType.split('/')[1] || 'jpeg')
  
  const base64Data = match[4]
  const byteString = atob(base64Data)
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


// === UNIDADES DE MEDIDA ===
export const getUnidadesMedida = async () =>
  throwIfError(await supabase.from('unidades_medida').select('*').order('grupo', { ascending: true }).order('nome'))

export const createUnidadeMedida = async (data: any) =>
  throwIfError(await supabase.from('unidades_medida').insert(data).select().single())

export const updateUnidadeMedida = async (id: string, data: any) =>
  throwIfError(await supabase.from('unidades_medida').update(data).eq('id', id).select().single())

export const deleteUnidadeMedida = async (id: string) =>
  throwIfError(await supabase.from('unidades_medida').delete().eq('id', id))

// ============================================================
// === SILAGRU — UNIDADES ARMAZENADORAS ===
// ============================================================
export const getUnidadesArmazenadoras = async () => {
  const { data, error } = await supabase
    .from('unidades_armazenadoras')
    .select('*, cadastros(id, nome, nome_fantasia, uf, cidade, logradouro, tipos)')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data || []).map((u: any) => ({
    ...u,
    cadastro_nome: u.cadastros?.nome_fantasia || u.cadastros?.nome || u.nome,
    cadastro_uf: u.cadastros?.uf || u.uf,
    cadastro_cidade: u.cadastros?.cidade || u.cidade,
  }))
}

export const createUnidadeArmazenadora = async (data: any) =>
  throwIfError(await supabase.from('unidades_armazenadoras').insert(data).select().single())

export const updateUnidadeArmazenadora = async (id: string, data: any) =>
  throwIfError(await supabase.from('unidades_armazenadoras').update(data).eq('id', id).select().single())

export const deleteUnidadeArmazenadora = async (id: string) =>
  throwIfError(await supabase.from('unidades_armazenadoras').delete().eq('id', id))

// === ESTRUTURAS DE ARMAZENAMENTO ===
export const getEstruturas = async (unidadeId: string) => {
  const { data, error } = await supabase
    .from('estruturas_armazenamento')
    .select('*, produtos(nome)')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data || []).map((e: any) => ({ ...e, produto_nome: e.produtos?.nome }))
}

export const getEstruturasByUnidade = async (unidadeId: string) => {
  const { data, error } = await supabase
    .from('estruturas_armazenamento')
    .select('id, nome, tipo, capacidade_tons')
    .eq('unidade_id', unidadeId)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return data || []
}

export const createEstrutura = async (data: any) =>
  throwIfError(await supabase.from('estruturas_armazenamento').insert(data).select().single())

export const updateEstrutura = async (id: string, data: any) =>
  throwIfError(await supabase.from('estruturas_armazenamento').update(data).eq('id', id).select().single())

export const deleteEstrutura = async (id: string) =>
  throwIfError(await supabase.from('estruturas_armazenamento').delete().eq('id', id))

// ============================================================
// === TIPOS DE ARMAZÉM ===
// ============================================================

export const getTiposArmazem = async () => {
  const { data, error } = await supabase
    .from('tipos_armazem')
    .select('*')
    .order('nome')
  if (error) throw error
  return data || []
}

export const createTipoArmazem = async (data: any) =>
  throwIfError(await supabase.from('tipos_armazem').insert(data).select().single())

export const updateTipoArmazem = async (id: string, data: any) =>
  throwIfError(await supabase.from('tipos_armazem').update(data).eq('id', id).select().single())

export const deleteTipoArmazem = async (id: string) =>
  throwIfError(await supabase.from('tipos_armazem').delete().eq('id', id))

// ============================================================
// === SILAGRU — TABELAS DE DESCONTO ===
// ============================================================
export const getTabelasDesconto = async () => {
  const { data, error } = await supabase
    .from('tabelas_desconto')
    .select('*, produtos(nome), ano_safra(nome)')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data || []).map((t: any) => ({
    ...t,
    produto_nome: t.produtos?.nome,
    ano_safra_nome: t.ano_safra?.nome,
  }))
}

export const getTabelasDescontoPorProduto = async (produtoId: string) => {
  const { data, error } = await supabase
    .from('tabelas_desconto')
    .select('*')
    .eq('produto_id', produtoId)
    .eq('ativo', true)
    .order('tipo_desconto')
  if (error) throw error
  return data || []
}

export const createTabelaDesconto = async (data: any) =>
  throwIfError(await supabase.from('tabelas_desconto').insert(data).select().single())

export const updateTabelaDesconto = async (id: string, data: any) =>
  throwIfError(await supabase.from('tabelas_desconto').update(data).eq('id', id).select().single())

export const deleteTabelaDesconto = async (id: string) =>
  throwIfError(await supabase.from('tabelas_desconto').delete().eq('id', id))

// === FAIXAS DE DESCONTO ===
export const getFaixasDesconto = async (tabelaId: string) => {
  const { data, error } = await supabase
    .from('faixas_desconto')
    .select('*')
    .eq('tabela_id', tabelaId)
    .order('grau')
  if (error) throw error
  return data || []
}

export const createFaixaDesconto = async (data: any) =>
  throwIfError(await supabase.from('faixas_desconto').insert(data).select().single())

export const deleteFaixaDesconto = async (id: string) =>
  throwIfError(await supabase.from('faixas_desconto').delete().eq('id', id))

export const deleteFaixasDescontoPorTabela = async (tabelaId: string) =>
  throwIfError(await supabase.from('faixas_desconto').delete().eq('tabela_id', tabelaId))

// ============================================================
// === SILAGRU — TARIFAS DE ARMAZENAGEM ===
// ============================================================
export const getTarifasArmazenagem = async () => {
  const { data, error } = await supabase
    .from('tarifas_armazenagem')
    .select('*, unidades_armazenadoras(nome), ano_safra(nome)')
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data || []).map((t: any) => ({
    ...t,
    unidade_nome: t.unidades_armazenadoras?.nome,
    ano_safra_nome: t.ano_safra?.nome,
  }))
}

export const createTarifaArmazenagem = async (data: any) =>
  throwIfError(await supabase.from('tarifas_armazenagem').insert(data).select().single())

export const updateTarifaArmazenagem = async (id: string, data: any) =>
  throwIfError(await supabase.from('tarifas_armazenagem').update(data).eq('id', id).select().single())

export const deleteTarifaArmazenagem = async (id: string) =>
  throwIfError(await supabase.from('tarifas_armazenagem').delete().eq('id', id))

// === ITENS DE TARIFA ===
export const getTarifaItens = async (tarifaId: string) => {
  const { data, error } = await supabase
    .from('tarifa_itens')
    .select('*, produtos(nome)')
    .eq('tarifa_id', tarifaId)
    .eq('ativo', true)
    .order('categoria')
  if (error) throw error
  return (data || []).map((i: any) => ({ ...i, produto_nome: i.produtos?.nome }))
}

export const createTarifaItem = async (data: any) =>
  throwIfError(await supabase.from('tarifa_itens').insert(data).select().single())

export const updateTarifaItem = async (id: string, data: any) =>
  throwIfError(await supabase.from('tarifa_itens').update(data).eq('id', id).select().single())

export const deleteTarifaItem = async (id: string) =>
  throwIfError(await supabase.from('tarifa_itens').delete().eq('id', id))

// ============================================================
// === SILAGRU — ROMANEIOS DE ARMAZÉM ===
// ============================================================
export const getRomaneiosArmazem = async (tipo?: string) => {
  let query = supabase
    .from('romaneios_armazem')
    .select(`
      *,
      depositante:cadastros!romaneios_armazem_depositante_id_fkey(nome, nome_fantasia),
      produto:produtos!romaneios_armazem_produto_id_fkey(nome),
      unidade:unidades_armazenadoras!romaneios_armazem_unidade_id_fkey(nome),
      transportadora:cadastros!romaneios_armazem_transportadora_id_fkey(nome, nome_fantasia),
      motorista:cadastros!romaneios_armazem_motorista_id_fkey(nome, nome_fantasia)
    `)
    .eq('ativo', true)
    .order('created_at', { ascending: false })

  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((r: any) => ({
    ...r,
    depositante_nome: r.depositante?.nome_fantasia || r.depositante?.nome,
    produto_nome: r.produto?.nome,
    unidade_nome: r.unidade?.nome,
    transportadora_nome: r.transportadora?.nome_fantasia || r.transportadora?.nome,
    motorista_nome: r.motorista?.nome_fantasia || r.motorista?.nome,
  }))
}

export const createRomaneioArmazem = async (data: any) =>
  throwIfError(await supabase.from('romaneios_armazem').insert(data).select().single())

export const updateRomaneioArmazem = async (id: string, data: any) =>
  throwIfError(await supabase.from('romaneios_armazem').update(data).eq('id', id).select().single())

export const deleteRomaneioArmazem = async (id: string) =>
  throwIfError(await supabase.from('romaneios_armazem').update({ ativo: false }).eq('id', id))

// ============================================================
// === SILAGRU — QUEBRA TÉCNICA ===
// ============================================================
export const getQuebraTecnica = async () => {
  const { data, error } = await supabase
    .from('quebra_tecnica')
    .select(`
      *,
      depositante:cadastros!quebra_tecnica_depositante_id_fkey(nome, nome_fantasia),
      produto:produtos!quebra_tecnica_produto_id_fkey(nome)
    `)
    .order('data_calculo', { ascending: false })
  if (error) throw error
  return (data || []).map((q: any) => ({
    ...q,
    depositante_nome: q.depositante?.nome_fantasia || q.depositante?.nome,
    produto_nome: q.produto?.nome,
  }))
}

export const calcularQuebraTecnica = async (data: any) =>
  throwIfError(await supabase.from('quebra_tecnica').insert(data).select().single())

// ============================================================
// === SILAGRU — COBRANÇAS DE ARMAZENAGEM ===
// ============================================================
export const getCobrancas = async () => {
  const { data, error } = await supabase
    .from('cobrancas_armazenagem')
    .select(`
      *,
      depositante:cadastros!cobrancas_armazenagem_depositante_id_fkey(nome, nome_fantasia),
      produto:produtos(nome),
      unidade:unidades_armazenadoras!cobrancas_armazenagem_unidade_id_fkey(nome)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((c: any) => ({
    ...c,
    depositante_nome: c.depositante?.nome_fantasia || c.depositante?.nome,
    produto_nome: c.produto?.nome,
    unidade_nome: c.unidade?.nome,
  }))
}

export const createCobranca = async (data: any) =>
  throwIfError(await supabase.from('cobrancas_armazenagem').insert(data).select().single())

export const updateCobranca = async (id: string, data: any) =>
  throwIfError(await supabase.from('cobrancas_armazenagem').update(data).eq('id', id).select().single())

export const deleteCobranca = async (id: string) =>
  throwIfError(await supabase.from('cobrancas_armazenagem').delete().eq('id', id))
