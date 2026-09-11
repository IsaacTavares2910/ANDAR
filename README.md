# ANDAR

## Estrutura

- `frontend/`: aplicação Vite da loja, catálogo, login/cadastro, conta, carrinho, favoritos, suporte/chatbot e interface do painel `/admin`.
- `backend/`: servidor Node mínimo e arquivos de infraestrutura do Supabase. As regras de autorização, RLS, Storage e a tabela `admin_users` estão em `backend/supabase-admin.sql`.
- `ADMIN_SETUP.md`: configuração do usuário administrador no Supabase Auth e associação à tabela `admin_users`.

O frontend usa o SDK do Supabase com a chave pública (`VITE_SUPABASE_ANON_KEY`). A segurança das operações não depende do frontend: inserção, edição, exclusão de produtos e Storage são restringidos por RLS e pela função `public.is_admin()` no Supabase.

## Desenvolvimento

```powershell
cd frontend
npm install
npm run dev
```

O build de produção também deve ser executado dentro de `frontend`. O deploy Netlify/Vercel deve usar `frontend` como diretório raiz do projeto, ou configurar o diretório base equivalente.

Para verificar o servidor backend:

```powershell
cd backend
npm install
npm run dev
```

O endpoint disponível é `GET /health`.