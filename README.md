# FretAgru - Sistema de Gestão de Fretes Agrícolas

## Descrição
Sistema para gestão completa de fretes agrícolas, controlando transporte de insumos, colheita e produtos agrícolas.

## Funcionalidades Principais
- **Gestão de Transportadoras**: Cadastro e gerenciamento de fornecedores de frete
- **Cotação de Frete**: Comparação de preços entre diferentes transportadoras
- **Rastreamento de Cargas**: Monitoramento em tempo real das transportações
- **Controle de Custos**: Análise detalhada dos custos de transporte
- **Integração com Aegro**: Sincronização com dados de produção e insumos
- **Relatórios de Performance**: Análise de eficiência das transportadoras

## Stack Tecnológico
- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Banco de Dados**: PostgreSQL
- **API REST**: Arquitetura RESTful com autenticação JWT
- **Integrações**: API Aegro, API de rastreamento

## Estrutura do Projeto
```
FretAgru/
├── frontend/          # Aplicação React
├── backend/           # API Node.js
├── database/          # Migrations e seeds
├── docs/             # Documentação
└── tests/            # Testes automatizados
```

## Módulos
1. **Transportadoras**: CRUD de transportadoras e veículos
2. **Cotações**: Sistema de cotação e negociação
3. **Cargas**: Gestão de cargas e rotas
4. **Financeiro**: Controle de pagamentos e custos
5. **Relatórios**: Dashboards e análises
6. **Integrações**: Conexão com sistemas externos
