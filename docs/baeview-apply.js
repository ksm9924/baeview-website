(() => {
  'use strict';

  const form = document.getElementById('tester-application');
  const status = document.getElementById('application-status');
  const submit = document.getElementById('application-submit');
  const success = document.getElementById('application-success');
  if (!form || !status || !submit || !success) return;

  let sending = false;
  const setStatus = (state, message, moveFocus = true) => {
    status.dataset.state = state;
    status.textContent = message;
    status.hidden = false;
    if (moveFocus) status.focus();
  };

  const normalize = value => String(value || '').trim();
  const collectApplication = () => {
    const values = new FormData(form);
    return {
      nickname: normalize(values.get('nickname')),
      email: normalize(values.get('email')),
      region: normalize(values.get('region')),
      platform: normalize(values.get('platform')),
      androidModel: normalize(values.get('android_model')),
      message: normalize(values.get('message')),
      consent: values.get('consent') === 'yes',
      website: normalize(values.get('website')),
      source: 'baeview.kr/tester-application',
    };
  };

  // A positive provider response means accepted by the submission service.
  // It does not establish delivery into the operator's email inbox.
  const sendApplication = async (application, config, signal) => {
    const platforms = { baemin: '배민', coupang: '쿠팡이츠', both: '배민·쿠팡이츠 모두' };
    const payload = config.provider === 'formsubmit' ? {
      name: application.nickname,
      email: application.email,
      region: application.region,
      platform: platforms[application.platform] || application.platform,
      android_device: application.androidModel || '미입력',
      message: application.message || '미입력',
      consent: application.consent ? '테스터 신청 처리를 위한 개인정보 수집·이용에 동의' : '미동의',
      _subject: '[배뷰] 테스터 신청',
      _template: 'table',
      _url: window.location.href,
      _honey: application.website,
    } : application;
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal,
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    let data;
    try { data = await response.json(); } catch { data = null; }
    if (!response.ok) {
      throw new Error(response.status === 429 ? 'TOO_MANY_REQUESTS' : 'SEND_FAILED');
    }
    const providerMessage = String(data?.message || '');
    if (data?.status === 'activation_pending' || /activat|confirm your email|verify your email/i.test(providerMessage)) {
      return { state: 'pending' };
    }
    const accepted = config.provider === 'formsubmit'
      ? data?.success === true || data?.success === 'true'
      : data?.status === 'sent';
    if (!accepted) throw new Error('DELIVERY_UNCONFIRMED');
    return { state: 'sent' };
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const application = collectApplication();
    if (!application.nickname || !application.region) {
      setStatus('error', '닉네임과 활동 지역을 공백 없이 입력해 주세요.');
      return;
    }
    if (!application.consent) {
      setStatus('error', '개인정보 수집·이용 동의 여부를 확인해 주세요.');
      return;
    }
    if (application.website) {
      setStatus('error', '신청 정보를 다시 확인해 주세요.');
      return;
    }

    const config = window.BAEVIEW_TESTER_APPLICATION || {};
    if (!config.endpoint || !/^https:\/\//.test(config.endpoint)) {
      setStatus('pending', '신청 접수를 준비하고 있습니다. 카카오톡 공개채팅방에서 참여를 문의해 주세요. 입력하신 내용은 아직 전송되지 않았습니다.');
      return;
    }

    sending = true;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    submit.textContent = '신청서를 보내는 중…';
    status.hidden = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), config.timeoutMs || 60000);
    const waitingTimer = window.setTimeout(() => {
      setStatus('pending', '전송 결과를 확인하고 있습니다. 중복 신청하지 말고 잠시 기다려 주세요.', false);
    }, 10000);
    try {
      const result = await sendApplication(application, config, controller.signal);
      if (result.state === 'pending') {
        setStatus('pending', '이메일 수신 연결이 아직 준비되지 않았습니다. 신청 내용이 보관되었을 수 있으니, 다시 신청하기 전 공개채팅방에서 문의해 주세요.');
        return;
      }
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      const timedOut = controller.signal.aborted || error?.name === 'AbortError';
      const rateLimited = error?.message === 'TOO_MANY_REQUESTS';
      const message = timedOut
        ? '접수 결과 확인이 지연되고 있습니다. 신청서가 이미 전달되었을 수 있으니, 다시 신청하기 전 공개채팅방에서 확인해 주세요. 입력 내용은 유지되어 있습니다.'
        : rateLimited
          ? '잠시 후 다시 신청해 주세요. 짧은 시간에 여러 번 접수할 수 없습니다.'
          : '신청서 전송 결과를 확인하지 못했습니다. 신청서가 이미 전달되었을 수 있으니, 다시 신청하기 전 공개채팅방에서 확인해 주세요. 입력 내용은 유지되어 있습니다.';
      setStatus(rateLimited && !timedOut ? 'error' : 'pending', message);
    } finally {
      window.clearTimeout(timer);
      window.clearTimeout(waitingTimer);
      sending = false;
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
      submit.textContent = '테스터 신청서 보내기 →';
    }
  });

  // Enable only after the handler is attached; script failures must not submit a GET query.
  submit.disabled = false;
})();
