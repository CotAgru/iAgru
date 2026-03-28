# PROJETO-MEMORIA-CONTEXTO.md — Ecossistema iAgru

> Memória técnica consolidada do ecossistema iAgru.
> Última atualização: 26/03/2026

---

## 1. Visão de Negócio

### O que é o iAgru?

O **iAgru** é um ecossistema de ferramentas de gestão desenvolvido **por produtor rural para produtores rurais** no Brasil. O objetivo é preencher lacunas operacionais e analíticas que os sistemas de mercado (Aegro, Irancho) não cobrem, gerando inteligência de dados para tomada de decisão no campo.

### Problema que resolve

O produtor rural brasileiro lida com múltiplas frentes simultâneas — frete de grãos, contratos de venda futura, compra de insumos, armazenagem — usando planilhas ou sistemas fragmentados. O iAgru unifica essas frentes em uma plataforma modular, com dashboards interativos e integração nativa com Aegro e Irancho.

### Módulos do Ecossistema

| Módulo | Descrição | Status | Deploy |
|--------|-----------|--------|--------|
| **CotAgru** | Gestão de orçamentos agrícolas | ✅ Ativo | GitHub |
| **PecAgru** | Análise de dados Irancho + dashboards pecuários | ✅ Ativo | GitHub |
| **DocAgru** | Gestão, análise e arquivamento de documentos | ✅ Ativo | GitHub |
| **PlanAgru** | Planejamento financeiro + comparativo Planejado × Realizado (API Aegro) | ✅ Ativo | GitHub |
| **FretAgru** | Gestão de fretes agrícolas (operações, ordens, romaneios, veículos, preços, BI) | ✅ Produção | Vercel + Supabase |
| **ContAgru** | Gestão de contratos de venda futura e compra de insumos | ✅ MVP funcional | (integrado ao FretAgru) |
| **SilAgru** | Gestão de armazenamento de grãos (recebimento, classificação, estoque, tarifas, descontos) | ✅ MVP funcional | (integrado ao FretAgru) |

> **Nota:** O módulo "VendAgu" foi renomeado para **ContAgru** e absorvido como módulo dentro da plataforma iAgru (mesmo deploy do FretAgru).

### Culturas e Atividades Suportadas

- **Grãos:** Soja, Milho, Sorgo, Feijão
- **Pecuária:** Recria, engorda a pasto, semi-confinamento, confinamento estativo
- **Integrações:** Aegro (gestão rural), Irancho (gestão pecuária)

---

## 2. Stack Tecnológica e Arquitetura

### Stack Real (em produção)

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React + TypeScript | 18.x + TS 5.3 |
| **Build** | Vite | 5.x |
| **Estilização** | TailwindCSS | 3.4 |
| **Ícones** | Lucide React | 0.303 |
| **Gráficos** | Recharts | 3.8 |
| **Notificações** | React Hot Toast | 2.4 |
| **Roteamento** | React Router DOM | 6.21 |
| **Exportação** | xlsx + file-saver + jsPDF + jspdf-autotable | — |
| **Mapas** | @vis.gl/react-google-maps | 1.7 |
| **Backend/DB** | Supabase (PostgreSQL + Auth + Storage) | SDK 2.99 |
| **Deploy** | Vercel | — |
| **URL Produção** | https://fretagru.vercel.app/ | — |

### Decisão Arquitetural Principal

**O frontend conecta diretamente ao Supabase via client SDK.** Não existe backend intermediário (Node/Express). Todas as queries, inserts, updates e deletes são feitos via `@supabase/supabase-js` no arquivo `frontend/src/services/api.ts`.

### Estrutura de Pastas (FretAgru — repositório principal)

```
FretAgru/
├── frontend/
│   └── src/
│       ├── components/       # 8 componentes reutilizáveis
│       │   ├── Layout.tsx           # Menu lateral modular (FretAgru + ContAgru + Geral + Sistema)
│       │   ├── SortHeader.tsx       # Ordenação clicável em colunas
│       │   ├── Pagination.tsx       # Paginação client-side (25/50/100)
│       │   ├── ExportButtons.tsx    # Botões PDF/Excel
│       │   ├── ViewModal.tsx        # Modal de detalhes
│       │   ├── SearchableSelect.tsx # Select com busca
│       │   ├── MultiSearchableSelect.tsx
│       │   └── InfoTooltip.tsx
│       ├── pages/            # 27 páginas
│       │   ├── DashboardGeral.tsx        # Visão consolidada de todos os módulos
│       │   ├── Dashboard.tsx             # BI Fretes (856 linhas — KPIs, filtros, gráficos, tabelas)
│       │   ├── DashboardContratos.tsx    # Dashboard ContAgru
│       │   ├── Operacoes.tsx             # FretAgru
│       │   ├── Ordens.tsx                # FretAgru
│       │   ├── Romaneios.tsx             # FretAgru (84K — maior arquivo)
│       │   ├── Veiculos.tsx              # FretAgru
│       │   ├── Precos.tsx                # FretAgru
│       │   ├── Importacao.tsx            # Wizard 7 etapas (Excel)
│       │   ├── ContratosVenda.tsx        # ContAgru
│       │   ├── CompraInsumos.tsx         # ContAgru
│       │   ├── armazem/                  # SilAgru (10 páginas)
│       │   │   ├── DashboardArmazem.tsx  # KPIs + gráficos Recharts
│       │   │   ├── UnidadesSilos.tsx     # CRUD unidades + estruturas
│       │   │   ├── RomaneioEntrada.tsx   # Classificação + descontos + vínculo FretAgru
│       │   │   ├── RomaneioSaida.tsx     # Expedição + vínculo ContAgru
│       │   │   ├── Estoque.tsx           # Saldo por depositante × produto
│       │   │   ├── TabelasDesconto.tsx   # CRUD + faixas + importação Excel
│       │   │   ├── TarifasServico.tsx    # 12 categorias de tarifas
│       │   │   ├── QuebraTecnica.tsx     # Cálculo diário (0,01%/dia)
│       │   │   ├── Cobrancas.tsx         # CRUD + geração em lote
│       │   │   └── FechamentoMensal.tsx  # Extrato consolidado + PDF
│       │   ├── Cadastros.tsx             # Universal
│       │   ├── Produtos.tsx              # Universal
│       │   ├── Safra.tsx                 # Universal (4 abas: Ano, Culturas, Tipos, Safras)
│       │   ├── Admin.tsx                 # Sistema
│       │   ├── Integracoes.tsx           # Aegro API (99K)
│       │   └── Login.tsx                 # Preparado (auth não ativo)
│       ├── services/
│       │   ├── api.ts          # Todas as queries Supabase (790+ linhas)
│       │   └── aegro.ts        # Cliente da API Aegro
│       ├── utils/
│       │   ├── format.ts       # Formatação pt-BR (157 linhas)
│       │   ├── export.ts       # Exportação Excel/PDF
│       │   └── importHelpers.ts # Helpers do wizard de importação
│       ├── hooks/
│       │   └── useSort.ts      # Hook de ordenação
│       └── lib/
│           └── supabase.ts     # Configuração do client Supabase
├── supabase/                   # 29 arquivos de migration (v1 a v25)
├── .vercel/                    # Config Vercel
└── vercel.json
```

### Navegação (definida em Layout.tsx)

```
Dashboard Geral (/)
├── FretAgru
│   ├── Dashboard Fretes (/frete/dashboard)
│   ├── Operações (/frete/operacoes)
│   ├── Ordens de Carregamento (/frete/ordens)
│   ├── Romaneios (/frete/romaneios)
│   ├── Veículos (/frete/veiculos)
│   ├── Preços Contratados (/frete/precos)
│   └── Importação (/frete/importacao)
├── ContAgru
│   ├── Dashboard Contratos (/contratos/dashboard)
│   ├── Contratos de Venda (/contratos/venda)
│   └── Compra de Insumos (/contratos/compra)
├── SilAgru (cor âmbar)
│   ├── Dashboard Armazém (/armazem/dashboard)
│   ├── Unidades/Silos (/armazem/unidades)
│   ├── Romaneios Entrada (/armazem/romaneios-entrada)
│   ├── Romaneios Saída (/armazem/romaneios-saida)
│   ├── Estoque (/armazem/estoque)
│   ├── Tabelas de Desconto (/armazem/tabelas-desconto)
│   ├── Tarifas de Serviço (/armazem/tarifas)
│   ├── Quebra Técnica (/armazem/quebra-tecnica)
│   ├── Cobranças (/armazem/cobrancas)
│   └── Fechamento Mensal (/armazem/fechamento)
├── Geral
│   ├── Cadastros (/cadastros)
│   ├── Produtos (/produtos)
│   └── Safra (/safra)
└── Sistema
    ├── Administração (/admin)
    └── Integrações (/integracoes)
```

---

## 3. Banco de Dados Supabase

### Entidades Universais (compartilhadas entre módulos)

| Tabela | Descrição |
|--------|-----------|
| `cadastros` | Unificado: Fornecedor, Transportadora, Motorista, Comprador, Corretor, Armazém, Fazenda |
| `produtos` | Grãos (soja, milho, sorgo, feijão) e insumos |
| `ano_safra` | Ex: 2024/2025 |
| `culturas` | Ex: Soja, Milho |
| `tipos_safra` | Ex: Safra, Safrinha |
| `safras` | Composição: Ano Safra + Cultura + Tipo (ex: 2024/2025 - Soja - Safra) |

### Tabelas FretAgru

| Tabela | Descrição |
|--------|-----------|
| `operacoes` | Agrupamento lógico de ordens/romaneios por safra |
| `ordens_carregamento` | Planejamento: origem, destino, produto, transportadores |
| `ordem_transportadores` | Relação N:N entre ordens e transportadoras |
| `romaneios` | Ticket de pesagem: pesos (bruto, tara, líquido, corrigido), descontos (7 tipos), dados de frete |
| `veiculos` | Placa, tipo, eixos, peso pauta, proprietário |
| `precos_contratados` | Preço por rota/produto (R$/ton, R$/sc, R$/viagem, R$/km) |

### Tabelas ContAgru

| Tabela | Descrição |
|--------|-----------|
| `contratos_venda` | Venda futura de commodities: comprador, corretor, produto, safra, volume_tons, preco_valor, modalidade (FOB/CIF), status |
| `contratos_compra_insumo` | Compra de insumos: fornecedor, produto, safra, quantidade, preço |

### Tabelas SilAgru (Migration v25)

| Tabela | Descrição |
|--------|-----------|
| `unidades_armazenadoras` | Armazéns físicos (nome, endereço, capacidade) |
| `estruturas_armazenamento` | Silos/tulhas dentro de cada unidade |
| `tabelas_desconto` | Tabelas de desconto por produto × tipo × safra |
| `faixas_desconto` | Faixas grau→desconto% dentro de cada tabela |
| `tarifas_armazenagem` | Tarifas por categoria (12 tipos: recebimento, secagem, estocagem, etc.) |
| `tarifa_itens` | Itens de tarifa vinculados a cada tarifa |
| `romaneios_armazem` | Romaneios de entrada/saída com classificação, descontos e vínculos (romaneio_frete_id, contrato_venda_id) |
| `quebra_tecnica` | Registro diário de perda técnica (0,01%/dia) por depositante × produto |
| `cobrancas_armazenagem` | Cobranças geradas (estocagem, ad valorem, expedição, etc.) |

### Tabelas Auxiliares

| Tabela | Descrição |
|--------|-----------|
| `tipos_nf` | Tipos de nota fiscal |
| `tipos_ticket` | Tipos de ticket de pesagem |
| `tipos_caminhao` | Tipos de caminhão + eixos |
| `integracoes` | Token Aegro, farm_id, status, config |

### Vinculação entre Módulos (Migration v24)

A migration v24 adicionou `contrato_venda_id` na tabela `romaneios`, permitindo vincular um romaneio (entrega de frete) a um contrato de venda (ContAgru). Isso conecta os dois módulos:

```sql
ALTER TABLE romaneios
ADD COLUMN IF NOT EXISTS contrato_venda_id UUID REFERENCES contratos_venda(id) ON DELETE SET NULL;
```

### Migrations Executadas (v1 a v25)

| Migration | Descrição |
|-----------|-----------|
| v1 | Tabelas base: cadastros, veiculos, produtos, precos_contratados |
| v3 | Ordens de carregamento e romaneios |
| v4 | Ordem_transportadores (N:N) |
| v5 | Operações |
| v6 | Ano_safra, tipos_nf, tipos_ticket + refatoração romaneios |
| v7 | Script de correção/vinculação de dados |
| v8 | Tipos_caminhao |
| v9 | Tipos_caminhao eixos |
| v10 | Auth + RLS (preparação) |
| v11 | Organizações e auth |
| v12 | Culturas, tipos_safra, safras (universal) |
| v13 | contratos_venda, contratos_compra_insumo (ContAgru) |
| v14 | Tabela integracoes (token, farm_id, status, config) |
| v15 | Aegro keys em cadastros |
| v16 | Tipo origem cadastro |
| v17 | Tipo pessoa, apelido |
| v18 | Arquivo contratos |
| v19 | Melhorias contratos |
| v20 | ano_safra_id em contratos |
| v21 | Multi-safra (safra_ids array) |
| v22 | RLS, unidades, tipos |
| v23 | Storage buckets (imagens romaneios) |
| v24 | romaneio ↔ contrato_venda (vinculação FretAgru ↔ ContAgru) |
| **v25** | **SilAgru**: unidades_armazenadoras, estruturas_armazenamento, tabelas_desconto, faixas_desconto, tarifas_armazenagem, tarifa_itens, romaneios_armazem, quebra_tecnica, cobrancas_armazenagem |

---

## 4. Convenções de Código

### Formatação pt-BR (obrigatório em todo o ecossistema)

Todas as regras estão centralizadas em `frontend/src/utils/format.ts`:

| Tipo | Formato | Exemplo | Função |
|------|---------|---------|--------|
| Inteiro com milhar | `"."` para milhar | `45.000` | `fmtInt()` |
| Decimal | `"."` milhar + `","` decimal | `1.234,56` | `fmtDec(v, decimals)` |
| Moeda | `R$ X.XXX,XX` | `R$ 1.234,56` | `fmtBRL()` |
| Percentual | `X,XX%` | `12,50%` | `fmtPerc()` |
| Data | `DD/MM/AAAA` | `24/03/2026` | `fmtData()` |
| Data+Hora | `DD/MM/AAAA HH:mm` | `24/03/2026 20:16` | `fmtDataHora()` |
| Input inteiro | Aceita apenas dígitos, formata milhar | `600.000` | `handleIntInput()` |
| Input decimal | Aceita dígitos + vírgula | `1.234,56` | `handleDecInput()` |
| Parse input | String formatada → number | `"600.000"` → `600000` | `parseNumInput()` |

### Conversão de Unidades (Volume)

O sistema armazena todos os pesos em **kg** no banco de dados. A conversão para exibição é:

```typescript
// KG é a unidade base no banco
// SC (saca) = kg / 60
// TN (tonelada) = kg / 1000

const convertVol = (kg: number, unit: 'kg' | 'sc' | 'tn'): number => {
  switch (unit) {
    case 'tn': return kg / 1000
    case 'sc': return kg / 60
    default: return kg
  }
}

// Para valor unitário de frete (R$/unit):
// R$/kg = vlrTotal / volKg
// R$/sc = (vlrTotal / volKg) × 60
// R$/tn = (vlrTotal / volKg) × 1000
const vlrUnitMult = (unit: 'kg' | 'sc' | 'tn'): number => {
  switch (unit) { case 'tn': return 1000; case 'sc': return 60; default: return 1 }
}
```

- **Padrão no BI:** unidade SC (sacas) como default
- **Padrão na tela Romaneios:** unidade KG como default

### Ordenação de Tabelas

**Toda tabela deve ter ordenação clicável em cada coluna.** Componente `SortHeader` ou lógica `toggleSort`:

```
Clique 1 → Decrescente (↓)
Clique 2 → Crescente (↑)
Clique 3 → Sem ordenação (↕)
```

### Sistema de Filtros Interligados (Dashboard FretAgru)

**Inspiração:** Power BI - todos os elementos reagem simultaneamente aos filtros.

**Arquitetura:**
- **9 filtros globais**: Ano Safra, Safra, Produto, Origem, Destino, Transportadora, Motorista, Placa, Tipo Ticket
- **Estado centralizado**: Cada filtro é um `useState` que alimenta `filteredRomaneios` via `useMemo`
- **Header de filtros ativos**: Badges azuis com nome do filtro + valor, X para remover individual, botão "Limpar Tudo"
- **Propagação automática**: Qualquer alteração em filtro recalcula KPIs, gráficos e tabelas instantaneamente

**Elementos clicáveis para filtrar:**
1. **Gráfico Tipo Ticket** (PieChart) → onClick aplica `setFiltroTipoTicket(data.id)`
2. **Gráfico Volume por Produto** (PieChart) → onClick aplica `setFiltroProduto(data.id)`
3. **Tabela Transportadora/Placa/Motorista** → onClick na linha aplica filtro correspondente
4. **Tabela Rotas** → onClick aplica `setFiltroOrigem` + `setFiltroDestino`

**Implementação técnica:**
```typescript
// Filtro global aplicado a todos elementos
const filteredRomaneios = useMemo(() => {
  return romaneios.filter((r: any) => {
    if (filtroAnoSafra && r.ano_safra_id !== filtroAnoSafra) return false
    if (filtroSafra && !r.safra_ids?.includes(filtroSafra)) return false
    // ... outros filtros
    return true
  })
}, [romaneios, filtroAnoSafra, filtroSafra, ...])

// KPIs, gráficos e tabelas dependem de filteredRomaneios
const kpis = useMemo(() => { /* cálculos */ }, [filteredRomaneios, ...])
```

### Componentes Reutilizáveis

| Componente | Uso |
|------------|-----|
| `SortHeader` | Header de coluna com ícone de ordenação clicável |
| `Pagination` | Paginação client-side (25/50/100 por página) |
| `ExportButtons` | Botões de exportação PDF/Excel |
| `ViewModal` | Modal fullscreen para detalhes de registro |
| `SearchableSelect` | Select com campo de busca |
| `MultiSearchableSelect` | Select múltiplo com busca |
| `InfoTooltip` | Tooltip de informação |

### Padrões de UI (TailwindCSS)

- **Cor primária:** green-600/green-800 (sidebar, botões, badges ativos)
- **Cards:** `bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md`
- **Tabelas:** `w-full text-sm` + `thead bg-gray-50` + `tbody divide-y` + `hover:bg-gray-50`
- **Modais:** overlay `bg-black/50` + panel `bg-white rounded-xl`
- **Sidebar:** `bg-green-800` com módulos colapsáveis
- **Responsivo:** mobile-first com breakpoints `sm:`, `lg:`
- **Seções colapsáveis:** `ChevronDown`/`ChevronRight` toggle
- **Header sticky:** Em páginas de BI/Dashboard, a barra de título + seletor de unidade + filtros fica fixa no topo ao rolar (`sticky top-0 z-20 bg-gray-50 shadow-sm border-b`)

---

## 5. Lógicas Complexas de Negócio

### 5.1 Cálculo de Frete

O frete é calculado sobre o **peso líquido SEM desconto** (`peso_liquido`), pois o transportador é pago pelo volume que transportou, independentemente dos descontos de qualidade aplicados no destino.

```
Valor Frete = peso_liquido × valor_unitario_por_kg

Onde:
- peso_liquido = peso_bruto - tara (sem descontos de qualidade)
- valor_unitario_por_kg é derivado do preço contratado:
  - Se R$/ton → divide por 1000
  - Se R$/sc → divide por 60
```

### 5.2 Descontos de Qualidade (Romaneios)

Cada romaneio pode ter até 7 tipos de desconto (todos em kg):

| Campo | Descrição |
|-------|-----------|
| `umidade_desc` | Desconto por excesso de umidade |
| `impureza_desc` | Desconto por impurezas |
| `avariados_desc` | Grãos avariados |
| `ardidos_desc` | Grãos ardidos |
| `esverdeados_desc` | Grãos esverdeados |
| `partidos_desc` | Grãos partidos/quebrados tipo 1 |
| `quebrados_desc` | Grãos quebrados tipo 2 |

```
peso_corrigido = peso_liquido - (soma de todos os descontos)
```

Os descontos aceitam valores decimais (ex: 538,93 kg).

### 5.3 Frete Excedente — Custo do Volume Não Vendável

Este é o conceito-chave do BI FretAgru:

**Como o frete é pago sobre o volume SEM desconto, mas o produtor só vai vender o volume COM desconto, existe um "volume perdido" pelo qual o produtor pagou frete mas não terá grão para venda.**

```
Volume Perdido = peso_liquido - peso_corrigido (por romaneio)
Frete Excedente = Volume Perdido × valor_unitario_por_kg

Onde:
- Volume Perdido = soma dos descontos (umidade + impureza + avariados + ...)
- Frete Excedente = frete pago por grão que o produtor NÃO terá para vender
```

O BI abre essa análise **por rota (Origem → Destino)**, mostrando:
- Volume s/Desc vs Volume c/Desc por rota
- Volume Perdido por rota
- Frete Pago total vs Frete Excedente por rota
- % do frete total que é excedente

### 5.4 Análise de Descontos por Origem

O BI mostra quais origens (fazendas/silos) têm maior índice de desconto, aberto por tipo:
- Ranking por `% Desconto` (desconto total / peso líquido × 100)
- Badges coloridos: verde (<2%), amarelo (2-5%), vermelho (>5%)
- Breakdown por cada um dos 7 tipos de desconto

### 5.5 SilAgru — Módulo de Armazenamento (3 Fases concluídas)

#### Fase 1 — Recebimento, Classificação, Estoque e Tarifas

Quando um caminhão chega ao armazém, o operador registra os % de classificação (umidade, impureza, avariados, etc.). O sistema:

1. Busca as **tabelas de desconto** vigentes para o produto selecionado
2. Para cada tipo (umidade, impureza, etc.), interpola o grau medido na **faixa grau→desconto**
3. Calcula desconto em kg: `peso_liquido × (desconto% / 100)`
4. Soma todos os descontos → `peso_corrigido = peso_liquido - desconto_total`
5. Credita o `peso_corrigido` ao saldo do depositante

**Tabelas de desconto** são cadastráveis por produto × tipo × safra. Cada tabela contém faixas (grau→desconto%) que podem ser importadas em lote ou via Excel (.xlsx/.xls/.csv).

**Estoque por depositante:** calculado como `Σ entradas(peso_corrigido) - Σ saídas(peso_corrigido)`.

**Tarifas de serviço:** 12 categorias (recebimento, secagem, estocagem, ad valorem, expedição, transbordo, pesagem avulsa, classificação, expurgo, transgenia, taxa permanência, outros) configuráveis por produto, forma de armazenamento e unidade de cobrança.

#### Fase 2 — Quebra Técnica, Cobranças e Fechamento Mensal

**Quebra Técnica:** Cálculo diário de perda sobre o saldo por depositante × produto, com taxa configurável (padrão 0,01%/dia). KPIs: saldo, quebra acumulada, estimativa diária. Histórico completo.

**Cobranças:** CRUD individual + **geração em lote** a partir de tarifas × volume em estoque. Filtros por status/depositante. KPIs: valor aberto, pago, total.

**Fechamento Mensal:** Extrato consolidado por depositante com entradas, saídas, quebra técnica, cobranças (total/pago/aberto), seletor mês/ano, expansão para detalhe de cada cobrança.

**Dashboard Armazém:** 7 KPIs (total entradas, saídas, estoque atual, descontos, quebra acumulada, cobranças aberto/pago) + gráfico barras movimentação mensal + gráfico pizza estoque por produto (Recharts).

#### Fase 3 — Vínculos entre Módulos, Importação Excel e PDF

**Vínculo FretAgru → SilAgru:** Campo `romaneio_frete_id` no romaneio de entrada do armazém (SearchableSelect), permitindo vincular o recebimento ao romaneio de frete que transportou a carga.

**Vínculo SilAgru → ContAgru:** Campo `contrato_venda_id` no romaneio de saída (SearchableSelect), permitindo vincular a expedição a um contrato de venda.

**Importação Excel:** Upload de planilha (.xlsx/.xls/.csv) para importar faixas de desconto. Detecção automática de colunas (grau/desconto).

**Extrato PDF:** Geração de PDF (jsPDF + autoTable) do fechamento mensal — resumo geral ou extrato individual por depositante com detalhamento de cobranças.

### 5.6 Vinculação entre Módulos (Completa)

| Vínculo | Campo | Tabela | Descrição |
|---------|-------|--------|-----------|
| FretAgru ↔ ContAgru | `contrato_venda_id` | `romaneios` | Romaneio de frete → contrato de venda (migration v24) |
| FretAgru → SilAgru | `romaneio_frete_id` | `romaneios_armazem` | Romaneio de frete → recebimento no armazém |
| SilAgru → ContAgru | `contrato_venda_id` | `romaneios_armazem` | Expedição do armazém → contrato de venda |

---

## 6. Integração Aegro

### Visão Geral

O Aegro é o ERP agrícola usado pela fazenda. A integração permite sincronizar dados entre iAgru e Aegro.

- **API Base:** `https://api.aegro.com.br/api/v1`
- **Autenticação:** Bearer Token
- **Farm ID:** Identificador da fazenda no Aegro
- **Tabela:** `integracoes` (token, farm_id, status, config)

### Hierarquia de Dados

```
farm_id (fazenda)
├── crops (safras) → crop_id
├── catalogs (catálogos) → catalog_id
│   └── elements (produtos/insumos) → element_id
├── suppliers (fornecedores)
└── fields (talhões)
```

### Status da Integração

| Fase | Funcionalidade | Status |
|------|---------------|--------|
| 1 | Página de Integrações + teste de conexão | ✅ Concluído |
| 2 | Importar Safras (crops → safras) | 🔜 Próximo |
| 3 | Importar Produtos (elements → produtos) | 🔜 Próximo |
| 4 | Sync Cadastros (suppliers → cadastros) | 📋 Planejado |
| 5 | Sync bidirecional (push + pull) | 📋 Futuro |

---

## 7. Bugs Corrigidos (Histórico)

### Bug: Veículo vinculado a motorista não persiste no banco (27/03/2026)

**Sintoma:** Ao cadastrar veículo vinculado a motorista, sistema exibe toast "Cadastro atualizado" mas veículo não aparece na lista nem na tabela `veiculos`.

**Causa Raiz:** 
- Faltava validação para campo obrigatório `tipo_caminhao`
- Tratamento de erro genérico não exibia mensagem real do erro
- Formulário não fechava após sucesso, dando impressão de que não salvou

**Correção Aplicada (`Cadastros.tsx` - função `saveVeiculo`):**
1. Adicionada validação: `if (!veiculoForm.tipo_caminhao) { toast.error('Tipo de caminhão é obrigatório'); return }`
2. Valores padrão explícitos: `eixos: veiculoForm.eixos || 0, peso_pauta_kg: veiculoForm.peso_pauta_kg || 0`
3. Tratamento de erro detalhado: `catch (err: any) { console.error('Erro ao cadastrar veículo:', err); toast.error(\`Erro ao cadastrar veículo: \${err?.message || 'Erro desconhecido'}\`) }`
4. Fechar formulário após sucesso: `setShowVeiculoForm(false)`
5. Corrigir ortografia no toast: "Veículo" com acento

**Validação:** Usuário deve selecionar tipo de caminhão antes de salvar. Mensagens de erro agora são específicas e informativas.

---

## 8. Pontos de Atenção e Dívidas Técnicas

### Segurança (CRÍTICO)

- **Sem autenticação ativa:** RLS permite tudo para `anon`. Qualquer pessoa com a URL do Supabase pode ler/escrever dados.
- **Próximo passo obrigatório:** Implementar Supabase Auth (email/senha) + RLS por organização.

### Performance

- **Sem paginação server-side:** Todas as tabelas carregam todos os registros no client. Com crescimento de dados, Romaneios e Ordens precisarão de `range()` no Supabase.
- **Arquivos muito grandes:** `Romaneios.tsx` (84K), `Integracoes.tsx` (99K), `Dashboard.tsx` (856 linhas) — candidatos a componentização.

### Tipagem

- **Uso extensivo de `any`:** As interfaces TypeScript não estão definidas para as entidades do banco. Todas as páginas usam `any[]` para os dados.

### Código Morto

| Item | Descrição | Ação Recomendada |
|------|-----------|------------------|
| `FretAgru/backend/` | Pasta de backend Node/Express nunca usada | Remover ou ignorar |
| `iAgru-Ecosystem/shared/` | Lib compartilhada não importada pelo FretAgru | Avaliar se será usada no futuro |
| `VendAgu/` | Pasta residual, módulo renomeado para ContAgru | Deprecar |

### Testes

- **Nenhum teste** unitário ou de integração existe no projeto. Não há Jest, Vitest ou qualquer framework de teste configurado.

### Melhorias Pendentes (Prioridade Alta)

- [ ] Autenticação Supabase Auth + RLS por organização
- [ ] Integração Aegro: sync safras e produtos
- [ ] Paginação server-side em Romaneios e Ordens
- [ ] Vinculação contrato ↔ romaneio na UI (campo já existe no banco)
- [ ] Fixações parciais em contratos de venda

### Melhorias Pendentes (Prioridade Média)

- [ ] Validação de formulários (CPF/CNPJ, placa, campos obrigatórios)
- [ ] Workflow de status em romaneios (rascunho → conferido → finalizado)
- [ ] Busca global no header
- [ ] Loading skeletons
- [ ] Componentizar arquivos grandes (Dashboard, Romaneios, Integracoes)

---

## 8. Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

---

## 9. Como Executar

```bash
cd FretAgru/frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # Build para produção (tsc + vite build)
```

---

## 10. Repositório e Deploy

- **GitHub:** `CotAgru/FretAgru` (conta: contato@cotagru.com.br)
- **Deploy:** Vercel (auto-deploy na branch `master`)
- **URL:** https://fretagru.vercel.app/
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`

---

*"De produtor para produtor, simplificando a gestão do campo"*
