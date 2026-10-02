# Nyxoshi V13–V17 — auditoria técnica e correções finais

## Escopo
- V13: autenticação, cargos/permissões, moderação, mensagens e responsividade mobile.
- V15: perfil, temas, fundos, efeitos, introdução, mídia do perfil e responsividade.
- V16: áudio, player, mídia em posts, áudio original e compartilhamento.
- V17: feed de vídeos, reprodução vertical, controles, upload, interações e compartilhamento.
- V18: não implementada; permanece fora deste pacote.

## Correções finais aplicadas
- Corrigido o carregamento de perfis públicos autenticados: a consulta pública agora usa uma única query parametrizada com ordem explícita (`$1 = viewerId`, `$2 = username`), evitando cruzamento entre username e user_id.
- O perfil público não depende mais da sequência de consultas de hidratação para contagens/seguimento, reduzindo pontos de falha e latência.
- A hidratação normal de perfil evita queries concorrentes no fallback PGlite de conexão única.
- `permanent_id` usa o valor já retornado pela linha do perfil, sem consulta extra.
- O carregamento de perfil, publicações, reposts e curtidas ganhou timeout de 12 s, retry controlado e não refaz fetch ao trocar o foco da janela.
- Mantidas as proteções de shadow-ban, bloqueios e privacidade no carregamento do perfil.
- Adicionados índices para consultas de followers, blocks, mutes e restrictions (`0012_v17_profile_query_indexes.sql`).
- V15: personalização persistida é exposta corretamente no perfil público.
- V15: mídia de perfil grande/inline é entregue via endpoint dedicado.
- V16/V17: mídia local de posts e miniaturas usa endpoints dedicados; uploads ficam em limites compatíveis com payload serverless.
- V16/V17: URLs externas ambíguas para OGG/WebM exigem tipo de mídia explícito.
- Menções em comentários usam exatamente um alvo.
- Ações de perfil e mensagens usam layouts delimitados para telas móveis.
- Ações autenticadas continuam protegidas no servidor; atualização de cargos privilegiados não depende apenas da interface.
- Nomes de arquivos do pacote não contêm referências a `grok`, `gemini`, `openai`, `claude`, `llama` ou `mistral`.
- `.vercel/` permanece fora do versionamento pelo `.gitignore`.

## Variáveis de ambiente
As variáveis obrigatórias/operacionais documentadas continuam:
`DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
`NYXOSHI_FOUNDER_1_EMAIL`, `NYXOSHI_FOUNDER_2_EMAIL`,
`NYXOSHI_FOUNDER_3_EMAIL`, `NYXOSHI_ANGEL_GIRL_EMAIL`,
`NYXOSHI_SUPREME_ARCHMAGE_EMAIL`, `NYXOSHI_HARDWARE_SCIENTIST_EMAIL`,
`VITE_AUTH_ENABLED` e `VITE_SOCIAL_AUTH_ENABLED`.
As variáveis de infraestrutura opcionais continuam somente quando o recurso correspondente for utilizado.

## Verificações executadas neste pacote
- Testes Node `scripts/*.test.mjs`: **216 testes, 212 aprovados, 0 falhas, 4 skips**.
- `node --experimental-strip-types --check` nos principais módulos TypeScript de servidor: **0 erros de sintaxe**.
- Verificação de nomes de arquivos relacionados a provedores/IA: **0 ocorrências**.
- Revisão estática dos imports e do fluxo de perfil, mídia, auth e banco.
- O build Vite/Nitro e o `npm audit` foram validados no computador do projeto conforme os resultados apresentados nesta conversa: build de produção concluído e `npm audit` terminou em **0 vulnerabilidades**.

## Observação de deploy
A aplicação usa PostgreSQL/Neon quando `DATABASE_URL` existe e PGlite como fallback. Para produção persistente, o deploy precisa usar a `DATABASE_URL` do banco real e executar as migrations do projeto durante o deploy.
