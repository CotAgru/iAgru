# Plano de Autenticação Compartilhada - Ecossistema iAgru

## Visão Geral

Sistema de autenticação e gestão de equipe **compartilhado** entre todos os projetos iAgru (FretAgru, VendAgru, SilAgru). Inspirado no modelo do Aegro.

---

## Etapa 1: Schema do Banco (Supabase)

### Tabelas necessárias

```sql
-- Organização (fazenda/empresa)
organizacoes (
  id UUID PK,
  nome TEXT NOT NULL,               -- "BC Agropecuaria"
  cnpj TEXT,
  proprietario_id UUID FK → auth.users,
  created_at TIMESTAMPTZ
)

-- Perfis de acesso do sistema
perfis_sistema (
  id UUID PK,
  codigo TEXT UNIQUE NOT NULL,       -- 'proprietario', 'gerente', 'operacional', 'financeiro', 'visualizador'
  nome TEXT NOT NULL,                -- 'Proprietário', 'Gerente', 'Operacional', 'Financeiro', 'Visualizador'
  descricao TEXT,
  cor TEXT,                          -- cor do badge no UI
  ordem INT                         -- para ordenação na UI
)

-- Membros da organização (equipe)
membros (
  id UUID PK,
  organizacao_id UUID FK → organizacoes,
  user_id UUID FK → auth.users,
  nome TEXT NOT NULL,
  sobrenome TEXT,
  email TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)

-- Perfis atribuídos a cada membro (N:N)
membro_perfis (
  id UUID PK,
  membro_id UUID FK → membros,
  perfil_id UUID FK → perfis_sistema
)

-- Convites pendentes
convites (
  id UUID PK,
  organizacao_id UUID FK → organizacoes,
  email TEXT NOT NULL,
  nome TEXT,
  perfis TEXT[],                     -- array de códigos de perfil
  convidado_por UUID FK → auth.users,
  aceito BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
```

### Perfis do Sistema iAgru (adaptados do Aegro)

| Código        | Nome           | Acesso                                                    |
|---------------|----------------|-----------------------------------------------------------|
| proprietario  | Proprietário   | Tudo + gestão de equipe + configurações                   |
| gerente       | Gerente        | Tudo exceto gestão de equipe                              |
| operacional   | Operacional    | Operações, Ordens, Romaneios, Cadastros, Veículos         |
| financeiro    | Financeiro     | Preços, Relatórios, Dashboard                             |
| visualizador  | Visualizador   | Somente leitura em todas as telas                         |

---

## Etapa 2: Página de Login/Cadastro (/login)

### Funcionalidades
- Login com e-mail + senha (Supabase Auth)
- Cadastro de nova conta (cria organização automaticamente, perfil = Proprietário)
- "Esqueci minha senha" (Supabase password reset)
- Responsivo (mobile-first)
- Design alinhado com identidade visual iAgru (verde, clean)

### Fluxo de primeiro acesso
1. Usuário acessa /login
2. Clica em "Criar conta"
3. Preenche: Nome, E-mail, Senha, Nome da Organização
4. Sistema cria: auth.user → organizacao → membro (perfil Proprietário)
5. Redireciona para Dashboard

### Fluxo de convite
1. Proprietário convida por e-mail na tela de Equipe
2. Convidado recebe e-mail com link de cadastro
3. Convidado cria senha e é vinculado à organização com os perfis selecionados

---

## Etapa 3: Página de Perfil (/perfil)

### Abas
- **Meu Perfil**: nome, e-mail, alterar senha
- **Organização**: nome da fazenda/empresa, CNPJ

---

## Etapa 4: Gestão de Equipe (/equipe)

### Tela principal (inspirada no Aegro - Imagem 1)
- **Abas**: EQUIPE | PERFIS
- Lista de membros: avatar (inicial do nome), Nome, E-mail, Perfis associados
- Busca por nome
- Botão "Adicionar Usuário" (verde, canto superior direito)
- Menu de ações por membro (3 pontinhos): Editar perfis, Desativar

### Modal "Adicionar Usuário" (inspirada no Aegro - Imagem 2)
- **Lado esquerdo**: E-mail*, Nome*, Sobrenome*, seleção de Perfis (checkboxes)
- **Lado direito**: Funcionalidades do perfil selecionado (permissões detalhadas)
- Botões: Cancelar | Convidar

### Aba PERFIS
- Lista dos perfis do sistema com suas permissões
- Visualização apenas (perfis são fixos do sistema, não editáveis pelo usuário)

---

## Etapa 5: Controle de Acesso no Frontend

### Implementação
- `AuthContext` gerencia: user, membro, perfis, organizacao
- Hook `usePermission(recurso, acao)` → boolean
- Componente `<PermissionGate recurso="romaneios" acao="editar">` para esconder elementos
- Rotas protegidas por perfil
- Botões de ação (editar, excluir) condicionais ao perfil

### Mapeamento de Permissões por Página

| Página           | proprietario | gerente | operacional | financeiro | visualizador |
|------------------|:----:|:----:|:----:|:----:|:----:|
| Dashboard        | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operações        | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Ordens           | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Romaneios        | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Cadastros        | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Veículos         | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Produtos         | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Preços           | ✅ | ✅ | ❌ | ✅ | 👁️ |
| Relatórios       | ✅ | ✅ | ❌ | ✅ | 👁️ |
| Equipe           | ✅ | ❌ | ❌ | ❌ | ❌ |
| Administração    | ✅ | ❌ | ❌ | ❌ | ❌ |

✅ = Acesso total | 👁️ = Somente leitura | ❌ = Sem acesso

---

## Etapa 6: RLS (Row Level Security) no Supabase

- Cada registro pertence a uma organização (`organizacao_id`)
- Políticas RLS filtram por organização do usuário logado
- Membros só veem dados da sua organização
- Migration SQL com políticas completas

---

## Ordem de Implementação

| # | Etapa | Dependência | Estimativa |
|---|-------|-------------|------------|
| 1 | Migration SQL (schema) | - | 1 sessão |
| 2 | Página de Login/Cadastro | Etapa 1 | 1 sessão |
| 3 | AuthContext + proteção de rotas | Etapa 2 | 1 sessão |
| 4 | Página de Perfil | Etapa 3 | 1 sessão |
| 5 | Gestão de Equipe (listar + adicionar) | Etapa 4 | 1-2 sessões |
| 6 | Controle de permissões no frontend | Etapa 5 | 1 sessão |
| 7 | RLS por organização | Etapa 6 | 1 sessão |
| 8 | Testes e ajustes | Todas | 1 sessão |

**Total estimado: ~8 sessões de trabalho**

---

## Observações Importantes

- O login será **compartilhado** entre FretAgru, VendAgru e SilAgru
- Cada projeto terá seu próprio conjunto de permissões por perfil
- A tabela `perfis_sistema` terá um campo `projeto` para diferenciar
- O design deve seguir a identidade visual iAgru (verde, clean, responsivo)
- **Mobile-first**: todas as telas devem funcionar perfeitamente no celular
