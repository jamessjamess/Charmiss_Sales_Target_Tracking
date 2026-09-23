/*
 * modules/phasing/phasing.js — กระจายเป้ารายเดือน (Monthly Phasing)
 *
 * หน้าที่:        แถบบริบทแถวเดียว: Channel | Account/เขต ‹ › | ผู้รับผิดชอบ · GP · เป้าหมายทั้งปี · ยอดขายปีก่อน · การเติบโต
 *                 (subChannelPicker ตัวเดียวกับหน้าวางแผน SKU)
 *                 กราฟ 12 เดือน (แท่งทึบ = เป้าหมายปีนี้, เส้นประ = ยอดขายปีก่อน, ตัวเลขใน Tooltip) + แถวผู้รับผิดชอบ (เฉพาะเมื่อมีหลายคนในปี)
 *                 + ตาราง: ยอดขายปีก่อน / สัดส่วนรายเดือน / เป้าหมาย Net Sales / การเติบโต / แถวคงเหลือ (components.remainingRow)
 *                 เดือนที่ต่างจากค่าตั้งต้นมีจุดมุมช่อง + Tooltip ค่าตั้งต้น
 *                 เปิดมาเป็นโหมดดู / แก้ไข → แก้ % หรือบาทรายเดือน (เก็บ %) → บันทึก/ยกเลิก ส่วนต่างไปอยู่ที่คงเหลือ
 *                 Workflow ต่อ Account/เขต (workflowBar): ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ (ส่งได้เมื่อ Top-down อนุมัติแล้ว)
 * อ่านจาก data/:  channels, history, content (pages.phasing, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId>, plan.<ปี>.workflow.*, ui.selection,
 *                 master.* (ผู้รับผิดชอบ, GP), ui.role, ui.currentMonth
 * store เขียน:    plan.<ปี>.phasing.<unitId> = { monthPct, edited } (ตอนกด บันทึก), ui.selection (Key เดียวกับหน้าวางแผน SKU)
 *                 plan.<ปี>.workflow.phasing.<unitId> (ผ่าน workflowBar)
 *
 * ตัวเลขทุกตัว (บาท ↔ %, ผลรวม, คงเหลือ, การเติบโต, Seasonality) มาจาก SP.core.calc / กฎ Workflow มาจาก SP.core.workflow
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var R = page.rows;
    var year = store.year();
    var data = store.data();
    var nowKey = store.currentKey();
    var editing = false;
    var draftPct = null;
    var savedPct = null;
    var bar = null;

    function phasingOf(unitId) { return store.get(store.planKey('phasing.' + unitId)); }
    function dirty() {
      if (!editing || !draftPct) return 0;
      return draftPct.filter(function (p, i) { return Math.abs(p - savedPct[i]) > 1e-12; }).length;
    }
    C.guardUnsaved(dirty);
    function guard() { var n = dirty(); if (!C.confirmDiscard(n)) return false; editing = false; return true; }

    function draw() {
      C.clear(root);
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      var tree = calc.topDown(data, store.get(store.planKey('topDown')), year);
      var states = store.workflowStates();

      // ---------- แถบบริบทแถวเดียว (Component กลาง) ----------
      var picker = C.subChannelPicker({
        tree: tree,
        selection: store.get('ui.selection'),
        guard: guard,
        onSelect: function (channelId, unitId) { store.set('ui.selection', { channel: channelId, unit: unitId }); draw(); ctx.refreshMenu(); },
        // รายการใน Dropdown: สถานะคงเหลือของ Phasing + สถานะ Workflow (ข้อความ)
        remainingOf: function (id) { return calc.phasingTotals(calc.unitTarget(tree, id), phasingOf(id).monthPct).remaining; },
        workflowOf: function (id) { return W.stateOf(states, 'phasing', id).status; },
        ownerOf: function (id) { return C.ownerInfo(data, id, nowKey); }
      });
      var ch = picker.channel;
      var unit = picker.unit;
      var toolbar = h('div', { class: 'ctx-bar' }, picker);
      root.appendChild(toolbar);

      if (!ch || !unit) {
        root.appendChild(h('div', { class: 'callout callout-info' },
          h('strong', { class: 'callout-title' }, ch ? fill(page.noUnitsInChannel, { channel: ch.name, year: year }) : page.noChannels),
          h('p', null, h('a', { href: SP.core.paths.to(SP.core.registry.byId('topDown').path) }, page.goTopDown))));
        return;
      }

      var key = store.planKey('phasing.' + unit.id);
      savedPct = phasingOf(unit.id).monthPct.slice();
      if (!editing || !draftPct || draftPct.unit !== unit.id) { draftPct = savedPct.slice(); draftPct.unit = unit.id; }
      var monthPct = editing ? draftPct : savedPct;
      var defaults = store.getDefault(key).monthPct;
      var basis = calc.phasingBasis(data, year, unit.id);
      var prior = calc.priorMonthly(data.history, year, unit.id);
      var annual = unit.amount;
      var owner = C.ownerInfo(data, unit.id, nowKey);

      C.contextStats([
        ch.hasGP ? { label: L.context.gp, value: F.pct(calc.gpOf(data, unit.id), 0) } : null,
        { label: L.context.annual, value: F.baht(annual) + ' ' + L.baht },
        { label: L.context.prior, value: F.baht(unit.prior) + ' ' + L.baht },
        { label: L.context.growth, value: C.growthText(unit.growth) }
      ]).forEach(function (el) { toolbar.appendChild(el); });

      // ---------- Workflow ของรายการนี้ที่หัวหน้า ----------
      bar = C.workflowBar({
        step: 'phasing', unitId: unit.id, year: year, ownerId: owner.id,
        title: function () { return fill(page.workflowTitle, { unit: unit.name }); },
        editing: function () { return editing; },
        facts: function () { return { remaining: calc.phasingTotals(annual, savedPct).remaining.status }; },
        summary: function () {
          var t = calc.phasingTotals(annual, savedPct);
          return [
            fill(page.summaryLines.annual, { amount: F.baht(annual) }),
            fill(page.summaryLines.months, { pct: F.pct(t.pctSum, 2), sum: F.baht(t.amountSum) }),
            fill(page.summaryLines.remaining, { remaining: C.remainingText(t.remaining) })
          ];
        },
        snapshot: function () {
          var out = {};
          out[unit.id] = calc.phasingTotals(annual, savedPct).amounts.map(Math.round);
          return out;
        },
        onEdit: function () { editing = true; draftPct = savedPct.slice(); draftPct.unit = unit.id; draw(); },
        onSave: function () {
          var next = draftPct.slice();
          store.set(key, { monthPct: next, edited: calc.sharesDiffer(next, defaults) });
          editing = false;
          draw();
        },
        onCancel: function () { editing = false; draftPct = savedPct.slice(); draftPct.unit = unit.id; draw(); },
        onChange: function () { draw(); ctx.refreshMenu(); }
      });
      if (ctx.intro) ctx.intro.appendChild(bar);

      var banner = editing ? C.editBanner() : null;
      if (banner) root.appendChild(banner);

      // ---------- กราฟ + แถวผู้รับผิดชอบ + ตาราง (Grid คอลัมน์เดียวกัน) ----------
      var chart = C.barChart({
        values: calc.phasingTotals(annual, monthPct).amounts,
        ghost: prior,
        showValues: false,
        showMonths: false,
        legend: false,
        lead: h('span'),
        trail: h('span'),
        className: 'ph-chart',
        tooltip: function (i, v, g) {
          return F.monthFull(i) + ' · ' + page.legendTarget + ' ' + F.baht(v) + ' ' + L.baht +
            (g != null ? ' · ' + page.legendPrior + ' ' + F.baht(g) + ' ' + L.baht : '');
        }
      });

      // แถบผู้รับผิดชอบรายเดือน แสดงเฉพาะเมื่อมีการเปลี่ยนคนระหว่างปี (คนเดียวทั้งปี = แสดงในแถบบริบทแล้ว)
      var segs = calc.ownerSegments(data.assignments, data.salespeople, unit.id, year);
      var ownerRow = segs.length > 1 ? h('div', { class: 'ph-owner', role: 'row', 'aria-label': R.owner },
        h('div', { class: 'ph-cell ph-label ph-owner-label', title: owner.title }, R.owner),
        C.ownerStrip(data, unit.id, year, { tag: 'div' }),
        h('div', { class: 'ph-owner-trail' })) : null;

      var cells = { growth: [], pa: [], pct: [], amount: [] };
      var table = h('div', { class: 'ph-table' + (editing ? ' is-editing' : ''), role: 'table' });
      function cell(cls, content, title) { return h('div', { class: 'ph-cell ' + (cls || ''), title: title, role: 'cell' }, content); }

      // แถวหัวเดือน
      table.appendChild(cell('ph-head ph-label', R.month));
      F.MONTHS.forEach(function (m) { table.appendChild(cell('ph-head num', m)); });
      table.appendChild(cell('ph-head num ph-total', page.totalColumn));
      // ยอดขายปีก่อน (ป้ายปีอยู่ในหัวแถว)
      table.appendChild(cell('ph-label', [h('span', null, R.prior), prior ? C.historyTag(tree.priorYear) : null]));
      F.MONTHS.forEach(function (m, i) { table.appendChild(cell('num ph-prior', F.baht(prior ? prior[i] : null))); });
      cells.totalPrior = cell('num ph-total');
      table.appendChild(cells.totalPrior);
      // สัดส่วนรายเดือน + เป้าหมาย Net Sales (โหมดแก้ไข = percentAmountInput ตัวเดียวกับหน้า Top-down: parts[0] และ parts[1])
      var pctRow = [cell('ph-label', R.pct)];
      var amtRow = [cell('ph-label', R.amount)];
      F.MONTHS.forEach(function (m, i) {
        if (editing) {
          var pa = C.percentAmountInput({
            pct: monthPct[i], base: annual, label: F.monthFull(i),
            onCommit: function (p) { draftPct[i] = p; update(); }
          });
          cells.pa.push(pa);
          pa.parts[0].classList.add('ph-cell', 'num');
          pa.parts[1].classList.add('ph-cell', 'num');
          cells.pct.push(pa.parts[0]);
          cells.amount.push(pa.parts[1]);
          pctRow.push(pa.parts[0]);
          amtRow.push(pa.parts[1]);
        } else {
          var pc = cell('num ph-value');
          var am = cell('num ph-value');
          cells.pct.push(pc);
          cells.amount.push(am);
          pctRow.push(pc);
          amtRow.push(am);
        }
      });
      cells.totalPct = cell('num ph-total');
      cells.totalAmount = cell('num ph-total');
      pctRow.push(cells.totalPct);
      amtRow.push(cells.totalAmount);
      pctRow.concat(amtRow).forEach(function (c) { table.appendChild(c); });
      // การเติบโตเทียบปีก่อน
      table.appendChild(cell('ph-label', R.growth));
      F.MONTHS.forEach(function () { var g = cell('num'); cells.growth.push(g); table.appendChild(g); });
      cells.totalGrowth = cell('num ph-total');
      table.appendChild(cells.totalGrowth);
      // แถวคงเหลือ (คิดทั้งปี: ค่าอยู่ที่คอลัมน์รวม รายเดือนเป็นช่องว่าง)
      cells.remRow = h('div');
      table.appendChild(cells.remRow);

      // ลูกศรซ้าย/ขวาเลื่อนระหว่างเดือนในแถวเดียวกัน
      if (editing) {
        C.bindArrowNav(cells.pa.map(function (p) { return p.inputs.pct; }));
        C.bindArrowNav(cells.pa.map(function (p) { return p.inputs.amount; }));
      }

      var head = h('div', { class: 'ph-chart-head' },
        basis.source !== 'account' ? h('span', { class: 'history-tag ph-basis' }, page.basisTag[basis.source]) : null,
        C.legend([
          { className: 'bar-swatch', label: page.legendTarget },
          { className: 'bar-ghost-swatch', label: page.legendPrior }
        ]),
        editing ? h('button', {
          type: 'button', class: 'btn btn-sm btn-secondary no-print ph-reset',
          onClick: function () { defaults.forEach(function (p, i) { draftPct[i] = p; }); update(); }
        }, page.resetButton) : null);

      root.appendChild(h('section', { class: 'card ph-card' },
        head,
        h('div', { class: 'table-scroll ph-scroll' }, h('div', { class: 'ph-grid' }, chart, ownerRow, table))));

      // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) ----------
      function update() {
        var current = editing ? draftPct : savedPct;
        var totals = calc.phasingTotals(annual, current);
        chart.update(totals.amounts, prior);
        totals.amounts.forEach(function (amount, i) {
          var changed = editing && Math.abs(current[i] - savedPct[i]) > 1e-12;
          var differs = calc.sharesDiffer([current[i]], [defaults[i]]);
          if (editing) {
            cells.pa[i].update(current[i], annual);
            cells.pa[i].parts.forEach(function (p) { p.classList.toggle('is-dirty-cell', changed); });
          } else {
            cells.pct[i].textContent = F.number(current[i] * 100, 2);
            cells.amount[i].textContent = F.baht(amount);
          }
          // เดือนที่ต่างจากค่าตั้งต้น: จุดมุมช่อง + Tooltip ค่าตั้งต้น
          cells.pct[i].classList.toggle('has-default-dot', differs);
          cells.pct[i].title = differs ? fill(page.defaultTip, { pct: F.pct(defaults[i], 2) }) : '';
          C.clear(cells.growth[i]).appendChild(prior ? C.growthText(calc.growth(amount, prior[i])) : document.createTextNode('–'));
        });
        var priorTotal = prior ? calc.sum(prior) : null;
        cells.totalPrior.textContent = F.baht(priorTotal);
        cells.totalPct.textContent = F.number(totals.pctSum * 100, 2);
        cells.totalAmount.textContent = F.baht(totals.amountSum);
        cells.totalAmount.title = L.target + ' ' + F.baht(annual);
        C.clear(cells.totalGrowth).appendChild(prior ? C.growthText(calc.growth(totals.amountSum, priorTotal)) : document.createTextNode('–'));
        var rem = totals.remaining;
        var monthsEmpty = F.MONTHS.map(function () { return { text: '' }; });
        var remRow = C.remainingRow({
          tag: 'div', rem: rem,
          cells: monthsEmpty.concat([{ className: 'num ph-total', node: [h('span', { class: 'rem-line' }, C.remainingPct(rem)), h('span', { class: 'rem-line' }, C.remainingAmount(rem) + ' ' + L.baht)] }])
        });
        cells.remRow.replaceWith(remRow);
        cells.remRow = remRow;
        if (banner) banner.update(dirty());
        picker.update();
      }

      update();
    }

    draw();
  }

  SP.modules.phasing = { render: render };
})(window.SP);
