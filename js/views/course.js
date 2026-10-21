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
  // 유닛별 학습 경로와 완료 상태를 표시한다.
  V.courseSummary = function (compact = false) {
    return `<ol class="course-path ${compact ? 'compact' : ''}">` +
      `${
      (SE.content.units || []).map(/* 각 항목을 표시 값으로 바꾼다. */unit => {
      const lessons = SE.home.lessons().filter(/* 조건에 맞는 항목만 남긴다. */l => l.unit === unit.unit),
        available = lessons.length > 0;
      const done = lessons.length > 0 && lessons.every(/* 모든 항목이 조건에 맞는지 확인한다. */l => SE.store.data.completed.includes(SE.home.courseId(l)));
      return `<li class="${available ? 'available' : ''}">` +
        `<div class="unit-number">${done ? '✓' : e(unit.unit)}</div>` +
        `<div>` +
        `<h3>${e(unit.titleKo)}</h3>` +
        `${
        compact ?
        `<p class="muted small">${available ? e(lessons[0].titleKo) + (done ? ' · 완료' : ' · 학습 가능') : '준비 중'}</p>` :
        `<div class="unit-lessons">${
        (unit.lessons || []).map(/* 각 항목을 표시 값으로 바꾼다. */(title, i) => {
        const lesson = lessons.find(/* 조건에 맞는 항목을 찾는다. */l => l.lesson === i + 1);
        return lesson ?
          button(`${e(title)} ${SE.store.data.completed.includes(SE.home.courseId(lesson)) ? '✓' : ''}`, 'start', 'lesson-link', `data-id="${e(lesson.id)}"`) :
          `<span class="muted small">${e(title)} · 준비 중</span>`;
      }).join('')
      }</div>`
      }</div></li>`;
    }).join('')
    }</ol>`;
  };
  // 코스 목록과 학습 수준을 표시한다.
  V.course = function () {
    return `${header('나의 여행 경로', '한 장면씩, 더 멀리.', '10개 유닛으로 떠나는 영어 여행. 지금은 첫 레슨을 학습할 수 있어요.')}${tierSelect()}${panel(V.courseSummary())}`;
  };
})();
