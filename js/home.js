// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util;
  SE.home = {
    // 우선순위에 따라 다음 학습 단계를 고른다.
    next(i) {
      const gap = i.lastStudyDay ? U.dayDiff(U.day(i.now), i.lastStudyDay) : 0;
      const overdue = i.oldestDueDay ? U.dayDiff(U.day(i.now), i.oldestDueDay) : 0;
      const returnDue = Math.min(i.reviewDue, Math.max(0, i.reviewsRemainingToday));
      const effective = returnDue + Math.min(i.newDue, Math.max(0, i.newRemainingToday));
      // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
      const step = (type, count = 0) => ({
        type,
        count
      });
      if (i.interruptedSession) {
        return step('resume');
      }
      if (gap >= 2 && returnDue > 0 && !i.returnReviewDoneToday) {
        return step('returnReview', Math.min(15, returnDue));
      }
      if (effective > 0 && (i.reviewDue + i.newDue >= 25 || overdue >= 2) && !(gap >= 2 && i.returnReviewDoneToday)) {
        return step('reviewFirst', effective);
      }
      if (effective > 0 && i.hasNextLesson) {
        return step('warmupThenLesson', Math.min(8, effective));
      }
      if (!effective && i.hasNextLesson) {
        return step('lesson');
      }
      if (!i.hasNextLesson && effective > 0) {
        return step('review', effective);
      }
      if (!i.hasNextLesson && !effective && i.aiAvailable) {
        return step('freeTalk');
      }
      if (!i.hasNextLesson && !effective && !i.aiAvailable && i.hasExtraPractice) {
        return step('extraPractice');
      }
      return step('comingSoon');
    },
    // 현재 수준의 레슨을 순서대로 찾는다.
    lessons() {
      return Object.values(SE.content.lessons || {}).sort(/* 기준 순서로 정렬한다. */(a, b) => a.unit - b.unit || a.lesson - b.lesson).filter(/* 조건에 맞는 항목만 남긴다. */l => l.tier === SE.store.data.settings.tier);
    },
    // 레슨의 코스 식별자를 구한다.
    courseId(l) {
      return l.id.replace(/-t\d+$/, '');
    },
    // 아직 완료하지 않은 레슨을 찾는다.
    nextLesson() {
      return this.lessons().find(/* 조건에 맞는 항목을 찾는다. */l => !SE.store.data.completed.includes(this.courseId(l)));
    },
    // 남은 추가 연습이 있는 레슨을 찾는다.
    extraLesson() {
      return this.lessons().find(/* 조건에 맞는 항목을 찾는다. */l => SE.store.data.completed.includes(this.courseId(l)) &&
        (l.extraDrills || []).some(/* 조건에 맞는 항목이 있는지 확인한다. */d => !SE.store.data.sessions.some(/* 조건에 맞는 항목이 있는지 확인한다. */s => s.lessonId === l.id && !!s.results[d.id])));
    },
    // 홈 규칙에 필요한 학습 현황을 모은다.
    input(now = new Date()) {
      const d = SE.store.data,
        today = U.day(now),
        daily = SE.store.today(now),
        due = SE.cards.due(now),
        reviews = due.filter(/* 조건에 맞는 항목만 남긴다. */c => c.state.reps > 0);
      // Read named fields: serialized property order is never semantic.
      const past = Object.keys(d.dailyProgress).filter(/* 조건에 맞는 항목만 남긴다. */k => {
        const p = d.dailyProgress[k];
        return k < today && p.drillsDone + p.reviewsDone + p.newCardsDone >= 1;
      }).sort();
      return {
        now,
        interruptedSession: d.reviewSession || d.session,
        lastStudyDay: past.at(-1) || null,
        reviewDue: reviews.length,
        newDue: due.length - reviews.length,
        oldestDueDay: reviews.length ? U.day(reviews.reduce(/* 항목별 값을 모은다. */(a, c) => new Date(a.state.due) < new Date(c.state.due) ? a : c).state.due) : null,
        reviewsRemainingToday: Math.max(0, d.settings.reviewsPerDay - daily.reviewsDone),
        newRemainingToday: Math.max(0, d.settings.newCardsPerDay - daily.newCardsDone),
        hasNextLesson: !!this.nextLesson(),
        returnReviewDoneToday: daily.returnReviewDone,
        aiAvailable: false,
        hasExtraPractice: !!this.extraLesson()
      };
    }
  };
})();
