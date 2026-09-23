/*
 * modules/sku-status/sku-status.js — Status สินค้า vs วิธีเติมยอด
 *
 * หน้าที่:        อธิบายว่า Status ดูระดับ SKU ส่วนวิธีเติมยอดดูระดับ SKU × Sub-channel
 *                 ตัวอย่าง SKU A (เปลี่ยนเดือนขายวันแรก/Listing ได้) และ SKU D (Clearance มาก่อนเสมอ)
 * อ่านจาก data/:  accounts, channels, history, settings, content (pages.skuStatus)
 * store อ่าน:     app.planYear, master.products, master.listings (หน้านี้ถูกซ่อนไว้ ใช้ข้อมูลชุดเดียวกับ Product Master)
 * store เขียน:    – (ค่าที่ลองเปลี่ยนในตัวอย่างอยู่ในหน้านี้เท่านั้น)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var h = C.h;

  function product(sku) { return SP.core.store.master().products.filter(function (p) { return p.sku === sku; })[0]; }
  function subName(id) { return calc.unitInfo(SP.core.store.data(), id).unit.name; }

  function hasRunRate(skuId, subId) { return calc.runRateOf(SP.data.history, skuId, subId) != null; }

  function ym(year, m) { return year + '-' + (m < 9 ? '0' : '') + (m + 1); }

  function statusCells(sku, year) {
    var L = SP.data.content.labels.status;
    var out = [];
    for (var m = 0; m < 12; m++) {
      var st = calc.skuStatus(sku, m, year);
      out.push({ className: 'st-' + st, text: L[st], title: F.month(m) + ': ' + L[st] });
    }
    return out;
  }

  function sourceCells(sku, subId, year, unitsByMonth) {
    var L = SP.data.content.labels;
    var out = [];
    for (var m = 0; m < 12; m++) {
      var start = sku.listing[subId] ? calc.monthIndex(sku.listing[subId], year) : 99;
      var src = calc.cellSource(sku, m, year, hasRunRate(sku.sku, subId), start);
      out.push({
        className: 'src-' + src,
        text: unitsByMonth ? F.units(unitsByMonth[m]) : L.sourceShort[src],
        title: F.month(m) + ': ' + L.source[src]
      });
    }
    return out;
  }

  function monthSelect(value, year, noneLabel, onChange, label) {
    var options = [];
    if (noneLabel) options.push({ value: '', label: noneLabel });
    // ค่าที่อยู่นอกปีแผน (เช่น ขายวันแรก 2027 แต่เลือกปี 2028) ยังเลือกได้
    if (value && calc.parseDate(value).y !== year) options.push({ value: value, label: F.date(value) });
    for (var m = 0; m < 12; m++) options.push({ value: ym(year, m), label: F.monthYear(m, year) });
    return C.select({ options: options, value: value || '', onChange: onChange, label: label });
  }

  function render(root, ctx) {
    var page = ctx.page;
    var year = SP.core.store.year();

    // ---------- กติกา ----------
    root.appendChild(h('div', { class: 'grid-2' },
      C.card(page.statusTitle, h('ul', { class: 'rule-list' }, page.statusRules.map(function (r) {
        return h('li', null, C.statusBadge(r.status), h('span', null, r.text));
      }))),
      C.card(page.sourceTitle, h('ul', { class: 'rule-list' }, page.sourceRules.map(function (r) {
        return h('li', null, C.sourceChip(r.source), h('span', null, r.text));
      })))));

    // ---------- ตัวอย่าง SKU A ----------
    var base = product(page.exampleSku);
    var sku = JSON.parse(JSON.stringify(base));
    // ตัวอย่างนี้ให้เลือกเดือนเริ่มขายต่อ Account ได้ ตั้งต้น = เดือนเริ่มขายของ SKU ถ้า Listing อยู่
    var listings = SP.core.store.master().listings;
    sku.listing = {};
    page.exampleSubChannels.forEach(function (id) { if (calc.isListed(listings, sku.sku, id)) sku.listing[id] = sku.launchDate.slice(0, 7); });
    var subs = page.exampleSubChannels;
    var strips = h('div', { class: 'strip-stack' });

    function drawStrips() {
      C.clear(strips);
      strips.appendChild(C.monthStrip(statusCells(sku, year), { label: page.statusRowLabel }));
      subs.forEach(function (id) {
        strips.appendChild(C.monthStrip(sourceCells(sku, id, year), { label: subName(id) }));
      });
    }

    var controls = h('div', { class: 'toolbar' },
      h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.firstSaleLabel),
        monthSelect(sku.launchDate.slice(0, 7), year, null, function (v) { sku.launchDate = v + '-01'; drawStrips(); }, page.firstSaleLabel)),
      subs.map(function (id) {
        return h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.listingLabel + ' ' + subName(id)),
          monthSelect(sku.listing[id], year, page.notListedOption, function (v) {
            if (v) sku.listing[id] = v; else delete sku.listing[id];
            drawStrips();
          }, page.listingLabel + ' ' + subName(id)));
      }));

    drawStrips();
    root.appendChild(C.card(page.exampleTitle, [
      h('p', { class: 'muted small' }, page.exampleHint),
      controls,
      h('div', { class: 'toolbar' }, C.sourceLegend()),
      strips
    ]));

    root.appendChild(C.callout('conclusion', page.conclusionTitle, page.conclusion));

    // ---------- ตัวอย่าง SKU D ----------
    var d = product(page.clearanceSku);
    var subD = page.clearanceSubChannel;
    var master = SP.core.store.master();
    var planD = { items: {} };
    planD.items[d.sku] = calc.newPlanItem(d, year, 0);
    var grid = calc.skuPlanGrid(SP.data, master, subD, planD, { year: year });
    var rowD = grid.rows[0];
    var dListing = {};
    dListing[subD] = '2000-01';   // Listing ก่อนปีแผน → ไม่ล็อกช่วงต้นปี
    root.appendChild(C.card(page.clearanceTitle, [
      h('p', { class: 'muted small' },
        d.name + ' · Clearance ' + F.date(d.clearance.fromMonth) + ' – ' + F.date(d.clearance.toMonth) +
        ' · Stock ใน ' + subName(subD) + ' ' + F.units(calc.clearanceStockFor(d, master.listings, subD)) + ' ' + SP.data.content.labels.units),
      h('div', { class: 'strip-stack' },
        C.monthStrip(statusCells(d, year), { label: page.statusRowLabel }),
        C.monthStrip(sourceCells(Object.assign({}, d, { listing: dListing }), subD, year, rowD.cells.map(function (c) { return c.units; })), { label: subName(subD) + ' (' + SP.data.content.labels.units + ')' }))
    ]));
  }

  SP.modules.skuStatus = { render: render };
})(window.SP);
