// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE,
    U = SE.util,
    e = U.esc,
    V = SE.views;
  // 동작이 연결된 버튼을 만든다.
  const button = (label, action, cls = '', attrs = '') => `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
  // 화면의 주 동작 버튼을 만든다.
  const primary = (label, action, attrs = '') => button(label, action, 'primary', `data-primary ${attrs}`);
  // 설정한 영어 음성으로 문장을 읽는다.
  const say = (text, label = '▷ 듣기') => button(label, 'say', 'text-button', `data-text="${e(text)}"`);
  // 화면의 제목과 설명을 만든다.
  const header = (eyebrow, title, description = '') => `<div class="eyebrow">${e(eyebrow)}</div><h1 tabindex="-1">${e(title)}</h1>${description ? `<p class="muted">${e(description)}</p>` : ''}`;
  // 내용을 기본 카드로 감싼다.
  const panel = content => `<section class="panel">${content}</section>`;
  // 빈 상태와 홈 이동 버튼을 표시한다.
  const empty = (title, body) => panel(`${header('여행 영어', title, body)}<div class="actions">${primary('홈으로', 'home')}</div>`);
  // 학습 수준 선택 버튼을 표시한다.
  const tierSelect = () => `<div class="tiers" aria-label="학습 수준">${button('T1 초급 · 준비 중', 'unavailable')}` +
    `${button('T2 중급 ✓', 'tier', 'selected')}` +
    `${button('T3 고급 · 준비 중', 'unavailable')}</div>`;
  V.helpers = {
    button,
    primary,
    say,
    header,
    panel,
    empty,
    tierSelect
  };
})();
