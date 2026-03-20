-- =============================================================
-- iAgru - Migration v11: Autenticação e Gestão de Equipe
-- Sistema compartilhado entre FretAgru, VendAgru e SilAgru
-- =============================================================

-- 1. Organizações (fazendas/empresas)
CREATE TABLE IF NOT EXISTS organizacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  cidade TEXT,
  uf TEXT,
  proprietario_user_id UUID NOT NULL REFERENCES auth.users(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Perfis de acesso do sistema
CREATE TABLE IF NOT EXISTS perfis_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  cor TEXT DEFAULT 'bg-gray-100 text-gray-700',
  ordem INT DEFAULT 0
);

-- 3. Inserir perfis padrão do iAgru
INSERT INTO perfis_sistema (codigo, nome, descricao, cor, ordem) VALUES
  ('proprietario', 'Proprietário', 'Acesso total + gestão de equipe e configurações', 'bg-purple-100 text-purple-700', 1),
  ('gerente', 'Gerente', 'Acesso total exceto gestão de equipe', 'bg-blue-100 text-blue-700', 2),
  ('operacional', 'Operacional', 'Operações, ordens, romaneios, cadastros, veículos', 'bg-green-100 text-green-700', 3),
  ('financeiro', 'Financeiro', 'Preços, relatórios, dashboard financeiro', 'bg-yellow-100 text-yellow-700', 4),
  ('visualizador', 'Visualizador', 'Somente leitura em todas as telas', 'bg-gray-100 text-gray-700', 5)
ON CONFLICT (codigo) DO NOTHING;

-- 4. Membros da organização (equipe)
CREATE TABLE IF NOT EXISTS membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  nome TEXT NOT NULL,
  sobrenome TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organizacao_id, email)
);

-- 5. Perfis atribuídos a cada membro (N:N)
CREATE TABLE IF NOT EXISTS membro_perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfis_sistema(id) ON DELETE CASCADE,
  UNIQUE(membro_id, perfil_id)
);

-- 6. Convites pendentes
CREATE TABLE IF NOT EXISTS convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  sobrenome TEXT,
  perfil_codigos TEXT[] DEFAULT '{}',
  convidado_por UUID REFERENCES auth.users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  aceito BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  UNIQUE(organizacao_id, email)
);

-- =============================================================
-- 7. Adicionar organizacao_id nas tabelas existentes
-- (para filtrar dados por organização via RLS)
-- =============================================================
ALTER TABLE cadastros ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE precos_contratados ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE ordens_carregamento ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE romaneios ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);
ALTER TABLE ano_safra ADD COLUMN IF NOT EXISTS organizacao_id UUID REFERENCES organizacoes(id);

-- =============================================================
-- 8. RLS para novas tabelas
-- =============================================================
ALTER TABLE organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE membro_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE convites ENABLE ROW LEVEL SECURITY;

-- Perfis do sistema: leitura para todos autenticados
CREATE POLICY "perfis_sistema_read" ON perfis_sistema
  FOR SELECT USING (true);

-- Organizações: membros podem ver sua própria org
CREATE POLICY "org_member_access" ON organizacoes
  FOR ALL USING (
    id IN (SELECT organizacao_id FROM membros WHERE user_id = auth.uid())
    OR proprietario_user_id = auth.uid()
  )
  WITH CHECK (proprietario_user_id = auth.uid());

-- Membros: acessar apenas da sua organização
CREATE POLICY "membros_org_access" ON membros
  FOR ALL USING (
    organizacao_id IN (SELECT organizacao_id FROM membros m WHERE m.user_id = auth.uid())
  )
  WITH CHECK (
    organizacao_id IN (SELECT organizacao_id FROM membros m WHERE m.user_id = auth.uid())
  );

-- Membro_perfis: acesso conforme membro
CREATE POLICY "membro_perfis_access" ON membro_perfis
  FOR ALL USING (
    membro_id IN (
      SELECT id FROM membros WHERE organizacao_id IN (
        SELECT organizacao_id FROM membros WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    membro_id IN (
      SELECT id FROM membros WHERE organizacao_id IN (
        SELECT organizacao_id FROM membros WHERE user_id = auth.uid()
      )
    )
  );

-- Convites: apenas proprietário da org pode gerenciar
CREATE POLICY "convites_owner_access" ON convites
  FOR ALL USING (
    organizacao_id IN (
      SELECT id FROM organizacoes WHERE proprietario_user_id = auth.uid()
    )
  )
  WITH CHECK (
    organizacao_id IN (
      SELECT id FROM organizacoes WHERE proprietario_user_id = auth.uid()
    )
  );

-- Convites: convidado pode ver seu próprio convite (para aceitar)
CREATE POLICY "convites_invitee_read" ON convites
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- =============================================================
-- 9. Índices para performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_membros_org ON membros(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_membros_user ON membros(user_id);
CREATE INDEX IF NOT EXISTS idx_membro_perfis_membro ON membro_perfis(membro_id);
CREATE INDEX IF NOT EXISTS idx_convites_org ON convites(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_convites_email ON convites(email);
CREATE INDEX IF NOT EXISTS idx_convites_token ON convites(token);

-- Índices para organizacao_id nas tabelas existentes
CREATE INDEX IF NOT EXISTS idx_cadastros_org ON cadastros(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_org ON veiculos(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_produtos_org ON produtos(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_precos_org ON precos_contratados(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_operacoes_org ON operacoes(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_ordens_org ON ordens_carregamento(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_romaneios_org ON romaneios(organizacao_id);

-- =============================================================
-- INSTRUÇÕES:
-- 1. Execute PRIMEIRO o ROLLBACK_URGENTE_v10.sql (se ainda não fez)
-- 2. Depois execute este script
-- 3. NÃO altere as políticas RLS das tabelas existentes ainda
--    (isso será feito na migration v12, após o frontend estar pronto)
-- =============================================================
