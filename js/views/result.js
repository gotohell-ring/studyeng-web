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
  // 레슨 완료 결과와 대화 피드백을 표시한다.
  V.result = function () {
    const s = SE.store.data.session,
      l = SE.learning.lesson(),
      streak = SE.store.streak();
    if (!s || !l) {
      return empty('학습을 마쳤어요', '홈에서 다음 학습을 시작해 주세요.');
    }
    const rows = Object.entries(s.results).filter(/* 조건에 맞는 항목만 남긴다. */([key]) => /-(d|x)\d+$/.test(key));
    const avg = rows.length ? Math.round(rows.reduce(/* 항목별 값을 모은다. */(sum, [, r]) => sum + r.score, 0) / rows.length) : 0;
    return `<div class="completion-mark" aria-hidden="true">✓</div>${header('오늘도 한 걸음', '레슨을 마쳤어요!', l.titleKo)}` +
      `<div class="stats">` +
      `<div>` +
      `<strong>${s.newCards}</strong>` +
      `<span>새 복습 카드</span></div>` +
      `<div>` +
      `<strong>${streak.count}` +
      `<small>일</small></strong>` +
      `<span>연속 학습</span></div>` +
      `<div>` +
      `<strong>${avg}` +
      `<small>점</small></strong>` +
      `<span>드릴 첫 시도 평균</span></div></div>` +
      `<p class="notice">새 카드는 다음 학습일 오전 4시부터 복습해요.</p>` +
      `<h2>대화 돌아보기</h2>` +
      `<p class="small muted">대본의 모범 답안과 비교했어요. 70점 미만인 답은 복습 카드로 준비했어요.</p>` +
      `<ul class="missions">${(l.roleplay?.missions || []).map(/* 각 항목을 표시 값으로 바꾼다. */m => `<li>${s.missionsDone.includes(m.id) ? '✓' : '○'} ${e(m.ko)}</li>`).join('')}</ul>` +
      `<div class="fallback-feedback">${
      (s.roleAnswers || []).map(/* 각 항목을 표시 값으로 바꾼다. */r => {
      const row = l.roleplay?.script?.find(
      // 콜백에서 필요한 값을 계산하거나 상태를 갱신한다.
      x => x.turn === r.turn);
      return `<details>` +
        `<summary>${r.turn}번째 대화 · ` +
        `${r.result?.score || 0}점 ` +
        `${r.result?.score < 70 ? '· 다시 연습' : '· 잘했어요'}</summary>` +
        `<p lang="en">${e(r.input || '건너뜀')}</p>` +
        `<p class="muted">모범 답안</p>` +
        `<p lang="en">${e(row?.expected?.[r.result?.matchedCandidateIndex || 0] || '')}</p>` +
        `${say(row?.expected?.[r.result?.matchedCandidateIndex || 0])}</details>`;
    }).join('')
    }</div>` +
      `<div class="actions">${primary('홈으로', 'result-home')}` +
      `${button('추가 연습 · 15문항', 'extra', 'secondary')}` +
      `${button('백업 내보내기', 'backup', 'text-button')}</div>`;
  };
})();
