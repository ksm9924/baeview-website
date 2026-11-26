(() => {
  'use strict';
  // Public-page interactions only. No application, account, or collection API calls.
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('mobile-nav');
  const closeMenu = (restoreFocus = false) => {
    if (!menuButton || !menu) return;
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '메뉴 열기');
    if (restoreFocus) menuButton.focus();
  };
  menuButton?.addEventListener('click', () => {
    if (!menu) return;
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu && !menu.hidden) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (menu && !menu.hidden && !header?.contains(event.target)) closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 800) closeMenu();
  }, { passive: true });
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });

  const tabList = document.querySelector('[data-guide-tabs]');
  const tabs = Array.from(document.querySelectorAll('[data-guide-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-guide-panel]'));
  if (!tabList || tabs.length !== 2 || panels.length !== 2) return;
  const selectGuide = (name, focus = false) => {
    const selected = tabs.find(tab => tab.dataset.guideTab === name);
    if (!selected) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.guidePanel !== name; });
    if (focus) selected.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectGuide(tab.dataset.guideTab));
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectGuide(tabs[next].dataset.guideTab, true);
    });
  });
  const selectFromHash = () => {
    if (location.hash === '#partner-start') selectGuide('partner');
    else if (location.hash === '#rider-start' || location.hash === '#how-it-works') selectGuide('rider');
  };
  document.querySelectorAll('[data-guide-link]').forEach(link => {
    link.addEventListener('click', () => selectGuide(link.dataset.guideLink));
  });
  window.addEventListener('hashchange', selectFromHash);
  selectGuide('rider');
  selectFromHash();
  tabList.hidden = false;
})();
