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
  // FSRS 결과를 앱의 학습일 규칙에 맞춘다.
  V.review = function () {
    const r = SE.store.data.reviewSession,
      c = SE.learning.reviewCard();
    if (!r) {
      const due = SE.cards.due(),
        queue = SE.cards.queue(),
        p = SE.store.today();
      return panel(`${
        header('기억을 이어가는 시간', queue.length ? `오늘 복습 ${queue.length}장` : due.length ? '오늘 한도를 채웠어요' : '오늘 복습 끝!', queue.length ? '기억이 흐려지기 전에 한 번 더 만나 보세요.' : due.length ? '설정에서 하루 한도를 바꾸거나 내일 다시 만나요.' : '새 카드는 다음 학습일 오전 4시부터 만나요.')
      }` +
        `<div class="stats">` +
        `<div>` +
        `<strong>${e(p.newCardsDone)} / ` +
        `${e(SE.store.data.settings.newCardsPerDay)}</strong>` +
        `<span>오늘 새 카드</span></div>` +
        `<div>` +
        `<strong>${e(p.reviewsDone)} / ` +
        `${e(SE.store.data.settings.reviewsPerDay)}</strong>` +
        `<span>오늘 복습 카드</span></div></div>` +
        `<div class="actions">${queue.length ? primary('복습 시작하기', 'review-start') : primary(SE.home.nextLesson() ? '레슨 시작하기' : '지난 레슨 다시 하기', 'start-next')}` +
        `${button('한도 설정', 'settings', 'text-button')}</div>`);
    }
    if (!c || r.index >= r.ids.length) {
      return panel(`${header('복습 완료', '기억에 한 번 더 남겼어요.', `${r.index}장을 연습했어요.`)}` +
        `<div class="actions">${primary(r.kind === 'warmupThenLesson' ? '이제 레슨 시작하기' : '복습 마치기', 'review-finish')}</div>`);
    }
    const label = {
      koToEn: '우리말을 영어로',
      response: '상대에게 답해요',
      correction: '문장을 고쳐요'
    };
    return `<div class="lesson-top">` +
      `<span>복습 ${e(r.index + 1)} / ` +
      `${e(r.ids.length)}</span>` +
      `<span class="top-actions">${button('저장', 'save-now', 'icon-button', 'aria-label="지금까지 기록 저장"')}${button('닫기 ×', 'review-close', 'icon-button')}</span></div>` +
      `<section class="panel task">${header(r.kind === 'returnReview' ? '쉬었던 만큼 중요한 카드만' : `기억 연습 · ${label[c.cardType] || '영어로 답해요'}`, c.frontText, c.frontHintKo || '')}` +
      `${c.frontAudioText ? say(c.frontAudioText, '▷ 앞면 읽어주기') : ''}` +
      `${
      r.pending && !r.retry ?
      V.feedback(r.practiceResult || r.pending, c.targetText, true) :
      V.input({
      mode: r.mode,
      draft: r.draft,
      answer: c.targetText,
      kind: 'review',
      retry: r.retry,
      peek: `${c.frontText}${c.frontHintKo ? ` · ${c.frontHintKo}` : ''}`
    })
    }</section>` +
      `<p class="shortcuts">Enter 확인·다음 · Esc 닫기 · Ctrl+Space 말하기 · Ctrl+Enter 건너뛰기</p>`;
  };
})();
