# Acesso administrativo ANDAR

O painel está disponível em `/admin` (ou `/admin.html`). O login usa Supabase Auth e o usuário precisa estar na tabela `admin_users`; a tela nunca libera operações apenas por esconder elementos no frontend.

## Configuração inicial

1. No Supabase Dashboard, abra **Authentication > Users > Add user**.
2. Crie um usuário com:
   - E-mail: `isaac171@andar.local`
   - Senha: `594416`
   - Confirmação de e-mail: habilitada
3. Copie o UUID desse usuário.
4. Abra o SQL Editor e execute `backend/supabase-admin.sql`. Na linha de inserção comentada, substitua `UUID_REAL` pelo UUID copiado e execute-a.
5. Publique o site normalmente. O usuário entra no painel com `Isaac171` e `594416`.

A migração reutiliza `produtos` e `categorias` existentes, cria somente `admin_users` e o bucket público `produtos`, e aplica RLS às operações de produtos e imagens. A coluna já existente `produtos.tamanho` é usada para tamanhos disponíveis.

O bucket antigo, caso exista, continua sendo usado para imagens já cadastradas. Ao substituir uma imagem, o painel tenta remover o arquivo anterior quando a URL permite identificar o bucket e o caminho.
