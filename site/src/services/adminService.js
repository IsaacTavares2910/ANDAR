import { supabase } from './supabaseClient';

export const PRODUCT_IMAGE_BUCKET = 'produtos';

export async function verificarAdministrador() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) throw error;
  return data ? userData.user : null;
}

export async function listarProdutosAdmin() {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listarCategoriasAdmin() {
  const { data, error } = await supabase.from('categorias').select('id, nome').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function salvarProdutoAdmin(produto, imagemFile) {
  let imagemUrl = produto.imagem_url || null;
  let novoCaminho = null;

  if (imagemFile) {
    novoCaminho = `${crypto.randomUUID()}-${normalizarNomeArquivo(imagemFile.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(novoCaminho, imagemFile, { cacheControl: '3600', upsert: false, contentType: imagemFile.type });
    if (uploadError) throw uploadError;
    imagemUrl = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(novoCaminho).data.publicUrl;
  }

  const payload = {
    nome: produto.nome,
    descricao: produto.descricao || null,
    preco: Number(produto.preco),
    categoria_id: produto.categoria_id ? Number(produto.categoria_id) : null,
    tamanho: produto.tamanho || null,
    estoque: Number(produto.estoque),
    imagem_url: imagemUrl
  };

  const query = produto.id
    ? supabase.from('produtos').update(payload).eq('id', produto.id).select().single()
    : supabase.from('produtos').insert(payload).select().single();
  const { data, error } = await query;

  if (error) {
    if (novoCaminho) await removerArquivo(PRODUCT_IMAGE_BUCKET, novoCaminho);
    throw error;
  }

  if (imagemFile && produto.imagem_url) await removerImagemAnterior(produto.imagem_url);
  return data;
}

export async function excluirProdutoAdmin(produto) {
  const { error } = await supabase.from('produtos').delete().eq('id', produto.id);
  if (error) throw error;
  if (produto.imagem_url) await removerImagemAnterior(produto.imagem_url);
}

async function removerImagemAnterior(url) {
  const imagem = extrairImagemStorage(url);
  if (!imagem) return;
  await removerArquivo(imagem.bucket, imagem.path);
}

async function removerArquivo(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) console.warn('Não foi possível remover a imagem antiga:', error);
}

function extrairImagemStorage(url) {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/';
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const remainder = parsed.pathname.slice(index + marker.length);
    const match = remainder.match(/^(?:public|sign|download)\/([^/]+)\/(.+)$/);
    return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
  } catch {
    return null;
  }
}

function normalizarNomeArquivo(nome) {
  return nome.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'imagem';
}
