# Nyxoshi V12 — configuração no Vercel

## Obrigatórias para produção
Cadastre em Production:

- DATABASE_URL = URL do PostgreSQL de produção
- BETTER_AUTH_URL = domínio público do Nyxoshi
- BETTER_AUTH_SECRET = segredo aleatório longo e privado
- NYXOSHI_APP_URL = mesmo domínio público do Nyxoshi
- NYXOSHI_FOUNDER_1_EMAIL = e-mail exato da conta Fundador #1
- NYXOSHI_FOUNDER_2_EMAIL = e-mail exato da conta Fundador #2
- NYXOSHI_FOUNDER_3_EMAIL = e-mail exato da conta Fundador #3
- NYXOSHI_ANGEL_GIRL_EMAIL = e-mail da conta Angel Girl
- NYXOSHI_SUPREME_ARCHMAGE_EMAIL = e-mail da conta Supremo Arquimago
- NYXOSHI_HARDWARE_SCIENTIST_EMAIL = e-mail da única conta Maluco Cientista de Hardware com Farofa
- VITE_AUTH_ENABLED = true

## Autenticação federada
Se o seu projeto Vercel estiver conectado à infraestrutura de autenticação que fornece o broker, mantenha também os valores fornecidos para:

- GROK_AUTH_ISSUER
- GROK_AUTH_CLIENT_ID
- GROK_AUTH_CLIENT_SECRET
- GROK_PROJECT_ID
- GROK_GATE_ORIGIN

Não invente valores para essas variáveis. Use os valores fornecidos pela infraestrutura de autenticação.

## Connectors
Somente se o projeto utilizar a infraestrutura de connectors:

- GROK_CONNECTORS_URL
- GROK_CONNECTOR_ACCESS_TOKEN

## PWA / host
VITE_PUBLIC_HOSTNAME pode ser preenchida com o host público quando a infraestrutura de publicação exigir. Caso o deployer já forneça esse valor, não é necessário duplicá-lo.

## Variáveis automáticas do Vercel
Não é necessário cadastrar manualmente:

- VERCEL_URL
- VERCEL_BRANCH_URL
- VERCEL_PROJECT_PRODUCTION_URL
- NODE_ENV

O código usa essas variáveis automaticamente para montar origens confiáveis durante o deploy.

## Regras importantes
1. Use Production para as credenciais reais do site.
2. Use Preview/Development com valores separados quando necessário.
3. Nunca coloque DATABASE_URL ou BETTER_AUTH_SECRET no GitHub.
4. Depois de alterar variáveis, faça um novo deploy.
5. O domínio usado em BETTER_AUTH_URL e NYXOSHI_APP_URL deve ser o domínio público real do Nyxoshi.
