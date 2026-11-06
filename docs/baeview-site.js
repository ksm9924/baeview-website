(() => {
  'use strict';
  const header = document.querySelector('[data-header]');
  const button = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('mobile-nav');
  const scrollHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 25);
  window.addEventListener('scroll', scrollHeader, { passive: true });
  scrollHeader();
  const closeMenu = () => {
    if (!button || !menu) return;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', '메뉴 열기');
    menu.hidden = true;
  };
  button?.addEventListener('click', () => {
    if (!menu) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    menu.hidden = !open;
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 760) closeMenu(); }, { passive: true });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });
})();
