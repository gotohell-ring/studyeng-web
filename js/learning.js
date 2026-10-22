// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util;
  SE.learning = {
    // 현재 레슨을 조회하거나 화면에 표시한다.
    lesson() {
      return SE.content.lessons[SE.store.data.session?.lessonId] || null;
    },
    // 현재 단계의 문항을 학습 순서로 구한다.
    items() {
      const s = SE.store.data.session,
        l = this.lesson();
      if (!s || !l) {
        return [];
      }
      if (s.stage === 'extra' || s.extra) {
        return (l.extraDrills || []).filter(/* 조건에 맞는 항목만 남긴다. */d => !s.extraIds || s.extraIds.includes(d.id));
      }
      return (l.drills || []).filter(/* 조건에 맞는 항목만 남긴다. */d => ['A', 'B'].includes(d.type)).concat((l.drills || []).filter(/* 조건에 맞는 항목만 남긴다. */d => ['C', 'E', 'I'].includes(d.type)), (l.drills || []).filter(/* 조건에 맞는 항목만 남긴다. */d => ['D', 'F', 'G', 'H'].includes(d.type)));
    },
    // 레슨을 시작하고 진행 상태를 저장한다.
    start(lessonId, extra = false) {
      const old = SE.store.data.session;
      if (old) {
        if (old.stage !== 'result' && !window.confirm('진행 중인 레슨을 저장하고 새 학습을 시작할까요? 이전 세션은 종료됩니다.')) {
          return false;
        }
        if (old.stage !== 'result') {
          old.abandoned = true;
        }
        SE.store.data.sessions.push(old);
      }
      if (SE.store.data.reviewSession) {
        this.finishReview(false);
      }
      if (!SE.content.lessons[lessonId]) {
        U.toast('아직 준비 중인 레슨이에요.');
        return false;
      }
      SE.store.data.session = {
        id: U.id(),
        lessonId,
        stage: extra ? 'extra' : 'intro',
        index: 0,
        turn: 0,
        results: {},
        keyAttempts: {},
        missionsDone: [],
        roleAnswers: [],
        newCards: 0,
        extra,
        startedAt: new Date().toISOString(),
        mode: SE.speech.supported() ? SE.store.data.settings.defaultInput : 'keyboard',
        draft: '',
        blocks: [],
        pending: null
      };
      if (SE.store.data.settings.defaultInput === 'speech' && !SE.speech.supported()) {
        U.toast('음성 인식을 지원하지 않는 브라우저예요 → 키보드로 입력할게요.');
      }
      if (extra) {
        const ids = (SE.content.lessons[lessonId].extraDrills || []).filter(/* 조건에 맞는 항목만 남긴다. */d => !SE.store.data.sessions.some(/* 조건에 맞는 항목이 있는지 확인한다. */s => s.lessonId === lessonId && s.results[d.id])).map(/* 각 항목을 표시 값으로 바꾼다. */d => d.id);
        // Explicit replay after all extra items were completed is still possible.
        SE.store.data.session.extraIds = ids.length ? ids : (SE.content.lessons[lessonId].extraDrills || []).map(/* 각 항목을 표시 값으로 바꾼다. */d => d.id);
      }
      SE.store.save();
      return true;
    },
    // 현재 문항과 채점 답안을 구한다.
    current() {
      const s = SE.store.data.session,
        l = this.lesson();
      if (!s || !l) {
        return null;
      }
      if (s.stage === 'keySentences') {
        const d = (l.keySentences || [])[s.index];
        return d ? {
          item: d,
          answer: d,
          key: d.id,
          kind: 'key'
        } : null;
      }
      if (s.stage === 'drill' || s.stage === 'extra') {
        const d = this.items()[s.index];
        if (!d) {
          return null;
        }
        const a = d.type === 'I' ? (d.turns || [])[s.turn] : d;
        if (!a) {
          return null;
        }
        return {
          item: d,
          answer: a,
          key: d.id + (d.type === 'I' ? '-t' + (s.turn + 1) : ''),
          kind: 'drill'
        };
      }
      if (s.stage === 'roleplay') {
        const row = (l.roleplay?.script || []).find(/* 조건에 맞는 항목을 찾는다. */r => r.turn === (s.scriptPointer || 1));
        if (!row) {
          return null;
        }
        return {
          item: row,
          answer: {
            en: row.expected?.[0] || '',
            answers: (row.expected || []).slice(1)
          },
          key: l.id + '-s' + row.turn,
          kind: 'roleplay'
        };
      }
      return null;
    },
    // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
    judge(answer, item, input, mode) {
      return SE.score({
        target: answer.en || '',
        answers: answer.answers || [],
        keywords: answer.keywords || [],
        input,
        mode,
        allowNearMatch: !['D', 'F', 'H'].includes(item.type),
        wrongInput: item.type === 'F' ? item.sourceEn : item.type === 'H' ? item.wrongEn : null
      });
    },
    // 여러 턴의 채점 결과를 합친다.
    aggregate(item, s = SE.store.data.session) {
      if (item.type !== 'I') {
        return s.results[item.id] || {
          score: 0,
          verdict: 'again',
          wordStatuses: []
        };
      }
      const rows = (item.turns || []).map(/* 각 항목을 표시 값으로 바꾼다. */(_, i) => s.results[item.id + '-t' + (i + 1)]);
      if (rows.some(/* 조건에 맞는 항목이 있는지 확인한다. */r => !r)) {
        return null;
      }
      const score = Math.floor(rows.reduce(/* 항목별 값을 모은다. */(sum, r) => sum + r.score, 0) / Math.max(1, rows.length) + 0.5);
      return {
        score,
        verdict: SE.verdict(score),
        skipped: rows.every(/* 모든 항목이 조건에 맞는지 확인한다. */r => r.skipped),
        wordStatuses: [],
        turnAverage: true
      };
    },
    // 응답을 채점하고 첫 유효 시도를 저장한다.
    submit(input, mode = 'keyboard', skipped = false) {
      const s = SE.store.data.session,
        ctx = this.current();
      if (!s || !ctx) {
        return;
      }
      const {
        item,
        answer,
        key,
        kind
      } = ctx;
      const existing = s.results[key];
      if (s.pending && !s.retry) {
        return;
      }
      const accepted = kind === 'drill' && !skipped && SE.store.data.overrides[key + '::' + SE.normalize(input).join(' ')];
      let result = skipped ? {
        score: 0,
        verdict: 'again',
        wordStatuses: [],
        matchedCandidateIndex: 0
      } : accepted ? {
        score: 100,
        verdict: 'correct',
        wordStatuses: SE.normalize(input).map(/* 각 항목을 표시 값으로 바꾼다. */word => ({
          word,
          status: 'correct'
        })),
        matchedCandidateIndex: 0,
        judgedBy: 'user'
      } : this.judge(answer, item, input, mode);
      result = {
        ...result,
        input,
        mode,
        skipped,
        at: new Date().toISOString()
      };
      if (!existing) {
        s.results[key] = result;
        if (kind === 'key') {
          s.keyAttempts[key] = (s.keyAttempts[key] || 0) + 1;
        }
        if (kind === 'drill' && item.type !== 'I') {
          SE.store.today().drillsDone++;
          s.newCards += SE.cards.fromDrill(item, result);
        }
        if (kind === 'roleplay') {
          const words = ' ' + SE.normalize(input).join(' ') + ' ';
          for (const mission of this.lesson().roleplay?.missions || []) {
            if ((mission.successHints || []).some(/* 조건에 맞는 항목이 있는지 확인한다. */h => words.includes(' ' + SE.normalize(h).join(' ') + ' '))) {
              s.missionsDone = [...new Set([...s.missionsDone, mission.id])];
            }
          }
          s.roleAnswers.push({
            turn: item.turn,
            input,
            result
          });
          s.newCards += SE.cards.fromRoleplay(this.lesson(), item, result);
        }
      } else if (kind === 'key') {
        s.keyAttempts[key] = (s.keyAttempts[key] || 0) + 1;
      }
      if (kind === 'drill' && item.type === 'I') {
        const aggregate = this.aggregate(item);
        if (aggregate && !s.results[item.id]) {
          s.results[item.id] = {
            ...aggregate,
            at: result.at
          };
          SE.store.today().drillsDone++;
          s.newCards += SE.cards.fromDrill(item, aggregate);
        }
      }
      s.pending = {
        key,
        result,
        practice: !!existing
      };
      s.retry = false;
      s.draft = '';
      s.blocks = [];
      // Speech failures never call submit; valid low scores do count.
      s.speechFailures = mode === 'speech' && result.score < 30 ? (s.speechFailures || 0) + 1 : 0;
      if (s.speechFailures >= 2) {
        s.mode = 'keyboard';
      }
      SE.store.save();
      return result;
    },
    // 첫 시도 기록을 유지하며 다시 연습한다.
    retry() {
      const s = SE.store.data.session;
      if (!s?.pending) {
        return;
      }
      s.pending = null;
      s.retry = true;
      s.draft = '';
      s.blocks = [];
      SE.store.save();
    },
    // 학습자가 수락한 답안을 기록한다.
    accept() {
      const s = SE.store.data.session,
        ctx = this.current();
      if (!s?.pending || ctx?.kind !== 'drill') {
        return;
      }
      const input = s.pending.result.input;
      if (!SE.normalize(input).length) {
        return;
      }
      const old = s.results[ctx.key];
      s.results[ctx.key] = {
        ...old,
        input,
        score: 100,
        verdict: 'correct',
        judgedBy: 'user',
        skipped: false,
        wordStatuses: SE.normalize(input).map(/* 각 항목을 표시 값으로 바꾼다. */word => ({
          word,
          status: 'correct'
        }))
      };
      const aggregate = this.aggregate(ctx.item);
      if (ctx.item.type === 'I' && aggregate) {
        s.results[ctx.item.id] = {
          ...aggregate,
          at: new Date().toISOString()
        };
      }
      SE.cards.accept(ctx.item, ctx.key, input, aggregate || {
        score: 0
      });
      s.pending = {
        key: ctx.key,
        result: s.results[ctx.key],
        practice: false
      };
      SE.store.save();
    },
    // 학습을 다음 문항이나 단계로 진행한다.
    advance(skipPractice = false) {
      const s = SE.store.data.session,
        l = this.lesson();
      if (!s || !l) {
        return;
      }
      if (s.stage === 'intro') {
        s.stage = 'keySentences';
        s.index = 0;
      } else if (s.stage === 'grammar') {
        s.stage = 'drill';
        s.index = 0;
      } else if (s.stage === 'block') {
        if (s.index >= this.items().length) {
          s.stage = 'roleplay';
          s.index = 0;
          s.scriptPointer = l.roleplay?.script?.[0]?.turn || 1;
        } else {
          s.stage = 'drill';
        }
      } else if (s.stage === 'keySentences') {
        if (!s.pending) {
          return;
        }
        const ctx = this.current(),
          latest = s.pending.result;
        if (latest.score < 70 && !latest.skipped && !skipPractice && (s.keyAttempts[ctx.key] || 0) < 3) {
          this.retry();
          return;
        }
        s.index++;
        if (s.index >= (l.keySentences || []).length) {
          s.stage = 'grammar';
          s.index = 0;
        }
      } else if (s.stage === 'drill' || s.stage === 'extra') {
        if (!s.pending) {
          return;
        }
        const item = this.items()[s.index];
        if (item?.type === 'I' && s.turn + 1 < (item.turns || []).length) {
          s.turn++;
        } else {
          s.index++;
          s.turn = 0;
          if (s.extra && s.index >= this.items().length) {
            this.archiveExtra();
            return;
          }
          if (!s.extra && [6, 16, 25].includes(s.index)) {
            s.stage = 'block';
            s.blockEnd = s.index;
          }
        }
      } else if (s.stage === 'roleplay') {
        if (!s.pending) {
          return;
        }
        const row = this.current()?.item;
        const next = s.pending.result.score >= 70 ? row?.nextOnMatch : row?.nextOnMiss;
        if (next == null) {
          this.complete();
          return;
        }
        s.scriptPointer = next;
      }
      s.pending = null;
      s.retry = false;
      s.draft = '';
      s.blocks = [];
      s.speechFailures = 0;
      SE.store.save();
    },
    // 레슨을 완료하고 학습 기록을 저장한다.
    complete() {
      const s = SE.store.data.session,
        l = this.lesson();
      if (!s || !l || s.stage === 'result') {
        return;
      }
      for (const k of l.keySentences || []) {
        s.newCards += SE.cards.add(SE.cards.descriptor(k));
      }
      const id = SE.home.courseId(l);
      if (!SE.store.data.completed.includes(id)) {
        SE.store.data.completed.push(id);
      }
      s.stage = 'result';
      s.pending = null;
      s.endedAt = new Date().toISOString();
      SE.store.save();
    },
    // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
    archiveExtra() {
      const s = SE.store.data.session;
      if (s) {
        SE.store.data.sessions.push(s);
      }
      SE.store.data.session = null;
      SE.store.save();
    },
    // 완료한 레슨을 기록으로 옮긴다.
    leaveResult() {
      const s = SE.store.data.session;
      if (s?.stage === 'result') {
        SE.store.data.sessions.push(s);
        SE.store.data.session = null;
        SE.store.save();
      }
    },
    // 복습 대기열과 진행 상태를 만든다.
    startReview(kind = 'review', limit = Infinity) {
      if (SE.store.data.reviewSession) {
        return;
      }
      SE.store.data.reviewSession = {
        ids: SE.cards.queue(kind, limit),
        index: 0,
        kind,
        day: U.day(),
        pending: null,
        mode: SE.speech.supported() ? SE.store.data.settings.defaultInput : 'keyboard',
        draft: ''
      };
      SE.store.save();
    },
    // 현재 복습 카드를 찾는다.
    reviewCard() {
      const r = SE.store.data.reviewSession;
      if (!r) return null;
      let skipped = false;
      while (r.index < r.ids.length) {
        const card = SE.store.data.cards.find(c => c.id === r.ids[r.index] && !c.retired);
        if (card) {
          if (skipped) SE.store.save();
          return card;
        }
        r.index++;
        r.pending = null;
        r.practiceResult = null;
        r.retry = false;
        r.draft = '';
        r.speechFailures = 0;
        skipped = true;
      }
      if (skipped) SE.store.save();
      return null;
    },
    // 복습 응답을 채점하고 일정을 갱신한다.
    reviewSubmit(input, mode = 'keyboard', skipped = false) {
      const r = SE.store.data.reviewSession,
        c = this.reviewCard();
      if (!r || !c || r.pending && !r.retry) {
        return;
      }
      if (r.day !== U.day()) {
        this.finishReview(false);
        U.toast('새 학습일이 시작됐어요 → 오늘 복습을 다시 열어 주세요.');
        return;
      }
      const daily = SE.store.today(),
        limit = c.state.reps ? SE.store.data.settings.reviewsPerDay - daily.reviewsDone : SE.store.data.settings.newCardsPerDay - daily.newCardsDone;
      if (!r.pending && limit <= 0) {
        U.toast('오늘 한도를 채웠어요 → 설정에서 한도를 바꿀 수 있어요.');
        r.index++;
        SE.store.save();
        return;
      }
      const result = skipped ? {
        score: 0,
        verdict: 'again',
        wordStatuses: [],
        skipped: true
      } : SE.score({
        target: c.targetText,
        answers: c.answers,
        keywords: c.keywords,
        input,
        mode,
        allowNearMatch: !c.strict,
        wrongInput: c.wrongInput
      });
      result.input = input;
      result.mode = mode;
      r.speechFailures = mode === 'speech' && result.score < 30 ? (r.speechFailures || 0) + 1 : 0;
      if (r.speechFailures >= 2) {
        r.mode = 'keyboard';
      }
      if (r.pending) {
        r.practiceResult = {
          result,
          practice: true
        };
        r.retry = false;
        r.draft = '';
        SE.store.save();
        return result;
      }
      const prev = U.clone(c.state),
        now = new Date(),
        rating = SE.scheduler.rating(result.verdict, skipped);
      c.state = SE.scheduler.review(prev, rating, now);
      SE.store.today()[prev.reps === 0 ? 'newCardsDone' : 'reviewsDone']++;
      const log = {
        id: U.id(),
        cardId: c.id,
        day: U.day(now),
        at: now.toISOString(),
        prevState: prev,
        rating,
        score: result.score,
        mode,
        corrected: false
      };
      SE.store.data.reviewLogs.push(log);
      r.pending = {
        result,
        logId: log.id
      };
      r.draft = '';
      SE.store.save();
      return result;
    },
    // 사용자가 선택한 복습 평가를 반영한다.
    changeReview(easy = false) {
      const r = SE.store.data.reviewSession,
        c = this.reviewCard(),
        log = SE.store.data.reviewLogs.find(/* 조건에 맞는 항목을 찾는다. */x => x.id === r?.pending?.logId);
      if (!log || !c || r.day !== U.day()) {
        return;
      }
      if (easy && r.pending.result.verdict !== 'correct') {
        return;
      }
      if (!easy && SE.store.data.reviewLogs.some(/* 조건에 맞는 항목이 있는지 확인한다. */x => x.cardId === c.id && x.day === U.day() && x.corrected)) {
        U.toast('이 카드는 오늘 이미 정정했어요.');
        return;
      }
      log.rating = easy ? 4 : 3;
      log.corrected = log.corrected || !easy;
      log.score = easy ? log.score : 100;
      c.state = SE.scheduler.review(log.prevState, log.rating, new Date(log.at));
      if (!easy) {
        r.pending.result = {
          ...r.pending.result,
          score: 100,
          verdict: 'correct',
          userCorrected: true
        };
      }
      r.practiceResult = null;
      r.retry = false;
      SE.store.save();
    },
    // 복습 카드의 연습 시도를 준비한다.
    retryReview() {
      const r = SE.store.data.reviewSession;
      if (!r?.pending) {
        return;
      }
      r.retry = true;
      r.practiceResult = null;
      r.draft = '';
      SE.store.save();
    },
    // 다음 복습 카드로 이동한다.
    nextReview() {
      const r = SE.store.data.reviewSession;
      if (!r?.pending) {
        return;
      }
      r.index++;
      r.pending = null;
      r.draft = '';
      r.retry = false;
      r.practiceResult = null;
      r.speechFailures = 0;
      this.reviewCard();
      SE.store.save();
    },
    // 복습을 마치고 다음 학습 연결을 결정한다.
    finishReview(completed = true) {
      const r = SE.store.data.reviewSession;
      if (!r) {
        return false;
      }
      if (r.kind === 'returnReview') {
        SE.store.today().returnReviewDone = true;
      }
      const lesson = completed && r.kind === 'warmupThenLesson';
      SE.store.data.reviewSession = null;
      SE.store.save();
      return lesson;
    }
  };
})();
