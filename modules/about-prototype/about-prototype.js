/*
 * modules/about-prototype/about-prototype.js — เกี่ยวกับ Prototype (เมนูกลุ่ม "ข้อมูลโครงการ")
 *
 * หน้าที่:        แท็บ ขอบเขต (+ สิ่งที่ตัดออก) | Decision log | คำถามที่ค้าง | ขั้นต่อไป
 *                 เปิดด้วย #open-questions (เช่น ลิงก์จาก ⓘ ในหน้าวางแผนราย SKU) = เปิดแท็บคำถามที่ค้าง
 *                 จอกว้างตั้งแต่ 1024px หน้าสูงเท่าจอ เนื้อหาแท็บเลื่อนภายในการ์ด / พิมพ์ = แสดงทุกแท็บต่อกัน
 *                 กล่องสิ่งที่ขออนุมัติ (page.approve) สร้างโดย core/layout.js
 *                 CR-17: รายการที่มี feature (ขอบเขต · Decision log · คำถามที่ค้าง · ขั้นต่อไป) แสดงเมื่อ Flag นั้นเปิด / '!ชื่อ' = แสดงเมื่อปิด
 *                 (ข้อความของ Phase 2 ยังอยู่ใน content.js แสดงกลับเมื่อเปิด Flag)
 * อ่านจาก data/:  content (pages.aboutPrototype)
 * store อ่าน:     – / store เขียน: –
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var h = C.h;

  var TABS = ['scope', 'decisions', 'questions', 'next'];

  // CR-17: item = ข้อความ หรือ { text | topic, feature } (feature '!ชื่อ' = แสดงเมื่อ Flag ปิด)
  function shown(item) {
    var f = item && typeof item === 'object' ? item.feature : null;
    if (!f) return true;
    return f.charAt(0) === '!' ? !SP.core.features.isOn(f.slice(1)) : SP.core.features.isOn(f);
  }
  function textOf(item) { return item && typeof item === 'object' ? item.text : item; }
  function list(items, ordered) { return h(ordered ? 'ol' : 'ul', { class: 'ab-list' }, items.filter(shown).map(function (t) { return h('li', null, textOf(t)); })); }

  function render(root, ctx) {
    var page = ctx.page;
    var current = location.hash === '#open-questions' ? 'questions' : 'scope';

    var panels = {
      scope: h('div', { class: 'grid-2 ab-scope' },
        h('div', null, h('h2', null, page.scopeTitle), list(page.scope)),
        h('div', null, h('h2', null, page.cutTitle), list(page.cut))),
      decisions: h('div', null, h('h2', null, page.tabs.decisions), C.table([
        { label: '#', className: 'num', render: function (r, i) { return String(i + 1); } },
        { label: page.decisionColumns.topic, render: function (r) { return h('strong', null, r.topic); } },
        { label: page.decisionColumns.decision, key: 'decision' }
      ], page.decisions.filter(shown), { className: 'ab-decisions' })),
      questions: h('div', { class: 'callout callout-question', id: 'open-questions' }, h('h2', null, page.tabs.questions), list(page.openQuestions, true)),
      next: h('div', null, h('h2', null, page.tabs.next), list(page.nextSteps, true))
    };
    var body = h('div', { class: 'card ab-panel' });
    TABS.forEach(function (id) {
      var p = h('section', { class: 'ab-tab', dataset: { tab: id }, hidden: id !== current }, panels[id]);
      body.appendChild(p);
    });

    var tabs = h('div', { class: 'ab-tabs' });
    // segmented แสดงค่าที่เลือกตอนสร้าง จึงสร้างใหม่ทุกครั้งที่เปลี่ยนแท็บ
    function drawTabs() {
      C.clear(tabs).appendChild(C.segmented({
        label: page.title, value: current,
        options: TABS.map(function (id) { return { value: id, label: page.tabs[id] }; }),
        onChange: show
      }));
    }
    function show(id) {
      current = id;
      [].forEach.call(body.children, function (p) { p.hidden = p.dataset.tab !== id; });
      body.scrollTop = 0;
      drawTabs();
    }
    drawTabs();
    root.appendChild(tabs);
    root.appendChild(body);

    // ลิงก์ #open-questions ขณะอยู่หน้านี้ = เปิดแท็บคำถามที่ค้าง
    window.addEventListener('hashchange', function () { if (location.hash === '#open-questions') show('questions'); });
  }

  SP.modules.aboutPrototype = { render: render };
})(window.SP);
