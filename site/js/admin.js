import { supabase } from '../src/services/supabaseClient';
import { excluirProdutoAdmin, listarCategoriasAdmin, listarProdutosAdmin, salvarProdutoAdmin, verificarAdministrador } from '../src/services/adminService';

const ADMIN_LOGIN = 'Isaac171';
const ADMIN_EMAIL = 'isaac171@andar.local';
let produtos = [];
let categorias = [];
let produtoEmEdicao = null;
let imagemSelecionada = null;

const el = selector => document.querySelector(selector);

document.addEventListener('DOMContentLoaded', iniciar);

async function iniciar() {
  configurarEventos();
  try {
    const usuario = await verificarAdministrador();
    if (usuario) await abrirPainel(usuario);
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(el('[data-login-message]'), 'Não foi possível verificar a autorização. Confira a configuração de RLS.', 'error');
  }
}

function configurarEventos() {
  el('[data-login-form]').addEventListener('submit', fazerLogin);
  el('[data-logout]').addEventListener('click', sair);
  el('[data-new-product]').addEventListener('click', () => abrirEditor());
  el('[data-refresh]').addEventListener('click', carregarDados);
  el('[data-search]').addEventListener('input', renderizarProdutos);
  el('[data-category-filter]').addEventListener('change', renderizarProdutos);
  el('[data-product-form]').addEventListener('submit', salvarProduto);
  el('[data-product-form] [name="imagem"]').addEventListener('change', prepararImagem);
  document.querySelectorAll('[data-close-dialog]').forEach(botao => botao.addEventListener('click', fecharEditor));
  el('[data-product-dialog]').addEventListener('click', event => { if (event.target === el('[data-product-dialog]')) fecharEditor(); });
}

async function fazerLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const usuario = form.usuario.value.trim();
  const senha = form.senha.value;
  if (usuario !== ADMIN_LOGIN) return mostrarMensagem(el('[data-login-message]'), 'Usuário não autorizado.', 'error');
  definirCarregando(form, true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: senha });
    if (error) throw error;
    const autorizado = await verificarAdministrador();
    if (!autorizado) {
      await supabase.auth.signOut();
      throw new Error('Esta conta não possui permissão de administrador.');
    }
    await abrirPainel(data.user);
  } catch (erro) {
    mostrarMensagem(el('[data-login-message]'), erro.message.includes('autorização') || erro.message.includes('permissão') ? erro.message : 'Usuário ou senha inválidos.', 'error');
  } finally {
    definirCarregando(form, false);
  }
}

async function abrirPainel(usuario) {
  el('[data-admin-user]').textContent = usuario.email || ADMIN_LOGIN;
  el('[data-admin-login]').classList.add('is-hidden');
  el('[data-admin-app]').classList.remove('is-hidden');
  try {
    categorias = await listarCategoriasAdmin();
    preencherCategorias();
    await carregarDados();
  } catch (erro) {
    mostrarMensagem(el('[data-feedback]'), 'Não foi possível carregar o catálogo. Verifique as políticas do Supabase.', 'error');
  }
}

async function carregarDados() {
  el('[data-refresh]').disabled = true;
  el('[data-products-grid]').innerHTML = '<div class="loading-state">Carregando coleção...</div>';
  try {
    produtos = await listarProdutosAdmin();
    atualizarResumo();
    renderizarProdutos();
  } catch (erro) {
    el('[data-products-grid]').innerHTML = '';
    mostrarMensagem(el('[data-feedback]'), traduzirErro(erro), 'error');
  } finally {
    el('[data-refresh]').disabled = false;
  }
}

function preencherCategorias() {
  const options = categorias.map(categoria => `<option value="${categoria.id}">${escapeHtml(categoria.nome)}</option>`).join('');
  el('[data-category-filter]').insertAdjacentHTML('beforeend', options);
  el('[data-category-input]').insertAdjacentHTML('beforeend', options);
}

function renderizarProdutos() {
  const termo = el('[data-search]').value.trim().toLowerCase();
  const categoria = el('[data-category-filter]').value;
  const filtrados = produtos.filter(produto => (!termo || String(produto.nome || '').toLowerCase().includes(termo)) && (!categoria || String(produto.categoria_id) === categoria));
  el('[data-empty]').classList.toggle('is-hidden', filtrados.length > 0);
  el('[data-products-grid]').innerHTML = filtrados.map(produto => {
    const imagem = produto.imagem_url || 'assets/images/placeholder.jpg';
    const estoque = Number(produto.estoque || 0);
    return `<article class="admin-product-card"><div class="admin-product-card__image"><img src="${escapeHtml(imagem)}" alt="${escapeHtml(produto.nome || 'Produto')}" loading="lazy"><span class="stock-badge ${estoque > 0 ? '' : 'is-empty'}">${estoque > 0 ? `${estoque} em estoque` : 'Esgotado'}</span></div><div class="admin-product-card__body"><span class="product-category">${escapeHtml(nomeCategoria(produto.categoria_id))}</span><h2>${escapeHtml(produto.nome || 'Sem nome')}</h2><p>${escapeHtml(produto.descricao || 'Sem descrição cadastrada.')}</p><div class="product-meta"><strong>${formatarPreco(produto.preco)}</strong><span>Tam. ${escapeHtml(produto.tamanho || 'não informado')}</span></div><div class="card-actions"><button class="button button--edit" type="button" data-edit="${produto.id}">Editar</button><button class="button button--delete" type="button" data-delete="${produto.id}">Excluir</button></div></div></article>`;
  }).join('');
  el('[data-products-grid]').querySelectorAll('[data-edit]').forEach(botao => botao.addEventListener('click', () => abrirEditor(produtos.find(item => String(item.id) === botao.dataset.edit))));
  el('[data-products-grid]').querySelectorAll('[data-delete]').forEach(botao => botao.addEventListener('click', () => deletarProduto(produtos.find(item => String(item.id) === botao.dataset.delete))));
}

function abrirEditor(produto = null) {
  produtoEmEdicao = produto;
  imagemSelecionada = null;
  const form = el('[data-product-form]');
  form.reset();
  el('[data-dialog-eyebrow]').textContent = produto ? 'Editar cadastro' : 'Novo cadastro';
  el('[data-dialog-title]').textContent = produto ? 'Editar produto' : 'Novo produto';
  if (produto) Object.entries({ nome: produto.nome, categoria_id: produto.categoria_id, preco: produto.preco, estoque: produto.estoque, tamanho: produto.tamanho, descricao: produto.descricao }).forEach(([campo, valor]) => { form.elements[campo].value = valor ?? ''; });
  atualizarPreview(produto?.imagem_url);
  el('[data-form-message]').textContent = '';
  el('[data-product-dialog]').showModal();
}

function prepararImagem(event) {
  imagemSelecionada = event.target.files[0] || null;
  atualizarPreview(imagemSelecionada ? URL.createObjectURL(imagemSelecionada) : produtoEmEdicao?.imagem_url);
}

async function salvarProduto(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const produto = { id: produtoEmEdicao?.id, nome: form.nome.value.trim(), categoria_id: form.categoria_id.value, preco: form.preco.value, estoque: form.estoque.value, tamanho: form.tamanho.value.trim(), descricao: form.descricao.value.trim(), imagem_url: produtoEmEdicao?.imagem_url };
  definirCarregando(form, true);
  try {
    await salvarProdutoAdmin(produto, imagemSelecionada);
    fecharEditor();
    mostrarMensagem(el('[data-feedback]'), produto.id ? 'Produto atualizado com sucesso.' : 'Produto adicionado com sucesso.', 'success');
    await carregarDados();
  } catch (erro) {
    mostrarMensagem(el('[data-form-message]'), traduzirErro(erro), 'error');
  } finally {
    definirCarregando(form, false);
  }
}

async function deletarProduto(produto) {
  if (!produto || !window.confirm(`Excluir “${produto.nome}”? Esta ação não pode ser desfeita.`)) return;
  try {
    await excluirProdutoAdmin(produto);
    mostrarMensagem(el('[data-feedback]'), 'Produto excluído com sucesso.', 'success');
    await carregarDados();
  } catch (erro) {
    mostrarMensagem(el('[data-feedback]'), traduzirErro(erro), 'error');
  }
}

async function sair() {
  await supabase.auth.signOut();
  window.location.reload();
}

function fecharEditor() { el('[data-product-dialog]').close(); }
function atualizarPreview(src) { const imagem = el('[data-image-preview]'); imagem.src = src || ''; imagem.classList.toggle('is-visible', Boolean(src)); el('[data-image-placeholder]').classList.toggle('is-hidden', Boolean(src)); }
function atualizarResumo() { el('[data-total-products]').textContent = produtos.length; el('[data-in-stock]').textContent = produtos.filter(produto => Number(produto.estoque) > 0).length; el('[data-out-stock]').textContent = produtos.filter(produto => Number(produto.estoque) <= 0).length; }
function nomeCategoria(id) { return categorias.find(categoria => String(categoria.id) === String(id))?.nome || 'Sem categoria'; }
function formatarPreco(valor) { return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function mostrarMensagem(elemento, texto, tipo) { elemento.textContent = texto; elemento.dataset.type = tipo; }
function definirCarregando(form, carregando) { form.classList.toggle('is-loading', carregando); form.querySelectorAll('button').forEach(botao => { botao.disabled = carregando; }); }
function traduzirErro(erro) { return erro?.code === '42501' ? 'Operação bloqueada pelas políticas de segurança do Supabase.' : erro?.message || 'Não foi possível concluir a operação.'; }
function escapeHtml(valor) { return String(valor ?? '').replace(/[&<>"']/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[caractere])); }
