/*
 * modules/sales-team/sales-team.js — หน้าทีมขายเดิม (CR-29 ซ่อนแล้ว · registry visible: false · ใช้สิทธิ์ของหน้า people)
 *
 * หน้าที่:        ลิงก์เดิมพาไปหน้าบุคลากรและทีม แท็บรายชื่อและทีม (#list · จัดกลุ่มตาม Channel = การ์ดทีมเดิม) ทันที
 * อ่านจาก data/:  content (pages.salesTeam) · store: ui.peopleGroupByChannel (เปิดการจัดกลุ่มให้)
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var e = SP.core.registry.byId('people');
    var href = SP.core.paths.to(e.path) + '#list';
    SP.core.store.set('ui.peopleGroupByChannel', true);
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.salesTeam = { render: render };
})(window.SP);
