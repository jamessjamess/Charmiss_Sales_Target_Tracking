/*
 * modules/phasing/phasing.js — กระจายเป้ารายเดือน (Monthly Phasing)
 *
 * หน้าที่:        แถบบริบทแถวเดียว: Channel | หน่วยขาย ‹ › | ผู้รับผิดชอบ · GP (ป้ายตาม gpLabel ของ Channel) · เป้าหมายทั้งปี ·
 *                 ยอดขายปี {ปีก่อน} ⓘ · การเติบโต / ส่งออก ▾ (Excel / CSV) 1 แถวต่อเดือน + รวมทั้งปี + คงเหลือ
 *                 (subChannelPicker ตัวเดียวกับหน้าวางแผน SKU)
 *                 กราฟ 12 เดือน (แท่งทึบ = เป้าหมายปีนี้, เส้นประ = ยอดขายปีก่อน, ตัวเลขใน Tooltip) + แถวผู้รับผิดชอบ (เฉพาะเมื่อมีหลายคนในปี)
 *                 + ตาราง: ยอดขายปีก่อน / สัดส่วนรายเดือน / เป้าหมาย Net Sales / การเติบโต / แถวคงเหลือ (components.remainingRow)
 *                 เดือนที่ต่างจากค่าตั้งต้นมีจุดมุมช่อง + Tooltip ค่าตั้งต้น
 *                 เปิดมาเป็นโหมดดู / แก้ไข → แก้ % หรือบาทรายเดือน (เก็บ %) → บันทึก/ยกเลิก ส่วนต่างไปอยู่ที่คงเหลือ
 *                 Workflow ต่อ Account/เขต (workflowBar): ผู้รับผิดชอบจัดทำ → Sales Director อนุมัติ (ส่งได้เมื่อ Top-down อนุมัติแล้ว)
 *                 มุมมองรวม (CR-13, subChannelPicker allowAggregate): "รวมทั้ง {Channel}" / "รวมทุก Channel" — อ่านอย่างเดียว (ไม่มี workflowBar
 *                 แสดง "มุมมองรวม · เลือกหน่วยขายเพื่อแก้ไข") / แถบบริบท = เป้าหมายทั้งปี · ยอดขายปีก่อน · การเติบโตของผลรวม /
 *                 กราฟแท่งซ้อนตามหน่วยขาย (ทุก Channel = ตาม Channel) หรือแท่งรวม + เส้นประยอดปีก่อน (charts.stackedBars) Legend กดไปมุมมองนั้น /
 *                 ตาราง ยอดขายปีก่อน · สัดส่วนรายเดือน · เป้าหมาย · การเติบโต ของผลรวม + แถวย่อยต่อหน่วยขาย (พับได้) · บรรทัดหน่วยที่ยังจัดสรรไม่ครบ /
 *                 ส่งออกผลรวม + แถวต่อหน่วยขาย — ตัวเลขจาก calc.aggregatePhasing (คำนวณทุกครั้ง ไม่เก็บลง store)
 * อ่านจาก data/:  channels, history, content (pages.phasing, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId>, plan.<ปี>.workflow.*, ui.selection,
 *                 master.* (ผู้รับผิดชอบ, GP), ui.role, ui.currentMonth
 * store เขียน:    plan.<ปี>.phasing.<unitId> = { monthPct, edited } (ตอนกด บันทึก), ui.selection (Key เดียวกับหน้าวางแผน SKU
 *                 มุมมองรวม = { channel, unit (หน่วยขายล่าสุด), aggregate: 'channel' | 'all' } หน้าวางแผน SKU ใช้ channel/unit ตามเดิม)
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
    var chartMode = 'stack';   // มุมมองรวม: 'stack' แยกตามหน่วยขาย (หรือ Channel) | 'total' แท่งรวม
    var unitsOpen = false;     // มุมมองรวม: แถวย่อยต่อหน่วยขายกางอยู่หรือไม่

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
        allowAggregate: true,
        onSelect: function (channelId, unitId, aggregate) {
          store.set('ui.selection', aggregate ? { channel: channelId, unit: unitId, aggregate: aggregate } : { channel: channelId, unit: unitId });
          draw();
          ctx.refreshMenu();
        },
        // รายการใน Dropdown: สถานะคงเหลือของ Phasing + สถานะ Workflow (ข้อความ)
        remainingOf: function (id) { return calc.phasingTotals(calc.unitTarget(tree, id), phasingOf(id).monthPct).remaining; },
        workflowOf: function (id) { return W.stateOf(states, 'phasing', id).status; },
        ownerOf: function (id) { return C.ownerInfo(data, id, nowKey); }
      });
      var ch = picker.channel;
      var unit = picker.unit;
      var toolbar = h('div', { class: 'ctx-bar' }, picker);
      root.appendChild(toolbar);
      if (picker.aggregate) { drawAggregate(tree, picker, toolbar); return; }

      if (!ch || !unit) {
        root.appendChild(h('div', { class: 'callout callout-info' },
          h('strong', { class: 'callout-title' }, ch ? fill(page.noUnitsInChannel, { channel: ch.name, year: year, unit: ch.unitLabel }) : page.noChannels),
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
        ch.hasGP ? { label: ch.gpLabel || L.context.gp, value: F.pct(calc.gpOf(data, unit.id), 0) } : null,
        { label: L.context.annual, value: F.baht(annual) + ' ' + L.baht },
        { label: C.priorLabel(tree.priorYear), value: F.baht(unit.prior) + ' ' + L.baht },
        { label: L.context.growth, value: C.growthText(unit.growth) }
      ]).forEach(function (el) { toolbar.appendChild(el); });

      // ---------- ส่งออก ▾: เดือน · ยอดขายปีก่อน · สัดส่วนรายเดือน · เป้าหมาย Net Sales · การเติบโต + รวมทั้งปี + คงเหลือ ----------
      var exportBtn = C.exportButton({
        unsaved: dirty,
        build: function (source) {
          var X = page.exportSpec;
          var pct = source === 'draft' && editing ? draftPct : savedPct;
          var t = calc.phasingTotals(annual, pct);
          var rows = F.MONTHS.map(function (m, i) {
            return { month: F.monthYear(i, year), prior: prior ? prior[i] : null, pct: pct[i], amount: t.amounts[i], growth: prior ? calc.growth(t.amounts[i], prior[i]) : null };
          });
          var priorTotal = prior ? calc.sum(prior) : null;
          rows.push({ month: page.totalColumn, prior: priorTotal, pct: t.pctSum, amount: t.amountSum, growth: prior ? calc.growth(t.amountSum, priorTotal) : null });
          rows.push({ month: X.remaining + ' · ' + L.alert[t.remaining.status], prior: null, pct: t.remaining.status === 'empty' ? null : 1 - t.pctSum, amount: t.remaining.amount, growth: null });
          var columns = [
            { key: 'month', label: X.cols.month },
            { key: 'prior', label: fill(R.prior, { year: tree.priorYear }), type: 'money' },
            { key: 'pct', label: R.pct, type: 'pct' },
            { key: 'amount', label: R.amount, type: 'money' },
            { key: 'growth', label: X.cols.growth, type: 'pct', value: function (r) { return r.growth == null || isNaN(r.growth) ? null : r.growth; } }
          ];
          var status = W.stateOf(store.workflowStates(), 'phasing', unit.id).status;
          var stamp = C.exportStamp(status);
          return {
            filename: fill(X.file, { year: year, unit: C.fileSafe(unit.name), status: stamp.status, date: stamp.date }),
            sheets: [{ name: X.sheet, header: C.exportHeader(year, status, [[L.exporting.headerUnit, ch.name + ' · ' + unit.name], [L.context.annual, annual]]), columns: columns, rows: rows }]
          };
        }
      });

      // ---------- Workflow ของรายการนี้ที่หัวหน้า ----------
      bar = C.workflowBar({
        step: 'phasing', unitId: unit.id, year: year, ownerId: owner.id, extra: exportBtn,
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
      table.appendChild(cell('ph-label', C.priorLabel(tree.priorYear, fill(R.prior, { year: tree.priorYear }))));
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

    // ---------------------------------------------------------------------
    // มุมมองรวม (CR-13): อ่านอย่างเดียว / ตัวเลขทั้งหมดจาก calc.aggregatePhasing / คงเหลือคิดต่อหน่วยขาย (ไม่มีแถวคงเหลือรายเดือน)
    // ---------------------------------------------------------------------
    function drawAggregate(tree, picker, toolbar) {
      var A = page.aggregate;
      var P = L.picker;
      var all = picker.aggregate === 'all';
      var channels = all ? tree.children : [picker.channel];
      var ids = [];
      channels.forEach(function (c) { c.children.forEach(function (u) { ids.push(u.id); }); });
      var map = {};
      ids.forEach(function (id) { map[id] = phasingOf(id); });
      var agg = calc.aggregatePhasing(data, tree, map, ids, year);
      var title = all ? P.allTotal : fill(P.channelTotal, { channel: picker.channel.name, n: ids.length });
      function channelName(id) { var c = calc.findById(tree.children, id); return c ? c.name : ''; }
      function openUnit(unitId) {
        var u = calc.findById(agg.units, unitId);
        store.set('ui.selection', { channel: u.channelId, unit: u.id });
        draw();
        ctx.refreshMenu();
      }
      function openChannel(channelId) {
        var c = calc.findById(tree.children, channelId);
        store.set('ui.selection', { channel: channelId, unit: c && c.children[0] ? c.children[0].id : null, aggregate: 'channel' });
        draw();
      }

      C.contextStats([
        { label: L.context.annual, value: F.baht(agg.target) + ' ' + L.baht },
        { label: C.priorLabel(tree.priorYear), value: F.baht(agg.priorTotal) + ' ' + L.baht, title: fill(A.priorTip, { year: tree.priorYear, n: agg.units.length }) },
        { label: L.context.growth, value: C.growthText(calc.growth(agg.target, agg.priorTotal)) }
      ]).forEach(function (el) { toolbar.appendChild(el); });

      // ---------- ส่งออก ▾: ผลรวม (เป้าหมาย + ยอดขายปีก่อน) + แถวต่อหน่วยขาย ----------
      var X = A.exportSpec;
      var exportBtn = C.exportButton({
        unsaved: function () { return 0; },
        build: function () {
          var columns = [{ key: 'kind', label: X.cols.kind }, { key: 'unit', label: X.cols.unit }, { key: 'channel', label: X.cols.channel }]
            .concat(F.MONTHS.map(function (m, i) { return { key: 'm' + i, label: F.monthYear(i, year), type: 'money' }; }))
            .concat([{ key: 'total', label: X.cols.total, type: 'money' },
              { key: 'growth', label: X.cols.growth, type: 'pct', value: function (r) { return r.growth == null || isNaN(r.growth) ? null : r.growth; } }]);
          function row(kind, unit, channel, values, prior) {
            var r = { kind: kind, unit: unit, channel: channel };
            values.forEach(function (v, i) { r['m' + i] = v; });
            r.total = calc.sum(values);
            r.growth = prior != null ? calc.growth(r.total, prior) : null;
            return r;
          }
          var chLabel = all ? '' : picker.channel.name;
          var rows = [row(X.kinds.target, title, chLabel, agg.amounts, agg.priorTotal)];
          if (agg.prior) rows.push(row(fill(X.kinds.prior, { year: tree.priorYear }), title, chLabel, agg.prior, null));
          agg.units.forEach(function (u) { rows.push(row(X.kinds.target, u.name, channelName(u.channelId), u.amounts, u.priorTotal)); });
          var stamp = C.exportStamp('draft');
          return {
            filename: fill(X.file, { year: year, unit: C.fileSafe(title), date: stamp.date }),
            sheets: [{ name: X.sheet, header: C.exportHeader(year, A.exportStatus, [[L.exporting.headerUnit, title], [L.context.annual, agg.target]]), columns: columns, rows: rows }]
          };
        }
      });
      // หัวหน้า: ไม่มีปุ่มแก้ไข / ส่งอนุมัติ (มุมมองรวมอ่านอย่างเดียว)
      bar = h('div', { class: 'ph-agg-bar' }, h('span', { class: 'badge tag-muted ph-agg-note' }, A.readOnly), exportBtn);
      if (ctx.intro) ctx.intro.appendChild(bar);

      // ---------- กราฟ: แท่งซ้อนตามหน่วยขาย (ทุก Channel = ตาม Channel) | แท่งรวม + เส้นประยอดปีก่อน ----------
      var n = agg.units.length;
      var stacks = all
        ? tree.children.map(function (c) {
          var list = agg.units.filter(function (u) { return u.channelId === c.id; });
          return { id: c.id, label: c.name, colorToken: c.color, shade: 1, values: calc.addMonthly(list.map(function (u) { return u.amounts; })) };
        })
        : agg.units.map(function (u, i) { return { id: u.id, label: u.name, colorToken: u.color, shade: n > 1 ? 1 - i * (0.62 / (n - 1)) : 1, values: u.amounts }; });
      var modeSeg = C.segmented({
        label: A.chartLabel, value: chartMode,
        options: [{ value: 'total', label: A.chartModes.total }, { value: 'stack', label: all ? A.chartModes.channels : A.chartModes.units }],
        onChange: function (v) { chartMode = v; draw(); }
      });
      var chart = SP.core.charts.stackedBars({
        stacks: stacks, line: agg.prior, mode: chartMode, totalToken: all ? '--c-bar' : picker.channel.color,
        labels: { total: A.legendTotal, line: fill(A.legendPrior, { year: tree.priorYear }) },
        tick: SP.core.charts.millionTick,
        onLegend: function (id) { if (all) openChannel(id); else openUnit(id); },
        legendTip: function (name) { return fill(A.legendTip, { name: name }); },
        tip: function (m) {
          var out = chartMode === 'total' ? [] : stacks.map(function (s) { return [s.label, F.baht(s.values[m]) + ' ' + L.baht]; });
          out.push([A.tipTotal, F.baht(agg.amounts[m]) + ' ' + L.baht]);
          if (agg.prior) out.push([fill(A.tipPrior, { year: tree.priorYear }), F.baht(agg.prior[m]) + ' ' + L.baht]);
          return out;
        }
      });

      // ---------- ตาราง: ผลรวม + แถวย่อยต่อหน่วยขาย (พับได้) ----------
      var table = h('div', { class: 'ph-table ph-agg-table', role: 'table' });
      function cell(cls, content, title) { return h('div', { class: 'ph-cell ' + (cls || ''), title: title, role: 'cell' }, content); }
      function monthsRow(label, values, total, cls, fmt) {
        table.appendChild(label);
        values.forEach(function (v) { table.appendChild(cell('num ' + (cls || ''), fmt(v))); });
        table.appendChild(cell('num ph-total', total));
      }
      table.appendChild(cell('ph-head ph-label', R.month));
      F.MONTHS.forEach(function (m) { table.appendChild(cell('ph-head num', m)); });
      table.appendChild(cell('ph-head num ph-total', page.totalColumn));
      var noValues = F.MONTHS.map(function () { return null; });
      monthsRow(cell('ph-label', C.priorLabel(tree.priorYear, fill(R.prior, { year: tree.priorYear }))), agg.prior || noValues, F.baht(agg.priorTotal), 'ph-prior', F.baht);
      monthsRow(cell('ph-label', R.pct), agg.monthPct, agg.total ? F.number(calc.sum(agg.monthPct) * 100, 2) : '–', 'ph-value', function (v) { return F.number(v * 100, 2); });
      monthsRow(cell('ph-label', R.amount), agg.amounts, F.baht(agg.total), 'ph-value', F.baht);
      table.appendChild(cell('ph-label', R.growth));
      agg.growth.forEach(function (g) { table.appendChild(cell('num', C.growthText(g))); });
      table.appendChild(cell('num ph-total', C.growthText(agg.growthTotal)));
      table.appendChild(h('div', { class: 'ph-cell ph-agg-toggle', role: 'cell' },
        h('button', {
          type: 'button', class: 'ph-agg-toggle-btn', 'aria-expanded': unitsOpen ? 'true' : 'false', title: A.unitsToggle,
          onClick: function () { unitsOpen = !unitsOpen; draw(); }
        }, (unitsOpen ? '▾ ' : '▸ ') + fill(A.unitsRow, { n: n }))));
      if (unitsOpen) {
        agg.units.forEach(function (u) {
          var name = all ? channelName(u.channelId) + ' · ' + u.name : u.name;
          var label = cell('ph-label ph-agg-unit', h('button', { type: 'button', class: 'ph-agg-link', title: fill(A.openUnit, { name: u.name }), onClick: function () { openUnit(u.id); } }, name));
          label.style.setProperty('--c', C.tokenVar(u.color));
          monthsRow(label, u.amounts, F.baht(calc.sum(u.amounts)), 'ph-agg-sub', F.baht);
        });
      }

      // บรรทัดสรุปคงเหลือ (คงเหลือคิดต่อหน่วยขาย) + ลิงก์ไปหน่วยที่ยังจัดสรรไม่ครบ
      var incomplete = agg.units.filter(function (u) { return agg.incomplete.indexOf(u.id) >= 0; });
      var status = h('p', { class: 'ph-agg-status' + (incomplete.length ? ' has-issues' : '') },
        incomplete.length ? fill(A.incomplete, { n: incomplete.length }) : A.complete,
        incomplete.map(function (u) {
          return h('button', { type: 'button', class: 'ph-agg-link ph-agg-issue', title: fill(A.openUnit, { name: u.name }), onClick: function () { openUnit(u.id); } },
            u.name + ' · ', h('span', { class: 'text-' + u.remaining.status }, C.remainingText(u.remaining)));
        }));

      root.appendChild(h('section', { class: 'card ph-card ph-agg' },
        h('div', { class: 'ph-chart-head' }, h('span', { class: 'ph-agg-title' }, fill(A.chartTitle, { name: title })), modeSeg),
        h('div', { class: 'table-scroll ph-scroll' }, h('div', { class: 'ph-grid' }, chart, table)),
        status));
    }

    draw();
  }

  SP.modules.phasing = { render: render };
})(window.SP);
