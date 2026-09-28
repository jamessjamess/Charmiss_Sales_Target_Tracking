/*
 * modules/accounts/accounts.js — หน้า Account & Platform เดิม (CR-32 รวมเป็น Sales Unit & Customer · registry visible: false · ใช้สิทธิ์ของ salesUnits)
 *
 * หน้าที่:        ลิงก์เดิมพาไปหน้า Sales Unit & Customer ทันที
 * อ่านจาก data/:  content (pages.accounts) · store: –
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var href = SP.core.paths.to(SP.core.registry.byId('salesUnits').path);
    root.appendChild(C.h('p', { class: 'callout callout-info' }, ctx.page.moved, ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.accounts = { render: render };
})(window.SP);
