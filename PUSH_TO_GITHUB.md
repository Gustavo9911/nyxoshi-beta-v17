# Enviar o Nyxoshi para o GitHub

Repositório alvo: `https://github.com/Gustavo9911/Nyxoshi-`

O repositório remoto está vazio. No computador, abra um terminal dentro desta pasta e execute:

```bash
git init
git branch -M main
git add .
git commit -m "feat: initial Nyxoshi project"
git remote add origin https://github.com/Gustavo9911/Nyxoshi-.git
git push -u origin main
```

Se o Git pedir autenticação, use o login/autorização do GitHub. Não coloque senha, token ou segredo dentro de arquivos do projeto.

Depois do primeiro push, o código ficará na branch `main` e o repositório poderá ser conectado a um serviço de deploy.

## Antes de publicar

- Crie as variáveis de ambiente necessárias no provedor de deploy.
- Nunca faça commit de `.env` ou chaves privadas.
- Rode `npm install` e depois `npm run typecheck`, `npm run lint` e `npm test` quando as dependências estiverem instaladas.
- Rode `npm run build` somente depois de configurar as variáveis de ambiente exigidas pelo projeto.
