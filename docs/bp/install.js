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
let activeModal = null;
let closingModal = null;
let restoreTimer;

window.addEventListener('message', event => {
  if (!appFrame || event.source !== appFrame.contentWindow || event.origin !== appOrigin || typeof event.data !== 'string') return;
  const command = /^bp:modal:(open|close):([0-9]{10,22})$/.exec(event.data);
  if (!command) return;
  const [, action, id] = command;
  if (action === 'open' && !activeModal) {
    activeModal = id;
    window.clearTimeout(restoreTimer);
    backMessage.hidden = true;
    history.pushState({...history.state, baeviewModal:id}, '');
  }
  if (action === 'close' && activeModal === id) {
    activeModal = null;
    if (history.state?.baeviewModal === id) {
      closingModal = id;
      history.back();
    }
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
  if (activeModal && activeModal !== event.state?.baeviewModal) {
    const id = activeModal;
    activeModal = null;
    appFrame.contentWindow.postMessage(`bp:modal:back:${id}`, appOrigin);
    return;
  }
  if (closingModal) {
    closingModal = null;
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
