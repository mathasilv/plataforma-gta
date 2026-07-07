# Plataforma GTA

Plataforma web interna da **GTA Energia** (engenharia elétrica, Goiânia/GO). Reúne,
num só lugar, as ferramentas do dia a dia da equipe: montagem e geração de propostas
comerciais, histórico de orçamentos e gestão de tarefas — com tema claro/escuro e
controle de acesso por usuário.

## Módulos

- **Nova proposta (CPQ)** — monta a proposta de um serviço e gera o `.docx` fiel ao
  modelo da GTA. Três serviços têm **configurador próprio** com dimensionamento e
  precificação automáticos: Energia Solar (consumo → geração → economia/payback),
  Projeto de Subestação (NT.002 da Equatorial) e Carregador Veicular EV (NBR 5410 /
  NBR 17019 → lista de materiais → preço pelo Fator K). Os demais usam o formulário
  dinâmico com precificação base derivada das propostas reais.
- **Orçamentos** (`/propostas`) — histórico de **todas** as propostas geradas, de
  qualquer serviço, com filtros (serviço, status, cliente), referência automática e
  a coluna de quem criou.
- **Tarefas** (`/tarefas`) — lista com filtros por status/responsável, busca,
  prioridade, prazo com alerta de atraso e comentários por usuário. Os responsáveis
  vêm dos usuários cadastrados. Opcionalmente, envia um **e-mail ao responsável**
  quando uma tarefa é criada para ele (desligado por padrão; ative com o Resend —
  veja `.env.example`).
- **Conta e usuários** — menu do usuário com "Minha conta", troca de senha, tema
  claro/escuro e, para administradores, gerenciamento de usuários.

**Serviços no catálogo (12):** Energia Solar, Projeto de Subestação, Execução de
Subestação, Conexão à Concessionária, Projeto de Rede MT, SPDA + Gerenciamento de
Risco, Inspeção de Subestação, Aluguel de Analisador de Energia, Carregador Veicular
(EV), Fornecimento de QGBT, Projeto Elétrico BT e Limpeza de Painéis.

## Como rodar (local)

Pré-requisitos: **Node.js 18+**.

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. Login padrão de desenvolvimento:

- **E-mail:** `admin@gta.com`
- **Senha:** `gta123`

> Configure usuários e segredo reais no `.env.local` (veja `.env.example`).

## Como usar

1. Faça login.
2. Em **Nova proposta**, escolha o serviço.
3. Preencha o configurador ou o formulário. Nos configuradores, o dimensionamento,
   os totais, o valor total e o **valor por extenso** são calculados automaticamente.
4. Clique em **Gerar .docx** — o documento é baixado e registrado em **Orçamentos**.

## Arquitetura (modular)

Cada serviço é uma pasta isolada em `src/services/<servico>` que exporta um
`ServiceModule` (contrato em `src/services/types.ts`). O núcleo — formulário dinâmico
(`src/components/DynamicForm.tsx`), motor de geração (`src/lib/docx/generate.ts`) e
endpoint (`src/app/api/gerar`) — é genérico e dirigido pelo **registro**
(`src/services/registry.ts`).

Um serviço pode ter **configurador próprio** (`usesConfigurator: true` + componente
em `src/components/<servico>/` + API de cálculo ao vivo) ou usar o **formulário
dinâmico**. A geração usa um `template.docx` próprio (Solar, Carregador) ou o molde
compartilhado dos serviços CPQ (`src/services/_shared/template-servicos.docx`).

```
src/
  app/                  login, dashboard, /nova/[servico], /propostas, /tarefas,
                        /conta, /admin/usuarios, /api/*
  components/           DynamicForm, AppHeader, configuradores (solar, subestacao,
                        carregador), tasks, propostas, users, CopyButton, ...
  lib/
    session.ts          sessão/login (cookie) + guarda de rotas
    format.ts           moeda, datas, referência, valor por extenso
    docx/generate.ts    preenche o molde (docxtemplater)
    docx/patchChart.ts  atualiza o gráfico nativo do Solar (Geração × Consumo)
    propostas/          store do histórico de orçamentos
    tasks/ · users/ · settings/   stores dos demais módulos
  services/
    types.ts            contrato ServiceModule
    registry.ts         lista de serviços
    solar/ subestacao/ carregador/   configuradores (config, engine/sizing, mapper, template.docx)
    _cpq/               fábrica + catálogo dos serviços CPQ
    _shared/            molde e utilitários compartilhados
```

### Adicionar um novo serviço

1. Crie `src/services/<novo>/` com o schema (Zod), o `mapper.ts` (dados →
   marcadores) e, se precisar, o `template.docx` (marcadores `{campo}` e loops
   `{#lista}...{/lista}`). Serviços simples podem reusar o molde CPQ compartilhado.
2. Exporte um `ServiceModule` em `index.ts`.
3. Registre-o em `src/services/registry.ts`.

Pronto — o dashboard, o formulário/configurador e a geração passam a reconhecê-lo.

## Persistência

Os módulos usam stores com a mesma interface e dois backends: **Postgres**
(`@vercel/postgres`) em produção e **arquivo JSON local** em desenvolvimento
(`data/*.json`, fora do git). Cobrem orçamentos, tarefas, usuários e os parâmetros
editáveis dos configuradores (`settings`).

## Deploy

Publicado na **Vercel**, com deploy automático a cada push na `main`. Variáveis de
ambiente: `AUTH_SECRET`, `APP_USERS` e a string de conexão do Postgres. Veja
[`DEPLOY.md`](DEPLOY.md) para o passo a passo.

## Custos

Stack essencialmente gratuita: Next.js + Vercel (free) + geração `.docx` local
(docxtemplater, open-source) + Postgres (free tier).
