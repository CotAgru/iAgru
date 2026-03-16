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

// === ORDENS DE CARREGAMENTO ===
export const getOrdens = async () => {
  const { data, error } = await supabase
    .from('ordens_carregamento')
    .select(`
      *,
      origem:cadastros!ordens_carregamento_origem_id_fkey(nome, nome_fantasia),
      destino:cadastros!ordens_carregamento_destino_id_fkey(nome, nome_fantasia),
      produtos(nome, tipo)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((o: any) => ({
    ...o,
    origem_nome: o.origem?.nome_fantasia || o.origem?.nome,
    destino_nome: o.destino?.nome_fantasia || o.destino?.nome,
    produto_nome: o.produtos?.nome,
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
    .select(`*, ordens_carregamento(numero_ordem_fmt, nome_ordem)`)
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
