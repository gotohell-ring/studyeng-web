// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  window.SE = window.SE || {};
  const SE = window.SE;
  const shownToasts = new Set();
  SE.aiAvailable = false;
  SE.views = {};
  SE.util = {
    // 화면에 넣을 문자열을 안전하게 이스케이프한다.
    esc: value => String(value == null ? '' : value).replace(/[&<>"']/g, /* 일치한 문자열을 정해진 값으로 바꾼다. */c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]),
    // 저장 값을 깊은 복사한다.
    clone: value => JSON.parse(JSON.stringify(value)),
    // 새 기록의 고유 식별자를 만든다.
    id: () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
    // 오전 4시 기준 학습일의 시작을 구한다.
    dayStart(value = new Date()) {
      const d = new Date(value);
      if (d.getHours() < 4) {
        d.setDate(d.getDate() - 1);
      }
      d.setHours(4, 0, 0, 0);
      return d;
    },
    // 학습일을 날짜 문자열로 바꾼다.
    day(value = new Date()) {
      const d = this.dayStart(value);
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    },
    // 학습일 기준으로 날짜를 더한다.
    addDay(value, n = 1) {
      const d = this.dayStart(value);
      d.setDate(d.getDate() + n);
      return d;
    },
    // 두 학습일 사이의 일수를 구한다.
    dayDiff(a, b) {
      // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
      const civil = s => {
        const p = s.split('-').map(Number);
        return Date.UTC(p[0], p[1] - 1, p[2]);
      };
      return Math.round((civil(a) - civil(b)) / 86400000);
    },
    // 같은 음성 안내는 세션당 한 번만 표시하고 4초 뒤 닫는다.
    toast(message, { once = false } = {}) {
      const el = document.getElementById('toast');
      if (!el) {
        return;
      }
      if (once) {
        if (shownToasts.has(message)) {
          return;
        }
        const key = 'studyeng.toast.' + message;
        try {
          if (window.sessionStorage.getItem(key)) {
            shownToasts.add(message);
            return;
          }
          window.sessionStorage.setItem(key, '1');
        } catch (_) {
          // 세션 저장소가 차단되어도 현재 페이지에서는 중복 안내를 막는다.
        }
        shownToasts.add(message);
      }
      el.textContent = message;
      el.hidden = false;
      clearTimeout(SE.util.toastTimer);
      el.onclick = SE.util.dismissToast;
      SE.util.toastTimer = setTimeout(SE.util.dismissToast, 4000);
    },
    // 안내를 누르거나 표시 시간이 끝나면 토스트를 닫는다.
    dismissToast() {
      clearTimeout(SE.util.toastTimer);
      const el = document.getElementById('toast');
      if (el) {
        el.hidden = true;
      }
    },
    // 백업 내용을 파일로 내려받는다.
    download(name, text, type = 'application/json') {
      try {
        const url = URL.createObjectURL(new Blob([text], {
          type
        }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(/* 콜백에서 필요한 값을 계산하거나 상태를 갱신한다. */() => URL.revokeObjectURL(url), 1000);
        return true;
      } catch (e) {
        this.toast('백업 파일을 만들지 못했어요 → 진단을 복사하고 브라우저의 다운로드 설정을 확인해 주세요.');
        return false;
      }
    },
    // 텍스트를 클립보드에 복사한다.
    async copy(text) {
      try {
        await navigator.clipboard.writeText(text);
        this.toast('복사했어요.');
      } catch (_) {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        try {
          if (!document.execCommand('copy')) {
            throw Error();
          }
          this.toast('복사했어요.');
        } catch (_) {
          window.prompt('자동 복사가 안 돼요 → 아래 내용을 직접 복사해 주세요.', text);
        }
        el.remove();
      }
    },
    // 최근 동작 이름 20개 (학습 입력은 기록하지 않음). 멈춤이 생기면 진단에 함께 남긴다.
    trail: [],
    trace(name) {
      this.trail.push(new Date().toISOString().slice(11, 19) + ' ' + name);
      if (this.trail.length > 20) {
        this.trail.shift();
      }
    },
    // 메인 스레드가 2.5초 이상 응답하지 않으면 진단 로그에 남긴다 (화면이 보일 때만)
    watchStalls() {
      // performance.now()는 시계 변경의 영향을 받지 않는다
      let last = performance.now();
      setInterval(() => {
        const now = performance.now(), gap = now - last;
        last = now;
        // 60초 넘는 간격은 화면 잠금·백그라운드 복귀이므로 멈춤으로 보지 않는다
        if (gap > 2500 && gap < 60000 && !document.hidden) {
          this.error({ name: 'stall ' + Math.round(gap / 100) / 10 + 's' }, '멈춤 감지 ' + (location.hash || '#/home') + ' ← ' + this.trail.slice(-5).join(' > '));
        }
      }, 1000);
    },
    // 학습 입력을 제외한 오류 정보를 저장한다.
    error(error, source = '앱') {
      // Never log learner input or arbitrary exception messages which may contain it.
      const entry = {
        at: new Date().toISOString(),
        source,
        name: String(error && error.name || 'Error')
      };
      if (SE.store) {
        SE.store.data.errors.push(entry);
        SE.store.data.errors = SE.store.data.errors.slice(-50);
        SE.store.save();
      }
      return entry;
    },
    // 오류를 기록하고 복구 화면을 표시한다.
    fatal(error, source) {
      this.error(error, source);
      if (SE.speech) {
        SE.speech.cancel();
      }
      const el = document.getElementById('app');
      if (el) {
        el.innerHTML = '<section class="panel"><h1>문제가 생겼어요</h1><p>화면을 표시하지 못했어요 → 홈으로 돌아가 이어하거나 진단을 복사해 주세요.</p><button data-action="recover">홈으로</button><button data-action="diagnostics">오류 복사</button></section>';
      }
    }
  };
  // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
  window.onerror = function (message, url, line, column, error) {
    SE.util.fatal(error, '화면 오류');
    return true;
  };
  window.addEventListener('unhandledrejection', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */event => {
    event.preventDefault();
    SE.util.fatal(event.reason, '비동기 오류');
  });
})();
