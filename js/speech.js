// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE;
  let generation = 0,
    rec = null,
    timers = [],
    active = false,
    stopRequested = false;
  // 음성 처리에 등록한 타이머를 해제한다.
  const clear = () => {
    timers.forEach(/* 각 항목을 처리한다. */t => {
      clearTimeout(t);
      clearInterval(t);
    });
    timers = [];
  };
  SE.speech = {
    // 브라우저의 음성 인식 지원 여부를 확인한다.
    supported: () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    // 읽어주기 기능 지원 여부를 확인한다.
    synthesisSupported: () => !!window.speechSynthesis && !!window.SpeechSynthesisUtterance,
    // 현재 녹음 상태를 반환한다.
    get active() {
      return active;
    },
    // 진행 중인 녹음을 한 번만 중지한다.
    stop() {
      if (!active || !rec || stopRequested) {
        return;
      }
      stopRequested = true;
      try {
        rec.stop();
      } catch (_) {}
    },
    // 이전 음성과 예약 작업을 취소한다.
    cancel() {
      generation++;
      sayToken++;
      clear();
      active = false;
      stopRequested = false;
      if (rec) {
        try {
          rec.abort();
        } catch (_) {}
        rec = null;
      }
      try {
        if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
          window.speechSynthesis.cancel();
        }
      } catch (_) {}
    },
    // 녹음과 인식 이벤트를 안전하게 처리한다.
    listen(callbacks = {}) {
      if (active) {
        this.stop();
        return;
      }
      this.cancel();
      const token = generation;
      let finished = false,
        heard = false,
        transcript = '',
        interim = '',
        silence = null;
      // 종료되었거나 오래된 음성 이벤트를 제외한다.
      const current = () => token === generation && !finished;
      // 현재 음성 인식 시도를 한 번만 마친다.
      const finish = reason => {
        if (!current()) {
          return;
        }
        finished = true;
        active = false;
        clear();
        if (rec) {
          try {
            rec.abort();
          } catch (_) {}
          rec = null;
        }
        callbacks.state?.(false, 0);
        // Safari는 녹음을 멈추면 확정(final) 결과 없이 중간 결과만 남기는 경우가 많아 중간 결과도 답으로 쓴다
        const text = (transcript.trim() || interim.trim());
        if (text && (!reason || reason === 'no-speech' || reason === 'aborted')) {
          callbacks.result?.(text);
        } else {
          callbacks.failed?.(reason || 'no-result');
        }
      };
      if (!this.supported()) {
        finish('unsupported');
        return;
      }
      try {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        rec = new Recognition();
        rec.lang = 'en-US';
        rec.continuous = !SAFARI_ENGINE;
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        const start = Date.now();
        active = true;
        stopRequested = false;
        // Safari는 멈춘 뒤 마지막 결과를 늦게 보내므로 종료 이벤트를 더 오래 기다린다
        const endWait = SAFARI_ENGINE ? 2500 : 700;
        // 녹음을 멈추고 종료 이벤트를 기다린다.
        const watchdog = () => {
          if (!current()) {
            return;
          }
          this.stop();
          timers.push(setTimeout(() => finish(null), endWait));
        };
        // 마이크가 실제로 열린 시점부터 "목소리 없음"을 센다 (Safari는 열리는 데 1~2초 걸림)
        let noSpeechTimer = null;
        const armNoSpeech = () => {
          clearTimeout(noSpeechTimer);
          noSpeechTimer = setTimeout(() => {
            if (current() && !heard) {
              finish('no-speech');
            }
          }, SAFARI_ENGINE ? 8000 : 5000);
          timers.push(noSpeechTimer);
        };
        rec.onaudiostart = () => {
          if (current()) {
            SE.util.trace('mic-audio');
            armNoSpeech();
          }
        };
        rec.onsoundstart = () => {
          if (current()) {
            heard = true;
          }
        };
        // 음성이 감지되었음을 기록한다.
        const markSpeech = () => {
          heard = true;
        };
        // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
        rec.onspeechstart = () => {
          if (current()) {
            markSpeech();
          }
        };
        // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
        rec.onspeechend = () => {
          if (current()) {
            clearTimeout(silence);
            silence = setTimeout(watchdog, 1500);
            timers.push(silence);
          }
        };
        // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
        rec.onresult = event => {
          if (!current()) {
            return;
          }
          markSpeech();
          transcript = '';
          interim = '';
          for (let i = 0; i < event.results.length; i++) {
            const r = event.results[i];
            if (r.isFinal) {
              transcript += r[0].transcript + ' ';
            } else {
              interim += r[0].transcript + ' ';
            }
          }
          callbacks.interim?.((transcript + interim).trim());
          clearTimeout(silence);
          silence = setTimeout(watchdog, 1500);
          timers.push(silence);
        };
        // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
        rec.onerror = e => {
          if (current()) {
            SE.util.trace('mic-error ' + (e.error || ''));
            finish(e.error || 'recognition-error');
          }
        };
        // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
        rec.onend = () => {
          if (current()) {
            finish(null);
          }
        };
        const synth = window.speechSynthesis;
        if (synth && (synth.speaking || synth.pending)) {
          synth.cancel();
        }
        // iPhone Safari는 버튼을 누른 그 순간(같은 이벤트 안)에 start()해야 마이크가 열린다 → 지연 없이 바로 시작
        rec.start();
        SE.util.trace('mic-start');
        callbacks.state?.(true, 15);
        // onaudiostart가 오지 않는 엔진을 위해 시작 시점에도 한 번 걸어 둔다 (오면 그 시점부터 다시 셈)
        armNoSpeech();
        timers.push(setInterval(/* 남은 시간 표시를 갱신한다. */() => {
          if (current()) {
            callbacks.state?.(true, Math.max(0, 15 - Math.floor((Date.now() - start) / 1000)));
          }
        }, 200));
        timers.push(setTimeout(watchdog, 15000));
        // 사용자가 멈췄는데 종료 이벤트가 오지 않으면 일정 시간 뒤 마친다
        let stopSeenAt = 0;
        timers.push(setInterval(() => {
          if (current() && stopRequested) {
            stopSeenAt = stopSeenAt || Date.now();
            if (Date.now() - stopSeenAt >= endWait) {
              finish(null);
            }
          }
        }, 250));
      } catch (e) {
        finish('start-failed');
      }
    },
    // 설정한 영어 음성으로 문장을 읽는다.
    say(text, { auto = false } = {}) {
      if (!text) {
        return;
      }
      // Safari는 사용자가 한 번도 누르지 않은 상태의 자동 재생을 막고 대기열을 멈춘다 → 첫 터치 전에는 자동 재생 생략
      if (auto && SAFARI_ENGINE && !unlocked) {
        return;
      }
      if (!this.synthesisSupported()) {
        SE.util.toast('이 브라우저에서 읽어주기를 사용할 수 없어요 → 화면의 문장을 읽어 주세요.', { once: true });
        return;
      }
      const token = ++sayToken;
      // 음성 목록이 이미 있으면 바로 읽고, 비어 있으면(첫 호출) 준비될 때까지 기다렸다가 읽는다.
      const ready = window.speechSynthesis.getVoices();
      if (ready.length > 0) {
        speakWith(ready);
      } else {
        loadVoices().then(voices => {
          if (token === sayToken) {
            speakWith(voices);
          }
        });
      }

      // 고른 영어 음성으로 실제 읽기를 시작한다.
      function speakWith(voices) {
        try {
          const synth = window.speechSynthesis;
          const busy = synth.speaking || synth.pending;
          if (busy) {
            synth.cancel();
          }
          const u = new window.SpeechSynthesisUtterance(String(text));
          u.lang = 'en-US';
          u.rate = SE.store.data.settings.speechRate;
          const voice = SE.speech.englishVoice(voices);
          if (voice) {
            u.voice = voice;
          } else if (voices.length > 0) {
            // 목록은 있는데 영어가 없으면 한국어 음성으로 영어를 읽게 되므로 읽지 않고 설치 방법을 안내한다.
            SE.util.toast(NO_ENGLISH_VOICE, { once: true });
            return;
          }
          // 목록 자체가 비어 있으면 브라우저 기본 영어 음성(lang)에 맡긴다.
          u.onerror = event => {
            if (event && (event.error === 'interrupted' || event.error === 'canceled')) {
              return;
            }
            SE.util.toast('문장을 읽지 못했어요 → 설정 > 진단에서 영어 음성이 보이는지 확인해 주세요.', { once: true });
          };
          let started = false;
          u.onstart = () => {
            started = true;
          };
          const start = () => {
            if (token !== sayToken) {
              return;
            }
            synth.speak(u);
            SE.util.trace('tts');
            // 3초 안에 시작하지 않으면 대기열이 막힌 것으로 보고 풀어 준다 (다음 듣기가 동작하도록)
            setTimeout(() => {
              if (!started && token === sayToken && (synth.pending || synth.speaking)) {
                synth.cancel();
                SE.util.error({ name: 'tts-stuck' }, '읽어주기');
                SE.util.toast('읽어주기가 멈춰서 정리했어요 → ▷ 듣기를 다시 눌러 주세요.', { once: true });
              }
            }, 3000);
          };
          // Safari는 cancel() 직후 같은 순간의 speak()를 버리므로 잠시 뒤에 읽는다
          if (busy && SAFARI_ENGINE) {
            setTimeout(start, 150);
          } else {
            start();
          }
        } catch (e) {
          SE.util.toast('읽어주기를 시작하지 못했어요 → 화면의 문장을 읽어 주세요.', { once: true });
        }
      }
    },
    // 첫 사용자 터치에서 소리 없는 문장을 읽어 Safari의 음성 재생 잠금을 푼다.
    unlock() {
      if (unlocked || !this.synthesisSupported()) {
        unlocked = true;
        return;
      }
      unlocked = true;
      try {
        const u = new window.SpeechSynthesisUtterance(' ');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch (_) {}
    },
    // 영어 음성 하나를 고른다: 로컬 미국 영어 → 로컬 영어 → 온라인 미국 영어 → 온라인 영어.
    englishVoice(voices) {
      const english = (voices || []).filter(v => /^en(?:-|_)/i.test(v.lang));
      const local = english.filter(v => v.localService);
      const us = v => /^en[-_]US$/i.test(v.lang);
      return local.find(us) || local[0] || english.find(us) || english[0] || null;
    },
    // 진단 화면용: 브라우저가 보는 영어 음성 이름 목록.
    englishVoiceNames() {
      if (!this.synthesisSupported()) {
        return [];
      }
      return window.speechSynthesis.getVoices()
        .filter(v => /^en(?:-|_)/i.test(v.lang))
        .map(v => v.name + (v.localService ? '' : ' (온라인)'));
    }
  };

  const NO_ENGLISH_VOICE = '브라우저가 영어 음성을 찾지 못했어요 → Windows 설정 > 시간 및 언어 > 음성 > "음성 추가"에서 ' +
    'English (United States)를 설치하고, 브라우저 창을 모두 닫았다가 다시 열어 주세요.';
  let sayToken = 0;
  let unlocked = false;
  // iPhone·iPad·Mac Safari (WebKit) 판별: 음성 인식·합성 동작 차이를 보정하는 데만 쓴다
  const UA = navigator.userAgent || '';
  const SAFARI_ENGINE = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (/Safari\//.test(UA) && !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android)/.test(UA));
  SE.speech.safari = SAFARI_ENGINE;
  let voicesPromise = null;

  // 음성 목록을 한 번 불러온다. 비어 있으면 voiceschanged를 최대 2초 기다린다.
  function loadVoices() {
    if (!SE.speech.synthesisSupported()) {
      return Promise.resolve([]);
    }
    const now = window.speechSynthesis.getVoices();
    if (now.length > 0) {
      return Promise.resolve(now);
    }
    if (!voicesPromise) {
      voicesPromise = new Promise(resolve => {
        const done = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', done);
          resolve(window.speechSynthesis.getVoices());
        };
        window.speechSynthesis.addEventListener('voiceschanged', done);
        setTimeout(done, 2000);
      }).then(list => {
        // 빈 결과는 캐시하지 않아 다음 호출에서 다시 확인한다.
        if (list.length === 0) {
          voicesPromise = null;
        }
        return list;
      });
    }
    return voicesPromise;
  }

  // 앱 시작 시 미리 음성 목록을 요청해 첫 읽기 지연을 줄인다.
  try {
    loadVoices();
  } catch (_) {}
})();
