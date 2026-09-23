/*
 * modules/approval/approval.js — อนุมัติ ล็อกเป้า และ Forecast
 *
 * หน้าที่:        Timeline Draft → Submitted → Director อนุมัติ → Baseline ล็อกทั้งปี → Forecast (กดเลื่อนสถานะได้)
 *                 ภาพ 12 เดือน: ผ่านไปแล้ว / เดือนปัจจุบัน / ล็อก M+1..M+3 / ปรับได้ (เลือกเดือนปัจจุบันได้)
 * อ่านจาก data/:  settings (FROZEN_MONTHS, DEMO_CURRENT_MONTH), content (pages.approval)
 * store อ่าน:     app.planYear (ใช้แสดงชื่อเดือน)
 * store เขียน:    – (สถานะที่กดลองอยู่ในหน้านี้เท่านั้น)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var h = C.h;

  function render(root, ctx) {
    var page = ctx.page;
    var S = SP.data.settings;
    var A = page.actions;
    var steps = page.steps;
    var current = 0;

    // ---------- Timeline ----------
    var timeline = h('ol', { class: 'ap-timeline' });
    var actions = h('div', { class: 'ap-actions no-print' });

    // ปุ่มของแต่ละสถานะ: [ข้อความ, สถานะถัดไป]
    var NEXT = [
      [[A.submit, 1]],
      [[A.approve, 2], [A.sendBack, 0]],
      [[A.lock, 3]],
      [[A.forecast, 4]],
      [[A.restart, 0]]
    ];

    function drawTimeline() {
      C.clear(timeline);
      steps.forEach(function (s, i) {
        var state = i < current ? 'is-done' : i === current ? 'is-current' : '';
        timeline.appendChild(h('li', { class: 'ap-step ' + state, 'aria-current': i === current ? 'step' : null },
          h('span', { class: 'ap-dot' }, i < current ? '✓' : String(i + 1)),
          h('span', { class: 'ap-title' }, s.title),
          h('span', { class: 'ap-who' }, s.who),
          h('span', { class: 'ap-desc' }, s.desc)));
      });
      C.clear(actions);
      NEXT[current].forEach(function (a, j) {
        actions.appendChild(h('button', {
          type: 'button', class: 'btn ' + (j === 0 ? 'btn-primary' : 'btn-secondary'),
          onClick: function () { current = a[1]; drawTimeline(); }
        }, a[0]));
      });
    }

    drawTimeline();
    root.appendChild(C.card(page.timelineTitle, [timeline, actions]));

    // ---------- 12 เดือนของ Forecast ----------
    var month = S.DEMO_CURRENT_MONTH;
    var W = SP.data.content.labels.window;
    var strip = h('div');
    var summary = h('p', { class: 'ap-summary' });

    var options = F.MONTHS.map(function (m, i) { return { value: String(i), label: F.monthYear(i, SP.core.store.year()) }; });
    var picker = C.select({ options: options, value: String(month), label: page.currentMonthLabel, onChange: function (v) { month = Number(v); drawWindow(); } });

    function drawWindow() {
      var kinds = F.MONTHS.map(function (m, i) { return calc.monthWindow(month, i, S.FROZEN_MONTHS); });
      var ICON = { past: '✓', current: '●', locked: '🔒', open: '✎' };
      C.clear(strip).appendChild(C.monthStrip(kinds.map(function (k, i) {
        return { className: 'win-' + k, text: ICON[k] + ' ' + W[k], title: F.month(i) + ': ' + page.windowNotes[k] };
      }), { className: 'ap-strip' }));

      var locked = kinds.map(function (k, i) { return k === 'locked' ? i : -1; }).filter(function (i) { return i >= 0; });
      var open = kinds.map(function (k, i) { return k === 'open' ? i : -1; }).filter(function (i) { return i >= 0; });
      summary.textContent =
        W.current + ' (M) = ' + F.month(month) +
        (locked.length ? ' · ' + W.locked + ' ' + F.monthRange(locked[0], locked[locked.length - 1]) : '') +
        ' · ' + W.open + ' ' + (open.length ? F.monthRange(open[0], open[open.length - 1]) : '–');
    }

    drawWindow();
    root.appendChild(C.card(page.windowTitle, [
      h('label', { class: 'field no-print' }, h('span', { class: 'field-label' }, page.currentMonthLabel), picker),
      strip,
      summary,
      h('ul', { class: 'ap-notes' }, ['past', 'current', 'locked', 'open'].map(function (k) {
        return h('li', null, h('span', { class: 'swatch win-' + k }), h('strong', null, W[k]), h('span', null, page.windowNotes[k]));
      }))
    ]));
  }

  SP.modules.approval = { render: render };
})(window.SP);
