// 채점 결과를 사람이 읽을 수 있는 이유 목록으로 바꾼다 (왜 틀렸는지, 왜 비슷하게 인정했는지).
(function () {
  'use strict';

  const SE = window.SE;
  const groups = [
    ['관사', 'a an the'],
    ['전치사', 'to of in on at for with from by about as into onto near over under after before during until'],
    ['대명사', 'i you he she it we they me him her us them my your his its our their mine yours this that these those'],
    ['be동사', 'am is are was were be been being'],
    ['조동사', 'do does did will would can could should may might must shall have has had']
  ].map(([name, words]) => [name, new Set(words.split(' '))]);
  // 단어의 문법 범주(관사, 전치사 등)를 구한다.
  const kind = word => (groups.find(([, set]) => set.has(word)) || [''])[0];
  // 어미만 다른지(look/looks, book/booked) 확인한다.
  const inflect = (a, b) => a !== b && [[a, b], [b, a]].some(([x, y]) => y.length >= 3 && ['ing', 'es', 'ed', 's', 'd'].some(s => x === y + s));
  // 두 단어의 글자 편집거리를 구한다.
  const distance = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  };
  const q = w => `'${w}'`;

  // result: SE.score 결과. 반환: [{ type: 'ok'|'near'|'wrong'|'info', text }]
  SE.explain = function (result) {
    const r = result || {},
      list = [],
      ws = r.wordStatuses || [];
    if (r.skipped) {
      return [{ type: 'info', text: '건너뛴 문항이라 0점으로 기록했어요.' }];
    }
    if (!(r.inputWords || []).length) {
      return r.input === undefined ? [] : [{ type: 'wrong', text: '입력한 영어 단어가 없어요.' }];
    }
    // 단어는 같고 순서만 다른 경우
    const T = r.targetWords || [],
      I = r.inputWords || [];
    const sameBag = T.length === I.length && [...T].sort().join(' ') === [...I].sort().join(' ');
    if (sameBag && T.join(' ') !== I.join(' ')) {
      list.push({ type: 'wrong', text: '필요한 단어는 모두 있지만 순서가 달라요. 모범 답안의 어순을 확인해 보세요.' });
    }
    ws.forEach(w => {
      if (sameBag && w.status !== 'near') {
        return; // 어순 문제는 위 한 줄로 설명
      }
      const t = w.word,
        u = w.inputWord;
      if (w.status === 'near') {
        if (inflect(t, u)) {
          list.push({ type: 'near', text: `${q(u)} → ${q(t)}: 어미(시제·수)만 달라요. 이 문장에는 ${q(t)}가 맞아요. 비슷하게 인정하고 절반만 감점했어요.` });
        } else {
          list.push({ type: 'near', text: `${q(u)} → ${q(t)}: 철자가 1글자 달라 오타로 보고 비슷하게 인정했어요 (작은 감점).` });
        }
      } else if (w.status === 'wrong') {
        const k = kind(t),
          ku = kind(u);
        if (inflect(t, u)) {
          list.push({ type: 'wrong', text: `${q(u)} → ${q(t)}: 어미(시제·수) 차이예요. 문법을 묻는 문항이라 비슷한 형태도 오답으로 처리해요.` });
        } else if (k && k === ku) {
          list.push({ type: 'wrong', text: `${q(u)} 대신 ${q(t)}를 써야 해요 (${k} 선택).` });
        } else if (t.length >= 5 && distance(t, u) === 1) {
          list.push({ type: 'wrong', text: `${q(u)} → ${q(t)}: 철자 1글자 차이지만 ${r.strict ? '문법을 묻는 문항이라' : r.keyboard ? '숫자 단어라' : '말하기에서는 고유명사만 오타를 인정해서'} 다른 단어로 처리했어요.` });
        } else if (distance(t, u) <= 2 && Math.max(t.length, u.length) >= 4) {
          list.push({ type: 'wrong', text: `${q(u)} → ${q(t)}: 철자가 2글자 이상 달라 다른 단어로 처리했어요. 철자를 확인해 보세요.` });
        } else {
          list.push({ type: 'wrong', text: `${q(u)}는 모범 답안의 ${q(t)}와 다른 단어예요. 뜻이 같은 표현이라면 '내 답도 맞아요'로 인정할 수 있어요.` });
        }
      } else if (w.status === 'missing') {
        const k = kind(t);
        list.push({ type: 'wrong', text: `${q(t)}가 빠졌어요${k ? ` (${k})` : ''}.` });
      } else if (w.status === 'extra') {
        const k = kind(t);
        list.push({ type: 'wrong', text: `${q(t)}는 필요 없는 단어예요${k ? ` (${k})` : ''}.` });
      }
    });
    // 축약형은 풀어서 비교하므로(I'd → I would) 빠진 단어가 축약형에서 나온 것이면 알려 준다
    const contractions = (String(r.candidate || '').match(/\b[A-Za-z]+['’][a-z]+\b/g) || []);
    if (contractions.length && ws.some(w => w.status !== 'correct')) {
      list.push({ type: 'info', text: `축약형은 풀어서 비교해요: ${contractions.map(c => `${c} = ${SE.normalize(c).join(' ')}`).join(', ')}` });
    }
    if (r.capped) {
      list.push({ type: 'info', text: '고쳐야 할 원래 문장(틀린 부분)이 그대로 남아 있어서 최대 69점으로 제한했어요.' });
    }
    if (r.matchedCandidateIndex > 0) {
      list.push({ type: 'info', text: '모범 답안 대신 허용 답안 중 가장 가까운 문장과 비교했어요.' });
    }
    if (!list.length && r.verdict === 'correct') {
      list.push({ type: 'ok', text: '모범 답안과 같아요.' });
    }
    return list;
  };
})();
