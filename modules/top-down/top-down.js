/*
 * modules/top-down/top-down.js — ขั้นที่ 1 จัดสรรเป้าหมายประจำปี (Top-down) — ชื่อหน้ามาจาก content.js
 *
 * หน้าที่:        Total Target → Channel → หน่วยขาย (Account / เขตการขาย / Platform ตาม unitLabel ของ Channel) ของปีแผนที่เลือก
 *                 แถบ Total บรรทัดเดียว: Total Target · ยอดขายปี {ปีก่อน} ⓘ · การเติบโต % (ส่วนต่างบาท)
 *                 ตารางเต็มความกว้าง (CR-10 ไม่มีแผงกราฟ): ชื่อ (+ ผู้รับผิดชอบปัจจุบัน) · ยอดขายปี {ปีก่อน} (ล้านบาท) · % ของ Total ·
 *                 % ใน Channel · เป้าหมาย (บาท) · การเติบโต · เป้าหมายเทียบปีก่อน (charts.vsLastYearBar สเกลจริงเดียวกันทั้งตาราง
 *                 เริ่มที่ 0 ค่าสูงสุด = charts.niceScaleMax ของเป้าหมายและยอดปีก่อนทุกแถว รวมแถวที่พับอยู่ + แกนใต้หัวคอลัมน์) · (แก้ไข) จัดการ
 *                 แถวคงเหลือท้ายทุก Channel (คงเหลือใน {Channel}) และระดับ Total / Hover แถว = ไฮไลต์ทั้ง Channel
 *                 โหมดแก้ไข: แถว Channel กรอกที่ % ของ Total / แถวหน่วยขายกรอกที่ % ใน Channel / เป้าหมาย (บาท) กรอกได้ทั้งสองระดับ
 *                 (แปลงกลับเป็น % ของคอลัมน์ที่แก้ได้) · + {unitLabel} · ⋯ · ถังขยะ · กระจายตามสัดส่วนปัจจุบัน · + เพิ่ม Channel
 *                 ส่งออก ▾ (Excel / CSV) 1 แถวต่อ Channel และหน่วยขาย + Total + คงเหลือ (calc.topDownRows)
 *                 Workflow ทั้งหน้า (workflowBar): Sales Director จัดทำ → Management อนุมัติ
 * อ่านจาก data/:  channels, history, targets, content (pages.topDown, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.workflow.*, master.* (ผู้รับผิดชอบใน tooltip), ui.role, ui.currentMonth
 * store เขียน:    plan.<ปี>.topDown { total, channels, pct, units } (ตอนกด บันทึก) / plan.<ปี>.workflow.topDown.all (ผ่าน workflowBar)
 *
 * ตัวเลขทุกตัว (บาท ↔ %, % ของ Total, การเติบโต, สัดส่วนปีก่อน, กระจายตามสัดส่วน, คงเหลือ, เทียบปีก่อน) มาจาก SP.core.calc
 * กฎ Workflow มาจาก SP.core.workflow / การกระจายยอดคงเหลือต้องกดเองเท่านั้น (ไม่ทำอัตโนมัติ)
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

  // จำนวนรายการที่ต่างจากที่บันทึกไว้: Total, % ของแต่ละ Channel/รายการ, Channel หรือรายการที่เพิ่ม/นำออก
  function diffCount(a, b) {
    var n = (a.total || 0) !== (b.total || 0) ? 1 : 0;
    var keys = {};
    Object.keys(a.pct).concat(Object.keys(b.pct)).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) { if (Math.abs((a.pct[k] || 0) - (b.pct[k] || 0)) > 1e-12) n++; });
    if (JSON.stringify(a.channels) !== JSON.stringify(b.channels)) n++;
    a.channels.concat(b.channels).forEach(function (id) {
      if (JSON.stringify(a.units[id] || []) !== JSON.stringify(b.units[id] || [])) n++;
    });
    return n;
  }

  // ส่งอนุมัติได้เมื่อคงเหลือจัดสรรครบทุกชั้น (Channel ที่เป้าหมายเป็น 0 และยังไม่มีรายการ ไม่ต้องจัดสรร)
  function overallStatus(tree) {
    if (tree.remaining.status !== 'ok') return tree.remaining.status;
    var bad = tree.children.filter(function (c) { return c.remaining.status !== 'ok' && !(c.remaining.status === 'empty' && !c.amount); })[0];
    return bad ? bad.remaining.status : 'ok';
  }

  function render(root, ctx) {
    var page = ctx.page;
    var L = SP.data.content.labels;
    var cols = page.columns;
    var year = store.year();
    var key = store.planKey('topDown');
    var data = store.data();
    var nowKey = store.currentKey();
    var saved = normalize(store.get(key));
    var draft = clone(saved);
    var editing = false;
    var collapsed = {};
    var refs;

    function tree() { return calc.topDown(data, draft, year); }
    function savedTree() { return calc.topDown(data, saved, year); }
    function dirty() { return editing ? diffCount(draft, saved) : 0; }
    C.guardUnsaved(dirty);

    // ---------- ส่งออก ▾ (ข้าง workflowBar) ----------
    var exportBtn = C.exportButton({ unsaved: dirty, build: exportSpec });

    // ---------- Workflow ที่หัวหน้า ----------
    var bar = C.workflowBar({
      step: 'topDown', unitId: null, year: year, extra: exportBtn,
      title: function () { return fill(page.workflowTitle, { year: year }); },
      editing: function () { return editing; },
      facts: function () { return { remaining: overallStatus(savedTree()) }; },
      summary: function () {
        var t = savedTree();
        return [fill(page.summaryLines.total, { amount: F.baht(t.amount) })]
          .concat(t.children.map(function (c) {
            return fill(page.summaryLines.channel, { name: c.name, pct: F.pct(c.pct, 2), amount: F.baht(c.amount), count: c.children.length });
          }))
          .concat([L.remaining + ': ' + L.alert[overallStatus(t)]]);
      },
      snapshot: function () {
        var out = {};
        calc.planUnits(savedTree()).forEach(function (u) { out[u.id] = Math.round(u.amount); });
        return out;
      },
      onEdit: function () { editing = true; draft = clone(saved); draw(); },
      onSave: function () { store.set(key, draft); saved = clone(draft); editing = false; draw(); },
      onCancel: function () { draft = clone(saved); editing = false; draw(); },
      onChange: function () { draw(); ctx.refreshMenu(); }
    });
    if (ctx.intro) ctx.intro.appendChild(bar);

    function setShares(ids, shares) {
      ids.forEach(function (id, i) { draft.pct[id] = shares[i]; });
      update();
    }
    function normalizeGroup(ids) { setShares(ids, calc.normalizeShares(ids.map(function (id) { return draft.pct[id] || 0; }))); }

    // ผู้รับผิดชอบปัจจุบันต่อท้ายชื่อหน่วยขาย (ข้อความเล็กสีจาง)
    function ownerNote(unitId) {
      var o = C.ownerInfo(data, unitId, nowKey);
      return h('span', { class: 'td-owner' + (o.vacant ? ' is-vacant' : '') }, o.name);
    }

    function ownerTitle(unitId) {
      var o = C.ownerInfo(data, unitId, nowKey);
      return fill(L.owner.tip, { name: o.name }) + '\n' + o.title;
    }

    // ---------- เซลล์ % 2 คอลัมน์ + บาท ----------
    // แถว Channel: กรอก % ของ Total (% ใน Channel = 100% อ่านอย่างเดียว) / แถวหน่วยขาย: กรอก % ใน Channel (% ของ Total อ่านอย่างเดียว)
    function valueCells(node, kind) {
      var ref = {
        kind: kind,
        tdTotal: h('td', { class: 'num td-pct' + (kind === 'unit' ? ' is-derived' : '') }),
        tdIn: h('td', { class: 'num td-pct' + (kind === 'channel' ? ' is-derived' : '') }),
        tdAmt: h('td', { class: 'num td-amount' }),
        growth: h('td', { class: 'num td-growth' }),
        compare: h('td', { class: 'td-compare' }),
        pa: null
      };
      if (editing) {
        ref.pa = C.percentAmountInput({ pct: node.pct, base: 0, label: node.name, onCommit: function (p) { draft.pct[node.id] = p; update(); } });
        (kind === 'channel' ? ref.tdTotal : ref.tdIn).appendChild(ref.pa.parts[0]);
        ref.tdAmt.appendChild(ref.pa.parts[1]);
      }
      refs.rows[node.id] = ref;
      return ref;
    }

    function manageCell(content) { return editing ? h('td', { class: 'td-manage' }, content) : null; }

    function removeChannel(ch) {
      (draft.units[ch.id] || []).forEach(function (id) { delete draft.pct[id]; });
      delete draft.units[ch.id];
      delete draft.pct[ch.id];
      draft.channels = draft.channels.filter(function (id) { return id !== ch.id; });
      draw();
    }

    function channelRows(ch) {
      var body = h('tbody', { class: 'td-group', dataset: { ch: ch.id }, style: { '--c': C.tokenVar(ch.color) } });
      var ref = valueCells(ch, 'channel');
      var toggle = h('button', {
        type: 'button', class: 'td-toggle', 'aria-expanded': collapsed[ch.id] ? 'false' : 'true', title: page.collapseTitle, 'aria-label': page.collapseTitle + ' ' + ch.name,
        onClick: function () { collapsed[ch.id] = !collapsed[ch.id]; draw(); }
      }, collapsed[ch.id] ? '▸' : '▾');
      var manage = editing ? h('span', { class: 'td-manage-group' },
        C.accountPicker({
          label: fill(L.addUnitButton, { unit: ch.unitLabel }), placeholder: page.addPlaceholder,
          emptyLabel: fill(L.noMoreUnitsOf, { unit: ch.unitLabel, master: L.masterOf[ch.allocationUnit] || L.masterOf.ACCOUNT }),
          className: 'td-add-unit', options: calc.availableUnits(data, draft, ch.id),
          onPick: function (id) { draft.units[ch.id].push(id); draft.pct[id] = 0; collapsed[ch.id] = false; draw(); }
        }),
        C.menuButton([
          { label: page.usePriorShares, title: page.usePriorSharesTitle, onClick: function () {
            var node = calc.findById(tree().children, ch.id);
            setShares(node.children.map(function (u) { return u.id; }), calc.priorShares(node.children.map(function (u) { return u.prior; })));
          } },
          { label: page.removeChannel, onClick: function () {
            var node = calc.findById(tree().children, ch.id);
            C.dialog({
              title: fill(page.removeChannelConfirm, { name: ch.name, year: year }),
              lines: [fill(page.removeChannelLine, { amount: F.baht(node.amount), count: node.children.length })],
              confirmLabel: page.removeChannel, danger: true
            }).then(function (r) { if (r.ok) removeChannel(ch); });
          } }
        ])) : null;
      var row = h('tr', { class: 'td-ch-row', dataset: { ch: ch.id } },
        h('th', { scope: 'row', class: 'td-name' }, toggle,
          h('span', { class: 'td-ch-name', title: ch.fullName + ' · ' + ch.unitLabel }, ch.name)),
        h('td', { class: 'num td-prior' }, F.millionPlain(ch.prior)),
        ref.tdTotal, ref.tdIn, ref.tdAmt, ref.growth, ref.compare, manageCell(manage));
      row.addEventListener('mouseenter', function () { hover(ch.id); });
      row.addEventListener('mouseleave', function () { hover(null); });
      refs.chRows[ch.id] = row;
      body.appendChild(row);

      if (!collapsed[ch.id]) {
        ch.children.forEach(function (u) {
          var r = valueCells(u, 'unit');
          var trash = editing ? C.trashButton({
            label: L.removeFromPlan,
            confirmTitle: fill(page.removeUnitConfirm, { name: u.name, year: year }),
            lines: [fill(page.removeUnitLine, { pct: F.pct(u.pct, 2), amount: F.baht(u.amount) })],
            onConfirm: function () {
              draft.units[ch.id] = draft.units[ch.id].filter(function (id) { return id !== u.id; });
              delete draft.pct[u.id];
              draw();
            }
          }) : null;
          var tr = h('tr', { class: 'td-unit-row', dataset: { ch: ch.id } },
            h('th', { scope: 'row', class: 'td-name td-unit-name', title: ownerTitle(u.id) }, h('span', null, u.name), ownerNote(u.id)),
            h('td', { class: 'num td-prior' }, F.millionPlain(u.prior)),
            r.tdTotal, r.tdIn, r.tdAmt, r.growth, r.compare, manageCell(trash));
          tr.addEventListener('mouseenter', function () { hover(ch.id); });
          tr.addEventListener('mouseleave', function () { hover(null); });
          body.appendChild(tr);
        });
      }

      // แถวคงเหลือของ Channel (ยังไม่มีหน่วยขาย = แถวเดียว "ยังไม่มี {unitLabel}" สถานะยังไม่กำหนด)
      refs.remRows[ch.id] = h('tr');
      body.appendChild(refs.remRows[ch.id]);
      return body;
    }

    // ช่องของแถวคงเหลือ: scope 'channel' = % ที่ยังไม่จัดสรรใน Channel (คอลัมน์ % ใน Channel) / 'total' = คอลัมน์ % ของ Total
    function remainingCells(rem, ids, scope, extraMenu) {
      var action = null;
      if (editing && (rem.status === 'short' || rem.status === 'over') && ids.length) {
        action = h('button', { type: 'button', class: 'btn btn-sm btn-secondary td-normalize', title: page.normalizeTitle, onClick: function () { normalizeGroup(ids); } }, page.normalize);
      }
      var cells = [
        { text: '' },
        { text: scope === 'total' ? C.remainingPct(rem) : '', className: 'num' },
        { text: scope === 'channel' ? C.remainingPct(rem) : '', className: 'num' },
        { text: C.remainingAmount(rem), className: 'num' },
        { text: '' }
      ];
      if (editing) cells.push({ node: h('span', { class: 'td-manage-group' }, action, extraMenu || null), colspan: 2, className: 'td-manage' });
      else cells.push({ text: '' });
      return cells;
    }

    function hover(id) {
      Object.keys(refs.chRows).forEach(function (k) {
        var on = k === id;
        Array.prototype.forEach.call(refs.table.querySelectorAll('tbody[data-ch="' + k + '"] tr'), function (tr) { tr.classList.toggle('is-hl', on); });
      });
    }

    // ---------- สร้างทั้งหน้า (เรียกใหม่เมื่อเข้า/ออกโหมดแก้ไข หรือเพิ่ม/นำออก) ----------
    function draw() {
      C.clear(root);
      bar.update();
      refs = { rows: {}, chRows: {}, remRows: {} };
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

      if (editing) { refs.banner = C.editBanner(); root.appendChild(refs.banner); }

      // ตาราง
      refs.totalRem = h('tr');
      refs.axis = h('span');
      refs.table = h('table', { class: 'td-table' + (editing ? ' is-editing' : '') },
        h('colgroup', null, h('col', { class: 'col-name' }), h('col', { class: 'col-prior' }), h('col', { class: 'col-pct' }), h('col', { class: 'col-pct' }),
          h('col', { class: 'col-amount' }), h('col', { class: 'col-growth' }), h('col', { class: 'col-compare' }), editing ? h('col', { class: 'col-manage' }) : null),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, cols.name),
          h('th', { scope: 'col', class: 'num' }, C.priorLabel(t.priorYear, fill(L.priorInfo.column, { year: t.priorYear }))),
          h('th', { scope: 'col', class: 'num', title: cols.pctTotalTip }, h('span', { class: 'has-tip' }, cols.pctTotal)),
          h('th', { scope: 'col', class: 'num', title: cols.pctChannelTip }, h('span', { class: 'has-tip' }, cols.pctChannel)),
          h('th', { scope: 'col', class: 'num' }, cols.amount),
          h('th', { scope: 'col', class: 'num' }, cols.growth),
          h('th', { scope: 'col', class: 'td-vly-head', title: L.vsLastYear.headerTip }, h('span', { class: 'has-tip' }, L.vsLastYear.header), refs.axis),
          editing ? h('th', { scope: 'col' }, cols.manage) : null)),
        t.children.map(channelRows),
        h('tfoot', null, refs.totalRem,
          editing ? h('tr', { class: 'td-add-channel' }, h('td', { colspan: '8' }, C.accountPicker({
            label: page.addChannel, placeholder: page.addChannelPlaceholder, emptyLabel: page.noMoreChannels,
            options: calc.availableChannels(data, draft).map(function (c) { return { id: c.id, name: c.name + ' · ' + c.fullName }; }),
            onPick: function (id) { draft.channels.push(id); draft.units[id] = []; draft.pct[id] = 0; draw(); }
          }))) : null));

      // ตารางเต็มความกว้าง (กราฟที่มาของการเติบโต / สัดส่วน Channel อยู่ในหน้ารายงานสรุปแผน)
      root.appendChild(h('div', { class: 'td-layout' },
        h('section', { class: 'card td-tree' }, h('div', { class: 'td-scroll' }, refs.table))));
      update();
    }

    // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) ----------
    function update() {
      var t = tree();
      if (editing) refs.totalValue.setValue(t.amount);
      else refs.totalValue.textContent = F.baht(t.amount);
      refs.totalValue.classList.toggle('is-dirty-cell', editing && (draft.total || 0) !== (saved.total || 0));
      var g = C.growthText(t.growth);
      C.clear(refs.totalGrowth).appendChild(g);
      if (t.growthAmount != null) refs.totalGrowth.appendChild(h('span', { class: g.className + ' td-growth-amount' }, '(' + F.signedBaht(t.growthAmount) + ' ' + L.baht + ')'));

      // แท่งเทียบปีก่อน: สเกลเดียวกันทุกแถว (เป้าหมาย ÷ ยอดขายปีก่อนของแถวนั้น) ขีดยอดปีก่อนอยู่ตำแหน่งเดียวกันทุกแถว
      function put(node, base, color) {
        var r = refs.rows[node.id];
        if (!r) return;
        var ofTotal = r.kind === 'channel' ? node.pct : node.pctOfTotal;
        var inChannel = r.kind === 'channel' ? 1 : node.pct;
        if (r.pa) r.pa.update(node.pct, base);
        else r.tdAmt.textContent = F.baht(node.amount);
        if (!r.pa || r.kind === 'unit') r.tdTotal.textContent = F.pct(ofTotal, 2);
        if (!r.pa || r.kind === 'channel') r.tdIn.textContent = F.pct(inChannel, 2);
        var changed = editing && Math.abs((draft.pct[node.id] || 0) - (saved.pct[node.id] || 0)) > 1e-12;
        (r.kind === 'channel' ? r.tdTotal : r.tdIn).classList.toggle('is-dirty-cell', changed);
        r.tdAmt.classList.toggle('is-dirty-cell', changed);
        C.clear(r.growth).appendChild(C.growthText(node.growth));
        C.clear(r.compare).appendChild(G.vsLastYearBar(node.amount, node.prior, scaleMax, { colorToken: color, year: t.priorYear }));
      }
      // สเกลจริงร่วมกันทั้งตาราง: เป้าหมายและยอดปีก่อนของทุกแถว Channel และหน่วยขาย (รวมแถวที่พับอยู่) คำนวณใหม่หลัง Enter / blur เท่านั้น
      var scaleValues = [];
      t.children.forEach(function (ch) {
        scaleValues.push(ch.amount, ch.prior);
        ch.children.forEach(function (u) { scaleValues.push(u.amount, u.prior); });
      });
      var scaleMax = G.niceScaleMax(scaleValues);
      var axis = G.vsLastYearAxis(scaleMax);
      refs.axis.replaceWith(axis);
      refs.axis = axis;
      t.children.forEach(function (ch) {
        put(ch, t.amount, ch.color);
        ch.children.forEach(function (u) { put(u, ch.amount, ch.color); });
        var ids = ch.children.map(function (u) { return u.id; });
        var remRow = ch.children.length
          ? C.remainingRow({ rem: ch.remaining, label: fill(page.remainingIn, { channel: ch.name }), cells: remainingCells(ch.remaining, ids, 'channel') })
          : C.remainingRow({ rem: ch.remaining, label: fill(L.noUnitsOf, { unit: ch.unitLabel }), cells: remainingCells(ch.remaining, [], 'channel') });
        refs.remRows[ch.id].replaceWith(remRow);
        refs.remRows[ch.id] = remRow;
      });
      var totalMenu = editing ? C.menuButton([{ label: page.usePriorShares, title: page.usePriorSharesTitle, onClick: function () {
        var chs = tree().children;
        setShares(chs.map(function (c) { return c.id; }), calc.priorShares(chs.map(function (c) { return c.prior; })));
      } }]) : null;
      var totalRow = C.remainingRow({ rem: t.remaining, label: page.remainingTotal, className: 'td-rem-total', cells: remainingCells(t.remaining, t.children.map(function (c) { return c.id; }), 'total', totalMenu) });
      refs.totalRem.replaceWith(totalRow);
      refs.totalRem = totalRow;
      if (refs.banner) refs.banner.update(dirty());
    }

    // ---------- ไฟล์ส่งออก: แถวแบน 1 แถวต่อ Channel และหน่วยขาย + Total + คงเหลือ (ตัวเลขเป็นชนิดตัวเลขจริง ไม่ใช้ Merge) ----------
    function exportSpec(source) {
      var X = page.exportSpec;
      var t = calc.topDown(data, source === 'draft' && editing ? draft : saved, year);
      var rows = calc.topDownRows(t).map(function (r) {
        var ch = r.channelId ? calc.findById(t.children, r.channelId) : null;
        var out = { r: r };
        if (r.kind === 'total') { out.channel = X.levels.total; out.level = X.levels.total; }
        else if (r.kind === 'remaining') {
          out.channel = r.scope === 'total' ? X.levels.total : r.channel;
          out.level = X.levels.remaining;
          out.unit = L.alert[r.status];
        } else {
          out.channel = r.channel;
          out.level = X.levels[r.kind];
          out.unitType = ch ? ch.unitLabel : '';
          if (r.kind === 'unit') { out.unit = r.unit; out.owner = C.ownerInfo(data, r.unitId, nowKey).name; }
        }
        return out;
      });
      var Cl = X.cols;
      var columns = [
        { key: 'channel', label: Cl.channel }, { key: 'level', label: Cl.level }, { key: 'unitType', label: Cl.unitType },
        { key: 'unit', label: Cl.unit, width: 22 }, { key: 'owner', label: Cl.owner, width: 22 },
        { key: 'prior', label: fill(Cl.prior, { year: t.priorYear }), type: 'money', value: function (x) { return x.r.prior == null ? null : x.r.prior; } },
        { key: 'pctOfTotal', label: Cl.pctOfTotal, type: 'pct', value: function (x) { return x.r.pctOfTotal == null ? null : x.r.pctOfTotal; } },
        { key: 'pctInChannel', label: Cl.pctInChannel, type: 'pct', value: function (x) { return x.r.pctInChannel == null ? null : x.r.pctInChannel; } },
        { key: 'amount', label: Cl.amount, type: 'money', value: function (x) { return x.r.amount; } },
        { key: 'growth', label: Cl.growth, type: 'pct', value: function (x) { var g = x.r.growth; return g == null || isNaN(g) ? null : g; } },
        { key: 'growthAmount', label: Cl.growthAmount, type: 'money', value: function (x) { return x.r.growthAmount == null ? null : x.r.growthAmount; } }
      ];
      var status = W.stateOf(store.workflowStates(), 'topDown').status;
      var stamp = C.exportStamp(status);
      return {
        filename: fill(X.file, { year: year, status: stamp.status, date: stamp.date }),
        sheets: [{ name: X.sheet, header: C.exportHeader(year, status), columns: columns, rows: rows }]
      };
    }

    draw();
  }

  SP.modules.topDown = { render: render };
})(window.SP);
