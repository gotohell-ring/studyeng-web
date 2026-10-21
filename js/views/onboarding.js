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
  // 첫 실행 안내와 준비 단계를 표시한다.
  V.onboarding = function () {
    const step = SE.app?.onboardingStep || 0;
    if (step === 0) {
      return panel(`<div class="illustration" aria-hidden="true">✈︎</div>${header('여행 영어에 오신 것을 환영해요', '여행의 순간을, 내 문장으로.', '한 번에 한 문장씩 연습해요. 마이크가 없어도 키보드로 끝까지 학습할 수 있어요.')}` +
        `<div class="feature-list">` +
        `<p>① 듣고 익히는 핵심 문장</p>` +
        `<p>② 일상처럼 이어지는 짧은 대화</p>` +
        `<p>③ 기억할 때 다시 만나는 복습</p></div>` +
        `<div class="actions">${primary('시작하기', 'onboard-next')}</div>`);
    }
    if (step === 1) {
      return panel(`${header('시작 준비 · 1 / 2', '마이크를 확인해 볼까요?', '선택 사항이에요. 인식이 안 되면 키보드로 바꿔 드려요.')}` +
        `<div class="prompt">` +
        `<p lang="en">I'd like a window seat, please.</p>${say("I'd like a window seat, please.")}</div>` +
        `<label for="answer">인식 결과 또는 직접 입력</label>` +
        `<textarea id="answer" lang="en" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="여기에 영어로 입력해 보세요"></textarea>` +
        `<p id="speech-status" aria-live="polite"></p>` +
        `<div class="actions">${button('● 마이크 테스트', 'mic', 'mic')}` +
        `${primary('다음', 'onboard-next')}` +
        `${button('건너뛰기', 'onboard-next', 'text-button')}</div>`);
    }
    return panel(`${header('시작 준비 · 2 / 2', '나에게 맞는 수준', '이번 버전에서는 T2 중급 레슨을 제공해요. 다른 수준은 준비 중이에요.')}` +
      `${tierSelect()}` +
      `<div class="prompt">` +
      `<h2>T2 중급</h2>` +
      `<p>이유와 조건을 붙여 여행 상황을 이야기해요.</p>` +
      `<p class="small muted">학습 기록은 이 브라우저에 저장됩니다. 설정에서 파일로 백업할 수 있어요.</p></div>` +
      `<div class="actions">${primary('여행 영어 시작하기', 'onboard-finish')}</div>`);
  };
})();
