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
  // 드릴 문항을 화면에 표시한다.
  V.drill = function (ctx) {
    const s = SE.store.data.session,
      d = ctx?.item || {},
      a = ctx?.answer || {},
      kind = ctx?.kind || 'drill';
    const titles = {
      A: s?.mode === 'keyboard' ? '듣고 받아쓰기' : '듣고 따라 말하기',
      B: '우리말을 영어로',
      C: '내 대사를 채워 보세요',
      D: '표현을 바꿔 말해요',
      E: '자연스럽게 답해요',
      F: '문장을 바꿔 보세요',
      G: '블록을 순서대로',
      H: '틀린 곳을 고쳐 보세요',
      I: '짧은 대화를 이어가요'
    };
    let prompt = '';
    let peek = '';
    if (kind === 'key') {
      prompt = `<h2 lang="en">${e(a.en)}</h2><p>${e(a.ko)}</p>${say(a.en)}`;
      peek = `${a.en} · ${a.ko}`;
    } else {
      switch (d.type) {
        case 'A':
          prompt = `<div class="audio-orb" aria-hidden="true">♪</div>${say(a.en, '▷ 문장 듣기')}` +
            `<p>${e(d.ko)}</p>` +
            `${s?.mode === 'speech' ? `<p lang="en">${e(a.en)}</p>` : '<p class="small muted">들은 문장을 영어로 적어 보세요.</p>'}`;
          peek = s?.mode === 'speech' ? `${a.en} · ${d.ko}` : `받아쓰기 · ${d.ko}`;
          break;
        case 'B':
          prompt = `<h2>${e(d.ko)}</h2>`;
          peek = d.ko;
          break;
        case 'C': {
          prompt = V.helpers.dialogue(d.dialogue, '상대');
          const lines = d.dialogue || [], b = lines.findIndex(l => l.blank), before = b > 0 ? lines[b - 1] : null;
          peek = before ? `상대: ${before.en}${before.ko ? ` (${before.ko})` : ''} → 내 대사` : '빈칸에 들어갈 내 대사';
        }
          break;
        case 'D':
          prompt = `<h2 lang="en">${e(d.pattern)}</h2><p>${e(d.slotKo)}</p><p class="muted" lang="en">${e(d.slotEn)}</p>`;
          peek = `${d.pattern} + ${d.slotKo} (${d.slotEn})`;
          break;
        case 'E':
        case 'I':
          prompt = `<div class="bubble">` +
            `<small>상대${d.type === 'I' ? ` · ${s?.turn + 1} / ${(d.turns || []).length}턴` : ''}</small>` +
            `<h2 lang="en">${e(a.promptEn)}</h2>` +
            `${a.promptKo ? `<p>${e(a.promptKo)}</p>` : ''}` +
            `${say(a.promptEn)}</div>`;
          peek = `상대: ${a.promptEn}${a.promptKo ? ` (${a.promptKo})` : ''}`;
          break;
        case 'F':
          prompt = `<p class="pill">${e(d.instructionKo)}</p><h2 lang="en">${e(d.sourceEn)}</h2>`;
          peek = `${d.instructionKo}: ${d.sourceEn}`;
          break;
        case 'G':
          prompt = '<h2>자연스러운 문장을 만들어 주세요.</h2>';
          break;
        case 'H':
          prompt = `<p class="pill">틀린 곳을 고쳐 주세요</p><h2 lang="en">${e(d.wrongEn)}</h2>`;
          peek = `고치기: ${d.wrongEn}`;
          break;
        default:
          prompt = '<p>문장을 듣고 영어로 답해 보세요.</p>';
      }
    }
    return `${
      header(kind === 'key' ?
      `핵심 문장 ${(s?.index || 0) + 1} / ${SE.learning.lesson()?.keySentences?.length || 5}` :
      `${s?.extra ? '추가 연습' : '드릴'} ${(s?.index || 0) + 1} / ${SE.learning.items().length}`, kind === 'key' ? '듣고, 내 문장으로.' : titles[d.type] || '영어로 답해요')
    }` +
      `<div class="prompt">${prompt}</div>` +
      `${
      s?.pending ?
      V.feedback(s.pending, a.en, false, kind) :
      V.input({
      mode: s?.mode,
      draft: s?.draft,
      blocks: d.type === 'G' ? d.blocks : null,
      selected: s?.blocks || [],
      answer: a.en,
      kind,
      retry: s?.retry,
      peek
    })
    }`;
  };
})();
