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
  // 입력 설정과 백업 및 진단을 표시한다.
  V.settings = function () {
    const s = SE.store.data.settings;
    return `${header('나에게 맞게', '설정')}` +
      `<section class="panel settings-panel">` +
      `<label for="input-mode">기본 입력 방식</label>` +
      `<select id="input-mode" data-setting="defaultInput">` +
      `<option value="speech" ${s.defaultInput === 'speech' ? 'selected' : ''}>말하기</option>` +
      `<option value="keyboard" ${s.defaultInput === 'keyboard' ? 'selected' : ''}>키보드</option></select>` +
      `<label for="speech-rate">말하기 속도</label>` +
      `<select id="speech-rate" data-setting="speechRate">${
      [[0.65, '천천히'], [0.85, '보통'], [1, '빠르게']].map(/* 각 항목을 표시 값으로 바꾼다. */([v, l]) => `<option value="${v}" ${s.speechRate === v ? 'selected' : ''}>${l}</option>`).join('')
    }</select>` +
      `<label class="check-row">` +
      `<input type="checkbox" data-setting="autoPlayAudio" ${s.autoPlayAudio ? 'checked' : ''}> 문장 자동 재생</label>` +
      `<div class="two-columns">` +
      `<div>` +
      `<label for="new-limit">하루 새 카드 (1~30)</label>` +
      `<input type="number" id="new-limit" min="1" max="30" data-setting="newCardsPerDay" value="${s.newCardsPerDay}"></div>` +
      `<div>` +
      `<label for="review-limit">하루 복습 (10~200)</label>` +
      `<input type="number" id="review-limit" min="10" max="200" data-setting="reviewsPerDay" value="${s.reviewsPerDay}"></div></div>` +
      `<p class="small muted">마이크가 작동하지 않으면 키보드로 자동 전환돼요. 브라우저 인식기는 네트워크 연결을 요구할 수 있어요.</p></section>` +
      `<section class="panel">` +
      `<h2>내 학습 기록</h2>` +
      `<p>브라우저 데이터를 지우기 전에 백업해 주세요. 파일 직접 실행과 시작 도우미는 저장 공간이 서로 달라요.</p>` +
      `<div class="stack">${button('파일에 저장 · iCloud Drive', 'share-backup', 'secondary')}${button('백업 내려받기', 'backup', 'secondary')}` +
      `<label class="file-button" for="backup-file">백업 가져오기 · 전체 교체</label>` +
      `<input class="visually-hidden" type="file" id="backup-file" accept=".json,application/json">${button('진도 초기화', 'reset', 'danger')}</div></section>` +
      `<section class="panel">` +
      `<div class="section-title">` +
      `<h2>진단</h2>${button('진단 복사', 'diagnostics', 'text-button')}</div>` +
      `<p class="small">음성 인식: ${SE.speech.supported() ? '지원' : '지원 안 됨'} · 읽어주기: ` +
      `${SE.speech.synthesisSupported() ? '지원' : '지원 안 됨'}</p>` +
      `<p class="small">영어 음성: ${(() => {
        const names = SE.speech.englishVoiceNames ? SE.speech.englishVoiceNames() : [];
        return names.length ? e(names.join(', ')) : '없음 → Windows 설정 > 시간 및 언어 > 음성 > 음성 추가에서 English (United States) 설치 후 브라우저 재시작';
      })()}</p>` +
      `${button('▷ 영어 음성 테스트', 'say', 'text-button', 'data-text="Hello! Your English voice is working."')}` +
      `<p class="small">AI 대화: iPhone 앱에서 제공</p>` +
      `<p class="small">콘텐츠: ${Object.keys(SE.content.lessons || {}).length}개 레슨 · 검증된 샘플</p>` +
      `<p class="small">저장 상태: ${SE.store.blocked ? '복구 대기' : SE.store.writeFailed ? '저장 실패 · 백업 필요' : '사용 가능'}</p>` +
      `<p class="small browser-info">${e(navigator.userAgent || '브라우저 정보 없음')}</p>` +
      `<h3>최근 오류 (최대 50건)</h3>` +
      `<pre class="error-list">${e(JSON.stringify(SE.store.data.errors.slice(-50), null, 2))}</pre></section>`;
  };
})();
