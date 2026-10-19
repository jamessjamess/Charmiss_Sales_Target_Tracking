/*
 * core/report.js — ข้อมูลของขั้นที่ 4 (รายงานสรุปแผน / ติดตามสถานะ) ที่ใช้ร่วมกันระหว่างหน้ารายงานกับ Side Menu (CR-12)
 *
 *   build()       → ตัวเลขทั้งหมดของรายงานจากข้อมูลปัจจุบัน เป็น JSON ล้วน (เก็บเป็น Snapshot ได้)
 *                   ตอนล็อก Baseline หน้ารายงานเก็บผลของ build() ไว้ที่ plan.<ปี>.workflow.baseline.all.snapshot.report
 *   current(live) → { report, fromSnapshot } ล็อก Baseline แล้ว = อ่านจาก Snapshot (ไม่อ่านข้อมูลที่ยังแก้ได้) / ยังไม่ล็อก = live (หรือ build())
 *   actions(live) → calc.planActions ของข้อมูลปัจจุบัน (สถานะงานใช้ข้อมูลล่าสุดเสมอ แม้ล็อก Baseline แล้ว)
 *   actionCount() → จำนวนรายการที่ต้องดำเนินการ (ตัวเลขในเมนูข้างของขั้นที่ 4) = หน่วยขายที่มีประเด็น
 *                   + 1 เมื่อมีร้านค้าย้ายเขตหลังอนุมัติเป้าหมาย (CR-16 ยังไม่ล็อก Baseline)
 *   storeMoves()  → ร้านค้าที่ย้ายเขตหลังอนุมัติจัดสรรเป้าหมายประจำปีของปีที่เลือก (core/stores.js movesAfterApproval)
 *   pivotPlan(opts, live) → CR-26 ตารางแผนราย SKU × Channel / หน่วยขาย / เดือน / ไตรมาส (calc.pivotPlan บน report.skuItems)
 *                   opts = { rows, cols, value, show, filters } · ตัวเลขชุดเดียวกับหน้า SKU Planning และ KPI แผน Bottom-up
 *   CR-17 Feature Flags: ปิด approvalWorkflow = รายการที่ต้องดำเนินการนับเฉพาะส่วนต่างและผู้รับผิดชอบ (calc.planActions approval: false)
 *                   ปิด baseline = ไม่ใช้ Snapshot / ไม่ถือว่าล็อก
 *
 * report = { year, builtAt, total: { amount, prior, remaining }, topDown (สถานะ),
 *            channels: [{ id, name, fullName, color, pct, amount, prior }],
 *            units: [{ id, name, channelId, target, prior, pctOfTotal, targetM, priorM, plan, planM, phasing, sku,
 *                      owner: { id, name, vacant, title }, mix: { status, series, category: [{ key, label, value }] } }],
 *            approvals: W.approvalRows (Top-down + Phasing/SKU ทุกหน่วยขาย), assignments, salespeople,
 *            skuItems: calc.skuPlanItems ทุกหน่วยขาย [{ key, name, unitId, channelId, seriesId, categoryId, subCategoryId, status, units, sale, net }] (CR-26) }
 * CR-38 Revision (Flag revision): build(opts) อ่านข้อมูลของรอบ opts.revisionId (ไม่ระบุ = รอบที่เลือก) ผ่าน core/revision.js (read · data · master) ·
 *   เดือนล็อกใช้ค่าของรอบก่อน (revision.phasing · revision.gridLock) · opts.year = ปีที่ยังไม่มีรอบ (Key plan.<ปี>.*) ·
 *   current() ของรอบ Lock แล้ว = Snapshot.report (ไม่คำนวณใหม่จาก Master) · ส่วนอื่นของไฟล์เดิม
 * อ่านจาก data/: content (labels) + Master ผ่าน store.data()
 * store อ่าน: app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId>, plan.<ปี>.sku.<unitId>, plan.<ปี>.workflow.*, master.*, ui.currentMonth
 * store เขียน: ไม่มี
 */
(function (SP) {
  'use strict';

  function build(opts) {
    opts = opts || {};
    var calc = SP.core.calc;
    var W = SP.core.workflow;
    var C = SP.core.components;
    var store = SP.core.store;
    // CR-38: ข้อมูลของรอบ (ไม่เปิด Flag / ระบุปีที่ยังไม่มีรอบ = Key ของปีนั้นใน store แบบเดิม)
    var R = SP.core.revision && SP.core.revision.enabled() && !opts.year ? SP.core.revision : null;
    var rid = R ? opts.revisionId || R.selectedId() : null;
    var year = R && rid ? R.yearOf(rid) : opts.year || store.year();
    var data = R ? R.data(rid) : store.data();
    var master = R ? R.master(rid) : store.master();
    function read(suffix) { return R ? R.read(suffix, rid) : store.get('plan.' + year + '.' + suffix); }
    function monthly(u) { return R ? R.phasing(u.id, u.amount, read('phasing.' + u.id).monthPct, rid).amounts : calc.phasingTotals(u.amount, read('phasing.' + u.id).monthPct).amounts; }
    var states = store.workflowStates();
    var bs = W.stateOf(states, 'baseline');
    // หลังล็อก Baseline แผนครั้งแรกคำนวณด้วยราคา GP และ Promotion ตอนล็อก
    var snap = locked(states) && bs.snapshot && bs.snapshot.basePrices ? bs.snapshot : null;
    var tree = calc.topDown(data, read('topDown'), year);
    var nowKey = store.currentKey();
    var tax = master.taxonomy;
    function labelled(list, kind) {
      return list.map(function (x) { return { key: x.key, label: kind === 'status' ? null : calc.taxonomyName(tax, kind, x.key) || null, value: x.value }; });
    }
    var units = [];
    var skuItems = [];
    var channels = tree.children.map(function (ch) {
      ch.children.forEach(function (u) {
        var grid = calc.skuPlanGrid(data, master, u.id, read('sku.' + u.id), { year: year, mode: 'initial', snapshot: snap, target: u.amount, revisionLock: R ? R.gridLock(u.id, rid) : null });
        var owner = C.ownerInfo(data, u.id, nowKey);
        Array.prototype.push.apply(skuItems, calc.skuPlanItems(grid, u.id, ch.id));
        units.push({
          id: u.id, name: u.name, channelId: ch.id, target: u.amount, prior: u.prior, pctOfTotal: u.pctOfTotal,
          targetM: monthly(u),
          priorM: calc.priorMonthly(data.history, year, u.id),
          plan: grid.yearTotal.net, planM: grid.totals.net,
          phasing: W.stateOf(states, 'phasing', u.id).status,
          sku: W.stateOf(states, 'sku', u.id).status,
          owner: { id: owner.id, name: owner.name, vacant: owner.vacant, title: owner.title },
          mix: {
            status: labelled(calc.planMix(grid.rows, 'status'), 'status'),
            series: labelled(calc.planMix(grid.rows, 'series'), 'series'),
            category: labelled(calc.planMix(grid.rows, 'category'), 'category')
          }
        });
      });
      return { id: ch.id, name: ch.name, fullName: ch.fullName, color: ch.color, pct: ch.pct, amount: ch.amount, prior: ch.prior };
    });
    var items = [{ step: 'topDown', unitId: null }];
    units.forEach(function (u) { items.push({ step: 'phasing', unitId: u.id }, { step: 'sku', unitId: u.id }); });
    return {
      year: year,
      revisionId: rid,   // CR-38
      builtAt: SP.core.clock.now(),
      total: { amount: tree.amount, prior: tree.prior, remaining: tree.remaining },
      topDown: W.stateOf(states, 'topDown').status,
      channels: channels,
      units: units,
      approvals: W.approvalRows(states, items),
      assignments: data.assignments,
      salespeople: data.salespeople,
      skuItems: skuItems
    };
  }

  // CR-17: ปิด baseline = ไม่มีการล็อก
  function locked(states) { return SP.core.features.isOn('baseline') && SP.core.workflow.isLocked(states); }

  function snapshotReport() {
    var W = SP.core.workflow;
    var states = SP.core.store.workflowStates();
    if (!locked(states)) return null;
    var s = W.stateOf(states, 'baseline').snapshot;
    return s && s.report ? s.report : null;
  }

  function current(live) {
    // CR-38: รอบที่เลือก Lock แล้ว = ตัวเลขทั้งหมดจาก Snapshot ตอน Lock
    var R = SP.core.revision;
    var rs = R && R.enabled() ? R.snapshotOf(R.selectedId()) : null;
    if (rs && rs.report) return { report: JSON.parse(JSON.stringify(rs.report)), fromSnapshot: true, revision: true };
    var snap = snapshotReport();
    return snap ? { report: snap, fromSnapshot: true } : { report: live || build(), fromSnapshot: false };
  }

  function actions(live) {
    var W = SP.core.workflow;
    var rep = live || build();
    return SP.core.calc.planActions(rep.units.map(function (u) {
      return { id: u.id, name: u.name, channelId: u.channelId, target: u.target, plan: u.plan, phasing: u.phasing, sku: u.sku, vacant: u.owner.vacant, owner: u.owner };
    }), { topDown: rep.topDown, locked: locked(SP.core.store.workflowStates()), approval: SP.core.features.isOn('approvalWorkflow') });
  }

  // CR-16: ร้านค้าที่ย้ายเขตหลังอนุมัติจัดสรรเป้าหมายประจำปี (ยังไม่อนุมัติ = [])
  function storeMoves() {
    var S = SP.core.stores, store = SP.core.store;
    if (!S) return [];
    return S.movesAfterApproval(store.data(), store.year(), S.approvedAt(SP.core.workflow.stateOf(store.workflowStates(), 'topDown')));
  }

  // CR-26: Pivot แผนราย SKU — ล็อก Baseline แล้ว (Phase 2) อ่านจาก Snapshot เหมือนส่วนอื่นของรายงาน (Snapshot เก่าไม่มี skuItems = ตารางว่าง)
  function pivotPlan(opts, live) {
    var rep = current(live).report;
    var o = {};
    Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; });
    o.taxonomy = SP.core.store.master().taxonomy;
    o.channels = rep.channels.map(function (c) { return c.id; });
    o.units = rep.units.map(function (u) { return { id: u.id, channelId: u.channelId }; });
    return SP.core.calc.pivotPlan(rep.skuItems || [], o);
  }

  function actionCount() {
    return actions().length + (!locked(SP.core.store.workflowStates()) && storeMoves().length ? 1 : 0);
  }

  // CR-32: ค่ารายเดือนของหน่วยขาย สำหรับมุมมองตามบุคคลของ Sales Person Management (ภาระเป้าหมายต่อคน · calc.personMonthlyLoad)
  //   ปีไม่เกินปีของเดือนปัจจุบันกลาง = ยอดจริง (history.years[ปี].monthly · เฉพาะเดือนที่ปิดแล้ว ไม่งั้น null)
  //   ปีหลังจากนั้น = เป้าหมายรายเดือน (Annual Target ของปีนั้น × สัดส่วนรายเดือนของ Sub-channel Allocation · หน่วยที่ไม่อยู่ในแผน = ไม่มีค่า)
  //   → { kind: 'actual' | 'target', allocated (มีเป้าหมายให้จัดสรรแล้ว), values: { <unitId>: [12 | null] } }
  function unitMonthlyValues(year) {
    var calc = SP.core.calc, store = SP.core.store, K = SP.core.clock;
    var data = store.data();
    var values = {};
    if (year <= K.parse(K.currentMonth()).year) {
      var lc = K.parse(K.lastClosedMonth());
      var hy = data.history && data.history.years[year];
      var n = year < lc.year ? 12 : year === lc.year ? lc.month : 0;
      if (hy && hy.actualMonths != null && year === lc.year) n = Math.min(n, hy.actualMonths);
      calc.allUnits(data).forEach(function (u) {
        var mm = hy && hy.monthly && hy.monthly[u.id];
        values[u.id] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (m) { return mm && m < n ? mm[m] || 0 : null; });
      });
      return { kind: 'actual', allocated: true, values: values };
    }
    var plan = store.get('plan.' + year + '.topDown');
    var tree = calc.topDown(data, plan, year);
    calc.planUnits(tree).forEach(function (u) {
      if (!(u.amount > 0)) return;
      values[u.id] = calc.phasingTotals(u.amount, store.get('plan.' + year + '.phasing.' + u.id).monthPct).amounts;
    });
    return { kind: 'target', allocated: tree.amount > 0 && Object.keys(values).length > 0, values: values };
  }

  SP.core.report = { build: build, current: current, actions: actions, actionCount: actionCount, storeMoves: storeMoves, locked: locked, pivotPlan: pivotPlan, unitMonthlyValues: unitMonthlyValues };
})(window.SP);
