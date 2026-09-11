/* ==========================================================================
   ANDAR — main.js
   Comportamentos globais: preloader, navegação, menu mobile, scroll reveal,
   vídeo do hero e utilidades compartilhadas (toast) usadas em outras páginas.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPreloader();
  initNav();
  initSupport();
  initMobileMenu();
  initScrollReveal();
  initHeroVideo();
  initYear();
});

function initTheme(){
  const root = document.documentElement;
  const savedTheme = localStorage.getItem('andar-theme');
  if(savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
  document.querySelectorAll('[data-theme-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const theme = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = theme;
      localStorage.setItem('andar-theme', theme);
      button.setAttribute('aria-label', theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro');
    });
  });
}

function initSupport(){
  const navActions = document.querySelector('.nav__actions');
  if(!navActions || document.querySelector('[data-support-trigger]')) return;

  const accountLink = navActions.querySelector('.nav__icon-btn');
  const trigger = document.createElement('button');
  trigger.className = 'support-trigger';
  trigger.type = 'button';
  trigger.setAttribute('data-support-trigger', '');
  trigger.setAttribute('aria-label', 'Abrir suporte');
  trigger.title = 'Suporte';
  trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3M4 13v4a2 2 0 0 0 2 2h1v-6H4Z"/><path d="M12 19v2M9 21h6"/></svg><span>Suporte</span>';
  navActions.insertBefore(trigger, accountLink || navActions.firstChild);

  const mobileMenu = document.querySelector('.nav__mobile');
  if(mobileMenu && !mobileMenu.querySelector('[data-support-trigger]')){
    const mobileTrigger = document.createElement('a');
    mobileTrigger.href = '#suporte';
    mobileTrigger.textContent = 'Suporte';
    mobileTrigger.dataset.supportTrigger = '';
    mobileMenu.appendChild(mobileTrigger);
    mobileTrigger.addEventListener('click', event => { event.preventDefault(); abrirSuporte(); });
  }

  const modal = document.createElement('dialog');
  modal.className = 'support-modal';
  modal.dataset.supportModal = '';
  modal.innerHTML = '<div class="support-modal__panel"><div class="support-modal__head"><div><span class="label">Atendimento ANDAR</span><h2>Suporte</h2></div><button type="button" class="support-modal__close" data-support-close aria-label="Fechar suporte">&times;</button></div><div class="support-chat"><div class="support-messages" data-support-messages></div><form class="support-composer" data-support-form><input name="mensagem" autocomplete="off" placeholder="Digite sua mensagem..." aria-label="Mensagem para o suporte" maxlength="500" required><button type="submit" aria-label="Enviar mensagem">Enviar <span>↗</span></button></form><a class="support-whatsapp support-whatsapp--footer" href="https://wa.me/5511978398836" target="_blank" rel="noopener noreferrer">Falar no WhatsApp <span>↗</span></a></div></div>';
  document.body.appendChild(modal);
  trigger.addEventListener('click', abrirSuporte);
  modal.querySelector('[data-support-close]').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if(event.target === modal) modal.close(); });
  modal.querySelector('[data-support-form]').addEventListener('submit', event => enviarMensagem(event, modal));
  document.addEventListener('keydown', event => { if(event.key === 'Escape' && modal.open) modal.close(); });

  function abrirSuporte(){
    const messages = modal.querySelector('[data-support-messages]');
    messages.innerHTML = '';
    adicionarMensagem(messages, 'bot', 'Olá! 👋 Sou o assistente da ANDAR. Como posso ajudar?');
    modal.showModal();
    modal.querySelector('[name="mensagem"]').focus();
  }
}

function enviarMensagem(event, modal){
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.mensagem;
  const texto = input.value.trim();
  if(!texto) return;

  const messages = modal.querySelector('[data-support-messages]');
  adicionarMensagem(messages, 'user', texto);
  input.value = '';
  form.querySelector('button').disabled = true;
  const typing = document.createElement('div');
  typing.className = 'support-typing';
  typing.innerHTML = '<span></span><span></span><span></span><em>ANDAR está digitando</em>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;

  window.setTimeout(() => {
    typing.remove();
    const resposta = responderMensagem(texto);
    adicionarMensagem(messages, 'bot', resposta.texto, resposta.fallback);
    form.querySelector('button').disabled = false;
    input.focus();
  }, 550);
}

function adicionarMensagem(container, autor, texto, fallback = false){
  const message = document.createElement('div');
  message.className = `support-bubble support-bubble--${autor}`;
  const content = document.createElement('p');
  content.textContent = texto;
  message.appendChild(content);
  if(fallback){
    const link = document.createElement('a');
    link.className = 'support-whatsapp';
    link.href = 'https://wa.me/5511978398836';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Falar no WhatsApp ↗';
    message.appendChild(link);
  }
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
}

function responderMensagem(mensagem){
  const texto = mensagem.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if(/pedido|compra|encomenda|rastre/.test(texto)) return { texto: 'Sobre pedidos: confira o status na sua conta. Se já tiver o número do pedido, envie pelo WhatsApp para nossa equipe localizar tudo mais rápido.' };
  if(/pagamento|pix|cartao|cartão|cobranca|cobrança|parcel/.test(texto)) return { texto: 'Aceitamos as opções de pagamento disponíveis no checkout. Em caso de cobrança duplicada ou pagamento pendente, nossa equipe pode verificar a transação pelo WhatsApp.' };
  if(/produto|modelo|material|cor|qualidade/.test(texto)) return { texto: 'Nossos produtos são feitos em pequenos lotes, com materiais selecionados e acabamento cuidadoso. Você pode ver os modelos disponíveis na Coleção.' };
  if(/tamanho|numero|número|medida|forma/.test(texto)) return { texto: 'Para escolher o tamanho, confira os tamanhos disponíveis na página do produto. Se ficar entre dois números, fale conosco para receber uma orientação personalizada.' };
  if(/estoque|disponivel|disponível|acabou|esgotado/.test(texto)) return { texto: 'O estoque é atualizado diretamente na nossa coleção. Quando um item aparece como esgotado, fale conosco para saber sobre reposição.' };
  if(/entrega|envio|frete|prazo|chegar/.test(texto)) return { texto: 'O prazo e o valor da entrega aparecem no checkout conforme o endereço informado. O envio é rastreado e segue em embalagem especial.' };
  if(/troca|devolucao|devolução|defeito|garantia/.test(texto)) return { texto: 'Para solicitar troca ou devolução, fale com nosso atendimento informando o número do pedido. Vamos orientar você em cada etapa.' };
  return { texto: 'Desculpe, não consegui entender seu problema. 😕 Para receber uma explicação mais detalhada, entre em contato pelo WhatsApp (11) 97839-8836.', fallback: true };
}

/* ---------------------------------------------------------------------- */
/* Preloader — some assim que a página termina de montar                   */
/* ---------------------------------------------------------------------- */
function initPreloader(){
  const preloader = document.querySelector('.preloader');
  if(!preloader) return;
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('is-hidden'), 350);
  });
  // salvaguarda: caso o evento "load" demore (vídeo pesado), esconde de qualquer forma
  setTimeout(() => preloader.classList.add('is-hidden'), 2500);
}

/* ---------------------------------------------------------------------- */
/* Navegação — muda de transparente para sólida ao rolar                   */
/* ---------------------------------------------------------------------- */
function initNav(){
  const nav = document.querySelector('.nav');
  if(!nav) return;
  const toggle = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
}

/* ---------------------------------------------------------------------- */
/* Menu mobile                                                             */
/* ---------------------------------------------------------------------- */
function initMobileMenu(){
  const burger = document.querySelector('.nav__burger');
  const mobileMenu = document.querySelector('.nav__mobile');
  if(!burger || !mobileMenu) return;

  const closeMenu = () => {
    mobileMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
}

/* ---------------------------------------------------------------------- */
/* Scroll reveal — usa IntersectionObserver para animar elementos .reveal  */
/* ---------------------------------------------------------------------- */
function initScrollReveal(){
  const targets = document.querySelectorAll('.reveal, .about__media');
  if(!targets.length) return;

  if(!('IntersectionObserver' in window)){
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
}

/* ---------------------------------------------------------------------- */
/* Vídeo do hero — garante autoplay silencioso e cai no fallback se faltar  */
/* ---------------------------------------------------------------------- */
/* Vídeo do hero — garante autoplay silencioso e cai no fallback se faltar  */
function initHeroVideo(){
  const video = document.querySelector('.hero__media video');
  const fallback = document.querySelector('.hero__fallback');
  if(!video) return;

  video.muted = true;

  video.addEventListener('error', () => {
    video.style.display = 'none';
    if(fallback) fallback.style.display = 'block';
  });

  // Alguns navegadores mobile pausam o autoplay; força play ao ficar pronto.
  video.addEventListener('loadeddata', () => {
    video.play().catch(() => { /* autoplay bloqueado — o overlay + fallback cobrem o fundo */ });
  });
}

/* ---------------------------------------------------------------------- */
/* Ano dinâmico no rodapé                                                   */
/* ---------------------------------------------------------------------- */
function initYear(){
  const el = document.querySelector('[data-year]');
  if(el) el.textContent = new Date().getFullYear();
}

/* ---------------------------------------------------------------------- */
/* Toast — utilidade compartilhada (usada em auth.js / produtos.js)        */
/* ---------------------------------------------------------------------- */
function showToast(message, timeout = 3200){
  let toast = document.querySelector('.toast');
  if(!toast){
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('is-visible'), timeout);
}

// expõe utilidades para as outras páginas (produtos.js, auth.js)
window.ANDAR = window.ANDAR || {};
window.ANDAR.showToast = showToast;
