import { supabase } from '../lib/supabase'

function throwIfError({ data, error }: any) {
  if (error) throw error
  return data
}

// === FORNECEDORES ===
export const getFornecedores = async () =>
  throwIfError(await supabase.from('fornecedores').select('*').order('nome'))

export const getFornecedor = async (id: string) =>
  throwIfError(await supabase.from('fornecedores').select('*').eq('id', id).single())

export const createFornecedor = async (data: any) =>
  throwIfError(await supabase.from('fornecedores').insert(data).select().single())

export const updateFornecedor = async (id: string, data: any) =>
  throwIfError(await supabase.from('fornecedores').update(data).eq('id', id).select().single())

export const deleteFornecedor = async (id: string) =>
  throwIfError(await supabase.from('fornecedores').delete().eq('id', id))

// === VEICULOS ===
export const getVeiculos = async () => {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*, fornecedores(nome)')
    .order('placa')
  if (error) throw error
  return data.map((v: any) => ({ ...v, fornecedor_nome: v.fornecedores?.nome }))
}

export const getVeiculo = async (id: string) =>
  throwIfError(await supabase.from('veiculos').select('*').eq('id', id).single())

export const createVeiculo = async (data: any) =>
  throwIfError(await supabase.from('veiculos').insert(data).select().single())

export const updateVeiculo = async (id: string, data: any) =>
  throwIfError(await supabase.from('veiculos').update(data).eq('id', id).select().single())

export const deleteVeiculo = async (id: string) =>
  throwIfError(await supabase.from('veiculos').delete().eq('id', id))

// === LOCAIS ===
export const getLocais = async () =>
  throwIfError(await supabase.from('locais').select('*').order('nome'))

export const getLocal = async (id: string) =>
  throwIfError(await supabase.from('locais').select('*').eq('id', id).single())

export const createLocal = async (data: any) =>
  throwIfError(await supabase.from('locais').insert(data).select().single())

export const updateLocal = async (id: string, data: any) =>
  throwIfError(await supabase.from('locais').update(data).eq('id', id).select().single())

export const deleteLocal = async (id: string) =>
  throwIfError(await supabase.from('locais').delete().eq('id', id))

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
      origem:locais!precos_contratados_origem_id_fkey(nome),
      destino:locais!precos_contratados_destino_id_fkey(nome),
      produtos(nome, tipo),
      fornecedores(nome)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((p: any) => ({
    ...p,
    origem_nome: p.origem?.nome,
    destino_nome: p.destino?.nome,
    produto_nome: p.produtos?.nome,
    produto_tipo: p.produtos?.tipo,
    fornecedor_nome: p.fornecedores?.nome,
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
