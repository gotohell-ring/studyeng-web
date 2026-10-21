// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE;
  const fw = new Set('a an the to of in on at for with from by about as am is are was were be been being i you he she it we they me him her us them my your his its our their do does did will would can could'.split(' '));
  // 단어의 채점 가중치를 구한다.
  const w = t => fw.has(t) ? 4 : 8;
  // 두 단어의 굴절 관계를 확인한다.
  const inflect = (a, b) => a !== b &&
    [[a, b], [b, a]].some(/* 조건에 맞는 항목이 있는지 확인한다. */([x, y]) => y.length >= 3 && ['ing', 'es', 'ed', 's', 'd'].some(/* 조건에 맞는 항목이 있는지 확인한다. */s => x === y + s));
  // 한 글자 차이의 오타인지 확인한다.
  const ed1 = (a, b) => {
    if (inflect(a, b) || Math.abs(a.length - b.length) > 1) {
      return false;
    }
    if (a.length === b.length) {
      return [...a].filter(/* 조건에 맞는 항목만 남긴다. */(v, i) => v !== b[i]).length === 1;
    }
    if (a.length < b.length) {
      [a, b] = [b, a];
    }
    return [...a].some(/* 조건에 맞는 항목이 있는지 확인한다. */(_, i) => a.slice(0, i) + a.slice(i + 1) === b);
  };
  // 단어별 등장 횟수를 센다.
  const counts = words => {
    const c = Object.create(null);
    words.forEach(/* 각 항목을 처리한다. */t => {
      c[t] = (c[t] || 0) + 1;
    });
    return c;
  };
  // 점수에 해당하는 판정을 구한다.
  SE.verdict = s => s >= 90 ? 'correct' : s >= 70 ? 'near' : 'again';
  // 허용 답안 중 가장 높은 점수와 단어별 결과를 구한다.
  SE.score = function (options) {
    const {
      target = '',
      answers = [],
      input = '',
      mode = 'keyboard',
      keywords = [],
      allowNearMatch = true,
      wrongInput = null
    } = options || {};
    const I = SE.normalize(input);
    let best = null;
    [target, ...(Array.isArray(answers) ? answers : [])].forEach(/* 각 항목을 처리한다. */(candidate, index) => {
      const T = SE.normalize(candidate),
        n = T.length,
        m = I.length;
      const D = Array.from({
        length: n + 1
      }, /* 콜백에서 필요한 값을 계산하거나 상태를 갱신한다. */() => Array(m + 1).fill(0));
      const P = Array.from({
        length: n + 1
      }, /* 콜백에서 필요한 값을 계산하거나 상태를 갱신한다. */() => Array(m + 1).fill(null));
      for (let i = 1; i <= n; i++) {
        D[i][0] = D[i - 1][0] + w(T[i - 1]);
        P[i][0] = 'missing';
      }
      for (let j = 1; j <= m; j++) {
        D[0][j] = D[0][j - 1] + w(I[j - 1]);
        P[0][j] = 'extra';
      }
      // 두 단어의 교체 비용과 상태를 구한다.
      function substitution(a, b) {
        if (a === b) {
          return [0, 'correct'];
        }
        if (inflect(a, b)) {
          return [w(a) * (allowNearMatch ? 0.5 : 1), allowNearMatch ? 'near' : 'wrong'];
        }
        if (allowNearMatch && (mode === 'keyboard' || mode === 'k' || keywords.includes(a)) && a.length >= 5 && !SE.numberWords.has(a) && ed1(a, b)) {
          return [w(a) / 4, 'near'];
        }
        return [w(a), 'wrong'];
      }
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          const [c, status] = substitution(T[i - 1], I[j - 1]);
          const choices = [[D[i - 1][j - 1] + c, status], [D[i - 1][j] + w(T[i - 1]), 'missing'], [D[i][j - 1] + w(I[j - 1]), 'extra']];
          choices.sort(/* 기준 순서로 정렬한다. */(a, b) => a[0] - b[0]);
          [D[i][j], P[i][j]] = choices[0];
        }
      }
      const total = T.reduce(/* 항목별 값을 모은다. */(s, t) => s + w(t), 0),
        cost = Math.min(D[n][m], total);
      let score = !m || !total ? 0 : Math.floor((200 * (total - cost) + total) / (2 * total));
      if (wrongInput != null) {
        const W = SE.normalize(wrongInput),
          wc = counts(W),
          tc = counts(T),
          ic = counts(I);
        if (I.join(' ') === W.join(' ') || Object.keys(wc).some(/* 조건에 맞는 항목이 있는지 확인한다. */t => wc[t] > (tc[t] || 0) && (ic[t] || 0) > (tc[t] || 0))) {
          score = Math.min(score, 69);
        }
      }
      const statuses = [];
      let i = n,
        j = m;
      while (i || j) {
        const status = P[i][j];
        if (status === 'missing') {
          statuses.push({
            word: T[--i],
            status
          });
        } else if (status === 'extra') {
          statuses.push({
            word: I[--j],
            status
          });
        } else {
          statuses.push({
            word: T[--i],
            inputWord: I[--j],
            status
          });
        }
      }
      const result = {
        score,
        verdict: SE.verdict(score),
        matchedCandidateIndex: index,
        wordStatuses: statuses.reverse()
      };
      if (!best || score > best.score) {
        best = result;
      }
    });
    return best;
  };
})();
