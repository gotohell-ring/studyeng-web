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
  // 현재 레슨을 조회하거나 화면에 표시한다.
  V.lesson = function () {
    const s = SE.store.data.session,
      l = SE.learning.lesson();
    if (!s || !l) {
      return empty('레슨을 찾을 수 없어요', '홈에서 학습할 레슨을 골라 주세요.');
    }
    let content = '';
    if (s.stage === 'intro') {
      content = `${header('첫 번째 장면', l.titleKo, l.intro?.situationKo || '대화를 듣고 연습해요.')}` +
        `${V.helpers.dialogue(l.intro?.dialogue, '직원')}` +
        `<div class="actions">${primary('핵심 문장 연습하기', 'advance')}` +
        `${button('건너뛰기', 'advance', 'text-button')}</div>`;
    } else if (s.stage === 'grammar') {
      content = `${header('문법 한 가지', l.grammar?.titleKo || '표현을 알아봐요')}` +
        `<div class="grammar-body">${(l.grammar?.bodyKo || []).map(/* 각 항목을 표시 값으로 바꾼다. */x => `<p>${e(x)}</p>`).join('')}</div>` +
        `${V.helpers.sayAll((l.grammar?.examples || []).map((x, i) => ({ i, t: x.en, s: 'example' })).filter(x => x.t), '▶ 예문 모두 듣기')}` +
        `${
        (l.grammar?.examples || []).map(/* 각 항목을 표시 값으로 바꾼다. */(x, i) => `<div class="example" data-line="${i}"><p lang="en">${e(x.en)}</p><p class="muted">${e(x.ko)}</p>${say(x.en)}</div>`).join('')
      }` +
        `<div class="actions">${primary('드릴 시작하기 · 25문항', 'advance')}` +
        `${button('건너뛰기', 'advance', 'text-button')}</div>`;
    } else if (s.stage === 'block') {
      const end = s.blockEnd || s.index,
        start = end === 6 ? 0 : end === 16 ? 6 : 16;
      const results = SE.learning.items().slice(start, end).map(/* 각 항목을 표시 값으로 바꾼다. */d => SE.learning.aggregate(d)).filter(Boolean);
      const avg = results.length ? Math.round(results.reduce(/* 항목별 값을 모은다. */(a, r) => a + r.score, 0) / results.length) : 0;
      content = `<div class="completion-mark" aria-hidden="true">✓</div>${header('잠깐, 잘하고 있어요', end === 6 ? '듣기·말하기 완료' : end === 16 ? '대화 연습 완료' : '문법 연습 완료', `${results.length}문항 · 첫 시도 평균 ${avg}점`)}` +
        `<p>숨 한 번 고르고 다음 장면으로 가 볼까요?</p>` +
        `<div class="actions">${primary(end === 25 ? '대본 대화 시작하기' : '다음 블록으로', 'advance')}</div>`;
    } else if (s.stage === 'result') {
      content = V.result();
    } else if (s.stage === 'roleplay') {
      content = V.roleplay();
    } else {
      const ctx = SE.learning.current();
      content = ctx ? V.drill(ctx) : `${header('학습 내용이 없어요', '다음 단계로 이동해 주세요.')}<div class="actions">${primary('레슨 마치기', 'finish-lesson')}</div>`;
    }
    const order = ['intro', 'keySentences', 'grammar', 'drill', 'roleplay', 'result'];
    let progress = order.indexOf(s.stage);
    if (s.stage === 'block') {
      progress = 3;
    }
    if (s.extra) {
      progress = 3;
    }
    return `<div class="lesson-top">` +
      `<span>${e(l.titleKo)}` +
      `${s.extra ? ' · 추가 연습' : ''}</span>` +
      `${button('닫기 ×', 'close', 'icon-button', 'aria-label="레슨 닫기"')}</div>` +
      `<div class="progress-track" role="progressbar" aria-label="레슨 진행" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${progress + 1}">` +
      `<span style="width:${(progress + 1) / 6 * 100}%"></span></div>` +
      `<section class="panel task">${content}</section>` +
      `<p class="shortcuts">Enter 확인·다음 · Esc 닫기 · Ctrl+Space 말하기 · Ctrl+Enter 건너뛰기</p>`;
  };
})();
