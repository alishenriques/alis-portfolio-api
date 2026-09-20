# alis-portfolio-api

API GraphQL e CMS do [portfólio](https://github.com/alishenriques/alis-portfolio). Node + GraphQL Yoga + Drizzle ORM + Neon Postgres + Cloudinary, com validação Zod. Roda na Vercel como função serverless.

Arquitetura completa e convenções: [`docs/ai`](https://github.com/alishenriques/alis-portfolio/tree/main/docs/ai) no repositório principal.

## Rodando

```bash
yarn install
cp .env.example .env
yarn dev          # http://localhost:4000/graphql
```

Sem `DATABASE_URL`, a API responde com dados de fallback.

## Scripts

`yarn dev` · `yarn lint` · `yarn typecheck` · `yarn test` · `yarn db:generate` · `yarn db:migrate`

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do Neon (opcional em dev) |
| `CMS_API_KEY` | Chave (mín. 8 caracteres) exigida no header `x-cms-key` nas mutations |
| `CLOUDINARY_*` | Credenciais do Cloudinary (opcionais) |
| `PORT` | Porta local (padrão 4000) |
| `CORS_ORIGIN` | Origem permitida (padrão `http://localhost:3000`) |
