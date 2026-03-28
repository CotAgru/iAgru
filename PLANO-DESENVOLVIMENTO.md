# Plano de Desenvolvimento - Ecossistema iAgru
> Atualizado em: 26/03/2026

> Documento de referência técnica consolidada: [PROJETO-MEMORIA-CONTEXTO.md](./PROJETO-MEMORIA-CONTEXTO.md)

---

## 1. Visão Geral do Ecossistema

O **iAgru** é uma plataforma modular unificada para gestão do produtor rural brasileiro. Cada módulo atende uma necessidade específica, compartilhando entidades universais (Cadastros, Produtos, Safra).

| Sistema | Status | Deploy | Descrição |
|---------|--------|--------|-----------|
| CotAgru | ✅ Ativo | GitHub | Gestão de orçamentos agrícolas |
| PecAgru | ✅ Ativo | GitHub | Análise dados Irancho + dashboards |
| DocAgru | ✅ Ativo | GitHub | Gestão e arquivamento de documentos |
| PlanAgru | ✅ Ativo | GitHub | Planejamento financeiro + API Aegro |
| **iAgru** | ✅ v2.0 | Vercel + Supabase | Plataforma modular unificada |
| → FretAgru | ✅ Produção | (integrado) | Gestão de fretes agrícolas + BI completo |
| → ContAgru | ✅ MVP funcional | (integrado) | Contratos de venda + compra insumos |
| **SilAgru** | ✅ Produção | (integrado) | Armazenamento de grãos (10 páginas, 3 fases concluídas) |

**URL de Produção:** https://fretagru.vercel.app/

> **Nota:** O módulo "VendAgu" foi renomeado para **ContAgru** e está integrado à plataforma iAgru.

---

## 2. Arquitetura Modular iAgru v2.0

### 2.1 Entidades Universais (compartilhadas)
- **Cadastros** — Unificado para todos os tipos (Fornecedor, Transportadora, Motorista, Comprador, Corretor, etc.)
- **Produtos** — Commodities e insumos agrícolas
- **Safra** — Ano Safra, Culturas, Tipos de Safra, Safras (composição: Ano + Cultura + Tipo)

### 2.2 Módulo FretAgru (Gestão de Fretes)
- **Operações** — Agrupamento lógico de ordens/romaneios
- **Ordens de Carregamento** — Planejamento de transporte
- **Romaneios** — Tickets de pesagem com:
  - OCR (Gemini AI) para digitalização automática de imagens
  - 7 tipos de desconto (umidade, impureza, avariados, ardidos, esverdeados, partidos, quebrados)
  - Anexar imagens ou PDFs (upload Supabase Storage bucket `romaneios-img`)
  - Preview inteligente: card azul para PDFs com nome do arquivo, imagem para fotos
  - Exportação individual em PDF formatado (botão verde no modal)
  - **⚠️ BASE DE CÁLCULO DO FRETE:** SEMPRE peso líquido (sem desconto), NUNCA peso corrigido
- **Veículos** — Cadastro de caminhões/placas
- **Preços Contratados** — Tabela de preços por rota + cálculo de distância (Google Maps)
- **Dashboard BI FretAgru** — BI completo **INTERLIGADO** estilo Power BI:
  - 5 KPIs reativos aos filtros: Total Viagens, Vol. s/Desc, Vol. c/Desc, Vlr Unit Médio, Vlr Total a Pagar
  - Seletor de unidade KG/SC/TN (padrão SC)
  - **9 filtros globais interativos**: Ano Safra, Safra, Produto, Origem, Destino, Transportadora, Motorista, Placa, **Tipo Ticket**
  - **🎯 Header de Filtros Ativos**: Badges azuis mostrando filtros aplicados, remoção individual com X, botão "Limpar Tudo"
  - **4 gráficos CLICÁVEIS**: Volume mensal, Valor frete mensal, Volume por produto (clique → filtra), **Tipo Ticket** (clique → filtra)
  - **Tabelas clicáveis**: Transportadora/Placa/Motorista (clique na linha → filtra), Rotas (clique → filtra origem + destino)
  - Análise de Descontos por Origem (7 tipos abertos, % desconto com badges)
  - Frete Excedente — Custo do Volume Não Vendável (mini-cards + tabela por rota)
  - **Sistema totalmente interligado**: Qualquer clique em gráfico ou tabela aplica filtro, todos os elementos reagem simultaneamente

### 2.3 Módulo ContAgru (Gestão de Contratos)
- **Contratos de Venda** — Commodities: comprador, corretor, produto, safra, volume, preço, modalidade (FOB/CIF), status
- **Compra de Insumos** — Fertilizantes, defensivos, sementes: fornecedor, produto, safra, quantidade, preço
- **Dashboard ContAgru** — Indicadores: volume vendido, valor total, status dos contratos

### 2.4 Navegação
- **Dashboard Geral** — Visão consolidada de todos os módulos
- **Menu FretAgru** — Operações, Ordens, Romaneios, Veículos, Preços, Dashboard
- **Menu ContAgru** — Dashboard, Contratos Venda, Compra Insumos
- **Menu Geral** — Cadastros, Produtos, Safra
- **Menu Sistema** — Admin, Importação

---

## 3. Banco de Dados Supabase

### 3.1 Migrations Executadas
| Migration | Descrição |
|-----------|----------|
| v1 | Tabelas base: cadastros, veiculos, produtos, precos_contratados |
| v3 | Ordens de carregamento e romaneios |
| v4 | Ordem_transportadores (N:N) |
| v5 | Operações |
| v6 | Ano_safra, tipos_nf, tipos_ticket + refatoração romaneios |
| v7 | Script de correção/vinculação de dados |
| v8 | Tipos_caminhao |
| v9 | Tipos_caminhao eixos |
| v10 | Auth + RLS (preparação) |
| v11 | Organizações e auth (preparação futura) |
| **v12** | Culturas, tipos_safra, safras (universal) |
| **v13** | Contratos_venda, contratos_compra_insumo (ContAgru) |
| v14 | Tabela integracoes (token Aegro, farm_id, status, config) |
| v15 | Aegro keys em cadastros |
| v16 | Tipo origem cadastro |
| v17 | Tipo pessoa, apelido |
| v18 | Arquivo contratos |
| v19 | Melhorias contratos (campos adicionais) |
| v20 | ano_safra_id em contratos |
| v21 | Multi-safra (safra_ids array em romaneios) |
| v22 | RLS, unidades, tipos |
| v23 | Storage buckets (imagens de romaneios) |
| **v24** | **romaneio ↔ contrato_venda (vinculação FretAgru ↔ ContAgru)** |

### 3.2 Tabelas Ativas
**Universais:** `cadastros`, `produtos`, `ano_safra`, `culturas`, `tipos_safra`, `safras`
**FretAgru:** `operacoes`, `ordens_carregamento`, `ordem_transportadores`, `romaneios`, `veiculos`, `precos_contratados`
**ContAgru:** `contratos_venda`, `contratos_compra_insumo`
**Auxiliares:** `tipos_nf`, `tipos_ticket`, `tipos_caminhao`

---

## 4. Funcionalidades Implementadas

### 4.1 Já Concluído ✅
- [x] CRUD completo: Cadastros, Produtos, Veículos, Preços, Operações, Ordens, Romaneios
- [x] Upload de imagens de romaneios (Supabase Storage)
- [x] OCR com Gemini AI para extração automática de dados de romaneios
- [x] Cálculo de distância via Google Maps Distance Matrix API
- [x] Exportação Excel em todas as listagens principais
- [x] Exportação PDF de detalhamento de preço
- [x] Importação em lote via wizard (Excel)
- [x] Layout modular com menu lateral responsivo
- [x] Dashboard Geral consolidado com dados reais
- [x] Dashboard FretAgru com gráficos (Recharts)
- [x] Módulo Safra completo (4 abas: Ano Safra, Culturas, Tipos, Safras)
- [x] Módulo ContAgru funcional (Contratos Venda + Compra Insumos)
- [x] Dashboard ContAgru com dados reais
- [x] Ordenação clicável em todas as colunas de tabela
- [x] Formatação pt-BR (números, datas, moeda)
- [x] Responsivo mobile + desktop
- [x] Limpeza de console.logs de produção
- [x] Tipos "Comprador" e "Corretor" adicionados em Cadastros
- [x] Página de Integrações (Aegro) — conexão, token, farm_id
- [x] Serviço Aegro API (teste de conexão, farms, crops, elements)
- [x] Migration v14: tabela `integracoes` (token, farm_id, status, config)
- [x] **BI FretAgru completo** — 5 KPIs, 8 filtros globais, 4 gráficos, 3 tabelas analíticas
- [x] **Seletor de unidade KG/SC/TN** no BI (padrão SC) + conversão em todos os volumes
- [x] **Análise de Descontos por Origem** — 7 tipos abertos, % desconto com badges coloridos
- [x] **Frete Excedente** — Custo do volume não vendável por rota (mini-cards + tabela)
- [x] **Cálculo frete corrigido**: peso_liquido × vlr_unit (frete sobre volume sem desconto)
- [x] **Campos decimais** nos descontos de romaneio (aceita 538,93 kg)
- [x] **Seletor de unidade na tela Romaneios** (KG/TN/SC) com reconversão de volumes
- [x] **Migration v24**: vinculação romaneio ↔ contrato_venda (campo contrato_venda_id)
- [x] Migrations v15-v23: melhorias em cadastros, contratos, multi-safra, storage
- [x] **Header sticky no BI**: Barra de título + seletor unidade + filtros fixa no topo ao rolar
- [x] **SilAgru — Fase 1 completa**: Módulo de armazenamento de grãos integrado ao ecossistema
  - Migration v25: 9 tabelas (unidades_armazenadoras, estruturas_armazenamento, tabelas_desconto, faixas_desconto, tarifas_armazenagem, tarifa_itens, romaneios_armazem, quebra_tecnica, cobrancas_armazenagem)
  - 7 páginas: Dashboard Armazém, Unidades/Silos, Romaneios Entrada, Romaneios Saída, Estoque, Tabelas de Desconto, Tarifas de Serviço
  - Cálculo automático de descontos (umidade, impureza, avariados, ardidos, esverdeados, partidos, quebrados) por interpolação nas tabelas cadastradas
  - Estoque por depositante × produto (entradas − saídas)
  - Menu lateral com módulo SilAgru (cor âmbar)
- [x] **SilAgru — Fase 2 completa**: Quebra Técnica (0,01%/dia), Cobranças (CRUD + geração em lote), Fechamento Mensal (extrato consolidado), Dashboard BI avançado (7 KPIs + gráficos Recharts)
- [x] **SilAgru — Fase 3 completa**: Vínculo FretAgru (romaneio_frete_id), vínculo ContAgru (contrato_venda_id), importação Excel de faixas de desconto, extrato PDF (jsPDF + autoTable)

### 4.2 Próximas Melhorias — Prioridade Alta
- [ ] **Autenticação**: Login com Supabase Auth (email/senha), RLS por organização
- [ ] **Integração Aegro — Sync Safras**: Importar crops do Aegro → tabela `safras` (crop_id)
- [ ] **Integração Aegro — Sync Produtos**: Importar elements do Aegro → tabela `produtos` (via catalog_id → farm_id)
- [ ] **Integração Aegro — Sync Cadastros**: Sincronizar fornecedores e locais
- [ ] **Filtros avançados**: Período, operação, safra, status em todas as listagens
- [ ] **Paginação server-side**: Para listagens grandes (romaneios, ordens)
- [ ] **Fixações parciais**: Contratar X sacas a preço Y em contratos de venda
- [x] **Vinculação contrato ↔ romaneio na UI**: Implementada nos romaneios FretAgru e SilAgru

### 4.3 Próximas Melhorias — Prioridade Média
- [ ] **Validação de formulários**: CPF/CNPJ, placa, campos obrigatórios
- [ ] **Duplicação de ordens**: Botão para clonar ordem existente
- [ ] **Status nos romaneios**: Workflow (rascunho → conferido → finalizado)
- [ ] **Breadcrumbs**: Navegação por contexto
- [ ] **Loading skeletons**: Animação de carregamento nas listagens
- [ ] **Busca global**: Campo unificado no header

### 4.4 Visão Futura
- [ ] **Pricing e Mercado**: Cotações CBOT, B3, câmbio, simulador de preço
- [ ] **Integração PlanAgru**: Custo de produção como referência de preço mínimo
- [ ] **SilAgru — Fase 4**: Integração com balanças rodoviárias (API/Serial), leitura automática de peso
- [ ] **Modo offline**: Cache local para áreas sem internet
- [ ] **Notificações push**: Alertas de ordens/contratos pendentes

---

## 5. Integração Aegro

### 5.1 Visão Geral
O Aegro é o sistema de gestão agrícola usado pela fazenda. A integração permite sincronizar dados entre iAgru e Aegro.

- **API Base**: `https://api.aegro.com.br/api/v1`
- **Autenticação**: Bearer Token (solicitar em token@aegro.com.br)
- **Farm ID**: Identificador da fazenda no Aegro (`61af6824b4d7196ebc0076f0`)
- **Todas as APIs são vinculadas ao farm_id**

### 5.2 Hierarquia de Dados no Aegro
```
farm_id (fazenda)
├── crops (safras) → crop_id
├── catalogs (catálogos) → catalog_id
│   └── elements (produtos/insumos) → element_id
├── suppliers (fornecedores)
└── fields (talhões)
```

### 5.3 Mapeamento Aegro ↔ iAgru
| Aegro | iAgru | Tabela | Campo de vínculo |
|-------|-------|--------|-----------------|
| farm | organização | `integracoes` | `farm_id` |
| crop | safra | `safras` | `aegro_crop_id` (futuro) |
| element | produto | `produtos` | `aegro_element_id` (futuro) |
| catalog | catálogo | — | `config.catalog_id` |
| supplier | cadastro (Fornecedor) | `cadastros` | `aegro_supplier_id` (futuro) |

### 5.4 Hierarquia Futura com Autenticação
```
Organização (farm_id no Aegro)
├── Proprietário (cria a conta, vincula farm_id)
├── Equipe (convites por email)
│   ├── Perfil: Proprietário (acesso total)
│   ├── Perfil: Financeiro (contratos, preços)
│   ├── Perfil: Operacional (ordens, romaneios)
│   └── Perfil: Visualização (somente leitura)
└── Dados isolados por organização (RLS)
```

### 5.5 Roadmap de Integração
| Fase | Funcionalidade | Status |
|------|---------------|--------|
| 1 | Página de Integrações + teste de conexão | ✅ |
| 2 | Importar Safras (crops → safras) | 🔜 |
| 3 | Importar Produtos (elements → produtos) | 🔜 |
| 4 | Sync Cadastros (suppliers → cadastros) | 📋 |
| 5 | Sync bidirecional (push + pull) | 📋 |

---

## 6. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | TailwindCSS |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Notificações | React Hot Toast |
| Roteamento | React Router DOM v6 |
| Exportação | xlsx + file-saver + jspdf + jspdf-autotable |
| Mapas | @vis.gl/react-google-maps |
| Integração | Aegro API v1 (Bearer Token) |
| Backend | Supabase (PostgreSQL + Auth + Storage) |
| Deploy | Vercel |

---

## 7. Decisões Arquiteturais

- **Plataforma modular única**: Todos os módulos (FretAgru, ContAgru, futuros) rodam na mesma aplicação React
- **Supabase como backend único**: PostgreSQL + Auth + Storage + Realtime
- **Frontend direto no Supabase**: Sem backend intermediário (API via client SDK)
- **Entidades compartilhadas**: Cadastros, Produtos e Safra são universais entre módulos
- **RLS sem auth (fase atual)**: Permite tudo para anon — auth será implementado como próxima fase
- **Formatação padronizada**: Utilitários centralizados em `utils/format.ts` (pt-BR)
- **Componentes reutilizáveis**: SortHeader, Pagination, ExportButtons usados em todo o sistema
- **Integração Aegro**: Token armazenado no Supabase (tabela `integracoes`), farm_id vincula todos os dados
- **Hierarquia futura**: Organização → Equipe → Perfis de acesso, vinculado ao farm_id do Aegro
