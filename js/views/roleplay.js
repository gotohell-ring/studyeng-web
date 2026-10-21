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
  // 대본 대화와 미션 진행을 표시한다.
  V.roleplay = function () {
    const s = SE.store.data.session,
      l = SE.learning.lesson(),
      ctx = SE.learning.current(),
      row = ctx?.item || {};
    return `${header('대본 대화 · ' + (row.turn || 1) + ' / ' + (l?.roleplay?.script || []).length, '공항에서 직접 이야기해요', '상대의 질문을 듣고 내 말로 답해 보세요.')}` +
      `<ul class="missions">${
      (l?.roleplay?.missions || []).map(/* 각 항목을 표시 값으로 바꾼다. */m => `<li class="${s?.missionsDone.includes(m.id) ? 'done' : ''}">${s?.missionsDone.includes(m.id) ? '✓' : '○'} ${e(m.ko)}</li>`).join('')
    }</ul>` +
      `${
      (s?.roleAnswers || []).slice(-1).map(/* 각 항목을 표시 값으로 바꾼다. */r => `<div class="bubble mine small"><small>내가 한 말</small><p lang="en">${e(r.input || '건너뜀')}</p></div>`).join('')
    }` +
      `<div class="prompt bubble">` +
      `<small>체크인 직원</small>` +
      `<h2 lang="en">${e(row.aiLine)}</h2>` +
      `${say(row.aiLine)}</div>` +
      `${
      s?.pending ?
      V.feedback(s.pending, ctx?.answer?.en, false, 'roleplay') :
      V.input({
      mode: s?.mode,
      draft: s?.draft,
      answer: ctx?.answer?.en,
      kind: 'roleplay'
    })
    }`;
  };
})();
