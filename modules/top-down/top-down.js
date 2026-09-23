/*
 * modules/top-down/top-down.js — แบ่งเป้า Top-down
 *
 * หน้าที่:        Total Target → Channel → Account / เขตการขาย (ตาม allocationUnit ของ Channel) ของปีแผนที่เลือก
 *                 แถบ Total (Total Target · ยอดขายปีก่อน · การเติบโต) → ตาราง (~75%) ที่มีคอลัมน์ "เทียบปีก่อน" (charts.miniBar)
 *                 และแถวคงเหลือ (components.remainingRow) ท้ายทุก Channel และระดับ Total + Donut 2 วง (~25%)
 *                 เปิดมาเป็นโหมดดู / แก้ไข → แก้ % หรือบาท, คอลัมน์จัดการ (+ Account/เขต, ⋯, ถังขยะ, กระจายตามสัดส่วนปัจจุบัน,
 *                 + เพิ่ม Channel) → บันทึก/ยกเลิก
 *                 Workflow ทั้งหน้า (workflowBar): Sales Director จัดทำ → Management อนุมัติ
 * อ่านจาก data/:  channels, history, targets, content (pages.topDown, labels) + Master ผ่าน store.data()
 * store อ่าน:     app.planYear, plan.<ปี>.topDown, plan.<ปี>.workflow.*, master.* (ผู้รับผิดชอบใน tooltip), ui.role, ui.currentMonth
 * store เขียน:    plan.<ปี>.topDown { total, channels, pct, units } (ตอนกด บันทึก) / plan.<ปี>.workflow.topDown.all (ผ่าน workflowBar)
 *
 * ตัวเลขทุกตัว (บาท ↔ %, การเติบโต, สัดส่วนปีก่อน, กระจายตามสัดส่วน, คงเหลือ) มาจาก SP.core.calc / กฎ Workflow มาจาก SP.core.workflow
 * การกระจายยอดคงเหลือต้องกดเองเท่านั้น (ไม่ทำอัตโนมัติ)
 */
(function (SP) {
  'use strict';

  var C = SP.core.components;
  var G = SP.core.charts;
  var F = SP.core.format;
  var calc = SP.core.calc;
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

    // ---------- Workflow ที่หัวหน้า ----------
    var bar = C.workflowBar({
      step: 'topDown', unitId: null, year: year,
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

    function ownerTitle(unitId) {
      var o = C.ownerInfo(data, unitId, nowKey);
      return fill(L.owner.tip, { name: o.name }) + '\n' + o.title;
    }

    // ---------- เซลล์ % และบาท: โหมดดู = ข้อความ / โหมดแก้ไข = percentAmountInput ----------
    function valueCells(node) {
      var tdPct = h('td', { class: 'num td-pct' });
      var tdAmt = h('td', { class: 'num td-amount' });
      var ref = { tdPct: tdPct, tdAmt: tdAmt, growth: h('td', { class: 'num td-growth' }), compare: h('td', { class: 'td-compare' }), pa: null };
      if (editing) {
        ref.pa = C.percentAmountInput({
          pct: node.pct, base: 0, label: node.name,
          onCommit: function (p) { draft.pct[node.id] = p; update(); }
        });
        tdPct.appendChild(ref.pa.parts[0]);
        tdAmt.appendChild(ref.pa.parts[1]);
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
      var ref = valueCells(ch);
      var toggle = h('button', {
        type: 'button', class: 'td-toggle', 'aria-expanded': collapsed[ch.id] ? 'false' : 'true', title: page.collapseTitle, 'aria-label': page.collapseTitle + ' ' + ch.name,
        onClick: function () { collapsed[ch.id] = !collapsed[ch.id]; draw(); }
      }, collapsed[ch.id] ? '▸' : '▾');
      var manage = editing ? h('span', { class: 'td-manage-group' },
        C.accountPicker({
          label: L.addUnit[ch.allocationUnit] || L.addUnit.ACCOUNT, placeholder: page.addPlaceholder, emptyLabel: page.noMoreUnits,
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
          h('span', { class: 'td-ch-name', title: ch.fullName + ' · ' + (L.unitTypeFull[ch.allocationUnit] || '') }, ch.name)),
        h('td', { class: 'num td-prior' }, F.millionPlain(ch.prior)),
        ref.tdPct, ref.tdAmt, ref.growth, ref.compare, manageCell(manage));
      row.addEventListener('mouseenter', function () { hover(ch.id); });
      row.addEventListener('mouseleave', function () { hover(null); });
      refs.chRows[ch.id] = row;
      body.appendChild(row);

      if (!collapsed[ch.id]) {
        ch.children.forEach(function (u) {
          var r = valueCells(u);
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
            h('th', { scope: 'row', class: 'td-name td-unit-name', title: ownerTitle(u.id) }, h('span', null, u.name)),
            h('td', { class: 'num td-prior' }, F.millionPlain(u.prior)),
            r.tdPct, r.tdAmt, r.growth, r.compare, manageCell(trash));
          tr.addEventListener('mouseenter', function () { hover(ch.id); });
          tr.addEventListener('mouseleave', function () { hover(null); });
          body.appendChild(tr);
        });
      }

      // แถวคงเหลือของ Channel (ยังไม่มีรายการ = แถวเดียว "ยังไม่มี Account" สถานะยังไม่กำหนด)
      refs.remRows[ch.id] = h('tr');
      body.appendChild(refs.remRows[ch.id]);
      return body;
    }

    function remainingCells(rem, ids, extraMenu) {
      var action = null;
      if (editing && (rem.status === 'short' || rem.status === 'over') && ids.length) {
        action = h('button', { type: 'button', class: 'btn btn-sm btn-secondary td-normalize', title: page.normalizeTitle, onClick: function () { normalizeGroup(ids); } }, page.normalize);
      }
      var cells = [
        { text: '' },
        { text: C.remainingPct(rem), className: 'num' },
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
      refs.donut.highlight(id);
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
      refs.totalGrowth = h('span');
      root.appendChild(h('section', { class: 'card td-total' },
        h('span', { class: 'td-total-field' }, h('span', { class: 'td-total-label' }, page.totalLabel), refs.totalValue, h('span', { class: 'muted' }, L.baht)),
        h('span', { class: 'td-total-item' }, h('span', { class: 'muted' }, L.prior), h('strong', null, F.baht(t.prior)), h('span', { class: 'muted' }, L.baht), C.historyTag(t.priorYear)),
        h('span', { class: 'td-total-item' }, h('span', { class: 'muted' }, L.growth), refs.totalGrowth)));

      if (editing) { refs.banner = C.editBanner(); root.appendChild(refs.banner); }

      // ตาราง
      refs.totalRem = h('tr');
      refs.table = h('table', { class: 'td-table' + (editing ? ' is-editing' : '') },
        h('colgroup', null, h('col', { class: 'col-name' }), h('col', { class: 'col-prior' }), h('col', { class: 'col-pct' }),
          h('col', { class: 'col-amount' }), h('col', { class: 'col-growth' }), h('col', { class: 'col-compare' }), editing ? h('col', { class: 'col-manage' }) : null),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, cols.name),
          h('th', { scope: 'col', class: 'num' }, cols.prior),
          h('th', { scope: 'col', class: 'num', title: cols.pctTip }, h('span', { class: 'has-tip' }, cols.pct)),
          h('th', { scope: 'col', class: 'num' }, cols.amount),
          h('th', { scope: 'col', class: 'num' }, cols.growth),
          h('th', { scope: 'col', title: cols.compareTip }, h('span', { class: 'has-tip' }, cols.compare)),
          editing ? h('th', { scope: 'col' }, cols.manage) : null)),
        t.children.map(channelRows),
        h('tfoot', null, refs.totalRem,
          editing ? h('tr', { class: 'td-add-channel' }, h('td', { colspan: '7' }, C.accountPicker({
            label: page.addChannel, placeholder: page.addChannelPlaceholder, emptyLabel: page.noMoreChannels,
            options: calc.availableChannels(data, draft).map(function (c) { return { id: c.id, name: c.name + ' · ' + c.fullName }; }),
            onPick: function (id) { draft.channels.push(id); draft.units[id] = []; draft.pct[id] = 0; draw(); }
          }))) : null));

      // Donut 2 วง (วงนอก = ปีนี้ วงใน = ปีก่อน) Legend = ชื่อและสี / ตัวเลขใน Tooltip
      refs.donut = G.donut({ items: [], onHover: function (id) { hover(id); } });

      root.appendChild(h('div', { class: 'td-layout' },
        h('section', { class: 'card td-tree' }, h('div', { class: 'td-scroll' }, refs.table)),
        h('section', { class: 'card td-charts' },
          h('h2', { class: 'td-chart-title' }, page.donutTitle),
          refs.donut,
          h('p', { class: 'td-chart-note' }, page.donutRings))));
      update();
    }

    // ---------- เติมตัวเลข (หลังแก้ค่า ไม่สร้างช่องกรอกใหม่) ----------
    function update() {
      var t = tree();
      var shares = calc.priorChannelShares(t);
      if (editing) refs.totalValue.setValue(t.amount);
      else refs.totalValue.textContent = F.baht(t.amount);
      refs.totalValue.classList.toggle('is-dirty-cell', editing && (draft.total || 0) !== (saved.total || 0));
      C.clear(refs.totalGrowth).appendChild(C.growthText(t.growth));

      // สเกลแท่งเทียบปีก่อน: แถว Channel เทียบกันเอง / แถว Account-เขต เทียบกันทุก Channel
      var chMax = Math.max.apply(null, t.children.map(function (c) { return Math.max(c.amount || 0, c.prior || 0); }).concat([1]));
      var units = calc.planUnits(t);
      var uMax = Math.max.apply(null, units.map(function (u) { return Math.max(u.amount || 0, u.prior || 0); }).concat([1]));

      function put(node, base, max, color) {
        var r = refs.rows[node.id];
        if (!r) return;
        if (r.pa) r.pa.update(node.pct, base);
        else { r.tdPct.textContent = F.pct(node.pct, 2); r.tdAmt.textContent = F.baht(node.amount); }
        var changed = editing && Math.abs((draft.pct[node.id] || 0) - (saved.pct[node.id] || 0)) > 1e-12;
        r.tdPct.classList.toggle('is-dirty-cell', changed);
        r.tdAmt.classList.toggle('is-dirty-cell', changed);
        C.clear(r.growth).appendChild(C.growthText(node.growth));
        C.clear(r.compare).appendChild(G.miniBar({
          value: node.amount, prior: node.prior, max: max, colorToken: color,
          title: L.target + ' ' + F.baht(node.amount) + ' ' + L.baht + ' · ' + L.prior + ' ' + F.baht(node.prior) + ' ' + L.baht
        }));
      }
      t.children.forEach(function (ch) {
        put(ch, t.amount, chMax, ch.color);
        ch.children.forEach(function (u) { put(u, ch.amount, uMax, ch.color); });
        var ids = ch.children.map(function (u) { return u.id; });
        var remRow = ch.children.length
          ? C.remainingRow({ rem: ch.remaining, cells: remainingCells(ch.remaining, ids) })
          : C.remainingRow({ rem: ch.remaining, label: L.noUnits[ch.allocationUnit] || L.noUnits.ACCOUNT, cells: remainingCells(ch.remaining, []) });
        refs.remRows[ch.id].replaceWith(remRow);
        refs.remRows[ch.id] = remRow;
      });
      var totalMenu = editing ? C.menuButton([{ label: page.usePriorShares, title: page.usePriorSharesTitle, onClick: function () {
        var chs = tree().children;
        setShares(chs.map(function (c) { return c.id; }), calc.priorShares(chs.map(function (c) { return c.prior; })));
      } }]) : null;
      var totalRow = C.remainingRow({ rem: t.remaining, label: page.remainingTotal, className: 'td-rem-total', cells: remainingCells(t.remaining, t.children.map(function (c) { return c.id; }), totalMenu) });
      refs.totalRem.replaceWith(totalRow);
      refs.totalRem = totalRow;
      if (refs.banner) refs.banner.update(dirty());

      // Donut: วงนอก = เป้าหมายปีนี้ต่อ Channel (+ ส่วนที่ยังไม่จัดสรร) / วงใน = ยอดขายปีก่อน / กลางวง = % จัดสรรแล้ว
      var items = t.children.map(function (ch) {
        return {
          id: ch.id, label: ch.name, value: ch.amount, colorToken: ch.color, legend: [ch.name],
          title: fill(page.donutTip, { name: ch.fullName, pct: F.pct(ch.pct, 1), amount: F.baht(ch.amount), prior: shares[ch.id] == null ? L.growthNew : F.pct(shares[ch.id], 1) })
        };
      });
      if (t.remaining.status === 'short') items.push({ id: '_rest', label: page.unallocated, title: page.unallocated + ' ' + F.baht(t.remaining.amount) + ' ' + L.baht, value: t.remaining.amount, muted: true, legend: [page.unallocated] });
      var inner = t.children.map(function (ch) { return { id: ch.id, value: ch.prior || 0, colorToken: ch.color, title: ch.name + ' · ' + L.prior + ' ' + F.baht(ch.prior) + ' ' + L.baht }; });
      refs.donut.update(items, { value: F.pct(t.allocatedPct, 1), label: page.donutCenter }, inner);
    }

    draw();
  }

  SP.modules.topDown = { render: render };
})(window.SP);
