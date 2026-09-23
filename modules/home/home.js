/*
 * modules/home/home.js — หน้าแรก (index.html ที่ Root)
 *
 * หน้าที่:        ปัญหาของ Excel ปัจจุบัน + Diagram Top-down / Bottom-up มาเจอกันที่ Remaining + ปุ่มเริ่ม Tour
 * อ่านจาก data/:  content (excelProblems, pages.home, pages.<id>.lead สำหรับรายการ Tour)
 * store อ่าน:     –
 * store เขียน:    –
 *
 * หน้านี้ไม่มี index.html ในโฟลเดอร์ของตัวเอง เพราะใช้ index.html ที่ Root
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var h = C.h;

  function conceptColumn(side, className) {
    return h('div', { class: 'concept-col ' + className },
      h('div', { class: 'concept-head' },
        h('span', { class: 'concept-title' }, side.title),
        h('span', { class: 'concept-unit' }, side.unit),
        h('span', { class: 'concept-who' }, side.who)),
      h('ol', { class: 'concept-steps' }, side.steps.map(function (s) { return h('li', null, s); })));
  }

  function render(root, ctx) {
    var page = ctx.page;
    var content = ctx.content;
    var paths = SP.core.paths;
    var tour = SP.core.registry.tour().filter(function (e) { return e.id !== 'home'; });
    var first = tour[0];

    root.appendChild(h('div', { class: 'home-cta no-print' },
      h('a', { class: 'btn btn-primary btn-lg', href: paths.to(first.path) }, page.startTour + ' →')));

    root.appendChild(C.card(page.problemsTitle,
      h('ul', { class: 'problem-list' }, content.excelProblems.map(function (t) { return h('li', null, t); }))));

    var meet = page.meet;
    root.appendChild(C.card(page.conceptTitle,
      h('div', { class: 'concept' },
        conceptColumn(page.topDown, 'is-top'),
        conceptColumn(page.bottomUp, 'is-bottom'),
        h('div', { class: 'concept-meet' },
          h('span', { class: 'concept-meet-title' }, meet.title),
          h('span', { class: 'concept-formula' }, meet.formula),
          C.alertLegend(),
          h('span', { class: 'concept-who' }, meet.note)))));

    root.appendChild(C.card(page.tourTitle, [
      h('ol', { class: 'tour-list' }, tour.map(function (e, i) {
        var lead = (content.pages[e.id] || {}).lead || [];
        return h('li', null,
          h('a', { href: paths.to(e.path) },
            h('span', { class: 'tour-list-num' }, String(i + 1)),
            h('span', { class: 'tour-list-body' },
              h('strong', null, e.title),
              lead[0] ? h('span', { class: 'tour-list-lead' }, lead[0]) : null)));
      })),
      h('a', { class: 'btn btn-primary btn-lg no-print', href: paths.to(first.path) }, page.startTour + ' →')
    ]));
  }

  SP.modules.home = { render: render };
})(window.SP);
