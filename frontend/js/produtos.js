/* ==========================================================================
   ANDAR — produtos.js
   Estrutura pronta para buscar produtos no Supabase. Enquanto o banco não
   está conectado, mostra o skeleton de carregamento e depois o estado vazio.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   CONFIGURAÇÃO FUTURA DO SUPABASE
   1. Adicione o SDK no <head> de produtos.html:
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   2. Preencha as constantes abaixo com os dados do seu projeto
      (Project Settings > API no painel do Supabase):
--------------------------------------------------------------------------- */
import {
  listarCategorias, listarProdutos, listarFavoritos, adicionarFavorito,
  removerFavorito, adicionarAoCarrinho, usuarioAtual
} from '../src/services/storeService';
import { supabase } from '../src/services/supabaseClient';

/* Campos esperados na tabela "produtos":
   id (uuid/int) | nome (text) | descricao (text) | preco (numeric)
   imagem (text - url) | categoria (text) | estoque (int)                */

let TODOS_PRODUTOS = [];
let CATEGORIA_ATIVA = 'todos';
let CATEGORIAS = [];
let FAVORITOS = new Set();
let PRODUTO_SELECIONADO = null;

document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  carregarCategorias();
  carregarFavoritos();
  configurarDetalhes();
  supabase.auth.onAuthStateChange(() => {
    FAVORITOS = new Set();
    carregarFavoritos();
  });
});

/* ---------------------------------------------------------------------- */
/* carregarProdutos — busca os produtos e decide o que renderizar          */
/* ---------------------------------------------------------------------- */
async function carregarProdutos(){
  mostrarLoading();

  try{
    const produtos = await buscarProdutosNoBanco();
    TODOS_PRODUTOS = produtos || [];

    if(TODOS_PRODUTOS.length === 0){
      mostrarEstadoVazio();
    } else {
      if(CATEGORIAS.length) montarFiltrosPorNomes(CATEGORIAS);
      else montarFiltros(TODOS_PRODUTOS);
      renderizarProdutos(TODOS_PRODUTOS);
    }
  } catch(erro){
    console.error('Erro ao carregar produtos:', erro);
    mostrarEstadoErro();
  }
}

/* ---------------------------------------------------------------------- */
/* buscarProdutosNoBanco — troque este corpo pela chamada real ao Supabase */
/* ---------------------------------------------------------------------- */
async function buscarProdutosNoBanco(){
  return listarProdutos();
}

async function carregarCategorias(){
  const wrap = document.querySelector('.filters');
  if(!wrap) return;

  try{
    const categorias = await listarCategorias();
    CATEGORIAS = categorias
      .map(categoria => ({
        id: categoria.id,
        nome: categoria.nome || categoria.categoria || categoria.slug
      }))
      .filter(categoria => categoria.id !== undefined && categoria.nome);
    if(CATEGORIAS.length) montarFiltrosPorNomes(CATEGORIAS);
    if(TODOS_PRODUTOS.length) renderizarProdutos(TODOS_PRODUTOS);
  } catch(erro){
    console.warn('Categorias não disponíveis; usando categorias dos produtos.', erro);
  }
}

async function carregarFavoritos(){
  try{
    const user = await usuarioAtual();
    if(!user) return;
    const favoritos = await listarFavoritos();
    FAVORITOS = new Set(favoritos.map(favorito => String(favorito.produto_id)));
    atualizarBotoesFavoritos();
  } catch(erro){
    console.warn('Favoritos indisponíveis para este usuário.', erro);
  }
}

/* ---------------------------------------------------------------------- */
/* Estados visuais                                                         */
/* ---------------------------------------------------------------------- */
function mostrarLoading(){
  const grid = document.querySelector('.products__grid');
  const empty = document.querySelector('.products__state');
  if(empty) empty.classList.add('is-hidden');
  if(!grid) return;

  grid.innerHTML = Array.from({ length: 8 }).map(() => `
    <div class="skeleton">
      <div class="skeleton__media"></div>
      <div class="skeleton__body">
        <div class="skeleton__line short"></div>
        <div class="skeleton__line"></div>
        <div class="skeleton__line short"></div>
      </div>
    </div>
  `).join('');
}

function mostrarEstadoVazio(){
  const grid = document.querySelector('.products__grid');
  const empty = document.querySelector('.products__state');
  if(grid) grid.innerHTML = '';
  if(empty) empty.classList.remove('is-hidden');
}

function mostrarEstadoErro(){
  const grid = document.querySelector('.products__grid');
  const empty = document.querySelector('.products__state');
  if(grid) grid.innerHTML = '';
  if(empty){
    empty.classList.remove('is-hidden');
    const title = empty.querySelector('h3');
    const text = empty.querySelector('p');
    if(title) title.textContent = 'Não foi possível carregar os produtos';
    if(text) text.textContent = 'Verifique a conexão com o banco de dados e tente novamente em instantes.';
  }
}

/* ---------------------------------------------------------------------- */
/* Filtros de categoria — montados dinamicamente a partir dos produtos     */
/* ---------------------------------------------------------------------- */
function montarFiltros(produtos){
  const categorias = [...new Set(produtos.map(p => p.categoria_id).filter(Boolean))]
    .map(id => ({ id, nome: String(id) }));
  montarFiltrosPorNomes(categorias);
}

function montarFiltrosPorNomes(categorias){
  const wrap = document.querySelector('.filters');
  if(!wrap) return;

  wrap.innerHTML = ['todos', ...categorias].map(categoria => {
    const id = categoria === 'todos' ? 'todos' : String(categoria.id);
    const nome = categoria === 'todos' ? 'Todos' : categoria.nome;
    return `
    <button class="filter-chip ${id === CATEGORIA_ATIVA ? 'is-active' : ''}" data-categoria="${id}">
      ${nome}
    </button>
  `;
  }).join('');

  wrap.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      CATEGORIA_ATIVA = chip.dataset.categoria;
      wrap.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');

      const filtrados = CATEGORIA_ATIVA === 'todos'
        ? TODOS_PRODUTOS
        : TODOS_PRODUTOS.filter(p => String(p.categoria_id) === CATEGORIA_ATIVA);

      renderizarProdutos(filtrados);
    });
  });
}

/* ---------------------------------------------------------------------- */
/* renderizarProdutos — desenha os cards a partir do array de produtos     */
/* ---------------------------------------------------------------------- */
function renderizarProdutos(produtos){
  const grid = document.querySelector('.products__grid');
  const empty = document.querySelector('.products__state');
  if(!grid) return;

  if(produtos.length === 0){
    grid.innerHTML = '';
    if(empty) empty.classList.remove('is-hidden');
    return;
  }
  if(empty) empty.classList.add('is-hidden');

  grid.innerHTML = produtos.map((produto, i) => `
    <article class="product-card" data-product-id="${escapeHtml(produto.id)}" tabindex="0" role="button" aria-label="Ver detalhes de ${escapeHtml(produto.nome || 'produto')}" style="animation-delay:${Math.min(i * 0.06, 0.6)}s">
      <div class="product-card__media">
        ${produto.estoque !== undefined && produto.estoque <= 0 ? '<span class="product-card__tag">Esgotado</span>' : ''}
        <img src="${escapeHtml(produto.imagem_url || produto.imagem || 'assets/images/placeholder.jpg')}" alt="${escapeHtml(produto.nome || 'Produto')}" loading="lazy">
      </div>
      <div class="product-card__body">
        <span class="product-card__cat">${nomeCategoria(produto.categoria_id)}</span>
        <h3 class="product-card__name">${escapeHtml(produto.nome || 'Sem nome')}</h3>
        <div class="product-card__row">
          <span class="product-card__price">${formatarPreco(produto.preco)}</span>
          <button class="product-card__btn ${FAVORITOS.has(String(produto.id)) ? 'is-active' : ''}" aria-label="${FAVORITOS.has(String(produto.id)) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}" data-favorite-id="${escapeHtml(produto.id)}">
            ${iconeFavorito(FAVORITOS.has(String(produto.id)))}
          </button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('[data-product-id]').forEach(card => {
    card.addEventListener('click', event => {
      if(event.target.closest('[data-favorite-id]')) return;
      abrirDetalhes(card.dataset.productId);
    });
    card.addEventListener('keydown', event => {
      if((event.key === 'Enter' || event.key === ' ') && !event.target.closest('[data-favorite-id]')){
        event.preventDefault();
        abrirDetalhes(card.dataset.productId);
      }
    });
  });

  grid.querySelectorAll('[data-favorite-id]').forEach(botao => {
    botao.addEventListener('click', async () => {
      const produtoId = botao.dataset.favoriteId;
      try{
        botao.disabled = true;
        if(FAVORITOS.has(String(produtoId))){
          await removerFavorito(produtoId);
          FAVORITOS.delete(String(produtoId));
        } else {
          await adicionarFavorito(produtoId);
          FAVORITOS.add(String(produtoId));
        }
        atualizarBotaoFavorito(botao, FAVORITOS.has(String(produtoId)));
        botao.classList.remove('is-popping');
        requestAnimationFrame(() => botao.classList.add('is-popping'));
        window.ANDAR?.showToast(FAVORITOS.has(String(produtoId)) ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.');
      } catch(erro){
        console.error('Erro ao adicionar favorito:', erro);
        const usuario = await usuarioAtual().catch(() => null);
        window.ANDAR?.showToast(usuario ? 'Não foi possível salvar o favorito. Verifique as políticas RLS.' : 'Entre na sua conta para favoritar produtos.');
      } finally {
        botao.disabled = false;
      }
    });
  });
}

function configurarDetalhes(){
  const modal = document.querySelector('[data-product-modal]');
  if(!modal) return;
  modal.querySelector('[data-modal-close]').addEventListener('click', fecharDetalhes);
  modal.addEventListener('click', event => { if(event.target === modal) fecharDetalhes(); });
  document.addEventListener('keydown', event => { if(event.key === 'Escape') fecharDetalhes(); });
  modal.querySelector('[data-add-cart]').addEventListener('click', adicionarProdutoSelecionadoAoCarrinho);
  modal.querySelector('[data-modal-favorite]').addEventListener('click', alternarFavoritoDetalhe);
}

function abrirDetalhes(produtoId){
  const produto = TODOS_PRODUTOS.find(item => String(item.id) === String(produtoId));
  const modal = document.querySelector('[data-product-modal]');
  if(!produto || !modal) return;
  PRODUTO_SELECIONADO = produto;
  modal.querySelector('[data-detail-image]').src = produto.imagem_url || produto.imagem || 'assets/images/placeholder.jpg';
  modal.querySelector('[data-detail-image]').alt = produto.nome || 'Produto';
  modal.querySelector('[data-detail-category]').textContent = nomeCategoria(produto.categoria_id);
  modal.querySelector('[data-detail-name]').textContent = produto.nome || 'Sem nome';
  modal.querySelector('[data-detail-description]').textContent = produto.descricao || 'Detalhes cuidadosamente pensados para acompanhar cada passo.';
  modal.querySelector('[data-detail-price]').textContent = formatarPreco(produto.preco);
  modal.querySelector('[data-detail-stock]').textContent = produto.estoque > 0 ? `${produto.estoque} disponíveis` : 'Esgotado';
  modal.querySelector('[data-detail-color]').textContent = produto.cor || produto.color || 'Consulte disponibilidade';
  montarTamanhos(produto, modal);
  atualizarBotaoFavorito(modal.querySelector('[data-modal-favorite]'), FAVORITOS.has(String(produto.id)));
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
}

function montarTamanhos(produto, modal){
  const wrap = modal.querySelector('[data-size-options]');
  const valores = produto.tamanhos_disponiveis || produto.tamanhos || produto.sizes || produto.tamanho;
  const tamanhos = Array.isArray(valores) ? valores : String(valores || '34,35,36,37,38,39,40,41,42').split(',').map(item => item.trim()).filter(Boolean);
  wrap.innerHTML = tamanhos.map((tamanho, index) => `<button type="button" class="size-option${index === 0 ? ' is-selected' : ''}" data-size="${escapeHtml(tamanho)}">${escapeHtml(tamanho)}</button>`).join('');
  wrap.querySelectorAll('[data-size]').forEach(botao => botao.addEventListener('click', () => {
    wrap.querySelectorAll('[data-size]').forEach(item => item.classList.remove('is-selected'));
    botao.classList.add('is-selected');
  }));
}

function fecharDetalhes(){
  document.querySelector('[data-product-modal]')?.classList.remove('is-open');
  document.body.classList.remove('modal-open');
}

async function adicionarProdutoSelecionadoAoCarrinho(){
  const modal = document.querySelector('[data-product-modal]');
  const tamanho = modal.querySelector('.size-option.is-selected')?.dataset.size;
  if(!PRODUTO_SELECIONADO || !tamanho) return window.ANDAR?.showToast('Escolha um tamanho.');
  try{
    await adicionarAoCarrinho(PRODUTO_SELECIONADO.id, tamanho);
    window.ANDAR?.showToast('Produto adicionado ao carrinho.');
    fecharDetalhes();
  } catch(erro){
    console.error('Erro ao adicionar ao carrinho:', erro);
    window.ANDAR?.showToast('Entre na sua conta para adicionar ao carrinho.');
  }
}

async function alternarFavoritoDetalhe(){
  if(!PRODUTO_SELECIONADO) return;
  const id = String(PRODUTO_SELECIONADO.id);
  try{
    if(FAVORITOS.has(id)){ await removerFavorito(id); FAVORITOS.delete(id); }
    else { await adicionarFavorito(id); FAVORITOS.add(id); }
    atualizarBotaoFavorito(document.querySelector('[data-modal-favorite]'), FAVORITOS.has(id));
    atualizarBotoesFavoritos();
  } catch(erro){
    const usuario = await usuarioAtual().catch(() => null);
    window.ANDAR?.showToast(usuario ? 'Não foi possível salvar o favorito. Verifique as políticas RLS.' : 'Entre na sua conta para favoritar produtos.');
  }
}

function atualizarBotoesFavoritos(){
  document.querySelectorAll('[data-favorite-id]').forEach(botao => atualizarBotaoFavorito(botao, FAVORITOS.has(String(botao.dataset.favoriteId))));
}

function atualizarBotaoFavorito(botao, ativo){
  if(!botao) return;
  botao.classList.toggle('is-active', ativo);
  botao.setAttribute('aria-label', ativo ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
  botao.innerHTML = iconeFavorito(ativo);
}

function iconeFavorito(ativo){
  return `<svg viewBox="0 0 24 24" fill="${ativo ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.4"><path d="M12 21s-7.5-4.6-10-9.2C.4 8 2 4.5 5.6 4c2-.3 3.8.7 4.4 2.2C10.6 4.7 12.4 3.7 14.4 4c3.6.5 5.2 4 3.6 7.8-2.5 4.6-10 9.2-10 9.2z"/></svg>`;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function nomeCategoria(categoriaId){
  const categoria = CATEGORIAS.find(item => String(item.id) === String(categoriaId));
  return categoria?.nome || '';
}

function formatarPreco(valor){
  if(valor === undefined || valor === null) return '—';
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// exposta globalmente caso outra página queira reusar (ex.: destaques na home)
window.carregarProdutos = carregarProdutos;
