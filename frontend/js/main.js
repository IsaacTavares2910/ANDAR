/* ==========================================================================
   ANDAR — main.js
   Comportamentos globais: preloader, navegação, menu mobile, scroll reveal,
   vídeo do hero e utilidades compartilhadas (toast) usadas em outras páginas.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initPreloader();
  initNav();
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
