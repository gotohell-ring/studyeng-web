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
  // 튜터 기능과 대본 연습 경로를 안내한다.
  V.tutor = function () {
    return panel(`<div class="illustration" aria-hidden="true">✧</div>${header('튜터', '대화가 시작될 곳', 'AI 대화는 iPhone 앱에서 제공됩니다. 웹에서는 대본으로 여행 대화를 연습할 수 있어요.')}` +
      `<div class="actions">${primary('체크인 대화 연습하기', 'start-next')}</div>`);
  };
})();
