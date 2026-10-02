# NYXOSHI V12

V12 baseada integralmente na V11, preservando os arquivos, funcionalidades, configurações, migrations, dependências e integrações existentes.

## Estrutura de cargos preservada
- Angel Girl: privilégios administrativos especiais anteriormente associados à Fundadora #1.
- Fundadores #1, #2 e #3: mesma estrutura de permissões entre si.
- Supremo Arquimago: cargo especial definido por e-mail.
- Sub Fundador / Vice Fundador: atribuição por ID permanente.
- Maluco Cientista de Hardware com Farofa: cargo exclusivo definido por e-mail, com acesso somente ao Laboratório da Maluca.

## Environment Variables
O `.env.example` desta versão documenta todas as variáveis encontradas no código V12, incluindo:
- DATABASE_URL
- BETTER_AUTH_URL
- BETTER_AUTH_SECRET
- NYXOSHI_APP_URL
- NYXOSHI_FOUNDER_1_EMAIL
- NYXOSHI_FOUNDER_2_EMAIL
- NYXOSHI_FOUNDER_3_EMAIL
- NYXOSHI_ANGEL_GIRL_EMAIL
- NYXOSHI_SUPREME_ARCHMAGE_EMAIL
- NYXOSHI_HARDWARE_SCIENTIST_EMAIL
- GROK_AUTH_ISSUER
- GROK_AUTH_CLIENT_ID
- GROK_AUTH_CLIENT_SECRET
- GROK_PROJECT_ID
- GROK_GATE_ORIGIN
- GROK_CONNECTORS_URL
- GROK_CONNECTOR_ACCESS_TOKEN
- VITE_AUTH_ENABLED
- VITE_PUBLIC_HOSTNAME

As variáveis VERCEL_URL, VERCEL_BRANCH_URL, VERCEL_PROJECT_PRODUCTION_URL e NODE_ENV são tratadas como variáveis de plataforma e não precisam ser copiadas para o projeto.

## Segurança
Secrets reais não são incluídos neste ZIP. Os valores reais devem ser configurados diretamente no Vercel.
