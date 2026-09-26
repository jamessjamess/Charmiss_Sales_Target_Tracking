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
 *   CR-17 Feature Flags: ปิด approvalWorkflow = รายการที่ต้องดำเนินการนับเฉพาะส่วนต่างและผู้รับผิดชอบ (calc.planActions approval: false)
 *                   ปิด baseline = ไม่ใช้ Snapshot / ไม่ถือว่าล็อก
 *
 * report = { year, builtAt, total: { amount, prior, remaining }, topDown (สถานะ),
 *            channels: [{ id, name, fullName, color, pct, amount, prior }],
 *            units: [{ id, name, channelId, target, prior, pctOfTotal, targetM, priorM, plan, planM, phasing, sku,
 *                      owner: { id, name, vacant, title }, mix: { status, series, category: [{ key, label, value }] } }],
 *            approvals: W.approvalRows (Top-down + Phasing/SKU ทุกหน่วยขาย), assignments, salespeople }
 * อ่านจาก data/: content (labels) + Master ผ่าน store.data()
 * store อ่าน: app.planYear, plan.<ปี>.topDown, plan.<ปี>.phasing.<unitId>, plan.<ปี>.sku.<unitId>, plan.<ปี>.workflow.*, master.*, ui.currentMonth
 * store เขียน: ไม่มี
 */
(function (SP) {
  'use strict';

  function build() {
    var calc = SP.core.calc;
    var W = SP.core.workflow;
    var C = SP.core.components;
    var store = SP.core.store;
    var year = store.year();
    var data = store.data();
    var master = store.master();
    var states = store.workflowStates();
    var bs = W.stateOf(states, 'baseline');
    // หลังล็อก Baseline แผนครั้งแรกคำนวณด้วยราคา GP และ Promotion ตอนล็อก
    var snap = locked(states) && bs.snapshot && bs.snapshot.priceList ? bs.snapshot : null;
    var tree = calc.topDown(data, store.get(store.planKey('topDown')), year);
    var nowKey = store.currentKey();
    var tax = master.taxonomy;
    function labelled(list, kind) {
      return list.map(function (x) { return { key: x.key, label: kind === 'status' ? null : calc.taxonomyName(tax, kind, x.key) || null, value: x.value }; });
    }
    var units = [];
    var channels = tree.children.map(function (ch) {
      ch.children.forEach(function (u) {
        var grid = calc.skuPlanGrid(data, master, u.id, store.get(store.planKey('sku.' + u.id)), { year: year, mode: 'initial', snapshot: snap, target: u.amount });
        var owner = C.ownerInfo(data, u.id, nowKey);
        units.push({
          id: u.id, name: u.name, channelId: ch.id, target: u.amount, prior: u.prior, pctOfTotal: u.pctOfTotal,
          targetM: calc.phasingTotals(u.amount, store.get(store.planKey('phasing.' + u.id)).monthPct).amounts,
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
      builtAt: new Date().toISOString(),
      total: { amount: tree.amount, prior: tree.prior, remaining: tree.remaining },
      topDown: W.stateOf(states, 'topDown').status,
      channels: channels,
      units: units,
      approvals: W.approvalRows(states, items),
      assignments: data.assignments,
      salespeople: data.salespeople
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

  function actionCount() {
    return actions().length + (!locked(SP.core.store.workflowStates()) && storeMoves().length ? 1 : 0);
  }

  SP.core.report = { build: build, current: current, actions: actions, actionCount: actionCount, storeMoves: storeMoves, locked: locked };
})(window.SP);
