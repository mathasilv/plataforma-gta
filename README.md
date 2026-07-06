# Plataforma GTA — Gerador de Propostas

Plataforma web interna da GTA Energia para gerar propostas comerciais em `.docx`,
fiéis aos modelos da empresa, a partir de um formulário.

**Serviços disponíveis (11):** Energia Solar, Limpeza de Painéis, Inspeção de
Subestação, SPDA + Gerenciamento de Risco, Carregador Veicular (EV), Fornecimento
de QGBT, Projeto de Subestação, Projeto de Rede MT, Execução de Rede MT, Execução
de Subestação e Rede MT/BT de Loteamento.

**Ferramentas:** além do gerador de propostas, a plataforma tem um módulo de
**Tarefas** (`/tarefas`): lista com filtros por status/responsável, busca,
prioridade, prazo com alerta de atraso e comentários por usuário. Os responsáveis
vêm dos usuários cadastrados (`APP_USERS`).

## Como rodar (local)

Pré-requisitos: **Node.js 18+** instalado (já instalado nesta máquina: Node 24).

```bash
npm install
npm run dev
```

Acesse http://localhost:3000. Login padrão de desenvolvimento:

- **E-mail:** `admin@gta.com`
- **Senha:** `gta123`

> Configure usuários e segredo reais no arquivo `.env.local` (veja `.env.example`).

## Como usar

1. Faça login.
2. No painel, escolha **Energia Solar Fotovoltaica**.
3. Preencha o formulário (dados do cliente, dimensionamento, cole os 12 meses da
   simulação, materiais, distribuidor e valores). Os totais anuais, o valor total e
   o **valor por extenso** são calculados automaticamente; o gráfico é atualizado.
4. Clique em **Gerar proposta** — o `.docx` é baixado, pronto para envio.

## Arquitetura (modular)

Cada serviço é uma pasta isolada em `src/services/<servico>` que exporta um
`ServiceModule` (contrato em `src/services/types.ts`). O núcleo — formulário
dinâmico (`src/components/DynamicForm.tsx`), motor de geração
(`src/lib/docx/generate.ts`) e endpoint (`src/app/api/gerar`) — é genérico e
dirigido pelo **registro** (`src/services/registry.ts`).

```
src/
  app/                  login, dashboard, /nova/[servico], /api/{login,logout,gerar}
  components/           DynamicForm, AppHeader
  lib/
    auth.ts             login fechado (cookie HMAC) + middleware
    format.ts           moeda, datas, referência, valor por extenso
    docx/generate.ts    preenche o molde (docxtemplater)
    docx/patchChart.ts  atualiza o gráfico nativo (Geração × Consumo)
  services/
    types.ts            contrato ServiceModule
    registry.ts         lista de serviços
    solar/              ⭐ config.ts, mapper.ts, presets.ts, template.docx
scripts/
  build-solar-template.mjs   (re)gera o molde a partir do .docx real
  test-solar.mjs / test-api.mjs   verificação de fidelidade (diff de texto)
```

### Adicionar um novo serviço

1. Crie `src/services/<novo>/` com `config.ts` (campos + Zod), `mapper.ts`
   (dados → marcadores) e `template.docx` (molde com marcadores `{campo}` e
   loops `{#lista}...{/lista}`).
2. Exporte um `ServiceModule` em `index.ts`.
3. Registre-o em `src/services/registry.ts`.

Pronto — o dashboard, o formulário e a geração passam a reconhecê-lo.

### Preparar um molde `.docx`

Os valores no `.docx` da GTA ficam em runs limpos, então o molde é criado por
substituição de texto por marcadores. Use `scripts/build-solar-template.mjs` como
referência: ele substitui valores por `{marcadores}`, colapsa tabelas repetíveis em
uma linha de loop e remove arquivos-lixo do zip. Rode:

```bash
node scripts/build-solar-template.mjs
node scripts/test-solar.mjs     # compara o texto gerado com o original
```

## Verificação de fidelidade

Com `npm run dev` ativo:

- `node scripts/test-api.mjs` — Solar (Maria Selma WEG): 193/193 linhas idênticas.
- `node scripts/test-services.mjs` — os outros 10 serviços contra os originais.
  Resultado: Inspeção, SPDA, Projeto RD, Execução SE e Loteamento **idênticos**;
  os demais diferem apenas em normalizações intencionais (prefixo da referência,
  vírgula do valor por extenso, correção de typos do original como "R$4.575,00").

## Módulo de Tarefas

- Dados em `data/tasks.json` (gitignored) via `src/lib/tasks/store.ts` — escrita
  atômica + fila de gravação. A interface `TaskStore` é o ponto único de troca
  para o Supabase no deploy (na Vercel o filesystem é efêmero).
- API: `/api/tarefas` (GET/POST), `/api/tarefas/[id]` (PATCH/DELETE),
  `/api/tarefas/[id]/comentarios` (POST), `/api/usuarios` (GET, sem senhas).
- UI: `src/app/tarefas/page.tsx` + `src/components/tasks/TaskList.tsx`.

## Próximos passos

- **Persistência (Supabase):** tarefas (`SupabaseTaskStore`) + histórico de
  propostas e sequência automática do código de referência.
- **Deploy (Vercel):** publicar com `AUTH_SECRET` e `APP_USERS` nas variáveis de ambiente.
- **Variantes futuras:** subestação aérea (modelo Francefarma) e outros moldes.

## Custos

Stack 100% gratuita: Next.js + Vercel (free) + geração `.docx` local (docxtemplater,
open-source). Supabase (free) entra na fase de persistência/deploy.
