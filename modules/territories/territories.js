/*
 * modules/territories/territories.js — หน้าเขตและร้านค้า (TT) เดิม (CR-32 รวมเป็น Account Master · registry visible: false · ใช้สิทธิ์ของ salesUnits)
 *
 * หน้าที่:        ลิงก์เดิมพาไปหน้า Account Master แท็บของ Channel ที่แบ่งเป้าตามเขต (#<channelId>) ทันที
 * อ่านจาก data/:  channels, content (pages.territories) · store: –
 */
(function (SP) {
  'use strict';

  function render(root, ctx) {
    var C = SP.core.components;
    var ch = SP.data.channels.filter(function (c) { return c.allocationUnit === 'TERRITORY'; })[0];
    var href = SP.core.paths.to(SP.core.registry.byId('salesUnits').path) + (ch ? '#' + ch.id : '');
    root.appendChild(C.h('p', { class: 'callout callout-info' }, C.fill(ctx.page.moved, { channel: ch ? ch.name : '' }), ' · ', C.h('a', { href: href }, ctx.page.go)));
    location.replace(href);
  }

  SP.modules.territories = { render: render };
})(window.SP);
