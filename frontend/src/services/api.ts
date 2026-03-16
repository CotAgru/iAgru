import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// === FORNECEDORES ===
export const getFornecedores = (params?: Record<string, string>) =>
  api.get('/fornecedores', { params }).then(r => r.data);

export const getFornecedor = (id: string) =>
  api.get(`/fornecedores/${id}`).then(r => r.data);

export const createFornecedor = (data: any) =>
  api.post('/fornecedores', data).then(r => r.data);

export const updateFornecedor = (id: string, data: any) =>
  api.put(`/fornecedores/${id}`, data).then(r => r.data);

export const deleteFornecedor = (id: string) =>
  api.delete(`/fornecedores/${id}`).then(r => r.data);

// === VEICULOS ===
export const getVeiculos = (params?: Record<string, string>) =>
  api.get('/veiculos', { params }).then(r => r.data);

export const getVeiculo = (id: string) =>
  api.get(`/veiculos/${id}`).then(r => r.data);

export const createVeiculo = (data: any) =>
  api.post('/veiculos', data).then(r => r.data);

export const updateVeiculo = (id: string, data: any) =>
  api.put(`/veiculos/${id}`, data).then(r => r.data);

export const deleteVeiculo = (id: string) =>
  api.delete(`/veiculos/${id}`).then(r => r.data);

// === LOCAIS ===
export const getLocais = (params?: Record<string, string>) =>
  api.get('/locais', { params }).then(r => r.data);

export const getLocal = (id: string) =>
  api.get(`/locais/${id}`).then(r => r.data);

export const createLocal = (data: any) =>
  api.post('/locais', data).then(r => r.data);

export const updateLocal = (id: string, data: any) =>
  api.put(`/locais/${id}`, data).then(r => r.data);

export const deleteLocal = (id: string) =>
  api.delete(`/locais/${id}`).then(r => r.data);

// === PRODUTOS ===
export const getProdutos = (params?: Record<string, string>) =>
  api.get('/produtos', { params }).then(r => r.data);

export const getProduto = (id: string) =>
  api.get(`/produtos/${id}`).then(r => r.data);

export const createProduto = (data: any) =>
  api.post('/produtos', data).then(r => r.data);

export const updateProduto = (id: string, data: any) =>
  api.put(`/produtos/${id}`, data).then(r => r.data);

export const deleteProduto = (id: string) =>
  api.delete(`/produtos/${id}`).then(r => r.data);

// === PRECOS CONTRATADOS ===
export const getPrecos = (params?: Record<string, string>) =>
  api.get('/precos', { params }).then(r => r.data);

export const getPreco = (id: string) =>
  api.get(`/precos/${id}`).then(r => r.data);

export const createPreco = (data: any) =>
  api.post('/precos', data).then(r => r.data);

export const updatePreco = (id: string, data: any) =>
  api.put(`/precos/${id}`, data).then(r => r.data);

export const deletePreco = (id: string) =>
  api.delete(`/precos/${id}`).then(r => r.data);
