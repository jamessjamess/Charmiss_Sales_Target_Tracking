/*
 * modules/top-down/top-down.js — ขั้นที่ 1 Annual Target (CR-23) — ชื่อหน้ามาจาก content.js
 *
 * หน้าที่:        Management ตั้ง Total Target และแบ่งลงแต่ละ Channel ของปีแผนที่เลือก (แถวหน่วยขายอยู่ที่ Sub-channel Allocation)
 *                 แถบ Total บรรทัดเดียว: Total Target · ยอดขายปี {ปีก่อน} ⓘ · การเติบโต % (ส่วนต่างบาท)
 *                 ตาราง (เฉพาะแถว Channel): Channel (แถบสี · ชื่อย่อ Tooltip ชื่อเต็ม · ลิงก์ {n} หน่วยขาย ไป Sub-channel Allocation) ·
 *                 ยอดขาย (ล้านบาท) ปีเต็ม 2 ปี + L12M (CR-24 หัวกลุ่ม · L12M ⓘ + ช่วงเดือน) · % ของ Total · เป้าหมาย {ปี} (บาท) · การเติบโต (เทียบ L12M) ·
 *                 เป้าหมายเทียบปีก่อน (charts.vsLastYearBar สเกลจริงเดียวกันทั้งตาราง เริ่มที่ 0 ขีด = L12M) · (แก้ไข) จัดการ ⋯
 *                 แถวคงเหลือระดับ Total ท้ายตาราง / ตารางสูงตามแถว (ไม่ยืดเต็มจอ)
 *                 CR-24 กราฟ 2 ใบใต้ตาราง (55 : 45 สูงเท่ากัน): ยอดขายและเป้าหมายราย Channel (charts.stackedColumns 2024 · 2025 · L12M · เป้าหมาย) ·
 *                 ที่มาของการเติบโต (charts.waterfall เริ่มจากยอดขาย L12M) — อัปเดตหลัง Enter / blur · Hover ช่วงของ Channel ↔ แถว Channel
 *                 โหมดแก้ไข: กรอก % ของ Total หรือเป้าหมาย (บาท) ต่อ Channel · ⋯ เติมตามสัดส่วนปีก่อน / นำ Channel ออกจากแผน ·
 *                 + เพิ่ม Channel · คงเหลือ: กระจายตามสัดส่วนปัจจุบัน + ⋯ เติมตามสัดส่วนปีก่อนทุก Channel
 *                 บันทึก: plan.<ปี>.topDown + Audit การเปลี่ยนเป้าหมาย Channel (calc.channelTargetAudit → บรรทัดแจ้งใน Sub-channel Allocation)
 *                 ส่งออก ▾ (Excel / CSV) 1 แถวต่อ Channel + Total + คงเหลือ พร้อมยอดขาย 3 ปี (calc.topDownRows level 'channel')
 *                 สิทธิ์ (permissions resource annualTarget ผ่าน workflowBar step topDown): Management แก้ไข · บทบาทอื่นอ่านอย่างเดียว
 *                 [Phase 2] Workflow ทั้งหน้า (workflowBar step topDown) ส่งอนุมัติได้เมื่อคงเหลือระดับ Total จัดสรรครบ
 * อ่านจาก data/:  channels, history, targets, content (pages.topDown, pages.phasing.title, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.workflow.*, ui.role, ui.currentMonth
 * store เขียน:    plan.<ปี>.topDown { total, channels, pct, units } + master.audit (ตอนกด บันทึก) · ui.selection (ลิงก์ {n} หน่วยขาย) ·
 *                 plan.<ปี>.workflow.topDown.all (ผ่าน workflowBar)
 *
 * ตัวเลขทุกตัว (บาท ↔ %, การเติบโต, สัดส่วนปีก่อน, กระจายตามสัดส่วน, คงเหลือ, เทียบปีก่อน, ยอดขายย้อนหลัง) มาจาก SP.core.calc
 * การกระจายยอดคงเหลือต้องกดเองเท่านั้น (ไม่ทำอัตโนมัติ)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var G = SP.core.charts;
  var F = SP.core.format;
  var calc = SP.core.calc;
  var W = SP.core.workflow;
  var store = SP.core.store;
  var h = C.h;
  var fill = C.fill;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function normalize(plan) {
    plan.pct = plan.pct || {};
    plan.units = plan.units || {};
    plan.channels = plan.channels || [];
    plan.channels.forEach(function (id) { if (!plan.units[id]) plan.units[id] = []; });
    return plan;
  }

  // จำนวนรายการที่ต่างจากที่บันทึกไว้: Total, % ของแต่ละ Channel, Channel ที่เพิ่ม/นำออก
  function diffCount(a, b) {
    var n = (a.total || 0) !== (b.total || 0) ? 1 : 0;
    var ids = {};
    a.channels.concat(b.channels).forEach(function (id) { ids[id] = true; });
    Object.keys(ids).forEach(function (id) { if (Math.abs((a.pct[id] || 0) - (b.pct[id] || 0)) > 1e-12) n++; });
    if (JSON.stringify(a.channels) !== JSON.stringify(b.channels)) n++;
    return n;
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var cols = page.columns;
    var year = store.year();
    var K = SP.core.clock;
    var fullYears = K.fullYears();   // CR-24: ปีเต็ม 2 ปีก่อนปีของเดือนปิดล่าสุด (2024 · 2025) + คอลัมน์ L12M
    var nHist = fullYears.length + 1;
    var charts = null;
    var key = store.planKey('topDown');
    var data = store.data();
    var saved = normalize(store.get(key));
    var draft = clone(saved);
    var editing = false;
    var refs;
    var allocEntry = SP.core.registry.byId('phasing');
    var allocTitle = (SP.data.content.pages.phasing && SP.data.content.pages.phasing.title) || allocEntry.title;

    function tree() { return calc.topDown(data, draft, year); }
    function savedTree() { return calc.topDown(data, saved, year); }
    function dirty() { return editing ? diffCount(draft, saved) : 0; }
    C.guardUnsaved(dirty);

    // ---------- ส่งออก ▾ (ข้าง workflowBar) ----------
    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });

    // ---------- ปุ่มแก้ไข / Workflow ที่หัวหน้า ----------
    var bar = C.workflowBar({
      step: 'topDown', unitId: null, year: year, extra: exportBtn,
      title: function () { return fill(page.workflowTitle, { year: year }); },
      editing: function () { return editing; },
      facts: function () { return { remaining: savedTree().remaining.status }; },
      summary: function () {
        var t = savedTree();
        return [fill(page.summaryLines.total, { amount: F.baht(t.amount) })]
          .concat(t.children.map(function (c) { return fill(page.summaryLines.channel, { name: c.name, pct: F.pct(c.pct, 2), amount: F.baht(c.amount) }); }))
          .concat([L.remaining + ': ' + L.alert[t.remaining.status]]);
      },
      snapshot: function () {
        var out = {};
        calc.planUnits(savedTree()).forEach(function (u) { out[u.id] = Math.round(u.amount); });
        return out;
      },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () {
        // Audit การเปลี่ยนเป้าหมายของ Channel (Sub-channel Allocation แสดงบรรทัดแจ้งจนกว่าจะกดปิด)
        var entries = calc.channelTargetAudit(savedTree(), tree(), { by: C.roleName(store.role()), at: new Date().toISOString(), year: year });
        store.set(key, draft);
        if (entries.length) store.appendAudit(entries);
        saved = clone(draft);
        editing = false;
        draw();
      },
      onCancel: function () { draft = clone(saved); editing = false; draw(); },
      onChange: function () { draw(); ctx.refreshMenu(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function setShares(ids, shares) {
      ids.forEach(function (id, i) { draft.pct[id] = shares[i]; });
      update();
    }
    function channelIds() { return tree().children.map(function (c) { return c.id; }); }
    function priorSharesAll() { return calc.priorShares(tree().children.map(function (c) { return c.prior; })); }

    function removeChannel(ch) {
      (draft.units[ch.id] || []).forEach(function (id) { delete draft.pct[id]; });
      delete draft.units[ch.id];
      delete draft.pct[ch.id];
      draft.channels = draft.channels.filter(function (id) { return id !== ch.id; });
      draw();
    }

    // ลิงก์ {n} หน่วยขาย → Sub-channel Allocation ของ Channel นั้น (ตั้ง ui.selection ก่อนเปิดหน้า)
    function unitsLink(ch) {
      var first = ch.children[0];
      return h('a', {
        class: 'td-units-link', href: SP.core.paths.to(allocEntry.path),
        title: fill(page.unitsLinkTip, { page: allocTitle, channel: ch.fullName || ch.name }),
        onClick: function () { store.set('ui.selection', { channel: ch.id, unit: first ? first.id : null }); }
      }, fill(page.unitsLink, { n: ch.children.length }));
    }

    function channelRow(ch, i) {
      var ref = {
        tdPct: h('td', { class: 'num td-pct' }),
        tdAmt: h('td', { class: 'num td-amount' }),
        growth: h('td', { class: 'num td-growth' }),
        compare: h('td', { class: 'td-compare' }),
        pa: null
      };
      if (editing) {
        ref.pa = C.percentAmountInput({ pct: ch.pct, base: 0, label: ch.name, onCommit: function (p) { draft.pct[ch.id] = p; update(); } });
        ref.tdPct.appendChild(ref.pa.parts[0]);
        ref.tdAmt.appendChild(ref.pa.parts[1]);
      }
      refs.rows[ch.id] = ref;
      var hist = calc.salesHistory(data, ch.id, fullYears).concat([ch.prior]);
      var menu = editing ? C.menuButton([
        { label: page.usePriorShareOne, title: page.usePriorShareOneTitle, onClick: function () {
          var shares = priorSharesAll();
          var idx = channelIds().indexOf(ch.id);
          if (idx >= 0) setShares([ch.id], [shares[idx]]);
        } },
        { label: page.removeChannel, danger: true, onClick: function () {
          var node = calc.findById(tree().children, ch.id);
          C.dialog({
            title: fill(page.removeChannelConfirm, { name: ch.name, year: year }),
            lines: [fill(page.removeChannelLine, { amount: F.baht(node.amount), count: node.children.length })],
            confirmLabel: page.removeChannel, danger: true
          }).then(function (r) { if (r.ok) removeChannel(ch); });
        } }
      ], page.removeChannel + ' · ' + ch.name) : null;
      var tr = h('tr', { class: 'td-ch-row', dataset: { ch: ch.id }, style: { '--c': C.tokenVar(ch.color) } },
        h('th', { scope: 'row', class: 'td-name' },
          h('span', { class: 'td-ch-name', title: ch.fullName + ' · ' + ch.unitLabel }, ch.name),
          unitsLink(ch)),
        hist.map(function (v, k) { return h('td', { class: 'num td-hist' + (k === hist.length - 1 ? ' is-latest' : '') }, F.millionPlain(v)); }),
        ref.tdPct, ref.tdAmt, ref.growth, ref.compare,
        editing ? h('td', { class: 'td-manage' }, menu) : null);
      tr.addEventListener('mouseenter', function () { highlightChannel(ch.id, 'table'); });
      tr.addEventListener('mouseleave', function () { highlightChannel(null, 'table'); });
      return tr;
    }

    // Hover แถว Channel ↔ ช่วงของ Channel ในกราฟแท่งซ้อน ↔ แถวของ Channel ใน Waterfall (from = 'table' | 'columns' | 'waterfall')
    function highlightChannel(id, from) {
      Array.prototype.forEach.call(root.querySelectorAll('.td-ch-row'), function (r) { r.classList.toggle('is-hl', !!id && r.dataset.ch === id); });
      if (!charts) return;
      if (from !== 'columns') charts.columns.highlight(id);
      if (from !== 'waterfall') charts.waterfall.highlight(id);
    }

    // ---------- สร้างทั้งหน้า (เรียกใหม่เมื่อเข้า/ออกโหมดแก้ไข หรือเพิ่ม/นำออก) ----------
    function draw() {
      C.clear(root);
      bar.update();
      refs = { rows: {} };
      var t = tree();

      // แถบ Total บรรทัดเดียว (ตัวเลข Total แสดงครั้งเดียวในหน้า)
      refs.totalValue = editing
        ? C.numberInput({ value: t.amount, grouping: true, commit: true, min: 0, className: 'wide', label: page.totalLabel, onChange: function (v) { draft.total = v; update(); } })
        : h('strong', { class: 'td-total-value' });
      refs.totalGrowth = h('span', { class: 'td-total-growth' });
      root.appendChild(h('section', { class: 'card td-total' },
        h('span', { class: 'td-total-field' }, h('span', { class: 'td-total-label' }, page.totalLabel), refs.totalValue, h('span', { class: 'muted' }, L.baht)),
        h('span', { class: 'td-total-item' }, h('span', { class: 'muted' }, C.priorLabel(t.priorYear)), h('strong', null, F.baht(t.prior)), h('span', { class: 'muted' }, L.baht)),
        h('span', { class: 'td-total-item' }, h('span', { class: 'muted' }, L.growth), refs.totalGrowth)));

      if (editing) {
        refs.banner = C.editBanner();
        root.appendChild(refs.banner);
      }

      // ตาราง: หัว 2 ชั้น (ยอดขาย 3 ปีอยู่ใต้หัวกลุ่ม)
      refs.totalRem = h('tr');
      refs.axis = h('span');
      var nCols = 1 + nHist + 4 + (editing ? 1 : 0);   // Channel · ยอดขาย 2 ปี + L12M · % · เป้าหมาย · การเติบโต · เทียบปีก่อน · (จัดการ)
      var head1 = h('tr', null,
        h('th', { scope: 'col', rowspan: '2' }, cols.name),
        h('th', { scope: 'colgroup', colspan: String(nHist), class: 'td-hist-group', title: cols.historyTip }, h('span', { class: 'has-tip' }, cols.history)),
        h('th', { scope: 'col', rowspan: '2', class: 'num', title: cols.pctTotalTip }, h('span', { class: 'has-tip' }, cols.pctTotal)),
        h('th', { scope: 'col', rowspan: '2', class: 'num', title: cols.amountTip }, h('span', { class: 'has-tip' }, fill(cols.amount, { year: year }))),
        h('th', { scope: 'col', rowspan: '2', class: 'num' }, cols.growth),
        h('th', { scope: 'col', rowspan: '2', class: 'td-vly-head', title: L.vsLastYear.headerTip }, h('span', { class: 'has-tip' }, L.vsLastYear.header), refs.axis),
        editing ? h('th', { scope: 'col', rowspan: '2' }, cols.manage) : null);
      var head2 = h('tr', { class: 'td-head-years' }, historyHeads());
      refs.table = h('table', { class: 'td-table' + (editing ? ' is-editing' : '') },
        h('colgroup', null, h('col', { class: 'col-name' }), fullYears.map(function () { return h('col', { class: 'col-hist' }); }), h('col', { class: 'col-hist col-l12m' }),
          h('col', { class: 'col-pct' }), h('col', { class: 'col-amount' }), h('col', { class: 'col-growth' }), h('col', { class: 'col-compare' }),
          editing ? h('col', { class: 'col-manage' }) : null),
        h('thead', null, head1, head2),
        h('tbody', null, t.children.map(channelRow)),
        h('tfoot', null, refs.totalRem,
          editing ? h('tr', { class: 'td-add-channel' }, h('td', { colspan: String(nCols) }, C.accountPicker({
            label: page.addChannel, placeholder: page.addChannelPlaceholder, emptyLabel: page.noMoreChannels,
            options: calc.availableChannels(data, draft).map(function (c) { return { id: c.id, name: c.name + ' · ' + c.fullName }; }),
            onPick: function (id) { draft.channels.push(id); draft.units[id] = []; draft.pct[id] = 0; draw(); }
          }))) : null));

      // ตารางสูงตามแถว (ไม่ยืดเต็มจอ) · เลื่อนภายในเมื่อแถวล้น
      root.appendChild(h('div', { class: 'td-layout' },
        h('section', { class: 'card td-tree' }, h('div', { class: 'td-scroll' }, refs.table))));
      // CR-24: กราฟ 2 ใบใต้ตาราง (55 : 45 สูงเท่ากัน)
      charts = buildCharts(t);
      root.appendChild(h('div', { class: 'td-charts' },
        h('section', { class: 'card td-chart td-chart-columns' }, h('h2', { class: 'td-chart-title' }, page.charts.columnsTitle), charts.columns),
        h('section', { class: 'card td-chart td-chart-growth' }, h('h2', { class: 'td-chart-title' }, page.wfTitle), charts.waterfall)));
      update();
    }

    // หัวคอลัมน์ยอดขาย: ปีเต็ม (ปีที่ซ้อนกับ L12M มี Tooltip บอกช่วง) + L12M ⓘ + ช่วงเดือนบรรทัดเล็ก
    function historyHeads() {
      var lc = K.parse(K.lastClosedMonth());
      return fullYears.map(function (y) {
        var tip = y === lc.year - 1 && lc.month < 12
          ? fill(L.priorInfo.overlapTip, { year: y, months: F.monthRange(lc.month, 11) })
          : fill(L.priorInfo.fullYearTip, { year: y });
        return h('th', { scope: 'col', class: 'num td-hist', title: tip }, h('span', { class: 'has-tip' }, String(y)));
      }).concat([h('th', { scope: 'col', class: 'num td-hist td-l12m' },
        C.priorLabel(null, L.priorInfo.short), h('small', { class: 'td-l12m-range' }, K.rangeLabel(true)))]);
    }

    // ---------- กราฟ: ยอดขายและเป้าหมายราย Channel · ที่มาของการเติบโต (ตัวเลขจาก calc) ----------
    function mb(v) { return F.millionPlain(v, 2); }
    function columnsSpec(t) {
      var X = page.charts;
      function col(id, label, sub, pick, emphasize) {
        return {
          id: id, label: label, sub: sub, emphasize: emphasize,
          parts: t.children.map(function (c) {
            var v = pick(c) || 0;
            return { id: c.id, value: v, colorToken: c.color, title: fill(X.segmentTip, { channel: c.name, column: label, amount: mb(v) }) };
          })
        };
      }
      var hist = {};
      t.children.forEach(function (c) { hist[c.id] = calc.salesHistory(data, c.id, fullYears); });
      var columns = fullYears.map(function (y, k) { return col('y' + y, String(y), null, function (c) { return hist[c.id][k]; }); })
        .concat([col('l12m', L.priorInfo.short, K.rangeLabel(true), function (c) { return c.prior; }),
          col('target', fill(X.targetColumn, { year: year }), null, function (c) { return c.amount; }, true)]);
      return {
        columns: columns,
        legend: t.children.map(function (c) { return { id: c.id, label: c.name, colorToken: c.color }; }),
        tick: G.millionTick,
        total: mb,
        growth: function (prev, cur) { return prev > 0 ? F.growth(calc.growth(cur, prev)) : null; },
        share: function (v, total) { return total > 0 ? F.pct(v / total, 0) : ''; },
        onHover: function (id) { highlightChannel(id, 'columns'); }
      };
    }
    function waterfallSpec(t) {
      var TD = page;
      var wf = calc.growthWaterfall(t);
      return {
        start: { label: fill(TD.wfStart, { year: t.priorYear }), value: wf.start }, end: { label: fill(TD.wfEnd, { year: year }), value: wf.end },
        steps: wf.steps.map(function (s) { return s.unallocated ? { id: '_rest', label: s.delta >= 0 ? TD.unallocated : TD.overAllocated, value: s.delta } : { id: s.id, label: s.name, value: s.delta, tag: s.isNew ? L.growthNew : null }; }),
        format: mb, signed: function (v) { return (v < 0 ? '−' : '+') + mb(Math.abs(v)); }, tick: G.millionTick,
        axisNote: function (lo) { return fill(TD.wfAxis, { value: F.number(lo / 1e6, 0) }); },
        onHover: function (id) { highlightChannel(id && id !== '_rest' ? id : null, 'waterfall'); }
      };
    }
    function buildCharts(t) {
      return { columns: G.stackedColumns(columnsSpec(t)), waterfall: G.waterfall(waterfallSpec(t)) };
    }

    // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) ----------
    function update() {
      var t = tree();
      if (refs.totalValue.setValue) refs.totalValue.setValue(t.amount);
      else refs.totalValue.textContent = F.baht(t.amount);
      refs.totalValue.classList.toggle('is-dirty-cell', editing && (draft.total || 0) !== (saved.total || 0));
      var g = C.growthText(t.growth);
      C.clear(refs.totalGrowth).appendChild(g);
      if (t.growthAmount != null) refs.totalGrowth.appendChild(h('span', { class: g.className + ' td-growth-amount' }, '(' + F.signedBaht(t.growthAmount) + ' ' + L.baht + ')'));

      // สเกลจริงร่วมกันทั้งตาราง: เป้าหมายและยอดขายปีล่าสุดของทุก Channel (คำนวณใหม่หลัง Enter / blur เท่านั้น)
      var scaleValues = [];
      t.children.forEach(function (ch) { scaleValues.push(ch.amount, ch.prior); });
      var scaleMax = G.niceScaleMax(scaleValues);
      var axis = G.vsLastYearAxis(scaleMax);
      refs.axis.replaceWith(axis);
      refs.axis = axis;
      t.children.forEach(function (ch) {
        var r = refs.rows[ch.id];
        if (!r) return;
        if (r.pa) r.pa.update(ch.pct, t.amount);
        else { r.tdPct.textContent = F.pct(ch.pct, 2); r.tdAmt.textContent = F.baht(ch.amount); }
        var changed = editing && Math.abs((draft.pct[ch.id] || 0) - (saved.pct[ch.id] || 0)) > 1e-12;
        r.tdPct.classList.toggle('is-dirty-cell', changed);
        r.tdAmt.classList.toggle('is-dirty-cell', changed);
        C.clear(r.growth).appendChild(C.growthText(ch.growth));
        C.clear(r.compare).appendChild(G.vsLastYearBar(ch.amount, ch.prior, scaleMax, { colorToken: ch.color, year: t.priorYear }));
      });

      // แถวคงเหลือระดับ Total: % อยู่ที่คอลัมน์ % ของ Total · บาทที่คอลัมน์เป้าหมาย
      var ids = t.children.map(function (c) { return c.id; });
      var action = editing && (t.remaining.status === 'short' || t.remaining.status === 'over') && ids.length
        ? h('button', { type: 'button', class: 'btn btn-sm btn-secondary td-normalize', title: page.normalizeTitle, onClick: function () {
          setShares(ids, calc.normalizeShares(ids.map(function (id) { return draft.pct[id] || 0; })));
        } }, page.normalize) : null;
      var menu = editing ? C.menuButton([{ label: page.usePriorShares, title: page.usePriorSharesTitle, onClick: function () { setShares(channelIds(), priorSharesAll()); } }]) : null;
      var cells = fullYears.concat(['l12m']).map(function () { return { text: '' }; }).concat([
        { text: C.remainingPct(t.remaining), className: 'num' },
        { text: C.remainingAmount(t.remaining), className: 'num' },
        { text: '' }
      ]);
      if (editing) cells.push({ node: h('span', { class: 'td-manage-group' }, action, menu), colspan: 2, className: 'td-manage' });
      else cells.push({ text: '' });
      var totalRow = C.remainingRow({ rem: t.remaining, label: page.remainingTotal, className: 'td-rem-total', cells: cells });
      refs.totalRem.replaceWith(totalRow);
      refs.totalRem = totalRow;
      if (refs.banner) refs.banner.update(dirty());
      // กราฟอัปเดตตามค่าที่แก้ (หลัง Enter / blur)
      if (charts) { charts.columns.update(columnsSpec(t)); charts.waterfall.update(waterfallSpec(t)); }
    }

    // ---------- ไฟล์ส่งออก: 1 แถวต่อ Channel + Total + คงเหลือ (ตัวเลขเป็นชนิดตัวเลขจริง ไม่ใช้ Merge) ----------
    function exportSpec(source) {
      var X = page.exportSpec;
      var t = calc.topDown(data, source === 'draft' && editing ? draft : saved, year);
      var rows = calc.topDownRows(t, { level: 'channel' }).map(function (r) {
        var out = { r: r, hist: fullYears.map(function () { return null; }) };
        if (r.kind === 'channel') {
          out.channel = r.channel; out.level = X.levels.channel; out.units = r.units;
          out.hist = calc.salesHistory(data, r.channelId, fullYears);
        } else if (r.kind === 'total') {
          out.channel = X.levels.total; out.level = X.levels.total;
          out.hist = fullYears.map(function (y, k) {
            var vals = t.children.map(function (c) { return calc.salesHistory(data, c.id, fullYears)[k]; }).filter(function (v) { return v != null; });
            return vals.length ? calc.sum(vals) : null;
          });
        } else {
          out.channel = X.levels.total; out.level = X.levels.remaining + ' · ' + L.alert[r.status];
        }
        return out;
      });
      var Cl = X.cols;
      var columns = [{ key: 'channel', label: Cl.channel }, { key: 'level', label: Cl.level }, { key: 'units', label: Cl.units }]
        .concat(fullYears.map(function (y, k) { return { key: 'h' + k, label: fill(Cl.history, { year: y }), type: 'money', value: function (x) { return x.hist[k]; } }; }))
        .concat([
          { key: 'l12m', label: fill(Cl.l12m, { range: K.rangeLabel(false) }), type: 'money', value: function (x) { return x.r.prior == null ? null : x.r.prior; } },
          { key: 'pctOfTotal', label: Cl.pctOfTotal, type: 'pct', value: function (x) { return x.r.pctOfTotal == null ? null : x.r.pctOfTotal; } },
          { key: 'amount', label: fill(Cl.amount, { year: year }), type: 'money', value: function (x) { return x.r.amount; } },
          { key: 'growth', label: Cl.growth, type: 'pct', value: function (x) { var g = x.r.growth; return g == null || isNaN(g) ? null : g; } },
          { key: 'growthAmount', label: Cl.growthAmount, type: 'money', value: function (x) { return x.r.growthAmount == null ? null : x.r.growthAmount; } }
        ]);
      var status = W.stateOf(store.workflowStates(), 'topDown').status;
      var stamp = C.exportStamp(status);
      return {
        filename: fill(X.file, { year: year, status: stamp.status, date: stamp.date }).replace(/_+/g, '_'),
        sheets: [{ name: X.sheet, header: C.exportHeader(year, status), columns: columns, rows: rows }]
      };
    }

    draw();
  }

  SP.modules.topDown = { render: render };
})(window.SP);
