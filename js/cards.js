// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util,
    norm = // 비교할 문장을 정규화한다.
    s => SE.normalize(s).join(' ');
  // 정규화된 답안의 중복을 제거한다.
  const union = (a, b) => {
    const seen = new Set();
    return [...a, ...b].filter(/* 조건에 맞는 항목만 남긴다. */x => {
      const k = norm(x);
      if (!k || seen.has(k)) {
        return false;
      }
      seen.add(k);
      return true;
    });
  };
  SE.cards = {
    // 문항을 복습 카드 정보로 바꾼다.
    descriptor(item) {
      const t = item.type || 'B';
      if (t === 'G') {
        return null;
      }
      const first = (item.turns || [])[0] || {};
      const blank = (item.dialogue || []).findIndex(/* 조건에 맞는 항목의 위치를 찾는다. */x => x.blank);
      const previous = (item.dialogue || [])[Math.max(0, blank - 1)] || {};
      const type = ['C', 'E', 'I'].includes(t) ? 'response' : ['F', 'H'].includes(t) ? 'correction' : 'koToEn';
      let front = item.ko || '',
        hint = '',
        audio = '';
      if (t === 'C') {
        front = previous.en || '';
        hint = '빈칸에 들어갈 내 대사를 말해 보세요';
        audio = front;
      }
      if (t === 'D') {
        front = item.pattern || '';
        hint = item.slotKo || '';
      }
      if (t === 'E' || t === 'I') {
        front = (t === 'I' ? first : item).promptEn || '';
        hint = item.promptKo || '';
        audio = front;
      }
      if (t === 'F') {
        front = item.sourceEn || '';
        hint = item.instructionKo || '';
      }
      if (t === 'H') {
        front = item.wrongEn || '';
        hint = '틀린 곳을 고쳐 말해 보세요';
      }
      const answer = t === 'I' ? first : item;
      return {
        sentenceId: item.id,
        cardType: type,
        targetText: answer.en || '',
        answers: answer.answers || [],
        keywords: answer.keywords || [],
        frontText: front,
        frontHintKo: hint,
        frontAudioText: audio,
        strict: ['D', 'F', 'H'].includes(t),
        wrongInput: t === 'F' ? item.sourceEn : t === 'H' ? item.wrongEn : null
      };
    },
    // 중복을 확인하고 복습 카드를 추가한다.
    add(desc, now = new Date()) {
      if (!desc || !norm(desc.targetText)) {
        return 0;
      }
      const data = SE.store.data;
      if (Object.values(SE.content.lessons || {}).some(/* 조건에 맞는 항목이 있는지 확인한다. */l => (l.retired || []).includes(desc.sentenceId))) {
        return 0;
      }
      const id = desc.sentenceId + '#' + desc.cardType;
      const old = data.cards.find(/* 조건에 맞는 항목을 찾는다. */c => c.id === id);
      if (old && old.retiredReason === 'content') {
        return 0;
      }
      const same = data.cards.find(/* 조건에 맞는 항목을 찾는다. */c => !c.retired && c.cardType === desc.cardType && norm(c.targetText) === norm(desc.targetText) && (
        c.cardType === 'koToEn' || norm(c.frontText) === norm(desc.frontText)));
      if (same) {
        same.sources = [...new Set([...same.sources, desc.sentenceId])];
        same.answers = union(same.answers, [desc.targetText, ...desc.answers]).filter(/* 조건에 맞는 항목만 남긴다. */a => norm(a) !== norm(same.targetText));
        same.keywords = union(same.keywords, desc.keywords);
        same.strict = same.strict || desc.strict;
        return 0;
      }
      const card = {
        ...desc,
        id,
        sources: [desc.sentenceId],
        retired: false,
        retiredReason: null,
        createdAt: now.toISOString(),
        state: SE.scheduler.newCard(now)
      };
      if (old) {
        Object.assign(old, card);
      } else {
        data.cards.push(card);
      }
      return 1;
    },
    // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
    fromDrill(item, result, now = new Date()) {
      return item && !item.recycledFrom && (result.skipped || result.score < 70) ? this.add(this.descriptor(item), now) : 0;
    },
    // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
    fromRoleplay(lesson, row, result, now = new Date()) {
      if (result.score >= 70) {
        return 0;
      }
      const i = result.matchedCandidateIndex || 0,
        expected = row.expected || [];
      return this.add({
        sentenceId: lesson.id + '-s' + row.turn + 'e' + i,
        cardType: 'response',
        targetText: expected[i] || '',
        answers: expected.filter(/* 조건에 맞는 항목만 남긴다. */(_, j) => j !== i),
        keywords: [],
        frontText: row.aiLine || '',
        frontHintKo: '',
        frontAudioText: row.aiLine || '',
        strict: false,
        wrongInput: null
      }, now);
    },
    // 학습자가 수락한 답안을 기록한다.
    accept(item, judgeKey, input, result) {
      const source = item.id;
      const firstTurn = !judgeKey.match(/-t[2-9]\d*$/);
      SE.store.data.overrides[judgeKey + '::' + norm(input)] = {
        input,
        judgedBy: 'user',
        at: new Date().toISOString()
      };
      SE.store.data.cards.filter(/* 조건에 맞는 항목만 남긴다. */c => !c.retired && c.sources.includes(source)).forEach(/* 각 항목을 처리한다. */c => {
        if (c.state.reps > 0) {
          if (firstTurn) {
            c.answers = union(c.answers, [input]).filter(/* 조건에 맞는 항목만 남긴다. */a => norm(a) !== norm(c.targetText));
          }
        } else if (result.score >= 70) {
          c.sources = c.sources.filter(/* 조건에 맞는 항목만 남긴다. */id => id !== source);
          if (!c.sources.length) {
            c.retired = true;
            c.retiredReason = 'override';
          }
        }
      });
    },
    // 현재 학습일에 복습할 카드를 구한다.
    due(now = new Date()) {
      return SE.store.data.cards.filter(/* 조건에 맞는 항목만 남긴다. */c => !c.retired && new Date(c.state.due) <= now);
    },
    // 하루 한도에 맞는 복습 대기열을 구한다.
    queue(kind = 'review', limit = Infinity, now = new Date()) {
      const day = SE.store.today(now),
        settings = SE.store.data.settings;
      let reviews = this.due(now).filter(/* 조건에 맞는 항목만 남긴다. */c => c.state.reps > 0),
        fresh = this.due(now).filter(/* 조건에 맞는 항목만 남긴다. */c => c.state.reps === 0);
      if (kind === 'returnReview') {
        reviews.sort(/* 기준 순서로 정렬한다. */(a, b) => SE.scheduler.retrievability(a.state, now) - SE.scheduler.retrievability(b.state, now));
        fresh = [];
      } else {
        reviews.sort(/* 기준 순서로 정렬한다. */(a, b) => new Date(a.state.due) - new Date(b.state.due) || a.id.localeCompare(b.id));
      }
      fresh.sort(/* 기준 순서로 정렬한다. */(a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      return [...reviews.slice(0, Math.max(0, settings.reviewsPerDay - day.reviewsDone)), ...fresh.slice(0, Math.max(0, settings.newCardsPerDay - day.newCardsDone))].slice(0, limit).map(/* 각 항목을 표시 값으로 바꾼다. */c => c.id);
    }
  };
})();
