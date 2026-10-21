// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util;
  const params = FSRS.generatorParameters({
    enable_fuzz: false,
    enable_short_term: false,
    request_retention: 0.9,
    maximum_interval: 365
  });
  const engine = FSRS.fsrs(params);
  SE.scheduler = {
    parameters: params,
    // 복습 예정일을 다음 학습일 이후로 보정한다.
    clampDue(due, now) {
      return U.dayStart(new Date(Math.max(new Date(due).getTime(), U.addDay(now).getTime())));
    },
    // 다음 학습일에 복습할 새 카드를 만든다.
    newCard(now = new Date()) {
      const c = FSRS.createEmptyCard(now);
      c.due = U.addDay(now);
      return c;
    },
    // FSRS 결과를 앱의 학습일 규칙에 맞춘다.
    review(card, rating, now = new Date()) {
      const c = {
        ...card,
        due: new Date(card.due)
      };
      if (c.last_review) {
        c.last_review = new Date(c.last_review);
      }
      const result = engine.next(c, new Date(now), rating).card;
      result.due = this.clampDue(result.due, now);
      result.state = FSRS.State.Review;
      return result;
    },
    // 현재 시점의 기억 확률을 구한다.
    retrievability(card, now = new Date()) {
      if (!card.last_review || card.reps === 0) {
        return 1;
      }
      return engine.get_retrievability({
        ...card,
        due: new Date(card.due),
        last_review: new Date(card.last_review)
      }, now, false);
    },
    // 채점 판정을 FSRS 평가로 바꾼다.
    rating(verdict, skipped = false, userEasy = false) {
      return skipped ? 1 : verdict === 'correct' ? userEasy ? 4 : 3 : verdict === 'near' ? 2 : 1;
    }
  };
})();
