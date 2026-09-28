/*
 * core/plan-edits.js — CR-34 คำสั่งเพิ่ม / ขอ / นำสินค้าออกจากแผน SKU (หน้า SKU Planning) · Pure functions · ตรวจสิทธิ์ในฟังก์ชัน
 *
 * สิทธิ์ = สิทธิ์แก้ไขหน้า SKU Planning ของหน่วยขายนั้น (permissions resource skuPlan · Sales Manager / Officer เฉพาะ Channel ในทีม)
 *   ขอ NPD เพิ่ม = skuPlan + ปุ่มเฉพาะ สร้าง NPD (skuPlan.createNpd · module npdFromSku) · ผู้ไม่มีสิทธิ์ = { ok: false, error: 'permission' }
 *
 * candidates(ctx) → { existing: [addable], npd: [addable] } รายการในแท็บ 1 / 2 ของ Dialog เพิ่มสินค้าในแผน
 *   ctx = { data (store.data()), master (store.master() + ค่าที่ยังไม่บันทึก), plan (draft), unitId, year }
 *   addable = calc.addableSkus + { type (calc.planTypeOf), l12m (ชิ้น L12M รวมทุกหน่วยขาย), launch ('YYYY-MM' | null), startMonth (ค่าเริ่มต้น 0–11) }
 *   tab 1 existing = สินค้าที่ขายอยู่ (ประเภท สินค้าเดิม / Listing ใหม่ · เรียง L12M) · tab 2 npd = NPD ยืนยันแล้ว (ไม่รวมคำขอที่ยังไม่ยืนยัน · เรียงเดือนเปิดตัว) · ขาดข้อมูลจำเป็นไว้ท้าย
 * addToPlan(ctx, user, channelId, kind 'existing' | 'npd', keys, startMonth (0–11 | null = ค่าเริ่มต้นของรายการ)) → { ok, plan, added: [key], error }
 *   แถวใหม่จำนวน 0 ทุกเดือน · ยังไม่ได้ Listing = plan.newListings (Listing จาก SKU Planning source skuPlanning ตอนบันทึก) · error 'invalid' = ไม่อยู่ในรายการของแท็บ
 * requestNpd(masterSlice, user, channelId, input, meta) → calc.createSalesNpd + เหตุผล (request.reason · แผน NPD reason / requestedBy) หรือ { ok: false, error: 'permission' }
 * removeFromPlan(plan, master, unitId, key, opts) → แผนใหม่: ลบแถว + Listing จาก SKU Planning ของหน่วยนี้ (plan.dropListings · opts.keepListing = ไม่ลบ) ·
 *   opts.cancelRequest = ยกเลิกคำขอ NPD (plan.cancelRequests) · Listing ที่ทีม Product สร้างไม่ถูกลบ
 * otherUnitsUsing(master, key, unitId) → หน่วยขายอื่นที่มี Listing ของสินค้านี้ (ถามยกเลิกคำขอ NPD เมื่อว่าง)
 * cancelRequest(master, key) → { products, npdPlans, listings, basePrices, promoPrices } ไม่มีสินค้าที่ขอ (ทุก Listing · ราคา · แผน NPD)
 * unitsInPlan(skuPlans { unitId: plan }, key) → [unitId] หน่วยขายที่มีสินค้านี้ในแผน SKU (ไม่นับแถวที่หยุดวางแผน) · หน้าแผน NPD คอลัมน์ ใช้ในแผน
 * store: ไม่อ่าน ไม่เขียน
 */
(function (SP) {
  'use strict';

  function calc() { return SP.core.calc; }
  function P() { return SP.core.permissions; }
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function denied() { return { ok: false, error: 'permission' }; }

  function canEdit(user, channelId) { return !!P() && P().can(user, 'edit', { module: 'skuPlan', channelId: channelId }); }
  function canRequest(user, channelId) { return canEdit(user, channelId) && P().can(user, 'edit', { module: 'npdFromSku', channelId: channelId }); }

  // ชิ้น L12M รวมทุกหน่วยขาย (เดือนที่ปิดแล้ว 12 เดือนล่าสุด · core/clock.js)
  function l12mUnits(data, key) {
    var K = SP.core.clock;
    var r = K.l12mRange();
    var years = (data.history && data.history.years) || {};
    var units = {};
    Object.keys(years).forEach(function (y) { Object.keys((years[y] && years[y].skuQty) || {}).forEach(function (u) { units[u] = true; }); });
    var total = 0;
    Object.keys(units).forEach(function (u) {
      for (var k = r.from; k <= r.to; k = K.addMonths(k, 1)) total += calc().skuActualAt(data.history, u, key, k) || 0;
    });
    return total;
  }

  function candidates(ctx) {
    var c = calc();
    // CR-35: Discontinued ที่เคยขายในหน่วยขายนี้เพิ่มได้ (history) · Delete ไม่แสดง
    var list = c.addableSkus(ctx.master, ctx.unitId, ctx.plan, ctx.year, ctx.data && ctx.data.history).map(function (a) {
      var o = {};
      Object.keys(a).forEach(function (k) { o[k] = a[k]; });
      o.type = c.planTypeOf(ctx.data, ctx.master, a.key, ctx.unitId, ctx.year);
      var pp = c.planProduct(a.product);
      var launch = pp.launchDate || c.quarterStart(pp.launchQuarter);
      o.launch = launch ? String(launch).slice(0, 7) : null;
      var li = launch ? c.monthIndex(launch, ctx.year) : 0;
      o.startMonth = a.startMonth != null ? a.startMonth : o.type === 'npdConfirmed' ? Math.max(0, Math.min(11, li)) : 0;
      o.l12m = o.type === 'npdConfirmed' ? 0 : l12mUnits(ctx.data, a.key);
      return o;
    });
    // เรียง: เพิ่มได้ก่อน (ไม่ขาดข้อมูลจำเป็น) · แท็บ 1 ยอด L12M มากไปน้อย · แท็บ 2 เดือนเปิดตัว
    function blockedLast(a, b) { return (a.blocked ? 1 : 0) - (b.blocked ? 1 : 0); }
    list = list.filter(function (a) { return !!a.type; });   // CR-35: ไม่มีประเภท (Discontinued ที่ไม่เคยขาย) เพิ่มไม่ได้
    return {
      existing: list.filter(function (a) { return a.type === 'existing' || a.type === 'newListing'; })
        .sort(function (a, b) { return blockedLast(a, b) || b.l12m - a.l12m || (a.key < b.key ? -1 : 1); }),
      npd: list.filter(function (a) { return a.type === 'npdConfirmed'; })
        .sort(function (a, b) { return blockedLast(a, b) || String(a.launch || '').localeCompare(String(b.launch || '')) || (a.key < b.key ? -1 : 1); })
    };
  }

  function addToPlan(ctx, user, channelId, kind, keys, startMonth) {
    if (!canEdit(user, channelId)) return denied();
    var c = calc();
    var pool = candidates(ctx)[kind === 'npd' ? 'npd' : 'existing'];
    var byKey = {};
    pool.forEach(function (a) { byKey[a.key] = a; });
    var chosen = (keys || []).map(function (k) { return byKey[k]; });
    if (!chosen.length || chosen.some(function (a) { return !a || a.blocked; })) return { ok: false, error: 'invalid' };
    var plan = copy(ctx.plan) || { items: {} };
    plan.items = plan.items || {};
    chosen.forEach(function (a) {
      var start = startMonth != null ? startMonth : a.startMonth;
      if (a.type === 'npdConfirmed' && a.launch) start = Math.max(start, Math.max(0, c.monthIndex(a.launch, ctx.year)));
      plan.items[a.key] = c.newPlanItem(c.planProduct(a.product), ctx.year, 0, start);
      if (!a.listed) {
        plan.newListings = plan.newListings || {};
        plan.newListings[a.key] = c.monthKey(ctx.year, plan.items[a.key].startMonth);
      }
    });
    return { ok: true, plan: plan, added: chosen.map(function (a) { return a.key; }) };
  }

  function requestNpd(master, user, channelId, input, meta) {
    if (!canRequest(user, channelId)) return denied();
    var res = calc().createSalesNpd(master, input, meta);
    if (!res.ok) return res;
    var reason = String(input.reason || '').trim();
    res.product.request.reason = reason;
    res.master.products = res.master.products.map(function (p) { return calc().productKey(p) === res.key ? res.product : p; });
    res.master.npdPlans = res.master.npdPlans.map(function (n) {
      if (n.productKey !== res.key) return n;
      var o = copy(n);
      o.requestedBy = (meta && meta.by) || '';
      o.reason = reason;
      return o;
    });
    return res;
  }

  function otherUnitsUsing(master, key, unitId) {
    return (master.listings || []).filter(function (l) { return l.productKey === key && l.accountId !== unitId && calc().listingStatus(l) !== 'delisted'; }).map(function (l) { return l.accountId; });
  }

  function removeFromPlan(plan, master, unitId, key, opts) {
    var out = copy(plan);
    delete out.items[key];
    if (out.newListings) delete out.newListings[key];
    if (out.listingStarts) delete out.listingStarts[key];
    var l = calc().listingOf(master.listings, key, unitId);
    if (!(opts && opts.keepListing) && calc().isPlanListing(l)) { out.dropListings = out.dropListings || {}; out.dropListings[key] = true; }
    if (opts && opts.cancelRequest) { out.cancelRequests = out.cancelRequests || {}; out.cancelRequests[key] = true; }
    return out;
  }

  function cancelRequest(master, key) {
    var c = calc();
    var keep = function (x) { return (x.productKey || c.productKey(x)) !== key; };
    return {
      products: (master.products || []).filter(function (p) { return c.productKey(p) !== key; }),
      npdPlans: (master.npdPlans || []).filter(keep),
      listings: (master.listings || []).filter(keep),
      basePrices: (master.basePrices || []).filter(keep),
      promoPrices: (master.promoPrices || []).filter(keep)
    };
  }

  function unitsInPlan(skuPlans, key) {
    return Object.keys(skuPlans || {}).filter(function (u) {
      var it = skuPlans[u] && skuPlans[u].items && skuPlans[u].items[key];
      return !!it && !it.stopped;
    });
  }

  SP.core.planEdits = {
    canEdit: canEdit,
    canRequest: canRequest,
    l12mUnits: l12mUnits,
    candidates: candidates,
    addToPlan: addToPlan,
    requestNpd: requestNpd,
    otherUnitsUsing: otherUnitsUsing,
    removeFromPlan: removeFromPlan,
    cancelRequest: cancelRequest,
    unitsInPlan: unitsInPlan
  };
})(window.SP);
