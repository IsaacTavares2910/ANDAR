import { supabase } from './supabaseClient';

export async function listarProdutos() {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listarCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*');

  if (error) throw error;
  return data ?? [];
}

export async function listarFavoritos() {
  const user = await usuarioAtualObrigatorio();
  const { data, error } = await supabase
    .from('favoritos')
    .select('*')
    .eq('usuario_id', user.id);

  if (error) throw error;
  return data ?? [];
}

export async function adicionarFavorito(produtoId) {
  const user = await usuarioAtualObrigatorio();
  const { data, error } = await supabase
    .from('favoritos')
    .insert({ usuario_id: user.id, produto_id: produtoId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removerFavorito(produtoId) {
  const user = await usuarioAtualObrigatorio();
  const { error } = await supabase
    .from('favoritos')
    .delete()
    .eq('usuario_id', user.id)
    .eq('produto_id', produtoId);

  if (error) throw error;
}

export async function listarCarrinho() {
  const user = await usuarioAtualObrigatorio();
  const { data, error } = await supabase
    .from('carrinho')
    .select('*')
    .eq('usuario_id', user.id);

  if (error) throw error;
  return data ?? [];
}

export async function adicionarAoCarrinho(produtoId, tamanho, quantidade = 1) {
  const user = await usuarioAtualObrigatorio();
  const { data, error } = await supabase
    .from('carrinho')
    .insert({ usuario_id: user.id, produto_id: produtoId, tamanho, quantidade })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removerDoCarrinho(itemId) {
  const user = await usuarioAtualObrigatorio();
  const { error } = await supabase
    .from('carrinho')
    .delete()
    .eq('usuario_id', user.id)
    .eq('id', itemId);

  if (error) throw error;
}

export async function alterarQuantidadeCarrinho(itemId, quantidade) {
  const user = await usuarioAtualObrigatorio();
  const quantidadeValida = Math.max(1, Number(quantidade) || 1);
  const { data, error } = await supabase
    .from('carrinho')
    .update({ quantidade: quantidadeValida })
    .eq('usuario_id', user.id)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function usuarioAtual() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function usuarioAtualObrigatorio() {
  const user = await usuarioAtual();
  if (!user) throw new Error('É necessário estar autenticado.');
  return user;
}

export async function salvarPerfilCliente(user, nome) {
  if (!user?.id) throw new Error('Usuário autenticado não encontrado.');
  const { data, error } = await supabase
    .from('clientes')
    .upsert({ id: user.id, nome, email: user.email }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
