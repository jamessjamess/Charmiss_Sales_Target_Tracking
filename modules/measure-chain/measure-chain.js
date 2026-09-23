/*
 * modules/measure-chain/measure-chain.js — จากจำนวนชิ้นถึง Net Sales
 *
 * หน้าที่:        เครื่องคิดเลข จำนวนชิ้น × ราคา → Sell-out Amount → Net Sales พร้อมสูตรทุกขั้น
 *                 และกลับด้าน Net Sales → Sell-out Amount / แสดงผลของคำถาม "ราคารวม VAT หรือไม่"
 * หน้านี้ซ่อนอยู่ (registry visible: false) — สูตรและแถบแบ่งเงินย้ายไปอยู่ที่ ⓘ ในหน้าวางแผน SKU แล้ว
 * อ่านจาก data/:  settings (VAT, PRICE_INCLUDES_VAT), content (pages.measureChain, labels.explain)
 * store อ่าน:     –
 * store เขียน:    – (ค่าที่ลองกรอกอยู่ในหน้านี้เท่านั้น)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var h = C.h;

  function money(n) { return F.baht(n, 2); }
  function short(n) { return F.number(n, Math.round(n * 100) % 100 === 0 ? 0 : 2); }

  function step(label, formula, value, className) {
    var f = h('span', { class: 'mc-formula' }, formula);
    var v = h('span', { class: 'mc-value' }, value);
    var el = h('li', { class: 'mc-step ' + (className || '') }, h('span', { class: 'mc-label' }, label), f, v);
    el.set = function (formula2, value2) { f.textContent = formula2; v.textContent = value2; };
    return el;
  }

  function render(root, ctx) {
    var page = ctx.page;
    var S = SP.data.settings;
    var vatPct = F.pct(S.VAT, 0);
    var vatFactor = F.number(1 + S.VAT, 2);
    var st = page.steps;
    var state = {
      units: page.defaults.units,
      price: page.defaults.price,
      gp: page.defaults.gp,
      includesVat: S.PRICE_INCLUDES_VAT,
      net: page.defaults.net,
      gpReverse: page.defaults.gp
    };

    // ---------- จำนวนชิ้น → Net Sales ----------
    var s1 = step(st.sellOutEx), s2 = step(st.net, '', '', 'is-key'), s3 = step(st.sellOutInc, '', '', 'is-muted');
    var split = h('div', { class: 'mc-split' });
    var vatNote = h('p', { class: 'mc-vat-diff' });

    var vatBox = h('input', { type: 'checkbox', checked: state.includesVat, onChange: function () { state.includesVat = vatBox.checked; update(); } });

    root.appendChild(h('div', { class: 'grid-2' },
      C.card(page.forwardTitle, [
        h('div', { class: 'mc-inputs' },
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.unitsLabel),
            C.numberInput({ value: state.units, min: 0, label: page.unitsLabel, onChange: function (v) { state.units = v; update(); } })),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.priceLabel),
            C.numberInput({ value: state.price, min: 0, label: page.priceLabel, onChange: function (v) { state.price = v; update(); } })),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.gpLabel),
            C.pctInput({ value: state.gp, label: page.gpLabel, onChange: function (v) { state.gp = v; update(); } })),
          h('label', { class: 'check' }, vatBox, page.vatToggle)),
        h('ol', { class: 'mc-steps' }, s1, s2, s3),
        h('div', null, h('h3', { class: 'mc-split-title' }, page.splitTitle), split)
      ]),
      reverseCard()));

    root.appendChild(h('div', { class: 'callout callout-question' },
      h('strong', { class: 'callout-title' }, page.vatQuestion), vatNote));

    function update() {
      var c = calc.chain({ units: state.units, price: state.price, gp: state.gp, includesVat: state.includesVat });
      s1.set(state.includesVat
        ? F.units(state.units) + ' × ' + short(state.price) + ' ÷ ' + vatFactor + ' = '
        : F.units(state.units) + ' × ' + short(state.price) + ' = ', money(c.sellOutExVat));
      s2.set(money(c.sellOutExVat) + ' × (1 − ' + F.pct(state.gp, 0) + ') = ', money(c.netSales));
      s3.set(money(c.sellOutExVat) + ' × ' + vatFactor + ' = ', money(c.sellOutIncVat));

      // เงินที่ลูกค้าจ่าย (รวม VAT) แบ่งเป็น Net Sales / GP / VAT — กราฟเดียวกับ ⓘ ในหน้าวางแผน SKU (charts.splitBar)
      var X = SP.data.content.labels.explain;
      C.clear(split).appendChild(SP.core.charts.splitBar(calc.moneySplit(c.sellOutExVat, state.gp, true), X.splitParts, { vatLabel: X.splitParts.vat + ' ' + vatPct, format: money }));

      // ผลต่างถ้าราคารวม VAT อยู่แล้วแต่คิดเหมือนไม่รวม
      var netIfExcl = calc.netSales(calc.sellOutExVat(state.units, state.price, false), state.gp);
      var netIfIncl = calc.netSales(calc.sellOutExVat(state.units, state.price, true), state.gp);
      vatNote.textContent = page.vatDiff + ' ' + money(netIfExcl - netIfIncl) + ' ' + SP.data.content.labels.baht +
        ' (' + F.pct(netIfIncl ? (netIfExcl - netIfIncl) / netIfIncl : 0) + ') · ' +
        page.vatCompare.excl + ' ' + money(netIfExcl) + ' · ' + page.vatCompare.incl + ' ' + money(netIfIncl);
    }

    // ---------- กลับด้าน ----------
    function reverseCard() {
      var r1 = step(st.sellOutEx, '', '', 'is-key'), r2 = step(st.sellOutInc, '', '', 'is-muted');
      function updateReverse() {
        var r = calc.reverseChain(state.net, state.gpReverse);
        r1.set(money(state.net) + ' ÷ (1 − ' + F.pct(state.gpReverse, 0) + ') = ', money(r.sellOutExVat));
        r2.set(money(r.sellOutExVat) + ' × ' + vatFactor + ' = ', money(r.sellOutIncVat));
      }
      var card = C.card(page.reverseTitle, [
        h('div', { class: 'mc-inputs' },
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.netLabel),
            C.numberInput({ value: state.net, min: 0, label: page.netLabel, onChange: function (v) { state.net = v; updateReverse(); } })),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, page.gpLabel),
            C.pctInput({ value: state.gpReverse, label: page.gpLabel, onChange: function (v) { state.gpReverse = v; updateReverse(); } }))),
        h('ol', { class: 'mc-steps' }, r1, r2)
      ]);
      updateReverse();
      return card;
    }

    update();
  }

  SP.modules.measureChain = { render: render };
})(window.SP);
