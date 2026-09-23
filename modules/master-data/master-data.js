/*
 * modules/master-data/master-data.js — ใครดูแลข้อมูลอะไร
 *
 * หน้าที่:        แสดงเจ้าของข้อมูลหลักแต่ละรายการ + Diagram ข้อมูลไหลไปที่แผนของทีมขาย
 *                 + ตัวอย่างค่าจริงจากข้อมูลตัวอย่างในเว็บนี้
 * อ่านจาก data/:  content (pages.masterData), pricing, channels, accounts
 * store อ่าน:     app.planYear, master.products, master.listings
 * store เขียน:    –
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var h = C.h;

  function product(sku) { return SP.core.store.master().products.filter(function (p) { return p.sku === sku; })[0]; }
  function subName(id) { return calc.unitInfo(SP.core.store.data(), id).unit.name; }

  // ตัวอย่างค่าจริงจาก data/ ของแต่ละแถว
  var EXAMPLES = {
    status: function () {
      var year = SP.core.store.year();
      return ['A', 'D'].map(function (id) {
        var segs = calc.statusSegments(product(id), year);
        var seg = segs.filter(function (s) { return s.status === 'npd' || s.status === 'clearance'; })[0] || segs[0];
        return h('span', { class: 'md-example' }, product(id).name + ' ', C.statusBadge(seg.status, F.monthRange(seg.from, seg.to)));
      });
    },
    firstSale: function () { return product('A').name + ' ขายวันแรก ' + F.date(product('A').launchDate); },
    listing: function () {
      var a = product('A');
      return a.name + ': ' + calc.listedAccounts(SP.core.store.master().listings, a.sku).slice(0, 3).map(subName).join(' · ') + ' …';
    },
    priceList: function () {
      var pl = SP.data.pricing.priceList;
      return ['A', 'B', 'C'].map(function (id) { return product(id).name + ' ' + F.baht(pl[id]); }).join(' · ') + ' บาท';
    },
    clearance: function () {
      var d = product('D');
      return d.name + ' ' + F.date(d.clearance.fromMonth) + ' – ' + F.date(d.clearance.toMonth) + ' · Stock ' + F.units(d.clearance.stockQty) + ' ชิ้น';
    },
    gp: function () {
      var d = SP.core.store.data();
      return h('span', null, ['watsons', 'shopee', 'tt-north'].map(function (id) { return subName(id) + ' ' + F.pct(calc.gpOf(d, id), 0); }).join(' · ') + ' ',
        h('span', { class: 'badge alert-short' }, SP.data.content.labels.pending));
    },
    promotion: function () {
      var p = SP.data.pricing.promotions[0];
      var d1 = calc.parseDate(p.start), d2 = calc.parseDate(p.end);
      return product(p.sku).name + ' ' + subName(p.subChannel) + ' ' + d1.d + '–' + d2.d + ' ' + F.month(d2.m) + ' ราคา ' + F.baht(p.price);
    }
  };

  function mermaidSource(page) {
    var lines = ['flowchart LR'];
    var owners = Object.keys(page.owners);
    owners.forEach(function (o, i) {
      var items = page.rows.filter(function (r) { return r.owner === o; });
      var sources = items.map(function (r) { return r.source; }).filter(function (s, j, a) { return a.indexOf(s) === j; });
      lines.push('  O' + i + '["' + page.owners[o] + '"]');
      sources.forEach(function (s, j) {
        var what = items.filter(function (r) { return r.source === s; }).map(function (r) { return r.item; }).join('<br/>');
        var node = 'D' + i + '_' + j;
        lines.push('  O' + i + ' --> ' + node + '["<b>' + s + '</b><br/>' + what + '"]');
        lines.push('  ' + node + ' --> PLAN');
      });
    });
    lines.push('  PLAN(["' + page.planLabel + '"])');
    return lines.join('\n');
  }

  // ใช้แสดงเมื่อโหลด Mermaid ไม่ได้
  function ownerCards(page) {
    return h('div', { class: 'md-owners' }, Object.keys(page.owners).map(function (o) {
      return h('div', { class: 'md-owner' },
        h('strong', null, page.owners[o]),
        h('ul', null, page.rows.filter(function (r) { return r.owner === o; }).map(function (r) { return h('li', null, r.item); })));
    }));
  }

  function render(root, ctx) {
    var page = ctx.page;
    var cols = page.columns;
    var registry = SP.core.registry;

    root.appendChild(C.card(page.flowTitle, C.diagram({
      source: mermaidSource(page),
      fallback: ownerCards(page),
      label: page.flowTitle
    })));

    root.appendChild(C.table([
      { label: cols.item, render: function (r) { return h('strong', null, r.item); } },
      { label: cols.owner, render: function (r) { return h('span', { class: 'badge md-owner-badge' }, page.owners[r.owner]); } },
      { label: cols.source, key: 'source' },
      { label: cols.example, render: function (r) { return EXAMPLES[r.key] ? EXAMPLES[r.key]() : ''; } },
      {
        label: cols.usedIn,
        render: function (r) {
          return h('span', { class: 'md-links' }, r.usedIn.map(function (id) {
            var e = registry.byId(id);
            return e ? h('a', { href: SP.core.paths.to(e.path) }, e.title) : null;
          }));
        }
      }
    ], page.rows, { className: 'md-table' }));
  }

  SP.modules.masterData = { render: render };
})(window.SP);
