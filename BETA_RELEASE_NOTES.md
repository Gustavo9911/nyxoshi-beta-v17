# Nyxoshi Beta — atualização

Esta versão remove dados pessoais/demo do layout e deixa o aplicativo preparado para usuários reais.

### Incluído
- Feed sem pessoas hardcoded.
- Login/cadastro com Better Auth.
- Posts, curtidas e comentários persistidos no banco.
- Perfis com foto, banner, GIF e link por URL.
- Configurações de conta e botão de sair.
- Mensagens reais com solicitações, aceitar, recusar e spam.
- Conversas persistidas e leitura de mensagens.
- Bloqueio impedindo mensagens entre contas bloqueadas.
- Cargos de equipe: tester, bug tester, designer, moderador e admin.
- Sistema server-side de fundadores, limitado a três e-mails configurados no ambiente.
- Painel de moderação com ban, mute e shadow ban.
- Painel dos fundadores separado.
- Auditoria das alterações de cargo.
- PWA instalável e configuração de empacotamento Android.

### Antes de abrir para testers
Configure o banco PostgreSQL/Neon e as variáveis de ambiente descritas em `.env.example`. Não use o fallback PGLite como banco de produção.
