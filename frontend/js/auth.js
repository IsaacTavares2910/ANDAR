import { supabase } from '../src/services/supabaseClient';
import {
  listarFavoritos, listarCarrinho, listarProdutos,
  listarCategorias, salvarPerfilCliente,
  removerFavorito, adicionarAoCarrinho, removerDoCarrinho, alterarQuantidadeCarrinho
} from '../src/services/storeService';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('#form-login');
  const cadastroForm = document.querySelector('#form-cadastro');
  const logoutBtn = document.querySelector('[data-logout]');

  if(loginForm) loginForm.addEventListener('submit', loginUsuario);
  if(cadastroForm) cadastroForm.addEventListener('submit', cadastrarUsuario);
  if(logoutBtn) logoutBtn.addEventListener('click', logoutUsuario);
  if(document.querySelector('[data-user-nome]')) protegerRotaUsuario();
  if(loginForm) redirecionarSessaoExistente();
  supabase.auth.onAuthStateChange((evento, session) => {
    if(evento === 'SIGNED_OUT' && document.querySelector('[data-user-nome]')){
      window.location.replace('login.html');
    }
    if(evento === 'SIGNED_IN' && document.querySelector('#form-login') && session){
      window.location.replace('usuario.html');
    }
  });
});

/* ---------------------------------------------------------------------- */
/* loginUsuario                                                            */
/* ---------------------------------------------------------------------- */
async function loginUsuario(event){
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const senha = form.senha.value;

  if(!validarEmail(email)){
    return exibirMensagem(form, 'Informe um e-mail válido.', 'error');
  }
  if(senha.length < 6){
    return exibirMensagem(form, 'A senha deve ter pelo menos 6 caracteres.', 'error');
  }

  definirCarregando(form, true);

  try{
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });
    if(error) throw error;

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if(sessionError) throw sessionError;
    if(!sessionData.session || !data.user){
      throw new Error('A sessão não foi criada.');
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if(userError || !userData.user) throw userError || new Error('Usuário não encontrado.');

    exibirMensagem(form, 'Login realizado com sucesso. Redirecionando...', 'success');
    window.ANDAR?.showToast('Bem-vindo(a) de volta.');
    setTimeout(() => { window.location.replace('usuario.html'); }, 500);

  } catch(erro){
    console.error('Erro no login:', erro);
    exibirMensagem(form, mensagemAuth(erro, 'Não foi possível entrar. Verifique seus dados e tente novamente.'), 'error');
  } finally{
    definirCarregando(form, false);
  }
}

/* ---------------------------------------------------------------------- */
/* cadastrarUsuario                                                         */
/* ---------------------------------------------------------------------- */
async function cadastrarUsuario(event){
  event.preventDefault();
  const form = event.target;
  const nome = form.nome.value.trim();
  const email = form.email.value.trim();
  const senha = form.senha.value;
  const confirmarSenha = form.confirmarSenha.value;

  if(nome.length < 2){
    return exibirMensagem(form, 'Informe seu nome completo.', 'error');
  }
  if(!validarEmail(email)){
    return exibirMensagem(form, 'Informe um e-mail válido.', 'error');
  }
  if(senha.length < 6){
    return exibirMensagem(form, 'A senha deve ter pelo menos 6 caracteres.', 'error');
  }
  if(senha !== confirmarSenha){
    return exibirMensagem(form, 'As senhas não coincidem.', 'error');
  }

  definirCarregando(form, true);

  try{
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome },
        emailRedirectTo: new URL('usuario.html', window.location.href).href
      }
    });
    if(error) throw error;

    if(data.session){
      try{
        await salvarPerfilCliente(data.user, nome);
      } catch(erroPerfil){
        console.warn('Conta criada, mas o perfil não foi salvo em clientes:', erroPerfil);
      }
      exibirMensagem(form, 'Conta criada. Entrando...', 'success');
      window.ANDAR?.showToast('Conta criada com sucesso.');
      setTimeout(() => { window.location.replace('usuario.html'); }, 500);
    } else {
      exibirMensagem(form, 'Conta criada. Confirme seu e-mail antes de fazer login.', 'success');
      window.ANDAR?.showToast('Verifique sua caixa de entrada.');
    }

  } catch(erro){
    console.error('Erro no cadastro:', erro);
    exibirMensagem(form, mensagemAuth(erro, 'Não foi possível concluir o cadastro. Tente novamente.'), 'error');
  } finally{
    definirCarregando(form, false);
  }
}

/* ---------------------------------------------------------------------- */
/* logoutUsuario                                                            */
/* ---------------------------------------------------------------------- */
async function logoutUsuario(event){
  if(event) event.preventDefault();

  const { error } = await supabase.auth.signOut();
  if(error) console.error('Erro ao sair:', error);
  window.location.href = 'index.html';
}

async function protegerRotaUsuario(){
  try{
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if(sessionError) throw sessionError;
    if(!sessionData.session){
      window.location.href = 'login.html';
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if(userError) throw userError;
    const user = userData.user;
    if(!user){
      window.location.href = 'login.html';
      return;
    }

    if(document.querySelector('[data-user-nome]')){
      try{
        await salvarPerfilCliente(user, user.user_metadata?.nome || 'Cliente ANDAR');
      } catch(erroPerfil){
        console.warn('Sessão válida, mas o perfil não foi sincronizado:', erroPerfil);
      }
    }

    const nome = user.user_metadata?.nome || 'Cliente ANDAR';
    const nomeEl = document.querySelector('[data-user-nome]');
    const emailEl = document.querySelector('[data-user-email]');
    const avatarEl = document.querySelector('.account__avatar');
    if(nomeEl) nomeEl.textContent = nome;
    if(emailEl) emailEl.textContent = user.email || '';
    if(avatarEl) avatarEl.textContent = nome.charAt(0).toUpperCase();
    await carregarResumoConta();
  } catch(erro){
    console.error('Erro ao verificar usuário:', erro);
    window.location.href = 'login.html';
  }
}

async function redirecionarSessaoExistente(){
  try{
    const { data, error } = await supabase.auth.getSession();
    if(error) throw error;
    if(data.session) window.location.replace('usuario.html');
  } catch(erro){
    console.warn('Não foi possível verificar a sessão existente:', erro);
  }
}

async function carregarResumoConta(){
  const favoritosEl = document.querySelector('[data-favoritos-total]');
  const carrinhoEl = document.querySelector('[data-carrinho-total]');
  if(!favoritosEl && !carrinhoEl) return;

  try{
    const [favoritos, carrinho, produtos] = await Promise.all([listarFavoritos(), listarCarrinho(), listarProdutos()]);
    let categorias = [];
    try{
      categorias = await listarCategorias();
    } catch(erro){
      console.warn('Categorias indisponíveis para os favoritos:', erro);
    }
    if(favoritosEl) favoritosEl.textContent = `${favoritos.length} favorito${favoritos.length === 1 ? '' : 's'}`;
    if(carrinhoEl) carrinhoEl.textContent = `${carrinho.length} item${carrinho.length === 1 ? '' : 's'} no carrinho`;
    renderizarFavoritos(favoritos, produtos, categorias);
    renderizarCarrinho(carrinho, produtos);
  } catch(erro){
    console.warn('Não foi possível carregar o resumo da conta:', erro);
  }
}

function renderizarFavoritos(itens, produtos, categorias){
  const lista = document.querySelector('[data-favoritos-list]');
  if(!lista) return;
  const linhas = itens.map(item => {
    const produto = produtos.find(produtoAtual => String(produtoAtual.id) === String(item.produto_id));
    if(!produto) return '';
    const tamanhos = obterTamanhos(produto);
    return `<div class="favorite-item" data-favorite-item="${escapeHtml(produto.id)}">
      <img src="${escapeHtml(produto.imagem_url || produto.imagem || 'assets/images/placeholder.jpg')}" alt="${escapeHtml(produto.nome || 'Produto')}">
      <div class="favorite-item__info"><span class="favorite-item__category">${escapeHtml(nomeCategoria(produto, categorias))}</span><h4>${escapeHtml(produto.nome || 'Produto')}</h4><p>${escapeHtml(produto.descricao || 'Peça selecionada da coleção ANDAR.')}</p><strong>${formatarPreco(produto.preco)}</strong></div>
      <div class="favorite-item__actions"><label>Tamanho<select data-favorite-size>${tamanhos.map(tamanho => `<option value="${escapeHtml(tamanho)}">${escapeHtml(tamanho)}</option>`).join('')}</select></label><button type="button" class="btn btn--small" data-favorite-cart>Adicionar ao carrinho</button><button type="button" class="favorite-remove" data-favorite-remove>Remover</button></div>
    </div>`;
  }).join('');
  lista.innerHTML = linhas || '<div class="account__empty">Nenhum favorito salvo ainda.</div>';
  lista.querySelectorAll('[data-favorite-item]').forEach(linha => {
    const produtoId = linha.dataset.favoriteItem;
    linha.querySelector('[data-favorite-remove]')?.addEventListener('click', async () => {
      try{ await removerFavorito(produtoId); await carregarResumoConta(); }
      catch(erro){ console.error('Erro ao remover favorito:', erro); }
    });
    linha.querySelector('[data-favorite-cart]')?.addEventListener('click', async () => {
      try{
        await adicionarAoCarrinho(produtoId, linha.querySelector('[data-favorite-size]').value);
        window.ANDAR?.showToast('Produto adicionado ao carrinho.');
        await carregarResumoConta();
      } catch(erro){ console.error('Erro ao adicionar favorito ao carrinho:', erro); }
    });
  });
}

function obterTamanhos(produto){
  const valores = produto.tamanhos_disponiveis || produto.tamanhos || produto.sizes || produto.tamanho;
  return (Array.isArray(valores) ? valores : String(valores || '34,35,36,37,38,39,40,41,42').split(',')).map(item => String(item).trim()).filter(Boolean);
}

function nomeCategoria(produto, categorias){
  const categoria = (categorias || []).find(item => String(item.id) === String(produto.categoria_id));
  return categoria?.nome || categoria?.categoria || produto.categoria || produto.categoria_id || 'Coleção ANDAR';
}

function renderizarCarrinho(itens, produtos){
  const lista = document.querySelector('[data-carrinho-list]');
  const totalEl = document.querySelector('[data-carrinho-total-price]');
  if(!lista) return;
  let total = 0;
  const linhas = itens.map(item => {
    const produto = produtos.find(produtoAtual => String(produtoAtual.id) === String(item.produto_id));
    if(!produto) return '';
    const quantidade = Math.max(1, Number(item.quantidade) || 1);
    total += Number(produto.preco || 0) * quantidade;
    return `<div class="cart-item" data-cart-item="${escapeHtml(item.id)}">
      <img src="${escapeHtml(produto.imagem_url || produto.imagem || 'assets/images/placeholder.jpg')}" alt="${escapeHtml(produto.nome || 'Produto')}">
      <div class="cart-item__info"><h4>${escapeHtml(produto.nome || 'Produto')}</h4><span>Tamanho ${escapeHtml(item.tamanho || 'não informado')}</span><strong>${formatarPreco(produto.preco)}</strong></div>
      <div class="cart-item__controls"><button type="button" data-cart-decrease aria-label="Diminuir quantidade">-</button><span>${quantidade}</span><button type="button" data-cart-increase aria-label="Aumentar quantidade">+</button><button type="button" data-cart-remove aria-label="Remover produto">Remover</button></div>
    </div>`;
  }).join('');
  lista.innerHTML = linhas || '<div class="account__empty">Nenhum item no carrinho ainda.</div>';
  if(totalEl) totalEl.textContent = `Total: ${formatarPreco(total)}`;
  lista.querySelectorAll('[data-cart-item]').forEach(linha => {
    const item = itens.find(itemAtual => String(itemAtual.id) === linha.dataset.cartItem);
    const quantidade = Math.max(1, Number(item?.quantidade) || 1);
    linha.querySelector('[data-cart-decrease]')?.addEventListener('click', () => atualizarItemCarrinho(item.id, quantidade - 1));
    linha.querySelector('[data-cart-increase]')?.addEventListener('click', () => atualizarItemCarrinho(item.id, quantidade + 1));
    linha.querySelector('[data-cart-remove]')?.addEventListener('click', () => removerItemCarrinho(item.id));
  });
}

async function atualizarItemCarrinho(itemId, quantidade){
  try{
    if(quantidade <= 0) await removerDoCarrinho(itemId);
    else await alterarQuantidadeCarrinho(itemId, quantidade);
    await carregarResumoConta();
  } catch(erro){ console.error('Erro ao atualizar carrinho:', erro); }
}

async function removerItemCarrinho(itemId){
  try{
    await removerDoCarrinho(itemId);
    await carregarResumoConta();
  } catch(erro){ console.error('Erro ao remover item:', erro); }
}

function formatarPreco(valor){
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ---------------------------------------------------------------------- */
function validarEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function exibirMensagem(form, texto, tipo){
  const msg = form.querySelector('.form-msg');
  if(!msg) return;
  msg.textContent = texto;
  msg.classList.remove('form-msg--error', 'form-msg--success');
  msg.classList.add(tipo === 'error' ? 'form-msg--error' : 'form-msg--success', 'is-visible');
}

function definirCarregando(form, carregando){
  const btn = form.querySelector('button[type="submit"]');
  if(!btn) return;
  btn.disabled = carregando;
  btn.dataset.label = btn.dataset.label || btn.textContent;
  btn.textContent = carregando ? 'Enviando...' : btn.dataset.label;
}

function mensagemAuth(erro, fallback){
  const mensagem = String(erro?.message || '').toLowerCase();
  if(mensagem.includes('email not confirmed')) return 'Confirme seu e-mail antes de fazer login.';
  if(mensagem.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
  if(mensagem.includes('user already registered')) return 'Este e-mail já está cadastrado.';
  if(mensagem.includes('password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
  if(mensagem.includes('email rate limit') || mensagem.includes('rate limit') || mensagem.includes('too many requests')) return 'O Supabase limitou temporariamente os e-mails de cadastro. Aguarde alguns minutos, verifique sua caixa de entrada e tente fazer login antes de criar outra conta.';
  if(mensagem.includes('signup is disabled')) return 'O cadastro está desativado nas configurações do Supabase Auth.';
  if(mensagem.includes('failed to fetch')) return 'Não foi possível conectar ao Supabase. Verifique a conexão.';
  return fallback;
}

/* ---------------------------------------------------------------------------
   INTEGRAÇÃO FUTURA — PROTEÇÃO DE ROTA
   Em usuario.html, ao conectar o Supabase, verifique a sessão ao carregar:

     const { data: { user } } = await supabase.auth.getUser();
     if(!user){ window.location.href = 'login.html'; return; }
     // Preencher nome/e-mail na tela com os dados de "user"
--------------------------------------------------------------------------- */
