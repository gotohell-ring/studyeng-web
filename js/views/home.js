// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util,
    e = U.esc,
    V = SE.views;
  const {
    button,
    primary,
    say,
    header,
    panel,
    empty,
    tierSelect
  } = V.helpers;
  // 다음 학습과 오늘의 진행 현황을 표시한다.
  V.home = function () {
    const d = SE.store.data,
      p = SE.store.today(),
      streak = SE.store.streak(),
      next = SE.home.next(SE.home.input());
    const s = d.session,
      rs = d.reviewSession;
    const resume = rs ?
      `복습 이어하기 (${Math.min(rs.index + 1, rs.ids.length)}/${rs.ids.length})` :
      s ? `${s.stage === 'drill' || s.stage === 'extra' ? `이어하기 (${Math.min(s.index + 1, SE.learning.items().length)}/${SE.learning.items().length})` : '레슨 이어하기'}` : '이어하기';
    const labels = {
      resume,
      returnReview: `복귀 복습 ${next.count}장`,
      reviewFirst: `복습 먼저 하기 · ${next.count}장`,
      warmupThenLesson: `${next.count}장 워밍업 후 레슨`,
      lesson: '첫 레슨 시작하기',
      review: `오늘 복습 ${next.count}장`,
      extraPractice: '추가 연습하기',
      comingSoon: '지난 레슨 다시 하기'
    };
    return `<section class="welcome">${header('오늘의 작은 한 걸음', '다음 여행엔, 영어로.', '듣고, 말하고, 기억에 남기는 여행 영어.')}</section>
      ` +
      `<section class="hero">` +
      `<div class="hero-top">` +
      `<span class="pill">공항에서 시작하는 여행</span>` +
      `<span aria-hidden="true" class="plane">✈︎</span></div>` +
      `<div class="eyebrow">유닛 1 · 중급</div>` +
      `<h2>체크인부터` +
      `<br>자신 있게.</h2>` +
      `<p>런던행 비행기, 원하는 좌석,` +
      `<br>내 짐을 이야기하는 연습.</p>` +
      `<div class="hero-footer">` +
      `<span>핵심 문장 5개 · 드릴 25개</span>` +
      `<span>약 20~25분</span></div></section>
      ` +
      `<section class="next-step">${next.type === 'comingSoon' ? '<p>다음 레슨은 준비 중이에요. 익숙한 장면을 한 번 더 연습해 볼까요?</p>' : ''}` +
      `${primary(e(labels[next.type] || '학습 시작하기'), 'next-step')}` +
      `${['returnReview', 'reviewFirst'].includes(next.type) && SE.home.nextLesson() ? button('레슨 먼저 하기', 'start-next', 'secondary') : ''}` +
      `<p class="small muted center">진도는 응답할 때마다 이 브라우저에 저장돼요.</p></section>
      ` +
      `<section class="stats" aria-label="오늘 학습">` +
      `<div>` +
      `<strong>${streak.count}` +
      `<small>일</small></strong>` +
      `<span>연속 학습 · 프리즈 ${streak.freezes}개</span></div>` +
      `<div>` +
      `<strong>${p.drillsDone}` +
      `<small>문항</small></strong>` +
      `<span>오늘 드릴</span></div>` +
      `<div>` +
      `<strong>${p.reviewsDone + p.newCardsDone}` +
      `<small>장</small></strong>` +
      `<span>오늘 복습</span></div></section>
      ` +
      `<section class="path-section">` +
      `<div class="section-title">` +
      `<h2>나의 여행 경로</h2>` +
      `<a href="#/course">코스 보기 →</a></div>${V.courseSummary(true)}</section>`;
  };
})();
