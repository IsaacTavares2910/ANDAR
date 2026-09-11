# Backend ANDAR

Este diretório contém o servidor Node e a configuração de infraestrutura do Supabase.

- `src/config/`: ambiente e cliente administrativo do Supabase.
- `src/routes/`: endpoints HTTP do backend.
- `src/controllers/`: controladores, incluindo `GET /health`.
- `supabase-admin.sql`: tabela de administradores, RLS de `produtos` e políticas do Storage.

O frontend mantém a sessão do Supabase Auth no navegador e chama o Supabase com a chave pública. A autorização efetiva de produtos e imagens é feita pelas políticas RLS no banco, nunca por uma condição visual do frontend.
