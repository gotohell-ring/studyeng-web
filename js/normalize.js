// 모듈의 기능과 공유 상태를 초기화한다.
(function () {
  'use strict';

  const SE = window.SE;
  const contractions = {
    "i'm": "i am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "he's": "he is",
    "she's": "she is",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "what's": "what is",
    "where's": "where is",
    "here's": "here is",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
    "it'll": "it will",
    "i'd": "i would",
    "you'd": "you would",
    "he'd": "he would",
    "she'd": "she would",
    "we'd": "we would",
    "they'd": "they would",
    "let's": "let us",
    "cannot": "can not",
    "gonna": "going to",
    "wanna": "want to",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "can not",
    "couldn't": "could not",
    "wouldn't": "would not",
    "shouldn't": "should not",
    "won't": "will not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    im: 'i am',
    ive: 'i have',
    youre: 'you are',
    theyre: 'they are',
    dont: 'do not',
    doesnt: 'does not',
    didnt: 'did not',
    cant: 'can not',
    isnt: 'is not',
    arent: 'are not',
    wasnt: 'was not',
    werent: 'were not',
    couldnt: 'could not',
    wouldnt: 'would not',
    shouldnt: 'should not',
    havent: 'have not',
    hasnt: 'has not',
    hadnt: 'had not',
    thats: 'that is',
    theres: 'there is',
    whats: 'what is'
  };
  const ones = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const tens = '_ _ twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
  const ord = {
    1: 'first',
    2: 'second',
    3: 'third',
    4: 'fourth',
    5: 'fifth',
    6: 'sixth',
    7: 'seventh',
    8: 'eighth',
    9: 'ninth',
    10: 'tenth',
    11: 'eleventh',
    12: 'twelfth',
    13: 'thirteenth',
    14: 'fourteenth',
    15: 'fifteenth',
    16: 'sixteenth',
    17: 'seventeenth',
    18: 'eighteenth',
    19: 'nineteenth',
    20: 'twentieth',
    30: 'thirtieth'
  };
  // 숫자를 정규화용 영어 단어로 바꾼다.
  const number = n => n < 20 ? ones[n] : n === 100 ? 'one hundred' : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  SE.numberWords = new Set([...ones, ...tens.slice(2), 'hundred', ...Object.values(ord)]);
  // 문장을 채점용 단어 목록으로 정규화한다.
  SE.normalize = function (value) {
    let s = String(value == null ? '' : value).normalize('NFKC').replace(/[’‘ʼ]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, ' ').toLowerCase();
    [['\\$', 'dollar'], ['€', 'euro'], ['£', 'pound'], ['₩', 'won']].forEach(/* 각 항목을 처리한다. */([symbol, word]) => {
      s = s.replace(new RegExp(symbol + '(\\d[\\d.,]*)', 'g'), '$1 ' + word);
    });
    s = s.replace(/\b(dollar|euro|pound)s\b/g, '$1').replace(/\ba\.m\./g, 'am').replace(/\bp\.m\./g, 'pm').replace(/%/g, ' percent').replace(/&/g, ' and ').replace(/[-/]/g, ' ').replace(/[!?;"()[\]]/g, ' ').replace(/(?<=\d),(?=\d)/g, '').replace(/(?<!\d)[.,:]|[.,:](?!\d)/g, ' ');
    const out = [];
    s.split(/\s+/).forEach(/* 각 항목을 처리한다. */tok => {
      tok = tok.replace(/^'+|'+$/g, '');
      if (!tok) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(contractions, tok)) {
        out.push(...contractions[tok].split(' '));
        return;
      }
      if (/^\d+$/.test(tok) && Number(tok) <= 100) {
        out.push(...number(Number(tok)).split(' '));
        return;
      }
      const m = tok.match(/^(\d+)(st|nd|rd|th)$/);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31) {
        const n = Number(m[1]);
        out.push(...(ord[n] || tens[Math.floor(n / 10)] + ' ' + ord[n % 10]).split(' '));
        return;
      }
      out.push(tok);
    });
    return out;
  };
})();
