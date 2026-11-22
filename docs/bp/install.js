const button = document.getElementById('install-button');
const details = document.getElementById('install-help');
const message = document.getElementById('install-message');
const close = document.getElementById('install-close');
const standalone = window.matchMedia('(display-mode: standalone)');
const isIOS = /iPhone|iPod|iPad/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let deferredPrompt = null;
let installed = standalone.matches || navigator.standalone === true;

function update() {
  button.hidden = installed;
  if (installed && details.open) details.close();
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  update();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferredPrompt = null;
  update();
});
standalone.addEventListener('change', () => {
  installed = standalone.matches || navigator.standalone === true;
  update();
});

button.addEventListener('click', async () => {
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    button.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      installed = choice.outcome === 'accepted' || installed;
      update();
      return;
    } catch {
      // Browsers can invalidate a deferred prompt. The menu remains available.
    } finally {
      button.disabled = false;
    }
  }
  message.textContent = isIOS
    ? 'Safari의 공유 메뉴에서 홈 화면에 추가를 선택해 주세요.'
    : '브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해 주세요.';
  if (!details.open) details.showModal();
});

close.addEventListener('click', () => details.close());
update();
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(() => {});
}
