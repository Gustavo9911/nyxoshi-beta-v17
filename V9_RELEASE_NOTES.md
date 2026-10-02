# Nyxoshi V9 — Correções e manutenção

V9 preserva a base completa do V7 e adiciona as correções solicitadas para o beta.

## Administração
- Painel de cargos restaurado para a Fundadora #1.
- Cargos disponíveis: user, tester, bug_tester, designer, moderator, admin e founder.
- Fundadora #1 permanece protegida e não pode ser removida pelo painel.
- Fundação #1, #2 e #3 possuem controle explícito de numeração.

## E-mails
- A área de e-mails continua disponível exclusivamente para a Fundadora #1.
- O campo de motivo para revelar e-mail foi removido.
- A autorização continua sendo verificada no servidor.

## Denúncias
- Novo painel privado `/reports`.
- Fundadores têm acesso automático.
- A Fundadora #1 pode autorizar outros usuários por ID interno.
- Cada denúncia preserva um snapshot do conteúdo denunciado, o motivo, autor da denúncia e informações do alvo.
- O moderador pode arquivar, advertir, silenciar, suspender, aplicar shadow ban ou remover conteúdo.
- Decisões ficam registradas com auditoria.

## Mensagens
- Solicitações usam consulta tolerante a perfis ausentes e mostram todas as solicitações pendentes/spam do destinatário.
- A aba de solicitações é atualizada automaticamente.
- Funções de conversa, grupos, respostas, reações, denúncia e exclusão foram preservadas.

## Reposts e curtidas
- Corrigidas consultas que tentavam interpolar SQL como parâmetro.
- Reposts e curtidas agora retornam o post original completo, com autor, texto, contagens e estado das interações.

## Perfil
- Banner, foto e GIF podem continuar sendo definidos por URL.
- Também é possível enviar diretamente arquivos de imagem/GIF de até 4 MB.
- GIFs enviados como arquivo são armazenados como data URL e continuam animados no navegador.
- Pré-visualização e remoção foram adicionadas às configurações.

## Preservação
- A base V7 foi mantida como ponto de partida.
- PostgreSQL/Neon, PGLite, Better Auth, Vercel, Capacitor/APK, interações sociais, notificações, grupos, mensagens, perfis e demais funções existentes não foram removidos.
