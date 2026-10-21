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
  // 단어별 채점 상태와 아이콘을 표시한다.
  V.resultWords = function (r) {
    const icons = {
        correct: '✓',
        near: '≈',
        wrong: '×',
        missing: '−',
        extra: '⊘'
      },
      labels = {
        correct: '정확',
        near: '비슷함',
        wrong: '다름',
        missing: '빠짐',
        extra: '불필요'
      };
    return `<div class="word-statuses" aria-label="단어별 채점">${
      (r.wordStatuses || []).map(/* 각 항목을 표시 값으로 바꾼다. */w => `<span class="word ${e(w.status)}" title="${e(labels[w.status] || '')}" aria-label="${e(w.word)} ${e(labels[w.status] || '')}">` +
      `<small aria-hidden="true">${icons[w.status] || '·'}</small> ` +
      `${e(w.word)}</span>`).join('')
    }</div>`;
  };
  // 채점 결과와 이어갈 동작을 표시한다.
  V.feedback = function (pending, answer, review = false, kind = 'drill') {
    const r = pending.result || {},
      labels = {
        correct: '정확해요',
        near: '거의 맞았어요',
        again: '다시 연습해요'
      },
      icons = {
        correct: '✓',
        near: '≈',
        again: '↻'
      };
    return `<section class="feedback ${e(r.verdict)}">` +
      `<div class="feedback-heading" role="status">` +
      `<h2>${icons[r.verdict] || '↻'} ` +
      `${e(labels[r.verdict] || '다시 연습해요')}</h2>` +
      `<span>${r.score || 0}점</span></div>` +
      `${pending.practice ? '<p class="small">연습 결과예요. 기록은 첫 유효 시도 점수를 유지해요.</p>' : ''}` +
      `<p class="small muted">${r.mode === 'speech' ? '인식 정확도예요. 발음 자체를 평가하지 않아요.' : '허용 답안과 단어를 비교한 결과예요.'}</p>` +
      `${V.resultWords(r)}` +
      `<p class="answer-label">모범 답안</p>` +
      `<p class="answer-text" lang="en">${e(answer)}</p>` +
      `${say(answer, '▷ 정답 듣기')}` +
      `${r.input ? `<details><summary>내가 한 답</summary><p lang="en">${e(r.input)}</p></details>` : ''}</section>
      ` +
      `<p class="word-legend muted" aria-label="단어 표시 범례">✓ 정확 · ` +
      `<span class="legend-missing">− 빠짐</span> · ` +
      `<span class="legend-extra">⊘ 불필요</span> · ≈ 비슷함 · × 다름</p>
      ` +
      `<div class="actions">${
        review ?
        primary('다음 카드', 'review-next') :
        primary(kind === 'key' && r.score < 70 && !r.skipped && (SE.store.data.session?.keyAttempts[pending.key] || 0) < 3 ? '한 번 더 연습하기' : '다음', 'advance')
      }` +
      `${!review && kind !== 'roleplay' ? button('다시 해보기', 'retry', 'secondary') : ''}` +
      `${review ? button('다시 해보기', 'review-retry', 'secondary') : ''}` +
      `${!review && kind === 'drill' && SE.normalize(r.input).length ? button('내 답도 맞아요', 'accept', 'text-button') : ''}` +
      `${review && SE.store.data.reviewSession?.pending?.result?.verdict === 'correct' ? button('쉬웠어요', 'easy', 'secondary') : ''}` +
      `${review ? button('내가 맞았어요', 'correct-review', 'text-button') : ''}` +
      `${button('건너뛰기', review ? 'review-next' : 'skip-feedback', 'text-button')}</div>`;
  };
  // 입력 방식과 답안 입력창 및 보조 버튼을 표시한다.
  V.input = function (options = {}) {
    const {
      mode = 'keyboard',
      draft = '',
      blocks = null,
      selected = [],
      answer = '',
      kind = 'drill',
      retry = false
    } = options;
    return `${retry ? '<p class="notice">다시 연습 중이에요. 첫 시도 기록은 유지돼요.</p>' : ''}` +
      `${
      blocks ?
      `<div class="block-answer" aria-live="polite">${selected.length ? selected.map(/* 각 항목을 표시 값으로 바꾼다. */i => e(blocks[i] || '')).join(' ') : '<span class="muted">아래 블록을 순서대로 눌러 주세요</span>'}</div>` +
      `<div class="blocks">${blocks.map(/* 각 항목을 표시 값으로 바꾼다. */(b, i) => button(e(b), 'block', 'block', `data-index="${i}" ${selected.includes(i) ? 'disabled' : ''}`)).join('')}</div>` +
      `${button('한 칸 되돌리기', 'undo-block', 'text-button')}` :
      `<div class="input-modes" aria-label="입력 방식">${button('● 말하기', 'mode-speech', mode === 'speech' ? 'selected' : '')}` +
      `${button('⌨ 키보드', 'mode-keyboard', mode === 'keyboard' ? 'selected' : '')}</div>` +
      `<label class="small" for="answer">${mode === 'speech' ? '말하거나 직접 수정해 주세요' : '영어로 답해 주세요'}</label>` +
      `<textarea id="answer" lang="en" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" placeholder="여기에 영어로 입력하세요">${e(draft)}</textarea>` +
      `<p id="speech-status" class="speech-status small" aria-live="polite">${mode === 'speech' ? '마이크를 누르고 말해 주세요. 최대 15초 동안 들어요.' : ''}</p>`
    }` +
      `<div class="actions">${!blocks && mode === 'speech' ? button('● 말하기 시작', 'mic', 'mic') : ''}` +
      `${primary('확인하기', kind === 'review' ? 'review-submit' : 'submit')}` +
      `<div class="utility-actions">${button('힌트 · 첫 단어', 'hint', 'text-button', `data-word="${e((answer || '').split(/\s+/)[0])}"`)}` +
      `${say(answer, '▷ 정답 듣기')}` +
      `${button('건너뛰기', kind === 'review' ? 'review-skip' : 'skip', 'text-button')}</div>` +
      `<p id="hint" class="small muted" aria-live="polite"></p></div>`;
  };
})();
