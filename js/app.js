// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util,
    L = SE.learning;
  const A = SE.app = {
    route: '/home',
    onboardingStep: 0,
    temporary: false,
    lastAudioKey: '',
    // 지정한 화면으로 이동한다.
    navigate(route) {
      if (window.location.hash === '#' + route) {
        this.render();
      } else {
        window.location.hash = route;
      }
    },
    // 현재 화면의 진행 상태를 구한다.
    state() {
      return this.route === '/review' ? SE.store.data.reviewSession : SE.store.data.session;
    },
    // 경로에 맞는 화면과 접근성 상태를 갱신한다.
    render() {
      try {
        SE.speech.cancel();
        let route = (window.location.hash || '#/home').slice(1);
        if (!['/home', '/course', '/tutor', '/review', '/settings', '/lesson', '/onboarding'].includes(route)) {
          route = '/home';
        }
        if (!SE.store.data.onboarded && route !== '/settings') {
          route = '/onboarding';
        }
        if (route === '/home') {
          L.leaveResult();
        }
        this.route = route;
        const recovering = SE.store.blocked && !this.temporary;
        const full = !recovering && route === '/lesson' || !recovering && route === '/review' && !!SE.store.data.reviewSession;
        document.body.classList.toggle('lesson-mode', !!full);
        const html = recovering ? SE.views.recovery() : SE.views[route.slice(1)]();
        const app = document.getElementById('app');
        app.innerHTML = html;
        document.getElementById('storage-warning').hidden = !(SE.store.writeFailed || SE.store.blocked && this.temporary);
        document.querySelectorAll('[data-tab]').forEach(/* 각 항목을 처리한다. */a => {
          if ('/' + a.dataset.tab === route) {
            a.setAttribute('aria-current', 'page');
          } else {
            a.removeAttribute('aria-current');
          }
        });
        const heading = app.querySelector('h1');
        if (heading) {
          heading.setAttribute('tabindex', '-1');
          heading.focus({
            preventScroll: true
          });
        }
        window.scrollTo(0, 0);
        if (!recovering) {
          this.autoAudio();
        }
      } catch (e) {
        U.fatal(e, '렌더링');
      }
    },
    // 현재 문항의 안내 음성을 한 번 재생한다.
    autoAudio() {
      if (!SE.store.data.settings.autoPlayAudio) {
        return;
      }
      let text = '',
        key = '';
      if (this.route === '/lesson') {
        const c = L.current(),
          s = SE.store.data.session;
        if (c && !s?.pending) {
          text = c.kind === 'key' || c.item.type === 'A' ? c.answer.en : c.kind === 'roleplay' ? c.item.aiLine : ['E', 'I'].includes(c.item.type) ? c.answer.promptEn : c.item.type === 'C' ? (c.item.dialogue || []).find(/* 조건에 맞는 항목을 찾는다. */(line, i, arr) => arr[i + 1]?.blank)?.en : '';
          key = s.id + ':' + c.key;
        }
      }
      if (this.route === '/review') {
        const c = L.reviewCard(),
          r = SE.store.data.reviewSession;
        if (c && !r.pending) {
          text = c.frontAudioText;
          key = 'review:' + r.day + ':' + c.id;
        }
      }
      if (text && key !== this.lastAudioKey) {
        this.lastAudioKey = key;
        SE.speech.say(text, { auto: true });
      }
    },
    // 진행을 저장하고 학습 화면을 닫는다.
    close() {
      if (this.route === '/review' && SE.store.data.reviewSession) {
        if (!window.confirm('복습을 저장하고 나갈까요? 이어서 할 수 있어요.')) {
          return;
        }
        if (SE.store.data.reviewSession.kind === 'returnReview') {
          L.finishReview(false);
        }
        this.navigate('/home');
        return;
      }
      if (this.route === '/lesson' && SE.store.data.session?.stage !== 'result' && !window.confirm('지금까지의 응답을 저장하고 나갈까요? 같은 문항부터 이어서 할 수 있어요.')) {
        return;
      }
      SE.store.save();
      this.navigate('/home');
    },
    // 다음 레슨이나 추가 연습을 시작한다.
    startNext(extra = false, id = null) {
      const lesson = id ? SE.content.lessons[id] : extra ? SE.home.extraLesson() : SE.home.nextLesson() || SE.home.lessons()[0];
      if (!lesson) {
        U.toast('다음 레슨을 준비 중이에요.');
        return;
      }
      if (L.start(lesson.id, extra)) {
        this.navigate('/lesson');
      }
    },
    // 홈에서 선택한 다음 학습을 실행한다.
    doNext() {
      const step = SE.home.next(SE.home.input());
      if (step.type === 'resume') {
        this.navigate(SE.store.data.reviewSession ? '/review' : '/lesson');
        return;
      }
      if (['review', 'reviewFirst', 'returnReview', 'warmupThenLesson'].includes(step.type)) {
        L.startReview(step.type, step.count);
        this.navigate('/review');
        return;
      }
      this.startNext(step.type === 'extraPractice');
    },
    // 마이크 결과를 현재 학습 흐름에 연결한다.
    microphone() {
      if (SE.speech.active) {
        SE.speech.stop();
        return;
      }
      const test = this.route === '/onboarding' && this.onboardingStep === 1;
      const state = this.state();
      if (!test && (!state || state.pending && !state.retry || !['/lesson', '/review'].includes(this.route))) {
        return;
      }
      const textarea = document.getElementById('answer');
      if (!textarea) {
        return;
      }
      SE.speech.listen({
        // 현재 화면의 진행 상태를 구한다.
        state(active, seconds) {
          const btn = document.querySelector('[data-action="mic"]'),
            status = document.getElementById('speech-status');
          if (btn) {
            btn.classList.toggle('recording', active);
            btn.textContent = active ? `■ 녹음 끝내기 · ${seconds}초` : '● 말하기 시작';
          }
          if (status) {
            status.textContent = active ? `듣고 있어요 · ${seconds}초 남음` : '인식이 끝났어요.';
          }
        },
        // 인식 중간 결과를 입력창에 반영한다.
        interim(text) {
          textarea.value = text;
          const el = document.getElementById('speech-status');
          if (el) {
            el.textContent = '인식 중: ' + text;
          }
        },
        // 레슨 완료 결과와 대화 피드백을 표시한다.
        result(text) {
          if (test) {
            textarea.value = text;
            U.toast('마이크 테스트를 마쳤어요. 다음으로 이동해 주세요.');
            return;
          }
          if (A.route === '/review') {
            L.reviewSubmit(text, 'speech');
          } else {
            L.submit(text, 'speech');
          }
          A.render();
        },
        // 음성 인식 실패를 안내하고 키보드로 전환한다.
        failed(reason) {
          const reasons = {
            'not-allowed': '마이크 권한이 꺼져 있어요',
            'service-not-allowed': '브라우저가 음성 인식을 허용하지 않아요',
            'network': '음성 인식 네트워크에 연결하지 못했어요',
            'audio-capture': '마이크를 찾을 수 없어요',
            'unsupported': '음성 인식을 지원하지 않는 브라우저예요',
            'no-speech': '목소리를 듣지 못했어요',
            'no-result': '인식된 말이 없어요',
            'start-failed': '마이크를 시작하지 못했어요'
          };
          if (state) {
            state.mode = 'keyboard';
            state.speechFailures = (state.speechFailures || 0) + 1;
            state.draft = textarea.value || '';
            SE.store.save();
          }
          // iPhone은 키보드의 마이크(받아쓰기) 버튼이 웹 음성 인식보다 안정적이라 함께 안내한다
          U.toast((reasons[reason] || '음성 인식이 멈췄어요') + ' → 키보드로 입력할게요.' +
            (SE.speech.safari ? ' 키보드의 🎤 받아쓰기 버튼으로 말해도 돼요.' : ''));
          if (!test) {
            A.render();
          } else {
            const el = document.getElementById('speech-status');
            if (el) {
              el.textContent = '마이크 대신 키보드로 입력하고 다음을 눌러 주세요.';
            }
          }
          document.getElementById('answer')?.focus();
        }
      });
    },
    // 개인 입력을 제외한 진단 정보를 만든다.
    diagnostics() {
      return JSON.stringify({
        browser: navigator.userAgent,
        speech: SE.speech.supported(),
        synthesis: SE.speech.synthesisSupported(),
        storageBlocked: SE.store.blocked,
        storageWriteFailed: SE.store.writeFailed,
        aiAvailable: false,
        safari: !!SE.speech.safari,
        standalone: window.navigator.standalone === true,
        englishVoices: SE.speech.englishVoiceNames ? SE.speech.englishVoiceNames() : [],
        // 최근 동작 이름(마이크 시작·오류 코드 등, 학습 입력 없음)
        recentActions: U.trail.slice(-20),
        errors: SE.store.data.errors.slice(-50)
      }, null, 2);
    },
    // 버튼 동작을 학습과 화면 이동에 연결한다.
    action(action, el) {
      const s = this.state();
      // 현재 입력창의 답안을 읽는다.
      const answer = () => document.getElementById('answer')?.value || '';
      switch (action) {
        case 'recover':
          this.navigate('/home');
          break;
        case 'home':
        case 'result-home':
          this.navigate('/home');
          break;
        case 'settings':
          this.navigate('/settings');
          break;
        case 'close':
        case 'review-close':
          this.close();
          break;
        case 'next-step':
          this.doNext();
          break;
        case 'start':
          this.startNext(false, el.dataset.id);
          break;
        case 'start-next':
          this.startNext();
          break;
        case 'extra':
          {
            const id = L.lesson()?.id;
            L.leaveResult();
            this.startNext(true, id);
            break;
          }
        case 'onboard-next':
          this.onboardingStep = Math.min(2, this.onboardingStep + 1);
          this.render();
          break;
        case 'onboard-finish':
          SE.store.data.onboarded = true;
          SE.store.save();
          this.navigate('/home');
          break;
        case 'unavailable':
          U.toast('이 수준은 준비 중이에요. 현재 T2 중급으로 연습할 수 있어요.');
          break;
        case 'tier':
          U.toast('T2 중급으로 설정되어 있어요.');
          break;
        case 'say':
          SE.speech.say(el.dataset.text);
          break;
        case 'hint':
          {
            const hint = document.getElementById('hint');
            if (hint) {
              hint.textContent = '첫 단어: ' + (el.dataset.word || '');
            }
            break;
          }
        case 'mode-speech':
        case 'mode-keyboard':
          if (s) {
            s.draft = answer();
            s.mode = action === 'mode-speech' ? 'speech' : 'keyboard';
            SE.store.save();
            this.render();
            document.getElementById('answer')?.focus();
          }
          break;
        case 'mic':
          this.microphone();
          break;
        case 'submit':
        case 'skip':
          {
            const ctx = L.current();
            if (!ctx || !s) {
              break;
            }
            const value = ctx.item.type === 'G' ? (s.blocks || []).map(/* 각 항목을 표시 값으로 바꾼다. */i => ctx.item.blocks?.[i] || '').join(' ') : answer();
            L.submit(action === 'skip' ? '' : value, 'keyboard', action === 'skip');
            this.render();
            break;
          }
        case 'advance':
        case 'skip-feedback':
          L.advance(action === 'skip-feedback');
          if (!SE.store.data.session) {
            this.navigate('/home');
            U.toast('추가 연습을 마쳤어요. 수고했어요!');
          } else {
            this.render();
          }
          break;
        case 'retry':
          L.retry();
          this.render();
          document.getElementById('answer')?.focus();
          break;
        case 'accept':
          L.accept();
          this.render();
          break;
        case 'finish-lesson':
          L.complete();
          this.render();
          break;
        case 'block':
          if (s) {
            s.blocks = s.blocks || [];
            const i = Number(el.dataset.index);
            if (!s.blocks.includes(i)) {
              s.blocks.push(i);
            }
            SE.store.save();
            this.render();
          }
          break;
        case 'undo-block':
          if (s) {
            s.blocks?.pop();
            SE.store.save();
            this.render();
          }
          break;
        case 'review-start':
          L.startReview();
          this.render();
          break;
        case 'review-submit':
        case 'review-skip':
          L.reviewSubmit(action === 'review-skip' ? '' : answer(), 'keyboard', action === 'review-skip');
          this.render();
          break;
        case 'review-next':
          L.nextReview();
          this.render();
          break;
        case 'review-retry':
          L.retryReview();
          this.render();
          document.getElementById('answer')?.focus();
          break;
        case 'easy':
          L.changeReview(true);
          this.render();
          U.toast('쉬웠어요로 평가했어요.');
          break;
        case 'correct-review':
          L.changeReview(false);
          this.render();
          break;
        case 'review-finish':
          {
            const lesson = L.finishReview();
            if (lesson) {
              this.startNext();
            } else {
              this.render();
            }
            break;
          }
        case 'backup':
          SE.store.backup();
          break;
        case 'raw-backup':
          SE.store.backup(true);
          break;
        case 'reset':
          SE.store.reset();
          break;
        case 'temporary':
          this.temporary = true;
          this.render();
          break;
        case 'diagnostics':
          U.copy(this.diagnostics());
          break;
      }
    },
    // 저장소와 화면 이벤트를 초기화한다.
    init() {
      // Safari 브라우저(홈 화면 앱이 아닌 경우)는 화면 아래 도구 막대가 하단 메뉴를 가리므로 메뉴를 위로 올린다
      const standalone = window.navigator.standalone === true ||
        (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
      document.documentElement.classList.toggle('safari-browser', !!SE.speech.safari && !standalone);
      SE.store.load();
      // Content retirement is authoritative and does not remove history.
      const retired = Object.values(SE.content?.lessons || {}).flatMap(/* 콜백에서 필요한 값을 계산하거나 상태를 갱신한다. */l => l.retired || []);
      SE.store.data.cards.forEach(/* 각 항목을 처리한다. */c => {
        if (retired.includes(c.sentenceId)) {
          c.retired = true;
          c.retiredReason = 'content';
        }
      });
      window.addEventListener('hashchange', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */() => this.render());
      document.addEventListener('click', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */event => {
        const el = event.target.closest('[data-action]');
        if (!el || el.disabled) {
          return;
        }
        try {
          U.trace(el.dataset.action);
          this.action(el.dataset.action, el);
        } catch (error) {
          U.fatal(error, '조작');
        }
      });
      document.addEventListener('input', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */event => {
        if (event.target.id === 'answer') {
          const s = this.state();
          if (s) {
            s.draft = event.target.value;
            SE.store.save();
          }
        }
      });
      document.addEventListener('change', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */event => {
        const el = event.target;
        if (el.id === 'backup-file') {
          SE.store.importFile(el.files[0]);
          return;
        }
        if (!el.dataset.setting) {
          return;
        }
        const key = el.dataset.setting;
        let value = el.type === 'checkbox' ? el.checked : el.value;
        if (['speechRate', 'newCardsPerDay', 'reviewsPerDay'].includes(key)) {
          value = Number(value);
        }
        const copy = U.clone(SE.store.data);
        copy.settings[key] = value;
        try {
          SE.store.validate(copy);
          SE.store.data.settings = copy.settings;
          SE.store.save();
          U.toast('설정을 저장했어요.');
        } catch (_) {
          U.toast('설정 범위를 확인해 주세요.');
          this.render();
        }
      });
      document.addEventListener('keydown', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */event => {
        if (event.isComposing || event.altKey || event.metaKey) {
          return;
        }
        const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
        if (event.key === 'Escape') {
          event.preventDefault();
          this.close();
          return;
        }
        if (event.ctrlKey && event.code === 'Space' || !typing && !event.ctrlKey && event.key.toLowerCase() === 'm') {
          event.preventDefault();
          this.microphone();
          return;
        }
        if (event.ctrlKey && event.key === 'Enter') {
          const el = document.querySelector('[data-action="skip"], [data-action="review-skip"], [data-action="skip-feedback"], [data-action="review-next"]');
          if (el) {
            event.preventDefault();
            el.click();
          }
          return;
        }
        if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && event.target.tagName !== 'SELECT' && event.target.tagName !== 'BUTTON' &&
          event.target.tagName !== 'A') {
          const el = document.querySelector('[data-primary]');
          if (el) {
            event.preventDefault();
            el.click();
          }
        }
      });
      document.addEventListener('visibilitychange', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */() => {
        if (document.hidden) {
          const s = this.state(),
            input = document.getElementById('answer');
          if (s && input) {
            s.draft = input.value;
          }
          SE.speech.cancel();
          SE.store.save();
        } else {
          this.render();
        }
      });
      // Safari 음성 재생 잠금은 사용자 터치 안에서만 풀린다
      const unlock = () => SE.speech.unlock();
      document.addEventListener('pointerdown', unlock, { once: true, capture: true });
      document.addEventListener('keydown', unlock, { once: true, capture: true });
      U.watchStalls();
      window.addEventListener('pagehide', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */() => {
        SE.speech.cancel();
        SE.store.save();
      });
      this.render();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', /* 브라우저 이벤트에 맞춰 상태를 갱신한다. */() => A.init());
  } else {
    A.init();
  }
})();
