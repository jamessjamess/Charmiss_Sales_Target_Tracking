/*
 * modules/salespeople/salespeople.js — หน้าผู้รับผิดชอบเดิม (CR-29 ซ่อนแล้ว · registry visible: false · ใช้สิทธิ์ของหน้า people)
 *
 * หน้าที่:        ลิงก์เดิมพาไปหน้าบุคลากรและทีม แท็บผู้รับผิดชอบรายเดือน (#monthly) ทันที
 *                 ผลงานรายบุคคลย้ายไป Plan Summary › เป้าหมายรายผู้รับผิดชอบ (คอลัมน์ YTD)
 * อ่านจาก data/:  content (pages.salespeople) · store: –
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var e = SP.core.registry.byId('people');
    var href = SP.core.paths.to(e.path) + '#monthly';
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.salespeople = { render: render };
})(window.SP);
