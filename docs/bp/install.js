const button = document.getElementById('install-button');
const bar = document.getElementById('install-bar');
const details = document.getElementById('install-help');
const message = document.getElementById('install-message');
const close = document.getElementById('install-close');
const backMessage = document.getElementById('back-message');
const appFrame = document.getElementById('partner-frame');
const appOrigin = 'https://baeview-partner-pilot-wbznui.flutterflow.app';
const standalone = window.matchMedia('(display-mode: standalone)');
let deferredPrompt = null;
let installed = false;

// The installed wrapper owns system insets; its cross-origin Flutter frame
// cannot measure the outer window's visible viewport or safe-area insets.
function fitPartnerViewport() {
  const heights = [window.innerHeight, document.documentElement.clientHeight];
  const visual = window.visualViewport;
  // Preserve pinch zoom. Reflow only at the normal page scale.
  if (visual && Math.abs(visual.scale - 1) >= 0.01) return;
  if (visual) heights.push(visual.height);
  const available = heights.filter(value => Number.isFinite(value) && value > 0);
  if (!available.length) return;
  const height = `${Math.floor(Math.min(...available))}px`;
  const style = document.documentElement.style;
  if (style.getPropertyValue('--partner-visible-height') !== height) {
    style.setProperty('--partner-visible-height', height);
  }
}

let partnerViewportFrame = null;
function queuePartnerViewport() {
  if (partnerViewportFrame !== null) return;
  partnerViewportFrame = window.requestAnimationFrame(() => {
    partnerViewportFrame = null;
    fitPartnerViewport();
  });
}

window.addEventListener('resize', queuePartnerViewport, {passive: true});
window.addEventListener('orientationchange', queuePartnerViewport, {passive: true});
window.addEventListener('pageshow', queuePartnerViewport);
window.visualViewport?.addEventListener('resize', queuePartnerViewport, {passive: true});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') queuePartnerViewport();
});
fitPartnerViewport();

function runningAsApp() {
  return standalone.matches || navigator.standalone === true;
}

function update() {
  bar.hidden = !deferredPrompt || installed || runningAsApp();
  if ((installed || runningAsApp()) && details.open) details.close();
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  if (installed || runningAsApp()) return;
  deferredPrompt = event;
  update();
});
window.addEventListener('appinstalled', () => {
  installed = true;
  deferredPrompt = null;
  update();
});
standalone.addEventListener('change', update);

if (typeof navigator.getInstalledRelatedApps === 'function') {
  navigator.getInstalledRelatedApps().then(apps => {
    if (apps.some(app => app.platform === 'webapp' &&
        (app.id === 'https://baeview.kr/bp/' || app.url === 'https://baeview.kr/bp/partner.webmanifest'))) {
      installed = true;
      deferredPrompt = null;
      update();
    }
  }).catch(() => {});
}

button.addEventListener('click', async () => {
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    button.disabled = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      installed = choice.outcome === 'accepted' || installed;
      return;
    } catch {
      // Browsers can invalidate a deferred prompt. The menu remains available.
    } finally {
      button.disabled = false;
      update();
    }
  }
  message.textContent = '브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해 주세요.';
  if (!details.open) details.showModal();
});

close.addEventListener('click', () => details.close());
update();

const stage = 'baeviewPartnerBack';
const history = window.history;
const modalStack = [];
let closingModal = null;
let restoreTimer;

function ensureModalHistory() {
  const id = modalStack.at(-1);
  if (id && history.state?.baeviewModal !== id) {
    history.pushState({...history.state, baeviewModal:id}, '');
  }
}

window.addEventListener('message', event => {
  if (!appFrame || event.source !== appFrame.contentWindow || event.origin !== appOrigin || typeof event.data !== 'string') return;
  const command = /^bp:modal:(open|close):([0-9]{10,22})$/.exec(event.data);
  if (!command) return;
  const [, action, id] = command;
  const position = modalStack.indexOf(id);
  if (action === 'open') {
    if (position !== -1) return;
    modalStack.push(id);
    window.clearTimeout(restoreTimer);
    backMessage.hidden = true;
    ensureModalHistory();
    return;
  }
  if (position === -1) return;
  modalStack.splice(position, 1);
  if (history.state?.baeviewModal === id) {
    closingModal = id;
    history.back();
  }
});

// A sheet gets one entry in both browser and installed app mode.
// The installed app keeps a separate guard for its own home screen.
if (runningAsApp()) {
  if (history.state?.[stage] !== 'active') {
    const initial = {...history.state};
    delete initial.baeviewModal;
    history.replaceState({...initial, [stage]:'root'}, '');
    history.pushState({...initial, [stage]:'active'}, '');
  }
}

window.addEventListener('popstate', event => {
  if (closingModal) {
    closingModal = null;
    ensureModalHistory();
    return;
  }
  const activeModal = modalStack.at(-1);
  if (activeModal && activeModal !== event.state?.baeviewModal) {
    modalStack.pop();
    appFrame.contentWindow.postMessage(`bp:modal:back:${activeModal}`, appOrigin);
    ensureModalHistory();
    return;
  }
  if (!activeModal && event.state?.baeviewModal) {
    const previous = {...event.state};
    delete previous.baeviewModal;
    history.replaceState(previous, '');
    return;
  }
  if (!runningAsApp()) return;
  window.clearTimeout(restoreTimer);
  backMessage.hidden = event.state?.[stage] !== 'root';
  if (backMessage.hidden) return;
  restoreTimer = window.setTimeout(() => {
    backMessage.hidden = true;
    if (history.state?.[stage] === 'root' && document.visibilityState === 'visible') {
      history.forward();
    }
  }, 2400);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(() => {});
}
