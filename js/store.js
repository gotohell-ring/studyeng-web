// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util,
    KEY = 'studyeng.v1';
  const writerId = U.id();
  // 저장소의 초기 구조와 설정을 만든다.
  const defaults = () => ({
    schemaVersion: 1,
    revision: 0,
    writerId,
    onboarded: false,
    settings: {
      defaultInput: 'speech',
      tier: 2,
      speechRate: 0.85,
      autoPlayAudio: true,
      newCardsPerDay: 10,
      reviewsPerDay: 50
    },
    completed: [],
    sessions: [],
    session: null,
    reviewSession: null,
    cards: [],
    reviewLogs: [],
    dailyProgress: {},
    overrides: {},
    errors: []
  });
  // 일반 객체인지 확인한다.
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  // 유한한 숫자인지 확인한다.
  const finite = v => typeof v === 'number' && Number.isFinite(v);
  // 유효한 날짜 문자열인지 확인한다.
  const validDate = v => typeof v === 'string' && Number.isFinite(new Date(v).getTime());
  // 불러올 저장 데이터의 구조와 범위를 검사한다.
  function validate(d) {
    if (!object(d) || d.schemaVersion !== 1) {
      throw Error('지원하지 않는 저장 버전이에요.');
    }
    if (typeof d.onboarded !== 'boolean' || !object(d.settings) || !object(d.dailyProgress) || !object(d.overrides)) {
      throw Error('저장 구조가 올바르지 않아요.');
    }
    for (const k of ['completed', 'sessions', 'cards', 'reviewLogs', 'errors']) {
      if (!Array.isArray(d[k])) {
        throw Error('저장 목록이 올바르지 않아요.');
      }
    }
    if (d.revision !== undefined && (!Number.isSafeInteger(d.revision) || d.revision < 0) ||
        d.writerId !== undefined && typeof d.writerId !== 'string') {
      throw Error('저장 revision이 올바르지 않아요.');
    }
    const s = d.settings;
    if (!['speech', 'keyboard'].includes(s.defaultInput) || s.tier !== 2 || !finite(s.speechRate) || s.speechRate < 0.5 || s.speechRate > 1.3 ||
      typeof s.autoPlayAudio !== 'boolean' ||
      !Number.isInteger(s.newCardsPerDay) ||
      s.newCardsPerDay < 1 ||
      s.newCardsPerDay > 30 ||
      !Number.isInteger(s.reviewsPerDay) ||
      s.reviewsPerDay < 10 ||
      s.reviewsPerDay > 200) {
      throw Error('설정값의 범위를 확인해 주세요.');
    }
    const optional = (x, k, check) => x[k] == null || check(x[k]);
    const nonnegative = v => Number.isSafeInteger(v) && v >= 0;
    const strings = v => Array.isArray(v) && v.every(x => typeof x === 'string');
    // 중첩 결과의 표시·설명에 쓰이는 선택 필드도 검증한다.
    const validResult = r => object(r) && Number.isInteger(r.score) && r.score >= 0 && r.score <= 100 && ['correct', 'near', 'again'].includes(r.verdict) && Array.isArray(r.wordStatuses) &&
      r.wordStatuses.every(w => object(w) && typeof w.word === 'string' &&
        optional(w, 'inputWord', v => typeof v === 'string') &&
        ['correct', 'near', 'wrong', 'missing', 'extra'].includes(w.status)) &&
      ['input', 'candidate'].every(k => optional(r, k, v => typeof v === 'string')) &&
      ['targetWords', 'inputWords'].every(k => optional(r, k, strings)) &&
      ['skipped', 'strict', 'keyboard', 'capped', 'userCorrected'].every(k => optional(r, k, v => typeof v === 'boolean')) &&
      optional(r, 'matchedCandidateIndex', nonnegative) &&
      optional(r, 'mode', v => ['speech', 'keyboard'].includes(v));
    const pending = p => object(p) && validResult(p.result) &&
      optional(p, 'practice', v => typeof v === 'boolean');
    const inputState = x => optional(x, 'draft', v => typeof v === 'string') &&
      optional(x, 'mode', v => ['speech', 'keyboard'].includes(v)) &&
      optional(x, 'retry', v => typeof v === 'boolean') &&
      optional(x, 'speechFailures', nonnegative);
    // 레슨 세션의 저장 구조를 확인한다.
    function session(x) {
      return object(x) && typeof x.id === 'string' && typeof x.lessonId === 'string' &&
        ['intro', 'keySentences', 'grammar', 'drill', 'block', 'roleplay', 'result', 'extra'].includes(x.stage) &&
        Number.isInteger(x.index) &&
        x.index >= 0 &&
        Number.isInteger(x.turn) &&
        x.turn >= 0 &&
        object(x.results) &&
        Object.values(x.results).every(validResult) &&
        object(x.keyAttempts) &&
        Array.isArray(x.missionsDone) &&
        Array.isArray(x.roleAnswers) &&
        x.roleAnswers.every(a => object(a) && nonnegative(a.turn) && typeof a.input === 'string' && validResult(a.result)) &&
        optional(x, 'pending', p => pending(p) && typeof p.key === 'string') &&
        inputState(x) && Object.values(x.keyAttempts).every(nonnegative) &&
        x.missionsDone.every(v => typeof v === 'string') &&
        optional(x, 'blocks', v => Array.isArray(v) && v.every(nonnegative)) &&
        nonnegative(x.newCards) &&
        typeof x.extra === 'boolean';
    }
    if (d.session !== null && !session(d.session) || !d.sessions.every(session) || !d.completed.every(/* 모든 항목이 조건에 맞는지 확인한다. */x => typeof x === 'string')) {
      throw Error('레슨 기록이 올바르지 않아요.');
    }
    for (const x of Object.values(d.dailyProgress)) {
      if (!object(x) || !['drillsDone', 'reviewsDone', 'newCardsDone'].every(/* 모든 항목이 조건에 맞는지 확인한다. */k => Number.isInteger(x[k]) && x[k] >= 0) ||
        typeof x.returnReviewDone !== 'boolean') {
        throw Error('일별 기록이 올바르지 않아요.');
      }
    }
    for (const c of d.cards) {
      if (!object(c) || typeof c.id !== 'string' || typeof c.sentenceId !== 'string' || !['koToEn', 'response', 'correction'].includes(c.cardType) ||
        typeof c.targetText !== 'string' ||
        typeof c.frontText !== 'string' ||
        !Array.isArray(c.sources) ||
        !Array.isArray(c.answers) ||
        !Array.isArray(c.keywords) ||
        ![...c.sources, ...c.answers, ...c.keywords].every(/* 모든 항목이 조건에 맞는지 확인한다. */v => typeof v === 'string') ||
        !object(c.state) ||
        !validDate(c.state.due) ||
        !Number.isInteger(c.state.reps) ||
        c.state.reps < 0 ||
        ![c.state.stability, c.state.difficulty, c.state.lapses, c.state.state, c.state.elapsed_days, c.state.scheduled_days, c.state.learning_steps].every(finite) ||
        typeof c.retired !== 'boolean' ||
        typeof c.strict !== 'boolean' ||
        !validDate(c.createdAt) ||
        c.state.last_review != null && !validDate(c.state.last_review)) {
        throw Error('복습 카드가 올바르지 않아요.');
      }
    }
    if (new Set(d.cards.map(/* 각 항목을 표시 값으로 바꾼다. */c => c.id)).size !== d.cards.length) {
      throw Error('카드 ID가 중복돼요.');
    }
    for (const log of d.reviewLogs) {
      if (!object(log) || typeof log.id !== 'string' || typeof log.cardId !== 'string' || typeof log.day !== 'string' || !validDate(log.at) || !object(log.prevState) ||
        !validDate(log.prevState.due) ||
        !finite(log.prevState.stability) ||
        !finite(log.prevState.difficulty) ||
        !Number.isInteger(log.prevState.reps) ||
        ![1, 2, 3, 4].includes(log.rating)) {
        throw Error('복습 기록이 올바르지 않아요.');
      }
    }
    for (const v of Object.values(d.overrides)) {
      if (!object(v) || typeof v.input !== 'string' || v.judgedBy !== 'user') {
        throw Error('허용 답안 기록이 올바르지 않아요.');
      }
    }
    if (d.reviewSession !== null) {
      const r = d.reviewSession;
      if (!object(r) || !Array.isArray(r.ids) || !r.ids.every(/* 모든 항목이 조건에 맞는지 확인한다. */id => typeof id === 'string') || !Number.isInteger(r.index) || r.index < 0 ||
        r.index > r.ids.length ||
        !['review', 'returnReview', 'warmupThenLesson', 'reviewFirst'].includes(r.kind) ||
        typeof r.day !== 'string' || !inputState(r) ||
        !optional(r, 'practiceResult', pending) ||
        r.pending != null && (!pending(r.pending) || typeof r.pending.logId !== 'string')) {
        throw Error('복습 세션이 올바르지 않아요.');
      }
    }
    return d;
  }
  SE.store = {
    data: defaults(),
    blocked: false,
    raw: null,
    writeFailed: false,
    defaults,
    validate,
    baseRevision: 0,
    snapshot: JSON.stringify(defaults()),
    // 직접 변경하는 학습 모듈도 빠짐없이 감지한다.
    get dirty() { return JSON.stringify(this.data) !== this.snapshot; },
    refreshIfNewer() {
      const raw = window.localStorage.getItem(KEY);
      const latest = raw === null ? null : JSON.parse(raw);
      if (!latest || (latest.revision || 0) <= this.baseRevision) return false;
      validate(latest);
      this.load();
      SE.speech.cancel();
      if (SE.app) {
        SE.app.lastAudioKey = '';
        SE.app.render();
      }
      U.toast('다른 창에서 학습 기록이 바뀌었어요 → 이 창을 새로 고칠게요');
      return true;
    },
    // 저장 데이터를 읽고 복구 필요 여부를 판단한다.
    load() {
      try {
        const raw = window.localStorage.getItem(KEY);
        if (raw !== null) {
          this.raw = raw;
          this.data = validate(JSON.parse(raw));
        }
      } catch (e) {
        this.blocked = true;
        this.data = defaults();
        this.problem = this.raw === null ? '브라우저가 저장소를 허용하지 않아요.' : '저장 데이터가 손상되었거나 다른 버전이에요.';
      }
      this.baseRevision = this.data.revision || 0;
      this.snapshot = JSON.stringify(this.data);
      return this.data;
    },
    // 현재 학습 상태를 저장한다.
    save() {
      if (this.blocked) {
        return false;
      }
      try {
        if (this.refreshIfNewer()) return false;
        const candidate = { ...this.data, revision: this.baseRevision + 1, writerId };
        const raw = JSON.stringify(candidate);
        window.localStorage.setItem(KEY, raw);
        this.data.revision = candidate.revision;
        this.data.writerId = writerId;
        this.baseRevision = candidate.revision;
        this.snapshot = raw;
        this.writeFailed = false;
        return true;
      } catch (e) {
        const first = !this.writeFailed;
        this.writeFailed = true;
        if (first) {
          U.toast('저장 공간이 부족하거나 저장이 차단됐어요 → 설정에서 백업을 내보내 주세요. 현재 창에서는 계속 학습할 수 있어요.');
        }
        const banner = document.getElementById('storage-warning');
        if (banner) {
          banner.hidden = false;
        }
        return false;
      }
    },
    // 오늘의 학습 진행 기록을 구한다.
    today(now = new Date()) {
      const day = U.day(now);
      if (!this.data.dailyProgress[day]) {
        this.data.dailyProgress[day] = {
          drillsDone: 0,
          reviewsDone: 0,
          newCardsDone: 0,
          returnReviewDone: false
        };
      }
      return this.data.dailyProgress[day];
    },
    // 현재 기록이나 손상된 원본을 내보낸다.
    backup(raw = false, name) {
      return U.download(name || 'studyeng-backup-' + U.day() + '.json', raw && this.raw !== null ? this.raw : JSON.stringify({
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        data: this.data
      }, null, 2));
    },
    // 공유 시트로 백업 파일을 보낸다 (iPhone: 파일에 저장 → iCloud Drive)
    shareBackup() {
      return U.shareFile('studyeng-backup-' + U.day() + '.json', JSON.stringify({
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        data: this.data
      }, null, 2));
    },
    // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
    parseBackup(text) {
      const value = JSON.parse(text);
      if (value.backupVersion !== undefined && value.backupVersion !== 1) {
        throw Error('이 백업 버전은 지원하지 않아요.');
      }
      return validate(value.data || value);
    },
    // 선택한 백업을 검증하고 가져온다.
    async importFile(file) {
      try {
        if (!file || file.size > 20 * 1024 * 1024) {
          throw Error('20MB 이하의 백업 파일을 선택해 주세요.');
        }
        const data = this.parseBackup(await file.text());
        if (!window.confirm('현재 진도를 이 백업으로 전체 교체할까요? 먼저 현재 상태의 백업을 내려받아요.')) {
          return;
        }
        if (!this.backup(this.blocked, 'studyeng-pre-restore.json')) {
          return;
        }
        // 복구 상태를 바꾸기 전에 실제 영구 저장부터 확인한다.
        try {
          const stored = window.localStorage.getItem(KEY);
          let revision = this.baseRevision;
          try { revision = Math.max(revision, JSON.parse(stored)?.revision || 0); } catch (_) {}
          data.revision = revision + 1;
          data.writerId = writerId;
          window.localStorage.setItem(KEY, JSON.stringify(data));
        } catch (_) {
          U.toast('저장 공간이 부족해 가져오지 못했어요');
          return;
        }
        SE.speech.cancel();
        this.data = data;
        this.blocked = false;
        this.raw = null;
        this.writeFailed = false;
        this.baseRevision = data.revision;
        this.snapshot = JSON.stringify(data);
        SE.app.navigate('/home');
        U.toast('백업을 가져왔어요.');
      } catch (e) {
        U.toast('백업을 읽지 못했어요 → ' + (e.message || '파일 형식을 확인해 주세요.'));
      }
    },
    // 백업과 확인 후 학습 기록을 초기화한다.
    reset() {
      if (!this.backup(this.blocked, 'studyeng-before-reset.json')) {
        return;
      }
      if (!window.confirm('백업 파일을 내려받았어요. 진도를 초기화할까요?')) {
        return;
      }
      if (!window.confirm('레슨·복습 기록과 설정을 모두 초기화합니다. 계속할까요?')) {
        return;
      }
      SE.speech.cancel();
      this.data = defaults();
      this.blocked = false;
      this.raw = null;
      this.save();
      SE.app.navigate('/onboarding');
    },
    // 학습일 기록으로 연속 학습일을 구한다.
    streak(now = new Date()) {
      const today = U.day(now),
        days = this.data.dailyProgress;
      // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
      const qualified = d => d && (d.drillsDone >= 5 || d.reviewsDone + d.newCardsDone >= 5);
      const first = Object.keys(days).filter(/* 조건에 맞는 항목만 남긴다. */k => k <= today && qualified(days[k])).sort()[0];
      if (!first) {
        return {
          count: 0,
          freezes: 1
        };
      }
      const end = qualified(days[today]) ? today : U.day(U.addDay(now, -1));
      let date = new Date(first + 'T04:00:00'),
        count = 0,
        freezes = 1,
        charge = 0;
      while (U.day(date) <= end) {
        if (qualified(days[U.day(date)])) {
          count++;
          charge++;
          if (charge === 7) {
            freezes = Math.min(2, freezes + 1);
            charge = 0;
          }
        } else {
          charge = 0;
          if (freezes > 0) {
            freezes--;
          } else {
            count = 0;
          }
        }
        date = U.addDay(date);
      }
      return {
        count,
        freezes
      };
    }
  };
})();
