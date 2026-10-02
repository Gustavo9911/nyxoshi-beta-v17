# Nyxoshi V15–V17 — auditoria técnica

## Escopo
- V15: perfil, temas, fundos, efeitos, introdução, mídia do perfil e responsividade.
- V16: áudio, mídia em posts, áudio original e compartilhamento.
- V17: aba de vídeos, reprodução inline, upload, URLs externas e compartilhamento.
- V18: **não implementada**; reservada para votação/aprovação no Discord.

## Correções principais
- Corrigido o carregamento da personalização V15 em perfis públicos, busca e sugestões: os campos persistidos agora são selecionados e hidratados corretamente.
- Corrigida a criação de menções em comentários, que podia violar a restrição de exatamente um alvo em `mentions`.
- Alinhados os limites de upload de post com o teto de payload do Vercel: 3 MB por mídia local, com validação servidor/cliente consistente.
- Mídia local de posts e miniaturas deixou de trafegar no JSON do feed: endpoints dedicados usam resposta binária e Range para mídia de vídeo/áudio.
- Imagens de perfil repetidas em cards, comentários, notificações e conversas agora usam endpoint de mídia dedicado, evitando repetir base64 em grandes respostas.
- Upload de GIF/WebP do perfil corrigido e URLs externas passaram a exigir protocolo e extensão compatíveis com o tipo declarado.
- Mídias de perfil sem alteração não são reenviadas ao salvar configurações, preservando compatibilidade com arquivos legados e reduzindo payload.
- Removido o mascote e todas as referências de arquivos do mascote.
- Removida a release note de V18 e a migração foi renomeada para V15–V17.
- Corrigida a estrutura responsiva do cabeçalho/ações do perfil.
- Corrigidos limites e overflow de mídia no mobile.
- Adicionada aba de vídeos no feed.
- Players de áudio/vídeo passaram a tratar erro de carregamento e respeitar largura máxima.
- Composer revisado para upload, URLs diretas e preview de mídia.
- Modais e sheets receberam limites de viewport e safe-area melhores para celulares.
- Criado retry controlado para mutações que recebem `Unauthorized`, com refresh de sessão limitado a 4 segundos.
- Aplicado retry em ações críticas de perfil, publicação, moderação, cargos e comunicados.
- Comunicados globais passaram a depender diretamente da permissão de liderança, sem depender da presença do usuário no grupo de Fundadores.
- Loading inicial deixou de poder ficar indefinidamente preso: após 8 segundos há uma tela de recuperação.
- Nomes locais relacionados a provedores sociais foram generalizados (`SOCIAL_PROVIDERS`). Contratos externos de autenticação foram preservados para não quebrar o deploy.

## Verificações executadas
- Parser TypeScript/TSX em todo o projeto: **0 diagnósticos de sintaxe**.
- Verificação dos imports `@/...`: **0 imports ausentes**.
- Testes Node existentes + novos testes de regressão: **205 testes, 201 pass, 0 falhas, 4 skips**.
- Foram adicionados 10 testes estáticos V15–V17 para proteger limites, rotas de mídia, personalização, payloads e menções.

## Limitação do ambiente de auditoria
As dependências npm não estavam instaladas no arquivo recebido e `npm ci --ignore-scripts --no-audit --no-fund --prefer-offline` excedeu o tempo disponível no ambiente. Portanto, `vite build`, `tsc`, ESLint e execução real do navegador não puderam ser executados aqui. O código foi validado por parsing TS/TSX (0 diagnósticos de sintaxe), análise estática dos imports locais (somente 2 imports especiais intencionais com `?raw`/`?url`), testes Node e revisão direcionada dos fluxos V15–V17.

## Auditoria complementar — V13 + V15–V17

- V13: endurecida a autorização no servidor para impedir alteração de cargos protegidos por chamadas forjadas; corrigida a remoção do acesso ao painel de denúncias para usar ID permanente; ações de perfil e mensagens foram ajustadas para mobile sem overflow de botões.
- V13: a inicialização autenticada agora tem timeout de recuperação e o carregamento do perfil não permanece indefinidamente; falhas de sessão/perfil apresentam ação de recuperação.
- V15: leituras de perfil público não sincronizam cargos como efeito colateral; perfil próprio não embute mídias Base64 grandes.
- V16/V17: URLs `.webm`/`.ogg` ambíguas exigem tipo explícito; metadados de áudio/vídeo têm timeout para evitar travamentos em arquivos problemáticos.
- V16/V17: mídia local do feed e miniaturas são servidas por endpoints próprios, reduzindo o tamanho das respostas.
- Nenhum arquivo do pacote possui nome com `grok`, `gemini`, `openai`, `claude`, `llama` ou `mistral`; não houve renomeação artificial de arquivos nem alteração de nomes de cookies/hosts de serviços externos.

### Validação

A suíte estática de scripts executa 215 testes, com 211 aprovados, 0 falhas e 4 skips. O build completo e o typecheck dependente das bibliotecas do projeto não foram executados neste ambiente por ausência de `node_modules`.

