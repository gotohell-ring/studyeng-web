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
  // 저장 데이터의 복구 선택지를 표시한다.
  V.recovery = function () {
    return panel(`${header('데이터 보호', '저장 내용을 확인해 주세요', SE.store.problem || '저장 데이터를 읽지 못했어요.')}` +
      `<p>원본을 덮어쓰지 않고 보관했어요. 백업을 내려받거나 기존 백업을 가져올 수 있어요.</p>` +
      `<div class="stack">${button('기존 데이터 백업 다운로드', 'raw-backup', 'primary')}` +
      `<label class="file-button" for="backup-file">백업 가져오기</label>` +
      `<input id="backup-file" class="visually-hidden" type="file" accept=".json,application/json">${button('백업 후 초기화', 'reset', 'danger')}` +
      `${button('저장 없이 체험하기', 'temporary', 'secondary')}</div>` +
      `<p class="small muted">저장 차단이면 브라우저의 사이트 데이터 설정을 확인해 주세요. 저장 없이 체험한 진도는 설정에서 백업해 주세요.</p>`);
  };
})();
