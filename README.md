# iAgru — Plataforma de Gestão Agrícola

> Ecossistema modular para gestão de atividades agrícolas do produtor rural brasileiro.

**Produção:** https://fretagru.vercel.app/

---

## Visão Geral

A iAgru é uma plataforma modular que reúne ferramentas de gestão agrícola em um único sistema. Cada módulo atende uma necessidade específica do produtor rural, compartilhando cadastros, produtos e safras entre si.

### Módulos

| Módulo | Descrição | Páginas | Status |
|--------|-----------|---------|--------|
| **FretAgru** | Gestão de fretes agrícolas (operações, ordens, romaneios, veículos, preços, BI) | 7 | ✅ Produção |
| **ContAgru** | Contratos de venda futura + compra de insumos agrícolas | 3 | ✅ MVP |
| **SilAgru** | Armazenamento de grãos (recebimento, classificação, estoque, cobranças, PDF) | 10 | ✅ Produção |

### Entidades Universais (compartilhadas)

- **Cadastros** — Produtores, motoristas, transportadoras, fornecedores, compradores, armazéns, fazendas
- **Produtos** — Grãos (soja, milho, sorgo, feijão) e insumos
- **Safra** — Ano safra, culturas, tipos de safra, safras combinadas

---

## Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS |
| **Ícones** | Lucide React |
| **Gráficos** | Recharts |
| **Banco de Dados** | Supabase (PostgreSQL gerenciado) |
| **Storage** | Supabase Storage (imagens e PDFs de romaneios) |
| **Deploy** | Vercel (frontend) |
| **Exportação** | xlsx + jsPDF (Excel e PDF) |

> O frontend conecta diretamente ao Supabase via client SDK. Não há backend intermediário.

---

## Estrutura do Projeto

```
iAgru/
├── MASTER-PROMPT.md                  # Arquivo mãe — regras do assistente IA
├── REGRAS-PADRAO.md                  # Convenções obrigatórias de código
├── MEMORIA-CONTEXTO.md               # Memória técnica consolidada
├── PLANO-DESENVOLVIMENTO.md          # Roadmap geral do ecossistema
├── README-ECOSSISTEMA.md             # Visão geral do ecossistema
│
├── docs/
│   ├── fretagru/README.md            # Documentação do módulo FretAgru
│   ├── contagru/README.md            # Documentação do módulo ContAgru
│   ├── silagru/README.md             # Documentação do módulo SilAgru
│   ├── PLANO-AUTH.md                 # Plano de autenticação
│   └── PLANO-REESTRUTURACAO.md       # Histórico da reestruturação
│
├── frontend/src/
│   ├── components/                   # 8 componentes reutilizáveis
│   ├── pages/
│   │   ├── frete/                    # FretAgru (7 páginas)
│   │   ├── contratos/                # ContAgru (3 páginas)
│   │   ├── armazem/                  # SilAgru (10 páginas)
│   │   └── (universais)              # DashboardGeral, Cadastros, Produtos, Safra, Admin, Integracoes
│   ├── services/api.ts               # Queries Supabase (790+ linhas)
│   ├── utils/                        # format.ts, export.ts, importHelpers.ts
│   ├── hooks/useSort.ts
│   └── lib/supabase.ts
│
├── supabase/                         # 29 migrations (v1 a v25)
├── api/                              # 5 serverless functions (Vercel)
├── scripts/                          # Scripts utilitários
└── vercel.json
```

---

## Módulos — Resumo

### FretAgru (7 páginas) — [docs/fretagru/](docs/fretagru/README.md)
Dashboard BI completo, Operações, Ordens de Carregamento, Romaneios (7 tipos de desconto), Veículos, Preços Contratados, Importação Excel (wizard 7 etapas).

### ContAgru (3 páginas) — [docs/contagru/](docs/contagru/README.md)
Dashboard Contratos, Contratos de Venda (FOB/CIF, multi-safra), Compra de Insumos.

### SilAgru (10 páginas) — [docs/silagru/](docs/silagru/README.md)
Dashboard Armazém, Unidades/Silos, Romaneios Entrada (classificação + descontos), Romaneios Saída, Estoque, Tabelas de Desconto (importação Excel), Tarifas de Serviço (12 categorias), Quebra Técnica, Cobranças, Fechamento Mensal (PDF).

### Vínculos entre Módulos
- **FretAgru ↔ ContAgru**: `contrato_venda_id` em romaneios
- **FretAgru → SilAgru**: `romaneio_frete_id` em romaneios de entrada
- **SilAgru → ContAgru**: `contrato_venda_id` em romaneios de saída

---

## Padrões Obrigatórios — [REGRAS-PADRAO.md](REGRAS-PADRAO.md)

- **Números:** ponto para milhar, vírgula para decimal (45.000 / 12,50)
- **Datas:** DD/MM/AAAA
- **Tabelas:** ordenação clicável em TODAS as colunas
- **Selects:** TODOS com busca (SearchableSelect)
- **Exportação:** PDF e Excel em TODAS as tabelas
- **Responsividade:** mobile + desktop obrigatório

---

## Como Executar

```bash
cd frontend
npm install
npm run dev
```

Variáveis de ambiente (`.env`):
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [MASTER-PROMPT.md](MASTER-PROMPT.md) | Regras do assistente IA |
| [REGRAS-PADRAO.md](REGRAS-PADRAO.md) | Convenções obrigatórias |
| [MEMORIA-CONTEXTO.md](MEMORIA-CONTEXTO.md) | Memória técnica consolidada |
| [PLANO-DESENVOLVIMENTO.md](PLANO-DESENVOLVIMENTO.md) | Roadmap do ecossistema |

---

Projeto privado — Ecossistema iAgru © 2024-2026
