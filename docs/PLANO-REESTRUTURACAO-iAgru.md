# Plano de Reestruturação — iAgru Plataforma Modular

> Gerado em: 22/03/2026
> Status: **AGUARDANDO APROVAÇÃO**

---

## 1. Diagnóstico do Estado Atual

### 1.1 Revisão de Código — Pontos Críticos

| # | Problema | Impacto | Arquivo(s) |
|---|---------|---------|------------|
| 1 | **Menu lateral acoplado ao FretAgru** — não suporta múltiplos módulos | Bloqueante para escalar | `Layout.tsx` |
| 2 | **Páginas monolíticas** — Romaneios (76KB), Ordens (61KB), Cadastros (43KB) | Manutenção difícil | `pages/*.tsx` |
| 3 | **api.ts único** — 294 linhas, todas as entidades misturadas | Difícil de manter | `services/api.ts` |
| 4 | **Uso excessivo de `any`** — sem interfaces TypeScript para os dados | Bugs silenciosos | Todos os arquivos |
| 5 | **README.md desatualizado** — menciona backend Express/sql.js que não é mais usado | Documentação errada | `README.md` |
| 6 | **Backend legado presente** — pasta `backend/` com node_modules (Express/sql.js) | Lixo no repositório | `backend/` |
| 7 | **Console.logs em produção** — logs de debug no upload de imagem | Poluição no console | `api.ts:254-274` |
| 8 | **Login.tsx e AuthContext.tsx órfãos** — existem mas não são usados | Código morto | `pages/Login.tsx`, `contexts/` |
| 9 | **package.json nomeado "fretagru-frontend"** — deveria ser "iagru" | Inconsistência | `package.json` |
| 10 | **Admin mistura itens universais com específicos do FretAgru** | Confuso para o usuário | `pages/Admin.tsx` |

### 1.2 UX/Responsividade — Pontos de Melhoria

| # | Problema | Onde |
|---|---------|------|
| 1 | Tabelas difíceis de ler em telas < 768px (muitas colunas) | Todas as listagens |
| 2 | Barra de filtros ocupa muito espaço vertical no mobile | Cadastros, Preços |
| 3 | Modais não ocupam tela cheia em mobile (scroll quebrado) | Formulários |
| 4 | Sem indicador visual de qual módulo/seção o usuário está | Sidebar |
| 5 | Dashboard carrega 7 endpoints simultâneos (lento em conexões fracas) | Dashboard |
| 6 | Sem loading skeleton — apenas spinner genérico | Todas as páginas |

---

## 2. Arquitetura Proposta — iAgru Plataforma Modular

### 2.1 Conceito

O iAgru deixa de ser "FretAgru" e passa a ser uma **plataforma modular** onde cada ferramenta (FretAgru, ContAgru, SilAgru) é um **módulo** com seu próprio menu, dashboard e funcionalidades. Entidades como Cadastros, Produtos e Safra são **universais** (compartilhadas entre todos os módulos).

### 2.2 Nova Estrutura do Menu Lateral

```
🌱 iAgru
│
├── 🏠 Dashboard Geral
│
├── 🚛 FretAgru ▾ ────────── (módulo colapsável)
│   ├── 📊 Dashboard Fretes
│   ├── 📂 Operações
│   ├── 📋 Ordens de Carregamento
│   ├── 📄 Romaneios
│   ├── 🚗 Veículos
│   ├── 💲 Preços Contratados
│   └── ⬆️ Importação
│
├── 📋 ContAgru ▾ ────────── (módulo colapsável)
│   ├── 📊 Dashboard Contratos
│   ├── 📈 Contratos de Venda
│   └── 🛒 Compra de Insumos
│
├── ── Geral ──────────────
├── 👥 Cadastros
├── 📦 Produtos
├── 🌾 Safra ▾ ───────────── (menu colapsável)
│   ├── Ano Safra
│   ├── Culturas
│   ├── Tipos de Safra
│   └── Safras
│
├── ── Sistema ────────────
└── ⚙️ Administração
```

### 2.3 Estrutura de Rotas

```
/                          → Dashboard Geral (visão consolidada)

/frete/dashboard           → Dashboard FretAgru
/frete/operacoes           → Operações
/frete/ordens              → Ordens de Carregamento
/frete/romaneios           → Romaneios
/frete/veiculos            → Veículos
/frete/precos              → Preços Contratados
/frete/importacao          → Importação de Dados

/contratos/dashboard       → Dashboard ContAgru
/contratos/venda           → Contratos de Venda
/contratos/compra          → Compra de Insumos

/cadastros                 → Cadastros (universal)
/produtos                  → Produtos (universal)
/safra                     → Safra (universal — abas internas)

/admin                     → Administração (Tipo NF, Tipo Ticket, Tipo Caminhão)
```

---

## 3. Novas Tabelas Supabase (Migration v12)

### 3.1 Tabelas Universais — Safra

```sql
-- Culturas agrícolas (Soja, Milho, Sorgo, Feijão, etc.)
CREATE TABLE culturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tipos de safra (Verão, Safrinha, Inverno)
CREATE TABLE tipos_safra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safras (combina: Ano Safra + Cultura + Tipo)
-- Exemplo: "Soja Verão 24/25", "Milho Safrinha 24/25"
CREATE TABLE safras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ano_safra_id UUID NOT NULL REFERENCES ano_safra(id),
  cultura_id UUID NOT NULL REFERENCES culturas(id),
  tipo_safra_id UUID REFERENCES tipos_safra(id),
  data_inicio DATE,
  data_fim DATE,
  area_ha REAL,
  producao_estimada_ton REAL,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.2 Tabelas ContAgru — Contratos

```sql
-- Contratos de Venda (commodities)
CREATE TABLE contratos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato VARCHAR(50),
  comprador_id UUID NOT NULL REFERENCES cadastros(id),
  corretor_id UUID REFERENCES cadastros(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  safra_id UUID REFERENCES safras(id),
  volume_tons REAL NOT NULL,
  preco_valor REAL NOT NULL,
  preco_unidade TEXT NOT NULL DEFAULT 'R$/ton',
  modalidade TEXT DEFAULT 'FOB',
  data_contrato DATE,
  data_entrega_inicio DATE,
  data_entrega_fim DATE,
  status TEXT NOT NULL DEFAULT 'negociacao',
  local_entrega_id UUID REFERENCES cadastros(id),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compra de Insumos Agrícolas
CREATE TABLE contratos_compra_insumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato VARCHAR(50),
  fornecedor_id UUID NOT NULL REFERENCES cadastros(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  safra_id UUID REFERENCES safras(id),
  quantidade REAL NOT NULL,
  unidade_medida TEXT NOT NULL DEFAULT 'ton',
  preco_valor REAL NOT NULL,
  preco_unidade TEXT NOT NULL DEFAULT 'R$/ton',
  data_contrato DATE,
  data_entrega_prevista DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 Novos tipos em Cadastros

Os tipos de cadastro serão ampliados para suportar ContAgru:
- Existentes: `Produtor, Motorista, Transportadora, Fornecedor, Local, Fazenda, Armazem, Industria, Porto`
- Novos: **`Comprador, Corretor`** (para contratos de venda)

---

## 4. Fases de Implementação

### FASE 1 — Reestruturação do Menu e Layout ✅ CONCLUÍDA
**Concluída em: Junho/2025**

| # | Tarefa | Status |
|---|--------|--------|
| 1.1 | Reescrever `Layout.tsx` — Menu modular com grupos colapsáveis | ✅ |
| 1.2 | Atualizar header — Logo iAgru + nome do módulo ativo | ✅ |
| 1.3 | Ajustar `App.tsx` — Novas rotas com prefixo `/frete/`, `/contratos/` + compatibilidade | ✅ |
| 1.4 | Renomear `package.json` — `"name": "iagru"` v2.0.0 | ✅ |
| 1.5 | Dashboard Geral — Cards resumo de todos os módulos com dados reais | ✅ |
| 1.6 | Mover Dashboard FretAgru para `/frete/dashboard` | ✅ |

### FASE 2 — Módulo Universal Safra ✅ CONCLUÍDA
**Concluída em: Junho/2025**

| # | Tarefa | Status |
|---|--------|--------|
| 2.1 | Migration SQL v12 — tabelas `culturas`, `tipos_safra`, `safras` | ✅ |
| 2.2 | API functions em `api.ts` para as novas tabelas | ✅ |
| 2.3 | Página `Safra.tsx` com 4 abas: Ano Safra, Culturas, Tipos de Safra, Safras | ✅ |
| 2.4 | CRUD completo para cada aba (incluindo modal de safras com todos os campos) | ✅ |
| 2.5 | Seeds padrão na migration: culturas + tipos safra | ✅ |

### FASE 3 — Módulo ContAgru (Contratos) ✅ CONCLUÍDA
**Concluída em: Junho/2025**

| # | Tarefa | Status |
|---|--------|--------|
| 3.1 | Migration SQL v13 — tabelas `contratos_venda`, `contratos_compra_insumo` | ✅ |
| 3.2 | API functions para contratos (CRUD completo) | ✅ |
| 3.3 | Dashboard ContAgru — cards com dados reais + gráficos de status | ✅ |
| 3.4 | CRUD Contratos de Venda — formulário completo com validação | ✅ |
| 3.5 | CRUD Compra de Insumos — formulário completo | ✅ |
| 3.6 | Exportação Excel em ambas as telas | ✅ |
| 3.7 | Novos tipos de cadastro suportados: Comprador, Corretor | ✅ |

### FASE 4 — Melhorias de UX e Qualidade ✅ CONCLUÍDA
**Concluída em: Junho/2025**

| # | Tarefa | Status |
|---|--------|--------|
| 4.1 | Limpar código morto — pendente para próxima iteração | ⏳ |
| 4.2 | Remover console.logs de produção (api.ts, Romaneios, Precos, Ordens) | ✅ |
| 4.3 | Responsividade mobile em modais e tabelas (overflow-x-auto, min-w) | ✅ |
| 4.4 | Loading spinner em todas as listagens | ✅ |
| 4.5 | Breadcrumbs — pendente para próxima iteração | ⏳ |

### FASE 5 — Documentação ✅ CONCLUÍDA
**Concluída em: Junho/2025**

| # | Tarefa | Status |
|---|--------|--------|
| 5.1 | Reescrever README.md completo (pt-BR) | ✅ |
| 5.2 | Atualizar PLANO-DESENVOLVIMENTO-iAgru.md | ✅ |
| 5.3 | Documentar nova arquitetura modular | ✅ |

---

## 5. Regras de Escalabilidade

Para que novos módulos (SilAgru, etc.) possam ser adicionados facilmente:

1. **Cada módulo** deve ter suas rotas com prefixo (`/frete/`, `/contratos/`, `/silo/`)
2. **O sidebar** recebe módulos via configuração (array de objetos), não hardcoded
3. **Entidades universais** (Cadastros, Produtos, Safra) ficam em rotas raiz
4. **api.ts** pode ser dividido futuramente por módulo, mas por enquanto mantemos um arquivo
5. **Componentes reutilizáveis** (`SortHeader`, `Pagination`, `ExportButtons`, `ViewModal`) são compartilhados

---

## 6. Compatibilidade e Migração

- As rotas antigas (`/operacoes`, `/ordens`, etc.) redirecionam para as novas (`/frete/operacoes`)
- Nenhum dado é perdido — apenas reorganização do frontend
- As tabelas existentes no Supabase permanecem inalteradas
- Novas tabelas são aditivas (não alteram as existentes)

---

## 7. Impacto no Deploy

- **Vercel**: Deploy automático via push no GitHub (sem mudança)
- **Supabase**: Executar manualmente as migrations v12 e v13 no SQL Editor
- **URL**: Continua `https://fretagru.vercel.app/` (pode ser renomeado para `iagru.vercel.app` futuramente)

---

## 8. Ordem de Execução Recomendada

```
FASE 1 (Menu + Layout + Rotas) → FASE 5 (README) → FASE 2 (Safra) → FASE 3 (ContAgru) → FASE 4 (UX)
```

> **IMPORTANTE**: A Fase 1 é pré-requisito para todas as outras.
> Após cada fase, commit + push + verificação em produção.
