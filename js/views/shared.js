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
  // 여러 문장을 순서대로 읽는 "전체 듣기" 버튼. items = [{ i: 줄 번호, t: 영어 문장, s: 화자 }]
  const sayAll = (items, label = '▶ 전체 대화 듣기') => items.length ?
    `<div class="dialogue-tools">${button(label, 'say-all', 'secondary play-all', `data-label="${e(label)}" data-lines="${e(JSON.stringify(items))}"`)}</div>` : '';
  // 대화 말풍선 묶음: 위에 전체 듣기, 줄마다 개별 듣기. lines = [{ speaker, en, ko, blank }]
  const dialogue = (lines, otherName = '상대') => {
    const list = lines || [];
    const items = list.map((l, i) => ({ i, t: l.en, s: l.speaker })).filter(x => !list[x.i].blank && x.t);
    return `${sayAll(items)}<div class="dialogue">${list.map((l, i) => `<div class="bubble ${l.speaker === 'learner' ? 'mine' : ''}" data-line="${i}">` +
      `<small>${l.speaker === 'learner' ? '나' : e(otherName)}</small>` +
      `<p lang="en">${l.blank ? '내 대사 · · ·' : e(l.en)}</p>` +
      `${l.ko && !l.blank ? `<p class="small muted">${e(l.ko)}</p>` : ''}` +
      `${l.blank || !l.en ? '' : say(l.en)}</div>`).join('')}</div>`;
  };
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
    sayAll,
    dialogue,
    header,
    panel,
    empty,
    tierSelect
  };
})();
