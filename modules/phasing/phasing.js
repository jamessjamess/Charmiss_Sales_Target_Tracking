/*
 * modules/phasing/phasing.js — ขั้นที่ 2 Sub-channel Allocation (CR-23) — ชื่อหน้ามาจาก content.js
 *
 * หน้าที่:        Sales Director แบ่งเป้าหมายของ Channel ลงหน่วยขาย (ส่วน A) และกระจายเป็นรายเดือน (ส่วน B) ในหน้าเดียว
 *                 แถบบริบท: ปุ่ม Channel (Channel ในทีมขึ้นก่อน) · เป้าหมาย Channel (กำหนดโดย Management) · ยอดขายปี {ปีก่อน} ⓘ · การเติบโต
 *                 + บรรทัดแจ้งเมื่อ Management เปลี่ยนเป้าหมาย Channel (calc.channelTargetChange จาก master.audit จนกว่าจะกดปิด)
 *                 ส่วน A ตารางหน่วยขาย: แถว รวมทั้ง {Channel} (มุมมองรวมของส่วน B) · หน่วยขาย (+ ผู้รับผิดชอบ · จุดสถานะเป้าหมายรายเดือน) ·
 *                   ยอดขาย 3 ปี (หัวกลุ่ม) · % ใน Channel · เป้าหมาย {ปี} · % ของ Total (อ่านอย่างเดียว) · การเติบโต · เป้าหมายเทียบปีก่อน
 *                   (charts.vsLastYearBar สเกลร่วมทุกแถวในตารางนี้) · คงเหลือใน {Channel} / คลิกแถว = เลือกหน่วยขายที่แสดงในส่วน B
 *                   Channel ที่เป้าหมายเป็น 0 = รอ Management กำหนดเป้าหมาย · ปุ่มแก้ไขกดไม่ได้ (calc.unitAllocationBlock → workflowBar editBlocked)
 *                 ส่วน B เป้าหมายรายเดือนของหน่วยที่เลือก: กราฟ (พับได้ ui.phasingChart) + แถวผู้รับผิดชอบ (หลายคน) + ตาราง 12 เดือน + คงเหลือ /
 *                   CR-24: ยอดขายอ้างอิงรายเดือน (ยอดจริงล่าสุดของเดือน · หัวเดือนบอกปีที่ใช้ · เส้นแบ่งจางระหว่างเดือนปิดล่าสุดกับเดือนถัดไป) ·
 *                   ค่าตั้งต้นสัดส่วน = ยอดอ้างอิง ÷ L12M · ส่วน A คอลัมน์ยอดขาย 2024 · 2025 · L12M /
 *                   มุมมองรวมทั้ง Channel อ่านอย่างเดียว (calc.aggregatePhasing · charts.stackedBars)
 *                 โหมดแก้ไข (ครั้งเดียวทั้ง 2 ส่วนของ Channel): % ใน Channel / เป้าหมาย (บาท) · + {unitLabel} · ถังขยะ · เติมตามสัดส่วนปีก่อน ·
 *                   กระจายตามสัดส่วนปัจจุบัน · % / บาทรายเดือนของทุกหน่วยใน Channel · คืนค่าตามสัดส่วนปีก่อน → บันทึก / ยกเลิก
 *                 ส่งออก ▾ ชีต 1 หน่วยขาย (ยอดขาย 3 ปี · % · เป้าหมาย) · ชีต 2 รายเดือนของทุกหน่วยใน Channel (CSV = ชีต 1)
 *                 สิทธิ์: resource unitTargets (workflowBar step phasing + Channel) — Sales Director แก้ไข · บทบาทอื่นอ่านอย่างเดียว
 * อ่านจาก data/:  channels, history, content (pages.phasing, pages.topDown.title, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId>, plan.<ปี>.workflow.*, ui.selection, ui.phasingChart,
 *                 ui.targetNotice, master.audit, master.* (ผู้รับผิดชอบ, GP), ui.role, ui.currentMonth, master.teams
 * store เขียน:    plan.<ปี>.topDown (units / pct ของหน่วยขาย) · plan.<ปี>.phasing.<unitId> = { monthPct, edited } (ตอนกด บันทึก ·
 *                 หน่วยที่นำออกลบ Key) · ui.selection = { channel, unit, aggregate: 'channel' } (Key เดียวกับหน้า SKU Planning) ·
 *                 ui.phasingChart · ui.targetNotice = { '<ปี>.<channelId>': at ของรายการที่กดปิด }
 *
 * ตัวเลขทุกตัว (บาท ↔ %, ผลรวม, คงเหลือ, การเติบโต, Seasonality, ยอดขายย้อนหลัง) มาจาก SP.core.calc / สิทธิ์จาก SP.core.permissions
 * การกระจายยอดคงเหลือต้องกดเองเท่านั้น (ไม่ทำอัตโนมัติ)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var G = SP.core.charts;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var P = SP.core.permissions;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function normalizeTD(plan) {
    plan.pct = plan.pct || {};
    plan.units = plan.units || {};
    plan.channels = plan.channels || [];
    plan.channels.forEach(function (id) { if (!plan.units[id]) plan.units[id] = []; });
    return plan;
  }
  function differs(a, b) {
    if (!a || !b) return !!(a || b);
    return a.some(function (v, i) { return Math.abs((v || 0) - (b[i] || 0)) > 1e-12; });
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var R = page.rows;
    var cols = page.columns;
    var year = store.year();
    var K = SP.core.clock;
    var fullYears = K.fullYears();   // CR-24: ยอดขายปีเต็ม 2 ปี + L12M
    var nHist = fullYears.length + 1;
    var lastClosed = K.parse(K.lastClosedMonth());
    var data = store.data();
    var nowKey = store.currentKey();
    var tdKey = store.planKey('topDown');
    var savedTD = normalizeTD(store.get(tdKey));
    var draftTD = clone(savedTD);
    var editing = false;
    var draftPhasing = {};   // หน่วยขายที่แก้รายเดือนในรอบนี้ → monthPct
    var removed = [];        // หน่วยขายที่นำออกในรอบนี้ (ลบเป้าหมายรายเดือนตอนบันทึก)
    var chartMode = 'stack';
    var unitsOpen = false;
    var bar = null;
    var topDownEntry = SP.core.registry.byId('topDown');
    var topDownTitle = (SP.data.content.pages.topDown && SP.data.content.pages.topDown.title) || topDownEntry.title;

    function curTD() { return editing ? draftTD : savedTD; }
    function tree() { return P.teamFirst(calc.topDown(data, curTD(), year), P.user()); }
    function phasingKey(id) { return store.planKey('phasing.' + id); }
    function savedPhasing(id) { return store.get(phasingKey(id)).monthPct; }
    function phasingOf(id) { return editing && draftPhasing[id] ? draftPhasing[id] : savedPhasing(id); }
    function defaultsOf(id) { return store.getDefault(phasingKey(id)).monthPct; }

    // จำนวนรายการที่ยังไม่บันทึก: % ของหน่วยขาย · หน่วยขายที่เพิ่ม/นำออก · เดือนที่แก้
    function dirty() {
      if (!editing) return 0;
      var n = 0;
      var ids = {};
      savedTD.channels.concat(draftTD.channels).forEach(function (c) {
        (savedTD.units[c] || []).concat(draftTD.units[c] || []).forEach(function (id) { ids[id] = true; });
        if (JSON.stringify(savedTD.units[c] || []) !== JSON.stringify(draftTD.units[c] || [])) n++;
      });
      Object.keys(ids).forEach(function (id) { if (Math.abs((savedTD.pct[id] || 0) - (draftTD.pct[id] || 0)) > 1e-12) n++; });
      Object.keys(draftPhasing).forEach(function (id) {
        if (removed.indexOf(id) >= 0) return;
        var cur = savedPhasing(id);
        n += draftPhasing[id].filter(function (p, i) { return Math.abs(p - cur[i]) > 1e-12; }).length;
      });
      return n;
    }
    C.guardUnsaved(dirty);

    // หน่วยที่เลือก (ui.selection) — ไม่อยู่ใน Channel = หน่วยแรก / aggregate = รวมทั้ง Channel (ค่า 'all' เดิม → รวมทั้ง Channel)
    function selection(t) {
      var sel = store.get('ui.selection') || {};
      var r = calc.resolveSelection(t, sel);
      return { channel: r.channel, unit: r.unit, aggregate: !!(sel.aggregate && r.channel && r.channel.children.length) };
    }
    function select(channelId, unitId, aggregate) {
      store.set('ui.selection', aggregate ? { channel: channelId, unit: unitId, aggregate: 'channel' } : { channel: channelId, unit: unitId });
    }
    function leaveEdit() { editing = false; draftTD = clone(savedTD); draftPhasing = {}; removed = []; }

    // ---------------------------------------------------------------------
    // ทั้งหน้า
    // ---------------------------------------------------------------------
    function draw() {
      C.clear(root);
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      var t = tree();
      var sel = selection(t);
      var ch = sel.channel;
      var unit = sel.unit;

      if (!ch) {
        root.appendChild(h('div', { class: 'callout callout-info' },
          h('strong', { class: 'callout-title' }, page.noChannels),
          h('p', null, h('a', { href: SP.core.paths.to(topDownEntry.path) }, fill(page.goTopDown, { page: topDownTitle })))));
        return;
      }
      var block = calc.unitAllocationBlock(t, ch.id);

      // ---------- แถบบริบท: ปุ่ม Channel + ตัวเลขของ Channel ----------
      var chSeg = C.segmented({
        label: page.channelLabel, value: ch.id,
        options: t.children.map(function (c) { return { value: c.id, label: c.name, title: c.fullName }; }),
        onChange: function (id) {
          if (!C.confirmDiscard(dirty())) return;
          leaveEdit();
          var next = calc.findById(t.children, id);
          select(id, next && next.children[0] ? next.children[0].id : null, false);
          draw();
          ctx.refreshMenu();
        }
      });
      var toolbar = h('div', { class: 'ctx-bar sa-ctx' }, chSeg);
      C.contextStats([
        { label: page.stats.target, value: h('span', null, F.baht(ch.amount) + ' ' + L.baht + ' ', h('span', { class: 'muted sa-target-by' }, page.stats.targetBy)) },
        { label: C.priorLabel(t.priorYear), value: F.baht(ch.prior) + ' ' + L.baht },
        { label: L.context.growth, value: C.growthText(ch.growth) }
      ]).forEach(function (el) { toolbar.appendChild(el); });
      root.appendChild(toolbar);

      // บรรทัดแจ้ง: Management เปลี่ยนเป้าหมาย Channel หลังจัดสรรแล้ว (หน่วยขายคง % เดิม) — แสดงจนกว่าจะกดปิด
      var noticeKey = year + '.' + ch.id;
      var dismissed = store.get('ui.targetNotice') || {};
      var change = ch.children.length ? calc.channelTargetChange(store.get('master.audit'), ch.id, year, dismissed[noticeKey]) : null;
      if (change) {
        root.appendChild(h('p', { class: 'sa-notice', role: 'status' },
          h('span', null, fill(page.changeNotice, { channel: ch.name, from: F.baht(change.oldValue), to: F.baht(change.newValue), at: F.dateTime(change.at) })),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm sa-notice-close', title: page.changeDismissTitle, onClick: function () {
            var next = store.get('ui.targetNotice') || {};
            next[noticeKey] = change.at;
            store.set('ui.targetNotice', next);
            draw();
          } }, page.changeDismiss)));
      }

      // ---------- ส่งออก ▾ + ปุ่มแก้ไข ----------
      var exportBtn = C.exportButton({ unsaved: dirty, build: function (source) { return exportSpec(source, ch.id); } });
      var owner = unit ? C.ownerInfo(data, unit.id, nowKey) : { id: null };
      bar = C.workflowBar({
        step: 'phasing', unitId: unit ? unit.id : null, channelId: ch.id, year: year, ownerId: owner.id, extra: exportBtn,
        title: function () { return fill(page.workflowTitle, { unit: unit ? unit.name : ch.name }); },
        editing: function () { return editing; },
        editBlocked: function () { return block === 'noTarget' ? fill(page.editBlocked, { channel: ch.name }) : null; },
        facts: function () { return { remaining: unit ? calc.phasingTotals(unit.amount, savedPhasing(unit.id)).remaining.status : 'empty' }; },
        summary: function () {
          if (!unit) return [];
          var tt = calc.phasingTotals(unit.amount, savedPhasing(unit.id));
          return [fill(page.summaryLines.annual, { amount: F.baht(unit.amount) }),
            fill(page.summaryLines.months, { pct: F.pct(tt.pctSum, 2), sum: F.baht(tt.amountSum) }),
            fill(page.summaryLines.remaining, { remaining: C.remainingText(tt.remaining) })];
        },
        snapshot: function () {
          var out = {};
          if (unit) out[unit.id] = calc.phasingTotals(unit.amount, savedPhasing(unit.id)).amounts.map(Math.round);
          return out;
        },
        onEdit: function () { editing = true; draftTD = clone(savedTD); draftPhasing = {}; removed = []; draw(); },
        onSave: save,
        onCancel: function () { leaveEdit(); draw(); },
        onChange: function () { draw(); ctx.refreshMenu(); }
      });
      if (ctx.intro) ctx.intro.appendChild(bar);

      // แถบโหมดแก้ไขอยู่ท้ายแถบบริบท (แถวเดียวกัน · จอแคบขึ้นบรรทัดใหม่)
      var banner = editing ? C.editBanner() : null;
      if (banner) { banner.update(dirty()); banner.classList.add('sa-banner'); toolbar.appendChild(banner); }

      var partB = null;
      function buildB() {
        var t2 = tree();
        var s2 = selection(t2);
        var c2 = calc.findById(t2.children, ch.id);
        return s2.aggregate ? aggregateCard(t2, c2) : monthlyCard(t2, c2, s2.unit, banner);
      }
      root.appendChild(unitsCard(t, ch, sel, block, banner, function () {
        if (!partB) return;
        var next = buildB();
        partB.replaceWith(next);
        partB = next;
      }));
      if (!ch.children.length) return;
      partB = buildB();
      root.appendChild(partB);
    }

    function save() {
      if (JSON.stringify(draftTD) !== JSON.stringify(savedTD)) store.set(tdKey, draftTD);
      var inPlan = {};
      draftTD.channels.forEach(function (c) { (draftTD.units[c] || []).forEach(function (id) { inPlan[id] = true; }); });
      Object.keys(draftPhasing).forEach(function (id) {
        if (!inPlan[id] || !differs(draftPhasing[id], savedPhasing(id))) return;
        var next = draftPhasing[id].slice();
        store.set(phasingKey(id), { monthPct: next, edited: calc.sharesDiffer(next, defaultsOf(id)) });
      });
      removed.forEach(function (id) { if (!inPlan[id]) store.remove(phasingKey(id)); });
      savedTD = normalizeTD(store.get(tdKey));
      leaveEdit();
      draw();
      ctx.refreshMenu();
    }

    // ---------------------------------------------------------------------
    // ส่วน A: จัดสรรลงหน่วยขาย
    // ---------------------------------------------------------------------
    function unitsCard(t, ch, sel, block, banner, onValues) {
      var refs = { rows: {} };
      var ids = ch.children.map(function (u) { return u.id; });
      var canEditHere = editing && !block;

      // เพิ่ม / ลบ / เติม / กระจาย = สร้างทั้งหน้าใหม่ · กรอกค่าในช่อง = update() ในที่
      function setShares(list, shares) { list.forEach(function (id, i) { draftTD.pct[id] = shares[i]; }); draw(); }

      function saleTip(node) {
        var info = calc.unitInfo(data, node.id);
        var c = info && info.channel;
        if (!c) return '';
        var T = page.saleTip;
        var gpLabel = c.gpLabel || L.context.gp;
        var gp = calc.gpOf(data, node.id);
        if (c.hasGP !== false && gp == null) return fill(T.missing, { gpLabel: gpLabel, unit: node.name });
        var sale = calc.saleFromNet(node.amount, gp, c.hasGP);
        return fill(c.hasGP === false ? T.noGp : T.gp, { sale: F.baht(sale), gpLabel: gpLabel, gp: F.pct(gp, 0), vat: F.number(1 + SP.data.settings.VAT, 2) });
      }
      // สเกลจริงร่วมทุกแถวในตารางนี้ (แถวรวมของ Channel + หน่วยขาย) เริ่มที่ 0 · ขีด = ยอดขายปีล่าสุด
      function scaleOf(c) {
        var v = [c.amount, c.prior];
        c.children.forEach(function (u) { v.push(u.amount, u.prior); });
        return G.niceScaleMax(v);
      }
      function histCells(id) {
        var vals = calc.salesHistory(data, id, fullYears).concat([calc.l12m(data, id)]);
        return vals.map(function (v, k) { return h('td', { class: 'num sa-hist' + (k === vals.length - 1 ? ' is-latest' : '') }, F.millionPlain(v)); });
      }
      function pick(unitId) {
        if (unitId === null) { if (!sel.aggregate) { select(ch.id, sel.unit ? sel.unit.id : null, true); draw(); } return; }
        if (!sel.aggregate && sel.unit && sel.unit.id === unitId) return;
        select(ch.id, unitId, false);
        draw();
      }

      // แถวรวมทั้ง Channel = มุมมองรวมของส่วน B (อ่านอย่างเดียว)
      refs.aggCompare = h('td', { class: 'sa-compare' });
      var aggRow = ch.children.length ? h('tr', { class: 'sa-row sa-agg-row' + (sel.aggregate ? ' is-selected' : ''), dataset: { unit: '' } },
        h('th', { scope: 'row', class: 'sa-name' },
          h('button', { type: 'button', class: 'sa-pick', title: page.aggregateRowTip, 'aria-pressed': sel.aggregate ? 'true' : 'false',
            onClick: function () { pick(null); } }, fill(page.aggregateRow, { channel: ch.name }))),
        histCells(ch.id),
        h('td', { class: 'num is-derived' }, F.pct(1, 2)),
        h('td', { class: 'num sa-amount' }, F.baht(ch.amount)),
        h('td', { class: 'num is-derived' }, F.pct(ch.pct, 2)),
        h('td', { class: 'num' }, C.growthText(ch.growth)),
        refs.aggCompare,
        editing ? h('td', { class: 'sa-manage' }) : null) : null;
      if (aggRow) aggRow.addEventListener('click', function (e) { if (!e.target.closest('input,button,a,select')) pick(null); });

      var unitRows = ch.children.map(function (u) {
        var ref = {
          tdIn: h('td', { class: 'num sa-pct' }), tdAmt: h('td', { class: 'num sa-amount' }),
          tdTotal: h('td', { class: 'num is-derived' }), growth: h('td', { class: 'num' }), compare: h('td', { class: 'sa-compare' }), pa: null,
          dot: h('span', { class: 'dot sa-dot', role: 'img' })
        };
        if (canEditHere) {
          ref.pa = C.percentAmountInput({ pct: u.pct, base: ch.amount, label: u.name, onCommit: function (pv) { draftTD.pct[u.id] = pv; update(); onValues(); } });
          ref.tdIn.appendChild(ref.pa.parts[0]);
          ref.tdAmt.appendChild(ref.pa.parts[1]);
        }
        refs.rows[u.id] = ref;
        var o = C.ownerInfo(data, u.id, nowKey);
        var selected = !sel.aggregate && sel.unit && sel.unit.id === u.id;
        var trash = canEditHere ? C.trashButton({
          label: L.removeFromPlan,
          confirmTitle: fill(page.removeUnitConfirm, { name: u.name, year: year }),
          lines: [fill(page.removeUnitLine, { pct: F.pct(u.pct, 2), amount: F.baht(u.amount) }), fill(page.removeUnitMonthly, { name: u.name })],
          onConfirm: function () {
            draftTD.units[ch.id] = draftTD.units[ch.id].filter(function (id) { return id !== u.id; });
            delete draftTD.pct[u.id];
            delete draftPhasing[u.id];
            if (removed.indexOf(u.id) < 0) removed.push(u.id);
            draw();
          }
        }) : null;
        var tr = h('tr', { class: 'sa-row' + (selected ? ' is-selected' : ''), dataset: { unit: u.id }, style: { '--c': C.tokenVar(ch.color) } },
          h('th', { scope: 'row', class: 'sa-name', title: fill(L.owner.tip, { name: o.name }) + '\n' + o.title },
            h('button', { type: 'button', class: 'sa-pick', title: fill(page.selectTip, { name: u.name }), 'aria-pressed': selected ? 'true' : 'false',
              onClick: function () { pick(u.id); } }, u.name),
            ref.dot,
            h('span', { class: 'sa-owner' + (o.vacant ? ' is-vacant' : '') }, o.name)),
          histCells(u.id),
          ref.tdIn, ref.tdAmt, ref.tdTotal, ref.growth, ref.compare,
          editing ? h('td', { class: 'sa-manage' }, trash) : null);
        tr.addEventListener('click', function (e) { if (!e.target.closest('input,button,a,select')) pick(u.id); });
        return tr;
      });

      refs.remRow = h('tr');
      // + {unitLabel} อยู่ที่หัวส่วน A (ไม่ใช้แถวแยก ให้ตารางพอดีจอ)
      var addPicker = canEditHere ? C.accountPicker({
        label: fill(L.addUnitButton, { unit: ch.unitLabel }), placeholder: page.addPlaceholder,
        emptyLabel: fill(L.noMoreUnitsOf, { unit: ch.unitLabel, master: L.masterOf[ch.allocationUnit] || L.masterOf.ACCOUNT }),
        className: 'sa-add-unit', options: calc.availableUnits(data, draftTD, ch.id),
        onPick: function (id) {
          draftTD.units[ch.id].push(id);
          draftTD.pct[id] = 0;
          removed = removed.filter(function (x) { return x !== id; });
          select(ch.id, id, false);
          draw();
        }
      }) : null;

      refs.axis = h('span');
      var head1 = h('tr', null,
        h('th', { scope: 'col', rowspan: '2' }, cols.name),
        h('th', { scope: 'colgroup', colspan: String(nHist), class: 'sa-hist-group', title: cols.historyTip }, h('span', { class: 'has-tip' }, cols.history)),
        h('th', { scope: 'col', rowspan: '2', class: 'num', title: cols.pctChannelTip }, h('span', { class: 'has-tip' }, cols.pctChannel)),
        h('th', { scope: 'col', rowspan: '2', class: 'num', title: cols.amountTip }, h('span', { class: 'has-tip' }, fill(cols.amount, { year: year }))),
        h('th', { scope: 'col', rowspan: '2', class: 'num', title: cols.pctTotalTip }, h('span', { class: 'has-tip' }, cols.pctTotal)),
        h('th', { scope: 'col', rowspan: '2', class: 'num' }, cols.growth),
        h('th', { scope: 'col', rowspan: '2', class: 'sa-vly-head', title: L.vsLastYear.headerTip }, h('span', { class: 'has-tip' }, L.vsLastYear.header), refs.axis),
        editing ? h('th', { scope: 'col', rowspan: '2' }, cols.manage) : null);
      var head2 = h('tr', { class: 'sa-head-years' }, fullYears.map(function (y) {
        var tip = y === lastClosed.year - 1 && lastClosed.month < 12
          ? fill(L.priorInfo.overlapTip, { year: y, months: F.monthRange(lastClosed.month, 11) }) : fill(L.priorInfo.fullYearTip, { year: y });
        return h('th', { scope: 'col', class: 'num sa-hist', title: tip }, h('span', { class: 'has-tip' }, String(y)));
      }).concat([h('th', { scope: 'col', class: 'num sa-hist sa-l12m', title: K.rangeLabel(false) }, C.priorLabel(null, L.priorInfo.short))]));
      var table = h('table', { class: 'sa-table' + (editing ? ' is-editing' : '') },
        h('colgroup', null, h('col', { class: 'col-name' }), fullYears.concat(['l12m']).map(function () { return h('col', { class: 'col-hist' }); }),
          h('col', { class: 'col-pct' }), h('col', { class: 'col-amount' }), h('col', { class: 'col-pct-total' }), h('col', { class: 'col-growth' }),
          h('col', { class: 'col-compare' }), editing ? h('col', { class: 'col-manage' }) : null),
        h('thead', null, head1, head2),
        h('tbody', null, aggRow, unitRows),
        h('tfoot', null, refs.remRow));

      // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) ----------
      function update() {
        var c = calc.findById(tree().children, ch.id) || ch;
        var scaleMax = scaleOf(c);
        var axis = G.vsLastYearAxis(scaleMax);
        refs.axis.replaceWith(axis);
        refs.axis = axis;
        if (aggRow) C.clear(refs.aggCompare).appendChild(G.vsLastYearBar(c.amount, c.prior, scaleMax, { colorToken: c.color, year: t.priorYear }));
        c.children.forEach(function (u) {
          var r = refs.rows[u.id];
          if (!r) return;
          if (r.pa) r.pa.update(u.pct, c.amount);
          else { r.tdIn.textContent = F.pct(u.pct, 2); r.tdAmt.textContent = F.baht(u.amount); }
          r.tdAmt.title = saleTip(u);
          var changed = editing && Math.abs((draftTD.pct[u.id] || 0) - (savedTD.pct[u.id] || 0)) > 1e-12;
          r.tdIn.classList.toggle('is-dirty-cell', changed);
          r.tdAmt.classList.toggle('is-dirty-cell', changed);
          r.tdTotal.textContent = F.pct(u.pctOfTotal, 2);
          C.clear(r.growth).appendChild(C.growthText(u.growth));
          C.clear(r.compare).appendChild(G.vsLastYearBar(u.amount, u.prior, scaleMax, { colorToken: c.color, year: t.priorYear }));
          // จุดสถานะคงเหลือของเป้าหมายรายเดือน (ข้อความใน Tooltip — ไม่สื่อด้วยสีอย่างเดียว)
          var mrem = calc.phasingTotals(u.amount, phasingOf(u.id)).remaining;
          var st = fill(page.monthlyStatus, { status: C.remainingText(mrem) });
          r.dot.className = 'dot dot-' + mrem.status + ' sa-dot';
          r.dot.title = st;
          r.dot.setAttribute('aria-label', st);
        });
        // แถวคงเหลือใน Channel: % ที่คอลัมน์ % ใน Channel · บาทที่คอลัมน์เป้าหมาย (Channel ว่าง = ยังไม่มี {unitLabel})
        var rem = c.remaining;
        var normalize = canEditHere && (rem.status === 'short' || rem.status === 'over') && ids.length
          ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary sa-normalize', title: page.normalizeTitle, onClick: function () {
            setShares(ids, calc.normalizeShares(ids.map(function (id) { return draftTD.pct[id] || 0; })));
          } }, page.normalize) : null;
        var menu = canEditHere && ids.length ? C.menuButton([{ label: page.usePriorShares, title: page.usePriorSharesTitle, onClick: function () {
          setShares(ids, calc.priorShares(c.children.map(function (u) { return u.prior; })));
        } }]) : null;
        var cells = fullYears.concat(['l12m']).map(function () { return { text: '' }; }).concat([
          { text: ids.length ? C.remainingPct(rem) : '', className: 'num' },
          { text: C.remainingAmount(rem), className: 'num' },
          { text: '' }, { text: '' }
        ]);
        if (editing) cells.push({ node: h('span', { class: 'sa-manage-group' }, normalize, menu), colspan: 2, className: 'sa-manage' });
        else cells.push({ text: '' });
        var remRow = C.remainingRow({
          rem: rem, className: 'sa-rem',
          label: ids.length ? fill(page.remainingIn, { channel: c.name }) : fill(page.noUnits, { unit: c.unitLabel }),
          cells: cells
        });
        refs.remRow.replaceWith(remRow);
        refs.remRow = remRow;
        if (banner) banner.update(dirty());
      }

      var wait = block === 'noTarget' ? h('div', { class: 'callout callout-info sa-wait', role: 'note' },
        h('strong', { class: 'callout-title' }, fill(page.waitTarget, { channel: ch.name })),
        h('a', { href: SP.core.paths.to(topDownEntry.path) }, fill(page.waitTargetLink, { page: topDownTitle }))) : null;
      var card = h('section', { class: 'card sa-units', style: { '--c': C.tokenVar(ch.color) } },
        h('div', { class: 'sa-card-head' },
          h('h2', { class: 'sa-card-title' }, fill(page.unitsTitle, { channel: ch.name })),
          ch.children.length ? h('span', { class: 'muted sa-hint' }, page.unitsHint) : h('span', { class: 'muted sa-hint' }, fill(page.noUnitsHint, { unit: ch.unitLabel })),
          addPicker ? h('span', { class: 'sa-add' }, addPicker) : null),
        wait,
        h('div', { class: 'sa-scroll' }, table));
      update();
      return card;
    }

    // ---------------------------------------------------------------------
    // ส่วน B: เป้าหมายรายเดือนของหน่วยที่เลือก
    // ---------------------------------------------------------------------
    function chartToggle(onToggle) {
      var shown = store.get('ui.phasingChart') !== false;
      return h('button', { type: 'button', class: 'btn btn-ghost btn-sm no-print sa-chart-toggle', 'aria-pressed': shown ? 'true' : 'false', onClick: function () {
        store.set('ui.phasingChart', !shown);
        onToggle();
      } }, shown ? page.chartHide : page.chartShow);
    }

    // CR-24: หัวเดือน + ปีของยอดอ้างอิง (บรรทัดเล็ก 26 / 25) · เส้นแบ่งจางก่อนเดือนแรกที่ใช้ปีก่อนหน้า (ก.ย.) — ใช้ทั้งหน่วยขายและมุมมองรวม
    function cellAt(i, cls, content, title) {
      return h('div', { class: 'ph-cell ' + (cls || '') + (i === lastClosed.month && lastClosed.month < 12 ? ' sa-split' : ''), title: title, role: 'cell' }, content);
    }
    function monthHeads(table, cell) {
      var RI = SP.data.content.labels.referenceInfo;
      table.appendChild(cell('ph-head ph-label', R.month));
      F.MONTHS.forEach(function (m, i) {
        var y = K.referenceYear(i);
        table.appendChild(cellAt(i, 'ph-head num sa-month-head', [h('span', null, m), h('small', { class: 'sa-ref-year' + (y !== lastClosed.year ? ' is-older' : '') }, String(y).slice(-2))], fill(RI.yearTip, { year: y })));
      });
      table.appendChild(cell('ph-head num ph-total', page.totalColumn));
    }

    function monthlyCard(t, ch, unit, banner) {
      var annual = unit.amount;
      var saved = savedPhasing(unit.id);
      var monthPct = phasingOf(unit.id);
      var defaults = defaultsOf(unit.id);
      var basis = calc.phasingBasis(data, year, unit.id);
      var prior = calc.priorMonthly(data.history, year, unit.id);
      var owner = C.ownerInfo(data, unit.id, nowKey);
      var showChart = store.get('ui.phasingChart') !== false;
      var canEditHere = editing && !calc.unitAllocationBlock(t, ch.id);
      function draftOf() { if (!draftPhasing[unit.id]) draftPhasing[unit.id] = saved.slice(); return draftPhasing[unit.id]; }

      var chart = C.barChart({
        values: calc.phasingTotals(annual, monthPct).amounts, ghost: prior, showValues: false, showMonths: false, legend: false,
        lead: h('span'), trail: h('span'), className: 'ph-chart',
        tooltip: function (i, v, g) {
          return F.monthFull(i) + ' · ' + page.legendTarget + ' ' + F.baht(v) + ' ' + L.baht + (g != null ? ' · ' + page.legendPrior + ' ' + F.baht(g) + ' ' + L.baht : '');
        }
      });
      // แถบผู้รับผิดชอบรายเดือน แสดงเฉพาะเมื่อมีการเปลี่ยนคนระหว่างปี
      var segs = calc.ownerSegments(data.assignments, data.salespeople, unit.id, year);
      var ownerRow = segs.length > 1 ? h('div', { class: 'ph-owner', role: 'row', 'aria-label': R.owner },
        h('div', { class: 'ph-cell ph-label ph-owner-label', title: owner.title }, R.owner),
        C.ownerStrip(data, unit.id, year, { tag: 'div' }),
        h('div', { class: 'ph-owner-trail' })) : null;

      var cells = { growth: [], pa: [], pct: [], amount: [] };
      var table = h('div', { class: 'ph-table sa-ref-table' + (canEditHere ? ' is-editing' : ''), role: 'table' });
      function cell(cls, content, title) { return h('div', { class: 'ph-cell ' + (cls || ''), title: title, role: 'cell' }, content); }
      monthHeads(table, cell);
      table.appendChild(cell('ph-label', C.priorLabel(null, SP.data.content.labels.referenceInfo.rowBaht, C.referenceNote())));
      F.MONTHS.forEach(function (m, i) { table.appendChild(cellAt(i, 'num ph-prior', F.baht(prior ? prior[i] : null))); });
      cells.totalPrior = cell('num ph-total');
      table.appendChild(cells.totalPrior);
      var pctRow = [cell('ph-label', R.pct)];
      var amtRow = [cell('ph-label', R.amount)];
      F.MONTHS.forEach(function (m, i) {
        if (canEditHere) {
          var pa = C.percentAmountInput({ pct: monthPct[i], base: annual, label: F.monthFull(i), onCommit: function (p) { draftOf()[i] = p; update(); } });
          cells.pa.push(pa);
          pa.parts[0].classList.add('ph-cell', 'num');
          pa.parts[1].classList.add('ph-cell', 'num');
          if (i === lastClosed.month) { pa.parts[0].classList.add('sa-split'); pa.parts[1].classList.add('sa-split'); }
          cells.pct.push(pa.parts[0]);
          cells.amount.push(pa.parts[1]);
          pctRow.push(pa.parts[0]);
          amtRow.push(pa.parts[1]);
        } else {
          var pc = cellAt(i, 'num ph-value'), am = cellAt(i, 'num ph-value');
          cells.pct.push(pc); cells.amount.push(am);
          pctRow.push(pc); amtRow.push(am);
        }
      });
      cells.totalPct = cell('num ph-total');
      cells.totalAmount = cell('num ph-total');
      pctRow.push(cells.totalPct);
      amtRow.push(cells.totalAmount);
      pctRow.concat(amtRow).forEach(function (c) { table.appendChild(c); });
      table.appendChild(cell('ph-label', R.growth));
      F.MONTHS.forEach(function (m, i) { var g = cellAt(i, 'num'); cells.growth.push(g); table.appendChild(g); });
      cells.totalGrowth = cell('num ph-total');
      table.appendChild(cells.totalGrowth);
      cells.remRow = h('div');
      table.appendChild(cells.remRow);
      if (canEditHere) {
        C.bindArrowNav(cells.pa.map(function (p) { return p.inputs.pct; }));
        C.bindArrowNav(cells.pa.map(function (p) { return p.inputs.amount; }));
      }

      var card = h('section', { class: 'card ph-card sa-monthly' + (showChart ? '' : ' is-chart-hidden') });
      var head = h('div', { class: 'ph-chart-head' },
        h('h2', { class: 'sa-card-title' }, fill(page.monthlyTitle, { unit: unit.name })),
        h('span', { class: 'sa-annual' }, fill(page.monthlyAnnual, { amount: F.baht(annual) })),
        basis.source !== 'account' ? h('span', { class: 'history-tag ph-basis' }, page.basisTag[basis.source]) : null,
        h('span', { class: 'sa-head-tools' },
          showChart ? C.legend([{ className: 'bar-swatch', label: page.legendTarget }, { className: 'bar-ghost-swatch', label: page.legendPrior }]) : null,
          chartToggle(function () { draw(); }),
          canEditHere ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary no-print ph-reset', onClick: function () {
            var d = draftOf();
            defaults.forEach(function (p, i) { d[i] = p; });
            update();
          } }, page.resetButton) : null));
      card.appendChild(head);
      card.appendChild(h('div', { class: 'table-scroll ph-scroll' }, h('div', { class: 'ph-grid' }, showChart ? chart : null, ownerRow, table)));

      function update() {
        var current = phasingOf(unit.id);
        var totals = calc.phasingTotals(annual, current);
        chart.update(totals.amounts, prior);
        totals.amounts.forEach(function (amount, i) {
          var changed = canEditHere && Math.abs(current[i] - saved[i]) > 1e-12;
          var diff = calc.sharesDiffer([current[i]], [defaults[i]]);
          if (canEditHere) {
            cells.pa[i].update(current[i], annual);
            cells.pa[i].parts.forEach(function (p) { p.classList.toggle('is-dirty-cell', changed); });
          } else {
            cells.pct[i].textContent = F.number(current[i] * 100, 2);
            cells.amount[i].textContent = F.baht(amount);
          }
          cells.pct[i].classList.toggle('has-default-dot', diff);
          cells.pct[i].title = diff ? fill(page.defaultTip, { pct: F.pct(defaults[i], 2) }) : '';
          C.clear(cells.growth[i]).appendChild(prior ? C.growthText(calc.growth(amount, prior[i])) : document.createTextNode('–'));
        });
        var priorTotal = prior ? calc.sum(prior) : null;
        cells.totalPrior.textContent = F.baht(priorTotal);
        cells.totalPct.textContent = F.number(totals.pctSum * 100, 2);
        cells.totalAmount.textContent = F.baht(totals.amountSum);
        cells.totalAmount.title = L.target + ' ' + F.baht(annual);
        C.clear(cells.totalGrowth).appendChild(prior ? C.growthText(calc.growth(totals.amountSum, priorTotal)) : document.createTextNode('–'));
        var rem = totals.remaining;
        var remRow = C.remainingRow({
          tag: 'div', rem: rem,
          cells: F.MONTHS.map(function () { return { text: '' }; }).concat([{ className: 'num ph-total', node: [h('span', { class: 'rem-line' }, C.remainingPct(rem)), h('span', { class: 'rem-line' }, C.remainingAmount(rem) + ' ' + L.baht)] }])
        });
        cells.remRow.replaceWith(remRow);
        cells.remRow = remRow;
        // จุดสถานะในส่วน A ของหน่วยนี้
        var dot = root.querySelector('tr[data-unit="' + unit.id + '"] .sa-dot');
        if (dot) {
          var st = fill(page.monthlyStatus, { status: C.remainingText(rem) });
          dot.className = 'dot dot-' + rem.status + ' sa-dot';
          dot.title = st;
          dot.setAttribute('aria-label', st);
        }
        if (banner) banner.update(dirty());
      }
      update();
      return card;
    }

    // ---------------------------------------------------------------------
    // ส่วน B มุมมองรวมทั้ง Channel (CR-13): อ่านอย่างเดียว · ตัวเลขจาก calc.aggregatePhasing · คงเหลือคิดต่อหน่วยขาย
    // ---------------------------------------------------------------------
    function aggregateCard(t, ch) {
      var A = page.aggregate;
      var ids = ch.children.map(function (u) { return u.id; });
      var map = {};
      ids.forEach(function (id) { map[id] = { monthPct: phasingOf(id) }; });
      var agg = calc.aggregatePhasing(data, t, map, ids, year);
      var title = fill(page.aggregateRow, { channel: ch.name });
      var showChart = store.get('ui.phasingChart') !== false;
      function openUnit(unitId) { select(ch.id, unitId, false); draw(); }
      var n = agg.units.length;
      var stacks = agg.units.map(function (u, i) { return { id: u.id, label: u.name, colorToken: u.color, shade: n > 1 ? 1 - i * (0.62 / (n - 1)) : 1, values: u.amounts }; });
      var modeSeg = C.segmented({
        label: A.chartLabel, value: chartMode,
        options: [{ value: 'total', label: A.chartModes.total }, { value: 'stack', label: A.chartModes.units }],
        onChange: function (v) { chartMode = v; draw(); }
      });
      var chart = showChart ? G.stackedBars({
        stacks: stacks, line: agg.prior, mode: chartMode, totalToken: ch.color,
        labels: { total: A.legendTotal, line: A.legendPrior },
        tick: G.millionTick,
        onLegend: openUnit,
        legendTip: function (name) { return fill(A.legendTip, { name: name }); },
        tip: function (m) {
          var out = chartMode === 'total' ? [] : stacks.map(function (s) { return [s.label, F.baht(s.values[m]) + ' ' + L.baht]; });
          out.push([A.tipTotal, F.baht(agg.amounts[m]) + ' ' + L.baht]);
          if (agg.prior) out.push([A.tipPrior, F.baht(agg.prior[m]) + ' ' + L.baht]);
          return out;
        }
      }) : null;

      var table = h('div', { class: 'ph-table ph-agg-table sa-ref-table', role: 'table' });
      function cell(cls, content, tip) { return h('div', { class: 'ph-cell ' + (cls || ''), title: tip, role: 'cell' }, content); }
      function monthsRow(label, values, total, cls, fmt) {
        table.appendChild(label);
        values.forEach(function (v, i) { table.appendChild(cellAt(i, 'num ' + (cls || ''), fmt(v))); });
        table.appendChild(cell('num ph-total', total));
      }
      monthHeads(table, cell);
      var noValues = F.MONTHS.map(function () { return null; });
      monthsRow(cell('ph-label', C.priorLabel(null, SP.data.content.labels.referenceInfo.rowBaht, C.referenceNote())), agg.prior || noValues, F.baht(agg.priorTotal), 'ph-prior', F.baht);
      monthsRow(cell('ph-label', R.pct), agg.monthPct, agg.total ? F.number(calc.sum(agg.monthPct) * 100, 2) : '–', 'ph-value', function (v) { return F.number(v * 100, 2); });
      monthsRow(cell('ph-label', R.amount), agg.amounts, F.baht(agg.total), 'ph-value', F.baht);
      table.appendChild(cell('ph-label', R.growth));
      agg.growth.forEach(function (g, i) { table.appendChild(cellAt(i, 'num', C.growthText(g))); });
      table.appendChild(cell('num ph-total', C.growthText(agg.growthTotal)));
      table.appendChild(h('div', { class: 'ph-cell ph-agg-toggle', role: 'cell' },
        h('button', { type: 'button', class: 'ph-agg-toggle-btn', 'aria-expanded': unitsOpen ? 'true' : 'false', title: A.unitsToggle,
          onClick: function () { unitsOpen = !unitsOpen; draw(); } }, (unitsOpen ? '▾ ' : '▸ ') + fill(A.unitsRow, { n: n }))));
      if (unitsOpen) {
        agg.units.forEach(function (u) {
          var label = cell('ph-label ph-agg-unit', h('button', { type: 'button', class: 'ph-agg-link', title: fill(A.openUnit, { name: u.name }), onClick: function () { openUnit(u.id); } }, u.name));
          label.style.setProperty('--c', C.tokenVar(u.color));
          monthsRow(label, u.amounts, F.baht(calc.sum(u.amounts)), 'ph-agg-sub', F.baht);
        });
      }
      var incomplete = agg.units.filter(function (u) { return agg.incomplete.indexOf(u.id) >= 0; });
      var status = h('p', { class: 'ph-agg-status' + (incomplete.length ? ' has-issues' : '') },
        incomplete.length ? fill(A.incomplete, { n: incomplete.length }) : A.complete,
        incomplete.map(function (u) {
          return h('button', { type: 'button', class: 'ph-agg-link ph-agg-issue', title: fill(A.openUnit, { name: u.name }), onClick: function () { openUnit(u.id); } },
            u.name + ' · ', h('span', { class: 'text-' + u.remaining.status }, C.remainingText(u.remaining)));
        }));
      return h('section', { class: 'card ph-card ph-agg sa-monthly' + (showChart ? '' : ' is-chart-hidden') },
        h('div', { class: 'ph-chart-head' },
          h('h2', { class: 'sa-card-title' }, fill(A.chartTitle, { name: title })),
          h('span', { class: 'badge tag-muted ph-agg-note' }, A.readOnly),
          h('span', { class: 'sa-head-tools' }, showChart ? modeSeg : null, chartToggle(function () { draw(); }))),
        h('div', { class: 'table-scroll ph-scroll' }, h('div', { class: 'ph-grid' }, chart, table)),
        status);
    }

    // ---------------------------------------------------------------------
    // ส่งออก ▾: ชีต 1 หน่วยขาย (ยอดขาย 3 ปี · % · เป้าหมาย) · ชีต 2 รายเดือนของทุกหน่วยใน Channel
    // ---------------------------------------------------------------------
    function exportSpec(source, channelId) {
      var X = page.exportSpec;
      var Cl = X.cols;
      var useDraft = source === 'draft' && editing;
      var t = calc.topDown(data, useDraft ? draftTD : savedTD, year);
      var ch = calc.findById(t.children, channelId);
      var rows1 = calc.topDownRows(t, { channelId: channelId }).map(function (r) {
        if (r.kind === 'remaining') return { r: r, unit: fill(X.remaining, { channel: r.channel, status: L.alert[r.status] }), hist: fullYears.map(function () { return null; }) };
        return { r: r, unit: r.unit, owner: C.ownerInfo(data, r.unitId, nowKey).name, hist: calc.salesHistory(data, r.unitId, fullYears) };
      });
      var columns1 = [{ key: 'unit', label: Cl.unit, width: 24 }, { key: 'owner', label: Cl.owner, width: 22 }]
        .concat(fullYears.map(function (y, k) { return { key: 'h' + k, label: fill(Cl.history, { year: y }), type: 'money', value: function (x) { return x.hist[k]; } }; }))
        .concat([
          { key: 'l12m', label: fill(Cl.l12m, { range: K.rangeLabel(false) }), type: 'money', value: function (x) { return x.r.prior == null ? null : x.r.prior; } },
          { key: 'pctInChannel', label: Cl.pctInChannel, type: 'pct', value: function (x) { return x.r.pctInChannel == null ? null : x.r.pctInChannel; } },
          { key: 'amount', label: fill(Cl.amount, { year: year }), type: 'money', value: function (x) { return x.r.amount; } },
          { key: 'pctOfTotal', label: Cl.pctOfTotal, type: 'pct', value: function (x) { return x.r.pctOfTotal == null ? null : x.r.pctOfTotal; } },
          { key: 'growth', label: Cl.growth, type: 'pct', value: function (x) { var g = x.r.growth; return g == null || isNaN(g) ? null : g; } },
          { key: 'growthAmount', label: Cl.growthAmount, type: 'money', value: function (x) { return x.r.growthAmount == null ? null : x.r.growthAmount; } }
        ]);
      var rows2 = (ch ? ch.children : []).map(function (u) {
        var pct = useDraft && draftPhasing[u.id] ? draftPhasing[u.id] : savedPhasing(u.id);
        var tt = calc.phasingTotals(u.amount, pct);
        var row = { unit: u.name, total: tt.amountSum, remaining: tt.remaining.amount };
        tt.amounts.forEach(function (v, i) { row['m' + i] = v; });
        return row;
      });
      var columns2 = [{ key: 'unit', label: Cl.unit, width: 24 }]
        .concat(F.MONTHS.map(function (m, i) { return { key: 'm' + i, label: F.monthYear(i, year), type: 'money' }; }))
        .concat([{ key: 'total', label: Cl.total, type: 'money' }, { key: 'remaining', label: Cl.remaining, type: 'money' }]);
      var status = W.stateOf(store.workflowStates(), 'topDown').status;
      var stamp = C.exportStamp(status);
      var header = C.exportHeader(year, status, [[L.exporting.headerUnit, ch ? ch.name : ''], [page.stats.target, ch ? ch.amount : null]]);
      return {
        filename: fill(X.file, { year: year, channel: C.fileSafe(ch ? ch.name : channelId), status: stamp.status, date: stamp.date }).replace(/_+/g, '_'),
        sheets: [
          { name: X.sheets.units, header: header, columns: columns1, rows: rows1 },
          { name: X.sheets.monthly, header: header, columns: columns2, rows: rows2 }
        ]
      };
    }

    draw();
  }

  SP.modules.phasing = { render: render };
})(window.SP);
