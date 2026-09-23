/*
 * core/calc.js — สูตรทั้งหมดของระบบ (ที่เดียวทั้งเว็บ)
 *
 * - Pure functions: ไม่แตะ DOM ไม่อ่าน store
 * - ค่าคงที่ (VAT, PRICE_INCLUDES_VAT, NPD_MONTHS, ALERT_TOLERANCE_BAHT) อ่านจาก SP.data.settings
 *   เป็นค่าตั้งต้น และส่งค่าเองเข้ามาแทนได้
 * - % และ GP เป็นสัดส่วน (0.45 = 45%)
 * - เดือนเป็น index 0–11 ของปีแผน (0 = ม.ค.)
 * - หน่วยแบ่งเป้า (unit) = Account หรือเขตการขาย ตาม allocationUnit ของ Channel (ชื่อพารามิเตอร์เก่า accountId = unitId)
 * - เดือนของผู้รับผิดชอบเป็น 'YYYY-MM' (monthKey)
 * - Test อยู่ที่ tests/calc.test.js
 */
(function (SP) {
  'use strict';

  function settings() { return SP.data.settings; }

  function sum(arr) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i] || 0;
    return t;
  }

  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  // =====================================================================
  // 1) Measure chain: จำนวนชิ้น → Sell-out Amount → Net Sales
  // =====================================================================

  // Sell-out Amount ก่อน VAT = จำนวนชิ้น × ราคา (ถ้าราคารวม VAT ให้ ÷ (1 + VAT))
  function sellOutExVat(units, price, includesVat) {
    if (includesVat == null) includesVat = settings().PRICE_INCLUDES_VAT;
    var gross = units * price;
    return includesVat ? gross / (1 + settings().VAT) : gross;
  }

  // Net Sales = Sell-out Amount ก่อน VAT × (1 − GP)
  function netSales(sellOutEx, gp) { return sellOutEx * (1 - gp); }

  // Sell-out Amount รวม VAT = Sell-out Amount ก่อน VAT × (1 + VAT) (ใช้แสดงผล)
  function sellOutIncVat(sellOutEx) { return sellOutEx * (1 + settings().VAT); }

  // กลับด้าน: Sell-out Amount ก่อน VAT = Net Sales ÷ (1 − GP)
  function sellOutFromNet(net, gp) { return gp >= 1 ? NaN : net / (1 - gp); }

  // ทุกขั้นในครั้งเดียว: { units, price, gp, includesVat }
  function chain(o) {
    var ex = sellOutExVat(o.units, o.price, o.includesVat);
    var net = netSales(ex, o.gp);
    var inc = sellOutIncVat(ex);
    return { sellOutExVat: ex, netSales: net, sellOutIncVat: inc, gpAmount: ex - net, vatAmount: inc - ex };
  }

  function reverseChain(net, gp) {
    var ex = sellOutFromNet(net, gp);
    var inc = sellOutIncVat(ex);
    return { netSales: net, sellOutExVat: ex, sellOutIncVat: inc, gpAmount: ex - net, vatAmount: inc - ex };
  }

  // =====================================================================
  // 2) Remaining และ Alert
  // =====================================================================

  // 'ok' = จัดสรรครบ (±ALERT_TOLERANCE_BAHT) | 'short' = ขาด (คงเหลือ > 0) | 'over' = เกิน (คงเหลือ < 0)
  function alertStatus(amount, tolerance) {
    if (tolerance == null) tolerance = settings().ALERT_TOLERANCE_BAHT;
    if (Math.abs(amount) <= tolerance) return 'ok';
    return amount > 0 ? 'short' : 'over';
  }

  // คงเหลือ = เป้าชั้นบน − ผลรวมที่แบ่งแล้ว (บาท และ % ของเป้า)
  // เป้าชั้นบนเป็น 0 และยังไม่ได้แบ่ง → 'empty' (ยังไม่กำหนด)
  function remaining(target, allocated, tolerance) {
    if (tolerance == null) tolerance = settings().ALERT_TOLERANCE_BAHT;
    var amount = target - allocated;
    return {
      target: target,
      allocated: allocated,
      amount: amount,
      pct: target ? amount / target : 0,
      status: !target && Math.abs(allocated) <= tolerance ? 'empty' : alertStatus(amount, tolerance)
    };
  }

  // คงเหลือของกลุ่มที่ยังไม่มีรายการให้แบ่ง (เช่น Channel ที่ยังไม่มี Account/เขต) → 'empty' เสมอ
  function emptyRemaining(target) {
    return { target: target, allocated: 0, amount: target, pct: target ? 1 : 0, status: 'empty' };
  }

  // =====================================================================
  // 3) Channel และหน่วยแบ่งเป้า (Account / เขตการขาย)
  // =====================================================================

  // สีของ Channel = ชื่อ CSS Variable (--ch-1 ถึง --ch-8) ไม่มี colorToken = สีถัดไปตาม order
  function channelColor(ch) {
    if (ch && ch.colorToken) return ch.colorToken;
    return '--ch-' + ((((ch && ch.order) || 1) - 1) % 8 + 1);
  }

  // หน่วยแบ่งเป้าทั้งหมดใน Master → [{ id, name, channelId, active, type: 'ACCOUNT' | 'TERRITORY', gp, gpFrom }]
  function allUnits(data) {
    var out = [];
    (data.accounts || []).forEach(function (a) {
      out.push({ id: a.id, name: a.name, channelId: a.channelId, active: a.active !== false, type: 'ACCOUNT', gp: a.gp, gpFrom: a.gpFrom });
    });
    (data.territories || []).forEach(function (t) {
      out.push({ id: t.id, name: t.name, channelId: t.channelId, active: t.active !== false, type: 'TERRITORY' });
    });
    return out;
  }

  // หน่วยของ Channel ตาม allocationUnit (ACCOUNT → Account Master / TERRITORY → Territory Master)
  function unitsOfChannel(data, channelId, activeOnly) {
    var ch = findById(data.channels, channelId);
    if (!ch) return [];
    return allUnits(data).filter(function (u) {
      return u.channelId === ch.id && u.type === (ch.allocationUnit || 'ACCOUNT') && (!activeOnly || u.active);
    });
  }

  // หน่วยพร้อม Channel → { unit, channel } หรือ null
  function unitInfo(data, unitId) {
    var unit = findById(allUnits(data), unitId);
    if (!unit) return null;
    return { unit: unit, channel: findById(data.channels, unit.channelId) };
  }

  // GP ที่ใช้กับหน่วย: Channel ที่ hasGP = false → 0 / นอกนั้น GP ของ Account (ไม่มีข้อมูล = 0)
  function gpOf(data, unitId) {
    var info = unitInfo(data, unitId);
    if (!info || !info.channel || info.channel.hasGP === false) return 0;
    return info.unit.gp || 0;
  }

  // =====================================================================
  // 4) Top-down: Total → Channel → หน่วยแบ่งเป้า
  // =====================================================================

  // % ↔ บาท: ค่าที่เก็บจริงคือ % (สัดส่วนของเป้าชั้นบน) บาทคำนวณจาก % เสมอ
  function amountFromPct(base, pct) { return base * pct; }
  function pctFromAmount(base, amount) { return base ? amount / base : 0; }

  // การเติบโต = เป้า ÷ ปีก่อน − 1 / เป้าเป็น 0 → NaN (แสดง "–") / ไม่มียอดปีก่อน → null (แสดง "ใหม่")
  function growth(target, prior) {
    if (!target) return NaN;
    return prior > 0 ? target / prior - 1 : null;
  }

  // สัดส่วนปีก่อน: [10, 30, 60] → [0.1, 0.3, 0.6] (ไม่มีข้อมูล = 0)
  function priorShares(values) {
    var t = sum(values);
    return values.map(function (v) { return t > 0 ? (v || 0) / t : 0; });
  }

  // "กระจายตามสัดส่วนปัจจุบัน": ปรับทุกค่าตามสัดส่วนเดิมให้รวมเป็น 100% (40%, 35%, 20% → 42.11%, 36.84%, 21.05%)
  // ผลรวมเป็น 0 → คืนค่าเดิม (ไม่มีสัดส่วนให้กระจาย) / ผู้ใช้ต้องกดเอง ห้ามเรียกอัตโนมัติ
  function normalizeShares(values) {
    var t = sum(values);
    return values.map(function (v) { return t > 0 ? (v || 0) / t : (v || 0); });
  }

  // ยอดทั้งปีของหน่วยจาก history.years[year].monthly (null = ไม่มีข้อมูล)
  function unitHistory(history, year, unitId) {
    var y = history.years[year];
    var m = y && y.monthly[unitId];
    return m ? sum(m) : null;
  }

  // ยอดทั้งปีของ Channel = รวมทุกหน่วยใน Master ของ Channel นั้น (รวมหน่วยที่ไม่อยู่ในแผน)
  function channelHistory(data, year, channelId) {
    var found = false, total = 0;
    unitsOfChannel(data, channelId).forEach(function (u) {
      var v = unitHistory(data.history, year, u.id);
      if (v != null) { found = true; total += v; }
    });
    return found ? total : null;
  }

  // plan = { total, channels: [channelId], pct: { <channelId|unitId>: สัดส่วนของชั้นบน }, units: { <channelId>: [unitId] } }
  // data = SP.data (หรือ store.data()) / year = ปีแผน (ปีก่อน = year − 1 ใช้หา History และ Growth)
  // → { amount, prior, growth, pct: 1, allocatedPct, remaining, children: [Channel] }
  //   Channel = { id, name, fullName, color, allocationUnit, hasGP, sellOutMethod,
  //               pct, amount, prior, growth, allocatedPct, remaining, children: [Unit] }
  //   Unit    = { id, name, type, pct, amount, prior, growth }
  function topDown(data, plan, year) {
    var prev = year - 1;
    var total = plan.total || 0;
    var pct = plan.pct || {};
    var units = plan.units || {};
    var children = (plan.channels || []).map(function (id) { return findById(data.channels, id); }).filter(Boolean).map(function (ch) {
      var chPct = pct[ch.id] || 0;
      var chAmount = amountFromPct(total, chPct);
      var subs = (units[ch.id] || []).map(function (id) {
        var info = unitInfo(data, id);
        var p = pct[id] || 0;
        var amount = amountFromPct(chAmount, p);
        var prior = unitHistory(data.history, prev, id);
        return {
          id: id, name: info ? info.unit.name : id, type: ch.allocationUnit, pct: p, pctOfTotal: pctOfTotal(p, chPct), amount: amount,
          prior: prior, growth: growth(amount, prior), growthAmount: growthAmount(amount, prior)
        };
      });
      var chPrior = channelHistory(data, prev, ch.id);
      return {
        id: ch.id,
        name: ch.name,
        fullName: ch.fullName,
        color: channelColor(ch),
        allocationUnit: ch.allocationUnit,
        hasGP: ch.hasGP !== false,
        sellOutMethod: ch.sellOutMethod,
        pct: chPct,
        amount: chAmount,
        prior: chPrior,
        growth: growth(chAmount, chPrior),
        growthAmount: growthAmount(chAmount, chPrior),
        unitLabel: ch.unitLabel,
        gpLabel: ch.gpLabel,
        children: subs,
        allocatedPct: sum(subs.map(function (s) { return s.pct; })),
        unallocatedPct: subs.length ? 1 - sum(subs.map(function (s) { return s.pct; })) : null,
        // ยังไม่มีหน่วย → ยังไม่กำหนด (ไม่นับว่าจัดสรรครบ)
        remaining: subs.length ? remaining(chAmount, sum(subs.map(function (s) { return s.amount; }))) : emptyRemaining(chAmount)
      };
    });
    var priors = children.map(function (c) { return c.prior; }).filter(function (v) { return v != null; });
    var prior = priors.length ? sum(priors) : null;
    return {
      year: year,
      priorYear: prev,
      amount: total,
      pct: 1,
      prior: prior,
      growth: growth(total, prior),
      growthAmount: growthAmount(total, prior),
      children: children,
      allocatedPct: sum(children.map(function (c) { return c.pct; })),
      unallocatedPct: 1 - sum(children.map(function (c) { return c.pct; })),
      remaining: remaining(total, sum(children.map(function (c) { return c.amount; })))
    };
  }

  // สัดส่วนของแต่ละ Channel ในยอดปีก่อน → { <channelId>: สัดส่วน | null (ไม่มียอดปีก่อน) }
  function priorChannelShares(tree) {
    var out = {};
    tree.children.forEach(function (c) { out[c.id] = tree.prior > 0 && c.prior != null ? c.prior / tree.prior : null; });
    return out;
  }

  // หน่วยทั้งหมดในแผน (ตามลำดับ Channel) → [{ id, name, amount, prior, growth, channel }]
  function planUnits(tree) {
    var out = [];
    tree.children.forEach(function (ch) {
      ch.children.forEach(function (u) { out.push({ id: u.id, name: u.name, amount: u.amount, prior: u.prior, growth: u.growth, channel: ch }); });
    });
    return out;
  }

  // Channel + หน่วยที่จะแสดงจากค่าที่เลือกไว้ (ui.selection = { channel, unit })
  // หน่วยไม่อยู่ในแผนของ Channel นั้น → หน่วยแรกของ Channel (unit = null = Channel ยังไม่มีหน่วย / channel = null = แผนไม่มี Channel)
  function resolveSelection(tree, sel) {
    sel = sel || {};
    var unitId = sel.unit || sel.account;
    var ch = findById(tree.children, sel.channel);
    if (!ch && unitId) ch = tree.children.filter(function (c) { return findById(c.children, unitId); })[0];
    ch = ch || tree.children[0] || null;
    if (!ch) return { channel: null, unit: null };
    return { channel: ch, unit: findById(ch.children, unitId) || ch.children[0] || null };
  }

  // เป้าทั้งปีของหน่วยหนึ่ง (บาท) จาก tree ของ topDown()
  function unitTarget(tree, unitId) {
    var u = findById(planUnits(tree), unitId);
    return u ? u.amount : 0;
  }

  // หน่วยใน Master ที่ active ใน Channel นี้ และยังไม่อยู่ในแผน (รายการ "+ เพิ่ม Account" / "+ เพิ่มเขต")
  function availableUnits(data, plan, channelId) {
    var used = (plan.units && plan.units[channelId]) || [];
    return unitsOfChannel(data, channelId, true).filter(function (u) { return used.indexOf(u.id) < 0; });
  }

  // Channel ใน Master ที่ยังไม่อยู่ในแผนของปี (รายการ "+ เพิ่ม Channel") เรียงตาม order
  function availableChannels(data, plan) {
    var used = plan.channels || [];
    return data.channels.filter(function (c) { return used.indexOf(c.id) < 0; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  // =====================================================================
  // 5) Seasonality และ Phasing
  // =====================================================================

  // Seasonality Index = ยอดเดือนนั้น ÷ ค่าเฉลี่ยรายเดือนของ 12 เดือนย้อนหลัง
  function seasonalityIndex(sales) {
    var mean = sum(sales) / sales.length;
    return sales.map(function (v) { return mean ? v / mean : 1; });
  }

  // สัดส่วนรายเดือน (รวม = 1) = ยอดเดือนนั้น ÷ ยอดรวม 12 เดือน = Index ÷ 12
  function seasonalityShares(sales) {
    var t = sum(sales);
    return sales.map(function (v) { return t ? v / t : 1 / sales.length; });
  }

  // เป้ารายเดือน = เป้าทั้งปี × สัดส่วนของเดือน
  function monthlyTargets(annual, shares) {
    return shares.map(function (s) { return annual * s; });
  }

  // =====================================================================
  // 6) วันที่, ราคาตามวันที่มีผล และ Promotion
  // =====================================================================

  // 'YYYY-MM' หรือ 'YYYY-MM-DD' → { y, m (0–11), d }
  function parseDate(str) {
    var p = String(str).split('-');
    return { y: Number(p[0]), m: Number(p[1]) - 1, d: p[2] ? Number(p[2]) : 1 };
  }

  // index ของเดือนเทียบกับปีแผน: เดือนก่อนปีแผนติดลบ ปีถัดไปได้ 12 ขึ้นไป
  function monthIndex(str, year) {
    var p = parseDate(str);
    return (p.y - year) * 12 + p.m;
  }

  // เดือนแบบนับต่อเนื่อง (ปี × 12 + เดือน)
  function absMonth(str) { var p = parseDate(str); return p.y * 12 + p.m; }

  function daysInMonth(year, m) { return new Date(Date.UTC(year, m + 1, 0)).getUTCDate(); }

  function dayNumber(y, m, d) { return Math.round(Date.UTC(y, m, d) / 86400000); }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // 'YYYY-MM-DD' ของวันที่ d เดือน m ปี year
  function dateKey(year, m, d) { return year + '-' + pad2(m + 1) + '-' + pad2(d); }

  // บวก/ลบวัน: ('2027-06-01', −1) → '2027-05-31'
  function addDays(date, n) {
    var p = parseDate(date);
    var t = new Date(Date.UTC(p.y, p.m, p.d + n));
    return t.getUTCFullYear() + '-' + pad2(t.getUTCMonth() + 1) + '-' + pad2(t.getUTCDate());
  }

  // จำนวนวันที่ช่วง start–end (รวมวันปลาย) ทับกับเดือน m ของปี year
  function overlapDays(start, end, year, m) {
    var s = parseDate(start), e = parseDate(end);
    var from = Math.max(dayNumber(s.y, s.m, s.d), dayNumber(year, m, 1));
    var to = Math.min(dayNumber(e.y, e.m, e.d), dayNumber(year, m, daysInMonth(year, m)));
    return Math.max(0, to - from + 1);
  }

  // ราคาเฉลี่ยถ่วงตามจำนวนวัน segments = [{ days, price }] วันที่เหลือใช้ราคาปกติ (ตัวอย่างในหน้าที่ซ่อนไว้)
  function averagePrice(normalPrice, segments, days) {
    var promoDays = 0, promoValue = 0;
    (segments || []).forEach(function (s) { promoDays += s.days; promoValue += s.days * s.price; });
    promoDays = Math.min(promoDays, days);
    return (normalPrice * (days - promoDays) + promoValue) / days;
  }

  // ราคาจาก Price List ณ วันที่ (มีผล effectiveFrom ถึง effectiveTo รวมวันปลาย / effectiveTo = null = ยังมีผล)
  // ราคาของ Channel นั้นมาก่อนราคากลาง (channelId = null) / ไม่มีราคา → null
  // priceList = [{ productKey, priceType: 'RSP' | 'SELL_IN', channelId, price, effectiveFrom, effectiveTo }]
  function priceOn(priceList, key, type, channelId, date) {
    var best = null;
    (priceList || []).forEach(function (r) {
      if (r.productKey !== key || r.priceType !== type) return;
      if (r.channelId && r.channelId !== channelId) return;
      if (r.effectiveFrom && date < r.effectiveFrom) return;
      if (r.effectiveTo && date > r.effectiveTo) return;
      var better = !best || (!!r.channelId && !best.channelId) ||
        (!!r.channelId === !!best.channelId && (r.effectiveFrom || '') > (best.effectiveFrom || ''));
      if (better) best = r;
    });
    return best ? best.price : null;
  }

  // RSP (ราคาขายปลีกก่อน Promotion) ณ วันที่
  function rspOn(priceList, key, date, channelId) { return priceOn(priceList, key, 'RSP', channelId || null, date); }

  // ประวัติราคาของสินค้า เรียง ประเภท → Channel → วันที่มีผลล่าสุดก่อน
  function priceHistory(priceList, key) {
    return (priceList || []).filter(function (r) { return r.productKey === key; }).sort(function (a, b) {
      if (a.priceType !== b.priceType) return a.priceType === 'RSP' ? -1 : 1;
      if ((a.channelId || '') !== (b.channelId || '')) return (a.channelId || '') < (b.channelId || '') ? -1 : 1;
      return (b.effectiveFrom || '') < (a.effectiveFrom || '') ? -1 : 1;
    });
  }

  // เพิ่มราคาใหม่โดยไม่เขียนทับค่าเดิม: ราคาเดิมของสินค้า × ประเภท × Channel เดียวกันที่ยังมีผล ปิดช่วงที่วันก่อน effectiveFrom
  // → { ok, list, error: 'price' (ต้องมากกว่า 0) | 'date' (วันที่มีผลต้องหลังราคาเดิมทุกรายการ) }
  function addPrice(priceList, entry) {
    if (!(Number(entry.price) > 0)) return { ok: false, error: 'price', list: priceList };
    if (!entry.effectiveFrom) return { ok: false, error: 'date', list: priceList };
    function same(r) { return r.productKey === entry.productKey && r.priceType === entry.priceType && (r.channelId || null) === (entry.channelId || null); }
    var list = copy(priceList || []);
    if (list.some(function (r) { return same(r) && (r.effectiveFrom || '') >= entry.effectiveFrom; })) return { ok: false, error: 'date', list: priceList };
    var prevDay = addDays(entry.effectiveFrom, -1);
    list.forEach(function (r) { if (same(r) && (!r.effectiveTo || r.effectiveTo >= entry.effectiveFrom)) r.effectiveTo = prevDay; });
    var row = copy(entry);
    row.price = Number(row.price);
    row.channelId = row.channelId || null;
    if (row.effectiveTo === undefined) row.effectiveTo = null;
    list.push(row);
    return { ok: true, list: list, error: null };
  }

  // ราคาโปรโมชัน: PRICE = ราคาที่กำหนด / DISCOUNT_PCT = RSP × (1 − ส่วนลด) (ส่วนลดเก็บเป็นสัดส่วน 0.2 = 20%)
  function promoPrice(promo, rsp) {
    return promo.mode === 'DISCOUNT_PCT' ? (rsp || 0) * (1 - (Number(promo.value) || 0)) : Number(promo.value) || 0;
  }

  // Promotion ที่ชนกับ promo: สินค้าเดียวกัน มี Account ร่วมกัน และช่วงวันที่ทับกัน (ไม่นับตัวเอง / นับทุกสถานะ)
  function promoConflicts(promotions, promo) {
    return (promotions || []).filter(function (p) {
      if (p.id === promo.id || p.productKey !== promo.productKey) return false;
      var shared = (p.accountIds || []).some(function (a) { return (promo.accountIds || []).indexOf(a) >= 0; });
      return shared && p.startDate <= promo.endDate && promo.startDate <= p.endDate;
    });
  }

  // ตรวจ Promotion ก่อนบันทึก → { ok, errors: [{ code, names }], warnings: [{ code }] }
  //   errors: 'dates' วันเริ่มหลังวันสิ้นสุด | 'accounts' ไม่เลือก Account | 'price' ราคาหลังคำนวณ ≤ 0 | 'overlap' ชนกับ Promotion อื่น
  //   warnings: 'aboveRsp' ราคาโปรโมชันสูงกว่า RSP
  function validatePromotion(promotions, promo, rsp) {
    var errors = [], warnings = [];
    if (!promo.startDate || !promo.endDate || promo.startDate > promo.endDate) errors.push({ code: 'dates' });
    if (!promo.accountIds || !promo.accountIds.length) errors.push({ code: 'accounts' });
    var price = promoPrice(promo, rsp);
    if (!(price > 0)) errors.push({ code: 'price' });
    else if (rsp != null && price > rsp + 1e-9) warnings.push({ code: 'aboveRsp' });
    var hit = errors.some(function (e) { return e.code === 'dates'; }) ? [] : promoConflicts(promotions, promo);
    if (hit.length) errors.push({ code: 'overlap', names: hit.map(function (p) { return p.name; }) });
    return { ok: !errors.length, errors: errors, warnings: warnings, price: price };
  }

  // ข้อมูลราคาที่ใช้คำนวณ: ปัจจุบัน (data.priceList, data.promotions, GP ของหน่วย) หรือ Snapshot ตอนล็อก Baseline
  // snapshot = { priceList, promotions, gp: { <unitId>: GP } } (ราคาและ Promotion ที่แก้หลังล็อกไม่เปลี่ยน Baseline)
  function pricingOf(data, snapshot) {
    if (snapshot && snapshot.priceList) return { priceList: snapshot.priceList, promotions: snapshot.promotions || [], gp: snapshot.gp || {} };
    return { priceList: data.priceList || [], promotions: data.promotions || [], gp: null };
  }

  // Channel และ GP ปกติของหน่วยขาย (Channel ที่ hasGP = false → GP = 0 ทุกกรณี)
  function unitPricing(data, pricing, unitId) {
    var info = unitInfo(data, unitId);
    var hasGP = !!(info && info.channel && info.channel.hasGP !== false);
    var gp = !hasGP ? 0 : pricing.gp && pricing.gp[unitId] != null ? pricing.gp[unitId] : gpOf(data, unitId);
    return { channelId: info && info.channel ? info.channel.id : null, hasGP: hasGP, gp: gp };
  }

  // ราคาและ GP ที่มีผลของเดือน m (ถ่วงตามจำนวนวัน) ของสินค้า × หน่วยขาย — ใช้ Promotion ที่ยืนยันแล้วเท่านั้น
  // → { days, rsp (RSP เฉลี่ย), price (ราคาที่มีผลเฉลี่ย), gp (GP ที่มีผล ถ่วงตามยอดเงิน), promoDays,
  //     promos: [{ promo, days, price }], drafts: [{ promo, days }] (ฉบับร่างที่ครอบเดือนนี้ ไม่นับในราคา) }
  function monthPricing(pricing, key, unitId, ctx, year, m) {
    var days = daysInMonth(year, m);
    var first = dateKey(year, m, 1), last = dateKey(year, m, days);
    var rows = (pricing.priceList || []).filter(function (r) { return r.productKey === key && r.priceType === 'RSP'; });
    var promos = (pricing.promotions || []).filter(function (p) {
      return p.productKey === key && (p.accountIds || []).indexOf(unitId) >= 0 && p.startDate <= last && p.endDate >= first;
    });
    var rspSum = 0, priceSum = 0, netSum = 0, promoDays = 0, used = {}, drafts = {};
    for (var d = 1; d <= days; d++) {
      var date = dateKey(year, m, d);
      var rsp = priceOn(rows, key, 'RSP', ctx.channelId, date) || 0;
      var promo = null;
      promos.forEach(function (p) {
        if (date < p.startDate || date > p.endDate) return;
        if (p.status === 'CONFIRMED') { if (!promo) promo = p; }
        else (drafts[p.id] = drafts[p.id] || { promo: p, days: 0 }).days += 1;
      });
      var price = promo ? promoPrice(promo, rsp) : rsp;
      var gp = !ctx.hasGP ? 0 : promo && promo.promoGpPct != null ? promo.promoGpPct : ctx.gp;
      rspSum += rsp;
      priceSum += price;
      netSum += price * (1 - gp);
      if (promo) {
        promoDays += 1;
        (used[promo.id] = used[promo.id] || { promo: promo, days: 0, price: price }).days += 1;
      }
    }
    function list(map) { return Object.keys(map).map(function (k) { return map[k]; }); }
    return {
      days: days, rsp: rspSum / days, price: priceSum / days, gp: priceSum > 0 ? 1 - netSum / priceSum : ctx.gp,
      promoDays: promoDays, promos: list(used), drafts: list(drafts)
    };
  }

  // ราคาที่มีผลเฉลี่ยของเดือน (ฟังก์ชันเดียวกับปฏิทิน Promotion และหน้าวางแผน SKU) snapshot = ราคาตอนล็อก Baseline (ไม่ส่ง = ปัจจุบัน)
  function effectivePrice(data, key, unitId, year, m, snapshot) {
    var pr = pricingOf(data, snapshot);
    return monthPricing(pr, key, unitId, unitPricing(data, pr, unitId), year, m).price;
  }

  // GP ที่มีผลของเดือน (GP ช่วง Promotion ถ้ากำหนด ถ่วงตามยอดเงิน)
  function effectiveGp(data, key, unitId, year, m, snapshot) {
    var pr = pricingOf(data, snapshot);
    return monthPricing(pr, key, unitId, unitPricing(data, pr, unitId), year, m).gp;
  }

  // รายละเอียดราคาเดือนนั้น (Tooltip ปฏิทิน Promotion) — includeDraft ไม่มีผลต่อราคา ใช้แสดงรายการฉบับร่างเท่านั้น
  function pricingDetail(data, key, unitId, year, m, snapshot) {
    var pr = pricingOf(data, snapshot);
    return monthPricing(pr, key, unitId, unitPricing(data, pr, unitId), year, m);
  }

  // จำนวนเดือน (fromMonth–ธ.ค.) ที่ราคาหรือ GP ที่มีผลของสินค้าในแผนต่างจาก Snapshot ตอนล็อก Baseline
  function priceChangedMonths(data, snapshot, unitId, keys, year, fromMonth) {
    if (!snapshot || !snapshot.priceList) return 0;
    var live = pricingOf(data, null), snap = pricingOf(data, snapshot);
    var cl = unitPricing(data, live, unitId), cs = unitPricing(data, snap, unitId);
    var n = 0;
    for (var m = Math.max(0, fromMonth || 0); m < 12; m++) {
      var diff = (keys || []).some(function (k) {
        var a = monthPricing(live, k, unitId, cl, year, m), b = monthPricing(snap, k, unitId, cs, year, m);
        return Math.abs(a.price - b.price) > 0.005 || Math.abs(a.gp - b.gp) > 1e-6;
      });
      if (diff) n += 1;
    }
    return n;
  }

  // =====================================================================
  // 7) Clearance และระบบเติม
  // =====================================================================

  // Clearance = Stock ÷ จำนวนเดือน ปัดลงทุกเดือน แล้วเติมเศษให้เดือนท้ายๆ ผลรวมเท่า Stock เสมอ
  // 1,000 ชิ้น 3 เดือน → [333, 333, 334]
  function clearanceSplit(stock, months) {
    if (months <= 0) return [];
    var base = Math.floor(stock / months);
    var rest = stock - base * months;
    var out = [];
    for (var i = 0; i < months; i++) out.push(base + (i >= months - rest ? 1 : 0));
    return out;
  }

  // ระบบเติม = Run-rate × Seasonality Index ของเดือนนั้น (ปัดเป็นชิ้น)
  function systemFill(runRate, index) { return Math.round(runRate * index); }

  // มียอดขายจริงของสินค้า (productKey) ในหน่วยขายนี้แล้วหรือยัง (history = SP.data.history)
  function runRateOf(history, key, unitId) {
    var rr = ((history.runRate || {})[key] || {})[unitId];
    return rr != null && rr > 0 ? rr : null;
  }

  // =====================================================================
  // 8) Phasing: Seasonality ปีก่อน → สัดส่วนรายเดือน
  // =====================================================================

  // ยอดรายเดือนของปีก่อน (year − 1) ของหน่วยนั้น (null = ไม่มีข้อมูล)
  function priorMonthly(history, year, unitId) {
    var y = history.years[year - 1];
    return (y && y.monthly[unitId]) || null;
  }

  // ยอดรายเดือนรวมของทุกหน่วยใน Master ของ Channel นั้น ในปี year (null = ไม่มีข้อมูล)
  function channelMonthly(data, year, channelId) {
    var y = data.history.years[year];
    var out = null;
    if (!y) return null;
    unitsOfChannel(data, channelId).forEach(function (u) {
      var m = y.monthly[u.id];
      if (!m) return;
      out = out || zeros(12);
      m.forEach(function (v, i) { out[i] += v; });
    });
    return out;
  }

  // ฐานของ Seasonality ปีแผน year: ยอดปีก่อนของหน่วย → ไม่มี ใช้ของ Channel → ไม่มี เท่ากันทุกเดือน
  // → { monthly: [12] | null, source: 'account' (ของหน่วยเอง) | 'channel' | 'flat' }
  function phasingBasis(data, year, unitId) {
    var own = priorMonthly(data.history, year, unitId);
    if (own) return { monthly: own, source: 'account' };
    var info = unitInfo(data, unitId);
    var ch = info && info.channel && channelMonthly(data, year - 1, info.channel.id);
    if (ch) return { monthly: ch, source: 'channel' };
    return { monthly: null, source: 'flat' };
  }

  // สัดส่วนตั้งต้นของ Phasing ปีแผน year (รวม = 1)
  function defaultPhasing(data, year, unitId) {
    var basis = phasingBasis(data, year, unitId);
    return basis.monthly ? seasonalityShares(basis.monthly) : zeros(12).map(function () { return 1 / 12; });
  }

  // ผลรวมของ Phasing: บาทรายเดือน = เป้าทั้งปี × % ของเดือน / Remaining = เป้าทั้งปี − ผลรวมบาท
  // ไม่ปรับเดือนอื่นให้ครบ 100% ส่วนต่างไปอยู่ที่ Remaining
  function phasingTotals(annual, monthPct) {
    var amounts = monthPct.map(function (p) { return amountFromPct(annual, p || 0); });
    var amountSum = sum(amounts);
    return { amounts: amounts, pctSum: sum(monthPct), amountSum: amountSum, remaining: remaining(annual, amountSum) };
  }

  // สัดส่วน 2 ชุดต่างกันหรือไม่ (ใช้ตัดสิน Badge "แก้แล้ว")
  function sharesDiffer(a, b) {
    if (!a || !b || a.length !== b.length) return true;
    for (var i = 0; i < a.length; i++) if (Math.abs((a[i] || 0) - (b[i] || 0)) > 1e-9) return true;
    return false;
  }

  // =====================================================================
  // 9) Product Master: รหัสสินค้า, Status, Listing, Clearance, วิธีเติมยอด
  // =====================================================================

  // productKey = TR Code ถ้ามี ไม่มีใช้รหัสชั่วคราว — ใช้อ้างสินค้าทุกที่ (Listing, ราคา, Promotion, แผน SKU, Actual, Run-rate)
  function productKey(product) { return product ? (product.trCode || product.tempCode || '') : ''; }

  function findProduct(products, key) {
    return (products || []).filter(function (p) { return productKey(p) === key; })[0] || null;
  }

  // Status ของสินค้า ณ เดือนที่พิจารณา (month = 'YYYY-MM') คำนวณจากวันที่เท่านั้น (ห้ามให้เลือกเอง)
  // → 'planned' ก่อน launchDate | 'new' NPD_MONTHS เดือนแรก (เดือนที่เริ่มขาย = เดือนที่ 1) | 'active' พ้นช่วง New
  //   | 'clearance' อยู่ในช่วง Clearance (มาก่อน Status อื่นเสมอ) | 'discontinued' หลัง discontinueMonth
  function productStatus(product, month, npdMonths) {
    if (npdMonths == null) npdMonths = settings().NPD_MONTHS;
    var a = absMonth(month);
    var cl = product.clearance;
    if (cl && cl.fromMonth && cl.toMonth && a >= absMonth(cl.fromMonth) && a <= absMonth(cl.toMonth)) return 'clearance';
    if (product.discontinueMonth && a > absMonth(product.discontinueMonth)) return 'discontinued';
    if (!product.launchDate) return 'planned';
    var first = absMonth(product.launchDate);
    if (a < first) return 'planned';
    if (a < first + npdMonths) return 'new';
    return 'active';
  }

  // Status ของเดือน m (0–11) ในปีแผน year
  function statusAt(product, year, m, npdMonths) { return productStatus(product, monthKey(year, m), npdMonths); }

  // ช่วงต่อเนื่องของ Status ทั้งปี → [{ status, from, to }] (Tooltip การเปลี่ยน Status และเส้นเวลา 12 ช่อง)
  function statusSegments(product, year, npdMonths) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var st = statusAt(product, year, m, npdMonths);
      var last = out[out.length - 1];
      if (last && last.status === st) last.to = m;
      else out.push({ status: st, from: m, to: m });
    }
    return out;
  }

  // Status ในบริบทปีแผน = Status ณ เดือนแรกของปีแผน
  function planYearStatus(product, year, npdMonths) { return statusAt(product, year, 0, npdMonths); }

  // ขายอยู่ในปีแผน = มีอย่างน้อย 1 เดือนที่เป็น New / Active / Clearance
  function soldInYear(product, year, npdMonths) {
    for (var m = 0; m < 12; m++) {
      var st = statusAt(product, year, m, npdMonths);
      if (st === 'new' || st === 'active' || st === 'clearance') return true;
    }
    return false;
  }

  // เปิดตัวในปีแผน (กลุ่ม NPD ของปีนั้น) = วันเริ่มขายอยู่ใน ม.ค.–ธ.ค. ของปี year
  function launchesIn(product, year) {
    if (!product.launchDate) return false;
    var i = monthIndex(product.launchDate, year);
    return i >= 0 && i <= 11;
  }

  // listings = [{ productKey, accountId (= unitId) }]
  function isListed(listings, key, unitId) {
    return (listings || []).some(function (l) { return l.productKey === key && l.accountId === unitId; });
  }

  // หน่วยขายที่สินค้านี้ Listing อยู่ (ตามลำดับใน listings)
  function listedAccounts(listings, key) {
    return (listings || []).filter(function (l) { return l.productKey === key; }).map(function (l) { return l.accountId; });
  }

  // Stock Clearance ของหน่วย = stockQty ระดับ SKU แบ่งเท่ากันทุกหน่วยที่ Listing (เศษไปหน่วยท้ายๆ)
  function clearanceStockFor(product, listings, unitId) {
    var cl = product.clearance;
    if (!cl || !cl.stockQty) return 0;
    var accs = listedAccounts(listings, productKey(product));
    var i = accs.indexOf(unitId);
    return i < 0 ? 0 : clearanceSplit(cl.stockQty, accs.length)[i];
  }

  // เดือนแรกที่เริ่มขายในหน่วยได้ = เดือนเริ่มขายใน Product Master (ถ้าเริ่มก่อนปีแผน = ม.ค.)
  function earliestStartMonth(product, year) { return product.launchDate ? Math.max(0, monthIndex(product.launchDate, year)) : 0; }

  // เดือนเริ่มขายในหน่วยต้องไม่ก่อน Launch Date และไม่หลังเดือนเลิกขาย
  function validStartMonth(product, m, year) {
    if (m < 0 || m > 11) return false;
    if (product.launchDate && m < monthIndex(product.launchDate, year)) return false;
    if (product.discontinueMonth && m > monthIndex(product.discontinueMonth, year)) return false;
    return true;
  }

  // วิธีเติมยอดของช่อง: 'locked' ล็อก 0 | 'clearance' | 'manual' กรอกเอง | 'system' ระบบเติม
  // ก่อนเดือนเริ่มขายในหน่วย → ล็อก / Clearance → Clearance / Planned หรือ Discontinued → ล็อก
  // ไม่มี Run-rate ในหน่วยนี้ → กรอกเอง / นอกนั้น → ระบบเติม
  function cellSource(product, m, year, hasRunRate, startMonth, npdMonths) {
    if (startMonth != null && m < startMonth) return 'locked';
    var st = statusAt(product, year, m, npdMonths);
    if (st === 'clearance') return 'clearance';
    if (st === 'planned' || st === 'discontinued') return 'locked';
    return hasRunRate ? 'system' : 'manual';
  }

  // เหตุผลของช่องล็อก 0 (null = ไม่ได้ล็อก): 'notListed' | 'planned' ก่อนวันเริ่มขาย | 'discontinued' เลิกขายแล้ว
  //   | 'beforeStart' สินค้าวางขายแล้วแต่ยังไม่ถึงเดือนเริ่มขายในหน่วยนี้
  function lockReason(product, m, year, startMonth, listed, npdMonths) {
    if (listed === false) return 'notListed';
    var st = statusAt(product, year, m, npdMonths);
    if (st === 'planned') return 'planned';
    if (st === 'discontinued') return 'discontinued';
    if (startMonth != null && m < startMonth) return 'beforeStart';
    return null;
  }

  // =====================================================================
  // 10) แผนราย SKU: โหมด, สิทธิ์แก้ช่อง, Grid
  // =====================================================================

  // mode = 'initial' สร้างแผนครั้งแรก | 'reforecast' ปรับแผน / currentMonth = index เดือนปัจจุบัน (จำลอง)
  // → { editable, reason }  reason: 'locked' | 'actual' (≤ M) | 'frozen' (M+1..M+frozen) | 'open' | วิธีเติมยอด
  function cellState(mode, m, currentMonth, fillSource, frozen) {
    if (frozen == null) frozen = settings().FROZEN_MONTHS;
    if (fillSource === 'locked') return { editable: false, reason: 'locked' };
    if (mode !== 'reforecast') return { editable: true, reason: fillSource };
    if (m <= currentMonth) return { editable: false, reason: 'actual' };
    if (m <= currentMonth + frozen) return { editable: false, reason: 'frozen' };
    return { editable: true, reason: 'open' };
  }

  function fill(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }

  // ใช้ในแผน SKU ได้หรือไม่ → null | 'notSale' (ไม่ใช่สินค้าขายจริง) | 'incomplete' (ขาดข้อมูลจำเป็น)
  function planBlockReason(product, priceList) {
    if ((product.itemType || 'SALE') !== 'SALE') return 'notSale';
    return productCompleteness(product, priceList).complete ? null : 'incomplete';
  }

  // แผน NPD ที่อนุมัติแล้วของสินค้า × หน่วยขาย → เดือนเริ่มขาย (index ในปีแผน) | null
  function npdStartMonth(npdPlans, key, unitId, year) {
    var plan = (npdPlans || []).filter(function (n) { return n.productKey === key && n.workflow && n.workflow.status === 'approved'; })[0];
    var a = plan && (plan.plannedAccounts || []).filter(function (x) { return x.accountId === unitId; })[0];
    if (!a || !a.plannedStartMonth) return null;
    var i = monthIndex(a.plannedStartMonth, year);
    return i >= 0 && i <= 11 ? i : null;
  }

  // แถวใหม่ในแผน: เริ่มขายเดือนแรกที่ทำได้ (หรือเดือนจากแผน NPD ที่อนุมัติแล้ว) / qty = ค่าช่องกรอกเอง / overrides = ช่องที่ถูกแก้
  function newPlanItem(product, year, qtyDefault, startMonth) {
    var start = startMonth != null && validStartMonth(product, startMonth, year) ? startMonth : earliestStartMonth(product, year);
    return { startMonth: start, qty: fill(12, qtyDefault || 0), overrides: fill(12, false), stopped: false };
  }

  // แผนตั้งต้นของหน่วย = สินค้าขายจริงที่ข้อมูลจำเป็นครบ Listing ในหน่วยนี้ และขายอยู่ในปีแผน (เปิดตัวก่อนปีแผน)
  //   + NPD ที่แผน NPD อนุมัติแล้วและวางแผนหน่วยนี้ไว้ (เดือนเริ่มขายจากแผน NPD) — NPD อื่นต้องเพิ่มเอง
  // master = { products, listings, priceList, npdPlans } / withDefaults = ใช้ manualDefault (เฉพาะปีที่มีข้อมูลตั้งต้น)
  // seeds = { <productKey>: { <เดือน>: ชิ้น } } ค่าตั้งต้นรายช่อง (data/plan-seeds.js) → ช่องนั้นเป็น Override
  function defaultSkuPlan(master, unitId, year, withDefaults, seeds) {
    var items = {};
    master.products.forEach(function (p) {
      var key = productKey(p);
      if (!isListed(master.listings, key, unitId) || planBlockReason(p, master.priceList)) return;
      var npdStart = npdStartMonth(master.npdPlans, key, unitId, year);
      if (npdStart == null && (launchesIn(p, year) || !soldInYear(p, year))) return;
      var item = newPlanItem(p, year, withDefaults && p.manualDefault ? p.manualDefault[unitId] : 0, npdStart);
      var seed = seeds && seeds[key];
      if (seed) Object.keys(seed).forEach(function (m) { item.qty[Number(m)] = seed[m]; item.overrides[Number(m)] = true; });
      items[key] = item;
    });
    return { items: items };
  }

  // สินค้าที่เพิ่มในแผนได้ = ขายจริง Listing ในหน่วยนี้ ยังไม่อยู่ในแผน และขายในปีแผน
  // → [{ product, key, status (ณ ม.ค.), npd (เปิดตัวในปีแผน), blocked: null | 'incomplete', missing: [ฟิลด์จำเป็นที่ขาด], startMonth }]
  //   blocked = แสดงในรายการแต่เลือกไม่ได้
  function availableSkus(master, unitId, plan, year) {
    var items = (plan && plan.items) || {};
    return master.products.filter(function (p) {
      var key = productKey(p);
      return (p.itemType || 'SALE') === 'SALE' && isListed(master.listings, key, unitId) && !items[key] && soldInYear(p, year);
    }).map(function (p) {
      var key = productKey(p);
      var c = productCompleteness(p, master.priceList);
      return {
        product: p, key: key, status: planYearStatus(p, year), npd: launchesIn(p, year),
        blocked: c.complete ? null : 'incomplete', missing: c.missingRequired, startMonth: npdStartMonth(master.npdPlans, key, unitId, year)
      };
    });
  }

  // หยุดวางแผน (ลบในโหมดปรับแผน): เดือนที่แก้ได้ (หลัง M+frozen) = 0 คงเดือน Actual และเดือนที่ล็อกไว้
  function stopPlanItem(item, currentMonth, frozen) {
    if (frozen == null) frozen = settings().FROZEN_MONTHS;
    var out = JSON.parse(JSON.stringify(item));
    for (var m = Math.max(0, currentMonth + frozen + 1); m < 12; m++) { out.qty[m] = 0; out.overrides[m] = true; }
    out.stopped = true;
    return out;
  }

  // ยอดขายจริง (ชิ้น) จาก data.actuals (ไม่มีข้อมูล = 0)
  function actualUnits(actuals, year, unitId, key, m) {
    var y = actuals && actuals.years[year];
    var a = y && y[unitId] && y[unitId][key];
    return a ? a[m] || 0 : 0;
  }

  // Grid ของแผนราย SKU ในหน่วยขายหนึ่ง
  //   data   = store.data() (priceList, promotions, history, settings, actuals, accounts/territories/channels สำหรับ GP)
  //   master = { products, listings } จาก store (master.*)
  //   plan   = { items: { <productKey>: item } } จาก store (plan.<ปี>.sku.<id> หรือ plan.<ปี>.forecast.<id>)
  //   opts   = { year, mode: 'initial' | 'reforecast', currentMonth, includesVat, snapshot (ราคาตอนล็อก Baseline) }
  // ชิ้นต่อช่อง: เดือน Actual (โหมดปรับแผน) = ยอดจริง / ล็อก = 0 / กรอกเอง หรือ Override = qty
  //             ระบบเติม = Run-rate × Seasonality Index / Clearance = Stock ของหน่วย ÷ จำนวนเดือน
  // ราคาและ GP ต่อช่อง = monthPricing (ราคาตามวันที่มีผล + Promotion ที่ยืนยันแล้ว ถ่วงตามจำนวนวัน)
  function skuPlanGrid(data, master, unitId, plan, opts) {
    opts = opts || {};
    var st = data.settings;
    var year = opts.year || st.DEFAULT_PLAN_YEAR;
    var mode = opts.mode || 'initial';
    var current = opts.currentMonth == null ? -1 : opts.currentMonth;
    var includesVat = opts.includesVat != null ? opts.includesVat : st.PRICE_INCLUDES_VAT;
    var pricing = pricingOf(data, opts.snapshot);
    var ctx = unitPricing(data, pricing, unitId);
    var si = seasonalityIndex(priorMonthly(data.history, year, unitId) || fill(12, 1));
    var totals = { units: zeros(12), sellOut: zeros(12), net: zeros(12) };
    var items = (plan && plan.items) || {};

    var rows = master.products.filter(function (p) { return items[productKey(p)]; }).map(function (p) {
      var key = productKey(p);
      var item = items[key];
      var listed = isListed(master.listings, key, unitId);
      var rr = runRateOf(data.history, key, unitId);
      var clFrom = p.clearance ? monthIndex(p.clearance.fromMonth, year) : 0;
      var clSplit = p.clearance
        ? clearanceSplit(clearanceStockFor(p, master.listings, unitId), monthIndex(p.clearance.toMonth, year) - clFrom + 1)
        : [];
      var cells = [];
      for (var m = 0; m < 12; m++) {
        var source = listed ? cellSource(p, m, year, rr != null, item.startMonth, st.NPD_MONTHS) : 'locked';
        var lock = source === 'locked' ? lockReason(p, m, year, item.startMonth, listed, st.NPD_MONTHS) : null;
        var state = cellState(mode, m, current, source, st.FROZEN_MONTHS);
        var systemUnits = source === 'system' ? systemFill(rr, si[m]) : source === 'clearance' ? (clSplit[m - clFrom] || 0) : null;
        var override = !!(item.overrides && item.overrides[m]) && systemUnits != null;
        var planned = source === 'locked' ? 0 : (source === 'manual' || override) ? Number(item.qty[m] || 0) : systemUnits;
        var units = state.reason === 'actual' ? actualUnits(data.actuals, year, unitId, key, m) : planned;
        var pm = monthPricing(pricing, key, unitId, ctx, year, m);
        var c = chain({ units: units, price: pm.price, gp: pm.gp, includesVat: includesVat });
        totals.units[m] += units;
        totals.sellOut[m] += c.sellOutExVat;
        totals.net[m] += c.netSales;
        cells.push({
          m: m, status: statusAt(p, year, m, st.NPD_MONTHS), source: source, lockReason: lock, state: state, units: units, planned: planned,
          systemUnits: systemUnits, override: override, price: pm.price, rsp: pm.rsp, normalPrice: pm.rsp, gp: pm.gp,
          promos: pm.promos, promoDays: pm.promoDays, days: pm.days, sellOut: c.sellOutExVat, net: c.netSales
        });
      }
      return {
        key: key,
        product: p,
        item: item,
        listed: listed,
        status: planYearStatus(p, year, st.NPD_MONTHS),
        group: launchesIn(p, year) ? 'npd' : 'selling',
        runRate: rr,
        segments: statusSegments(p, year, st.NPD_MONTHS),
        hasOverride: cells.some(function (c) { return c.override; }),
        cells: cells,
        total: {
          units: sum(cells.map(function (c) { return c.units; })),
          sellOut: sum(cells.map(function (c) { return c.sellOut; })),
          net: sum(cells.map(function (c) { return c.net; }))
        }
      };
    });

    return {
      accountId: unitId, unitId: unitId, year: year, mode: mode, gp: ctx.gp, hasGP: ctx.hasGP, includesVat: includesVat, si: si, rows: rows, totals: totals,
      yearTotal: { units: sum(totals.units), sellOut: sum(totals.sellOut), net: sum(totals.net) }
    };
  }

  // =====================================================================
  // 11) ช่วงเวลา Forecast (หน้า approval)
  // =====================================================================

  // 'past' ผ่านไปแล้ว | 'current' เดือนปัจจุบัน (ล็อก) | 'locked' M+1..M+frozen | 'open' ปรับได้
  function monthWindow(current, m, frozen) {
    if (frozen == null) frozen = settings().FROZEN_MONTHS;
    if (m < current) return 'past';
    if (m === current) return 'current';
    if (m <= current + frozen) return 'locked';
    return 'open';
  }

  // =====================================================================
  // 12) ตัวช่วยค้นข้อมูล
  // =====================================================================

  function findById(list, id) { return (list || []).filter(function (x) { return x.id === id; })[0] || null; }

  // =====================================================================
  // 13) ผู้รับผิดชอบตามช่วงเวลา (assignments) — เป้าและยอดผูกกับหน่วย ไม่ผูกกับคน
  //     เดือนเป็น 'YYYY-MM' (เทียบแบบ String ได้) / assignment = { unitId, salesPersonId | null, fromMonth, toMonth | null }
  // =====================================================================

  // (2027, 0) → '2027-01'
  function monthKey(year, m) {
    var y = year + Math.floor(m / 12);
    var mm = ((m % 12) + 12) % 12 + 1;
    return y + '-' + (mm < 10 ? '0' : '') + mm;
  }

  // '2027-01' + 2 → '2027-03'
  function addMonths(key, n) {
    var p = parseDate(key);
    return monthKey(p.y, p.m + n);
  }

  // คนนี้ทำงานอยู่ในเดือน key หรือไม่ (startMonth ≤ key ≤ endMonth)
  function employedIn(person, key) {
    return !!person && (!person.startMonth || person.startMonth <= key) && (!person.endMonth || key <= person.endMonth);
  }

  // สถานะของ Sales Person ณ เดือน key: 'active' | 'leaving' (มีเดือนลาออกแล้วแต่ยังทำงาน) | 'resigned' | 'future' (ยังไม่เริ่มงาน)
  function personStatus(person, key) {
    if (person.endMonth && person.endMonth < key) return 'resigned';
    if (person.startMonth && person.startMonth > key) return 'future';
    return person.endMonth ? 'leaving' : 'active';
  }

  // ลบหน่วย (Account / เขต) ออกจาก Master ได้หรือไม่: ต้องไม่อยู่ในแผน (inPlan = { <unitId>: true })
  // ไม่มียอดขายย้อนหลังในปีใดเลย และไม่เคยมีผู้รับผิดชอบ — นอกนั้นให้ปิดใช้งานแทน
  function canRemoveUnit(data, unitId, inPlan) {
    if (inPlan && inPlan[unitId]) return false;
    if ((data.assignments || []).some(function (a) { return a.unitId === unitId; })) return false;
    var years = (data.history && data.history.years) || {};
    return !Object.keys(years).some(function (y) { return years[y].monthly && years[y].monthly[unitId]; });
  }

  // ช่วงของหน่วยนี้เรียงตามเดือน
  function unitAssignments(assignments, unitId) {
    return (assignments || []).filter(function (a) { return a.unitId === unitId; })
      .sort(function (a, b) { return a.fromMonth < b.fromMonth ? -1 : a.fromMonth > b.fromMonth ? 1 : 0; });
  }

  function covers(a, key) { return a.fromMonth <= key && (a.toMonth == null || key <= a.toMonth); }

  // ช่วงที่ครอบเดือน key (null = ไม่มี = ว่าง)
  function assignmentAt(assignments, unitId, key) {
    return unitAssignments(assignments, unitId).filter(function (a) { return covers(a, key); })[0] || null;
  }

  // ผู้รับผิดชอบหน่วยในเดือน key → salesPersonId หรือ null (ว่าง หรือคนที่ผูกไว้ลาออกแล้ว/ยังไม่เริ่มงาน)
  function ownerOf(assignments, salespeople, unitId, key) {
    var a = assignmentAt(assignments, unitId, key);
    if (!a || !a.salesPersonId) return null;
    var p = findById(salespeople, a.salesPersonId);
    return employedIn(p, key) ? p.id : null;
  }

  // 12 เดือนของปีแผน → [{ personId | null, assignedId | null, state: 'owner' | 'vacant' | 'resigned' }]
  //   resigned = ยังผูกกับคนที่ลาออกแล้ว (นับเป็นว่างในการคำนวณ)
  function ownerMonths(assignments, salespeople, unitId, year) {
    var out = [];
    for (var m = 0; m < 12; m++) {
      var key = monthKey(year, m);
      var a = assignmentAt(assignments, unitId, key);
      var owner = ownerOf(assignments, salespeople, unitId, key);
      out.push({ personId: owner, assignedId: a ? a.salesPersonId : null, state: owner ? 'owner' : a && a.salesPersonId ? 'resigned' : 'vacant' });
    }
    return out;
  }

  // แถบผู้รับผิดชอบ: เดือนติดกันที่เป็นคนเดียวกัน (และสถานะเดียวกัน) รวมเป็นช่วงเดียว → [{ personId, assignedId, state, from, to }]
  function ownerSegments(assignments, salespeople, unitId, year) {
    var out = [];
    ownerMonths(assignments, salespeople, unitId, year).forEach(function (o, m) {
      var last = out[out.length - 1];
      if (last && last.state === o.state && last.personId === o.personId && last.assignedId === o.assignedId) last.to = m;
      else out.push({ personId: o.personId, assignedId: o.assignedId, state: o.state, from: m, to: m });
    });
    return out;
  }

  // ช่วงที่ทับกันในหน่วยเดียวกัน → [{ unitId, first, second }] (ว่าง = ถูกต้อง)
  function validateAssignments(list) {
    var bad = [];
    var byUnit = {};
    (list || []).forEach(function (a) { (byUnit[a.unitId] = byUnit[a.unitId] || []).push(a); });
    Object.keys(byUnit).forEach(function (u) {
      var rows = unitAssignments(list, u);
      for (var i = 1; i < rows.length; i++) {
        var prev = rows[i - 1];
        if (prev.toMonth == null || prev.toMonth >= rows[i].fromMonth) bad.push({ unitId: u, first: prev, second: rows[i] });
      }
      rows.forEach(function (a) { if (a.toMonth != null && a.toMonth < a.fromMonth) bad.push({ unitId: u, first: a, second: a }); });
    });
    return bad;
  }

  function sameOwner(a, b) { return (a.salesPersonId || null) === (b.salesPersonId || null); }

  // กำหนดผู้รับผิดชอบหน่วย unitId ตั้งแต่ fromKey ถึง toKey (null = ต่อไปเรื่อยๆ) personId = null → ว่าง
  // ช่วงเดิมที่ทับจะถูกตัดออก ช่วงติดกันของคนเดียวกันรวมเป็นช่วงเดียว
  // currentKey = เดือนปัจจุบัน: เดือนก่อนหน้าเป็นประวัติ แก้ไม่ได้ (fromKey < currentKey → error 'past')
  // → { ok: true, list } | { ok: false, error: 'past' | 'range' }
  function setOwner(list, unitId, personId, fromKey, toKey, currentKey) {
    if (toKey != null && toKey < fromKey) return { ok: false, error: 'range' };
    if (currentKey && fromKey < currentKey) return { ok: false, error: 'past' };
    var out = [];
    (list || []).forEach(function (a) {
      if (a.unitId !== unitId) { out.push({ unitId: a.unitId, salesPersonId: a.salesPersonId, fromMonth: a.fromMonth, toMonth: a.toMonth }); return; }
      if (a.fromMonth < fromKey) {
        var end = a.toMonth != null && a.toMonth < fromKey ? a.toMonth : addMonths(fromKey, -1);
        out.push({ unitId: unitId, salesPersonId: a.salesPersonId, fromMonth: a.fromMonth, toMonth: end });
      }
      if (toKey != null && (a.toMonth == null || a.toMonth > toKey)) {
        var start = a.fromMonth > toKey ? a.fromMonth : addMonths(toKey, 1);
        out.push({ unitId: unitId, salesPersonId: a.salesPersonId, fromMonth: start, toMonth: a.toMonth });
      }
    });
    out.push({ unitId: unitId, salesPersonId: personId || null, fromMonth: fromKey, toMonth: toKey == null ? null : toKey });
    // รวมช่วงติดกันของคนเดียวกัน
    var others = out.filter(function (a) { return a.unitId !== unitId; });
    var rows = unitAssignments(out, unitId);
    var merged = [];
    rows.forEach(function (a) {
      var last = merged[merged.length - 1];
      if (last && sameOwner(last, a) && last.toMonth != null && addMonths(last.toMonth, 1) === a.fromMonth) last.toMonth = a.toMonth;
      else merged.push(a);
    });
    return { ok: true, list: others.concat(merged) };
  }

  // บันทึกเดือนลาออก: ต้องไม่ก่อนเดือนปัจจุบัน และไม่ก่อนเดือนเริ่มงาน → { ok, people, error: 'past' | 'range' }
  function setEndMonth(people, personId, endKey, currentKey) {
    var p = findById(people, personId);
    if (!p) return { ok: false, error: 'range' };
    if (endKey && currentKey && endKey < currentKey) return { ok: false, error: 'past' };
    if (endKey && p.startMonth && endKey < p.startMonth) return { ok: false, error: 'range' };
    return {
      ok: true,
      people: people.map(function (x) {
        var c = JSON.parse(JSON.stringify(x));
        if (c.id === personId) c.endMonth = endKey || null;
        return c;
      })
    };
  }

  // Sales Person ที่กำหนดให้หน่วยของ Channel นี้ได้ในเดือน key: ทำงานอยู่ และ channelId ตรงกัน หรือ null (ดูแลได้ทุก Channel)
  function eligiblePeople(salespeople, channelId, key) {
    return (salespeople || []).filter(function (p) {
      return (p.channelId == null || p.channelId === channelId) && (!key || employedIn(p, key));
    });
  }

  // Alert ของหน่วยในแผน → [{ unitId, type: 'vacant' | 'resigned', months: [index], personId }]
  //   vacant = ไม่มีผู้รับผิดชอบ / resigned = ยังผูกกับคนที่ลาออกแล้ว (นับเป็นว่าง)
  function assignmentAlerts(assignments, salespeople, unitIds, year) {
    var out = [];
    unitIds.forEach(function (u) {
      var vacant = [], resigned = {};
      ownerMonths(assignments, salespeople, u, year).forEach(function (o, m) {
        if (o.state === 'vacant') vacant.push(m);
        if (o.state === 'resigned') (resigned[o.assignedId] = resigned[o.assignedId] || []).push(m);
      });
      if (vacant.length) out.push({ unitId: u, type: 'vacant', months: vacant, personId: null });
      Object.keys(resigned).forEach(function (p) { out.push({ unitId: u, type: 'resigned', months: resigned[p], personId: p }); });
    });
    return out;
  }

  // =====================================================================
  // 14) Performance รายคน: รวมเป้าและยอดของทุกหน่วย เฉพาะเดือนที่คนนั้นรับผิดชอบ
  // =====================================================================

  // values = { <unitId>: [12 ตัวเลข] } ของ source ที่ต้องการ (Target Baseline หรือ Actual)
  // → { personId, months: [12], total, owned: [12 bool], units: [{ unitId, months, total }] }
  function performanceByPerson(assignments, salespeople, personId, year, values) {
    var months = zeros(12), owned = fill(12, false), units = [];
    Object.keys(values || {}).forEach(function (unitId) {
      var row = zeros(12), any = false;
      for (var m = 0; m < 12; m++) {
        if (ownerOf(assignments, salespeople, unitId, monthKey(year, m)) !== personId) continue;
        row[m] = values[unitId][m] || 0;
        months[m] += row[m];
        owned[m] = true;
        any = true;
      }
      if (any) units.push({ unitId: unitId, months: row, total: sum(row) });
    });
    return { personId: personId, months: months, total: sum(months), owned: owned, units: units };
  }

  // ตาราง Performance ของคนหนึ่ง: Target Baseline ทั้งช่วงที่รับผิดชอบ, Target และ Actual ถึงเดือนปัจจุบัน, % ความสำเร็จ
  // targets / actuals = { <unitId>: [12] } / currentMonth = index เดือนปัจจุบัน (นับเป็น Actual)
  function personPerformance(assignments, salespeople, personId, year, targets, actuals, currentMonth) {
    var t = performanceByPerson(assignments, salespeople, personId, year, targets);
    var a = performanceByPerson(assignments, salespeople, personId, year, actuals);
    var upto = function (arr) { return sum(arr.slice(0, currentMonth + 1)); };
    var targetToDate = upto(t.months);
    var actualToDate = upto(a.months);
    return {
      personId: personId,
      owned: t.owned,
      units: t.units.map(function (u) { return u.unitId; }),
      target: t.total,
      targetToDate: targetToDate,
      actualToDate: actualToDate,
      achievement: targetToDate > 0 ? actualToDate / targetToDate : null
    };
  }

  // ยอดจริงเป็น Net Sales รายเดือนของหน่วย (ชิ้นจาก data.actuals × ราคาที่มีผล × (1 − GP ที่มีผล)) เดือนหลัง uptoMonth = 0
  function actualNetByUnit(data, master, unitId, year, uptoMonth) {
    var out = zeros(12);
    var y = data.actuals && data.actuals.years[year];
    var rows = (y && y[unitId]) || {};
    var pricing = pricingOf(data, null);
    var ctx = unitPricing(data, pricing, unitId);
    Object.keys(rows).forEach(function (key) {
      if (!findProduct(master.products, key)) return;
      for (var m = 0; m <= Math.min(11, uptoMonth); m++) {
        var units = rows[key][m] || 0;
        if (!units) continue;
        var pm = monthPricing(pricing, key, unitId, ctx, year, m);
        out[m] += chain({ units: units, price: pm.price, gp: pm.gp }).netSales;
      }
    });
    return out;
  }

  // =====================================================================
  // 15) คำอธิบายการคำนวณ (ⓘ และ Tooltip รายช่องในหน้าวางแผน SKU)
  // =====================================================================

  // การคำนวณของช่องเดียว: ชิ้น × ราคา → Sell-out ก่อน VAT → Net Sales → รวม VAT
  function cellBreakdown(units, price, gp, includesVat) {
    var c = chain({ units: units, price: price, gp: gp, includesVat: includesVat });
    return {
      units: units, price: price, gp: gp,
      sellOutExVat: c.sellOutExVat, netSales: c.netSales, sellOutIncVat: c.sellOutIncVat,
      gpAmount: c.gpAmount, vatAmount: c.vatAmount
    };
  }

  // เงินที่ลูกค้าจ่าย (รวม VAT) ไปอยู่ที่ใคร: Net Sales (บริษัท) / GP (ร้านค้า) / VAT
  // hasGP = false → ไม่มีส่วน GP → { sellOutExVat, total, parts: [{ key: 'net' | 'gp' | 'vat', value, share }] }
  function moneySplit(sellOutEx, gp, hasGP) {
    var g = hasGP === false ? 0 : gp;
    var net = netSales(sellOutEx, g);
    var inc = sellOutIncVat(sellOutEx);
    var parts = [{ key: 'net', value: net }];
    if (hasGP !== false) parts.push({ key: 'gp', value: sellOutEx - net });
    parts.push({ key: 'vat', value: inc - sellOutEx });
    parts.forEach(function (p) { p.share = inc ? p.value / inc : 0; });
    return { sellOutExVat: sellOutEx, total: inc, parts: parts };
  }

  // =====================================================================
  // 16) Series, หมวดสินค้า และผลรวมของแถวที่เลือก
  // =====================================================================

  var TAX_LEVELS = { category: ['CATEGORY', 'SUB_CATEGORY', 'TYPE'], series: ['SERIES', 'SUB_SERIES'] };
  var TAX_FIELDS = { CATEGORY: 'categoryId', SUB_CATEGORY: 'subCategoryId', TYPE: 'typeId', SERIES: 'seriesId', SUB_SERIES: 'subSeriesId' };

  // taxonomy = { category: [{ id, name, parentId, level, active, order }], series: [...] } / kind = 'category' | 'series'
  function taxonomyNode(tax, kind, id) { return id ? findById(tax && tax[kind], id) : null; }
  function taxonomyName(tax, kind, id) { var n = taxonomyNode(tax, kind, id); return n ? n.name : ''; }

  // รายการย่อยของ parentId (null = ระดับบนสุด) เรียงตามลำดับ / activeOnly = เฉพาะที่เปิดใช้งาน (ฟอร์มสินค้า)
  function taxonomyChildren(tax, kind, parentId, activeOnly) {
    return ((tax && tax[kind]) || []).filter(function (n) {
      return (n.parentId || null) === (parentId || null) && (!activeOnly || n.active !== false);
    }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  // Tree เรียงตามลำดับ → [{ node, depth }]
  function taxonomyTree(tax, kind) {
    var out = [];
    (function walk(parentId, depth) {
      taxonomyChildren(tax, kind, parentId).forEach(function (n) { out.push({ node: n, depth: depth }); walk(n.id, depth + 1); });
    })(null, 0);
    return out;
  }

  // ฟิลด์ของสินค้าที่อ้างรายการระดับนี้ (CATEGORY → categoryId, …)
  function taxonomyField(level) { return TAX_FIELDS[level]; }

  // จำนวน SKU ที่ใช้รายการนี้อยู่
  function taxonomyUsage(products, node) {
    var f = node && TAX_FIELDS[node.level];
    return f ? (products || []).filter(function (p) { return p[f] === node.id; }).length : 0;
  }

  // ลบรายการ: ห้ามลบเมื่อมี SKU ใช้อยู่ ('inUse' + count) หรือยังมีรายการย่อย ('hasChildren') → ให้ปิดใช้งานแทน
  function removeTaxonomyNode(tax, products, kind, id) {
    var node = taxonomyNode(tax, kind, id);
    if (!node) return { ok: false, error: 'notFound', count: 0 };
    var used = taxonomyUsage(products, node);
    if (used) return { ok: false, error: 'inUse', count: used };
    var kids = taxonomyChildren(tax, kind, id).length;
    if (kids) return { ok: false, error: 'hasChildren', count: kids };
    var out = copy(tax);
    out[kind] = out[kind].filter(function (n) { return n.id !== id; });
    return { ok: true, error: null, taxonomy: out };
  }

  // เพิ่มรายการย่อย (parentId = null = ระดับบนสุด) ระดับถัดจาก parent → { ok, taxonomy, node, error: 'depth' | 'name' }
  function addTaxonomyNode(tax, kind, parentId, name, id) {
    var levels = TAX_LEVELS[kind];
    var parent = parentId ? taxonomyNode(tax, kind, parentId) : null;
    var level = parent ? levels[levels.indexOf(parent.level) + 1] : levels[0];
    if (!level) return { ok: false, error: 'depth' };
    var clean = String(name || '').trim();
    if (!clean) return { ok: false, error: 'name' };
    var siblings = taxonomyChildren(tax, kind, parentId);
    var node = { id: id, name: clean, parentId: parentId || null, level: level, active: true, order: siblings.length ? siblings[siblings.length - 1].order + 1 : 1 };
    var out = copy(tax);
    out[kind].push(node);
    return { ok: true, taxonomy: out, node: node, error: null };
  }

  // เลื่อนลำดับขึ้น (delta = −1) หรือลง (+1) ภายในรายการระดับเดียวกัน
  function moveTaxonomyNode(tax, kind, id, delta) {
    var node = taxonomyNode(tax, kind, id);
    if (!node) return tax;
    var sib = taxonomyChildren(tax, kind, node.parentId);
    var i = sib.map(function (n) { return n.id; }).indexOf(id);
    var j = i + delta;
    if (j < 0 || j >= sib.length) return tax;
    var out = copy(tax);
    var a = findById(out[kind], sib[i].id), b = findById(out[kind], sib[j].id);
    var t = a.order; a.order = b.order; b.order = t;
    if (a.order === b.order) { a.order += delta; }
    return out;
  }

  // ชื่อหมวดสินค้าและ Series ของสินค้า
  function productTaxonomy(tax, product) {
    return {
      category: taxonomyName(tax, 'category', product.categoryId), subCategory: taxonomyName(tax, 'category', product.subCategoryId),
      type: taxonomyName(tax, 'category', product.typeId), series: taxonomyName(tax, 'series', product.seriesId),
      subSeries: taxonomyName(tax, 'series', product.subSeriesId)
    };
  }

  // ตัวเลือก Filter Series: Series แล้วตามด้วย Sub Series พร้อมจำนวน SKU → [{ value, label, count, depth, parentId }]
  //   เลือก Series = รวม Sub Series ทั้งหมด (inSeries) / สินค้าที่ไม่มี Series → value '' label null
  function seriesList(tax, products) {
    var out = [];
    taxonomyChildren(tax, 'series', null).forEach(function (s) {
      out.push({ value: s.id, label: s.name, depth: 0, parentId: null, count: products.filter(function (p) { return p.seriesId === s.id; }).length });
      taxonomyChildren(tax, 'series', s.id).forEach(function (ss) {
        out.push({ value: ss.id, label: ss.name, depth: 1, parentId: s.id, count: products.filter(function (p) { return p.subSeriesId === ss.id; }).length });
      });
    });
    var none = products.filter(function (p) { return !p.seriesId; }).length;
    if (none) out.push({ value: '', label: null, depth: 0, parentId: null, count: none });
    return out;
  }

  // สินค้าอยู่ใน Series ที่เลือกหรือไม่ (ไม่เลือก = ทุก Series / เลือก Series = รวมทุก Sub Series)
  function inSeries(product, selected) {
    if (!selected || !selected.length) return true;
    return selected.indexOf(product.seriesId || '') >= 0 || (!!product.subSeriesId && selected.indexOf(product.subSeriesId) >= 0);
  }

  // ผลรวมรายเดือนของหลายชุด (เช่น เป้าหมายรายเดือนของหลายหน่วย) → [12]
  function addMonthly(list) {
    var out = zeros(12);
    (list || []).forEach(function (arr) { (arr || []).forEach(function (v, m) { out[m] += v || 0; }); });
    return out;
  }

  // แผน Net Sales แยกตามกลุ่มสินค้า จากแถวของ skuPlanGrid หลายหน่วย → [{ key, value }] ผลรวมทุกกลุ่ม = แผนรวม
  //   by = 'status'   → Status ของแต่ละเดือน (Planned / New / Active / Clearance / Discontinued)
  //   by = 'series'   → seriesId / 'category' → categoryId เรียงมากไปน้อย แสดง top รายการ ที่เหลือรวมเป็น key = null (อื่นๆ)
  function planMix(rows, by, top) {
    var map = {}, order = [];
    function add(k, v) { if (!(k in map)) { map[k] = 0; order.push(k); } map[k] += v; }
    rows.forEach(function (r) {
      if (by === 'status') r.cells.forEach(function (c) { add(c.status, c.net); });
      else add(by === 'category' ? (r.product.categoryId || '') : (r.product.seriesId || ''), r.total.net);
    });
    var out = order.map(function (k) { return { key: k, value: map[k] }; });
    if (by === 'status') {
      var rank = ['planned', 'new', 'active', 'clearance', 'discontinued'];
      return out.sort(function (a, b) { return rank.indexOf(a.key) - rank.indexOf(b.key); });
    }
    out.sort(function (a, b) { return b.value - a.value; });
    if (top && out.length > top) {
      var rest = out.slice(top);
      out = out.slice(0, top).concat([{ key: null, value: sum(rest.map(function (x) { return x.value; })) }]);
    }
    return out;
  }

  // ผลรวมรายเดือนของแถว SKU ที่ระบุ (ใช้กับ "รวม Series ที่เลือก")
  function sumRows(rows) {
    var t = { units: zeros(12), sellOut: zeros(12), net: zeros(12) };
    rows.forEach(function (r) {
      r.cells.forEach(function (c, m) { t.units[m] += c.units; t.sellOut[m] += c.sellOut; t.net[m] += c.net; });
    });
    t.year = { units: sum(t.units), sellOut: sum(t.sellOut), net: sum(t.net) };
    return t;
  }

  // =====================================================================
  // 17) ความครบถ้วนของข้อมูลสินค้า
  // =====================================================================

  // มีข้อมูลในฟิลด์หรือไม่: 'code' = TR Code หรือรหัสชั่วคราว / 'rsp' = มี RSP ใน Price List / 'packSize' ต้องมากกว่า 0
  function hasProductField(product, field, priceList) {
    if (field === 'code') return !!productKey(product);
    if (field === 'rsp') {
      var k = productKey(product);
      return (priceList || []).some(function (r) { return r.productKey === k && r.priceType === 'RSP' && r.price > 0; });
    }
    var v = product[field];
    if (field === 'packSize') return v != null && Number(v) > 0;
    return v != null && String(v).trim() !== '';
  }

  // ความครบถ้วน (ฟิลด์จำเป็นและที่ควรมีอยู่ใน settings) → { pct, missingRequired, missingRecommended, complete, level }
  //   level = 'ok' ครบ | 'required' ขาดข้อมูลจำเป็น | 'recommended' ขาดข้อมูลที่ควรมี
  function productCompleteness(product, priceList) {
    var S = settings();
    var req = S.PRODUCT_REQUIRED || [], rec = S.PRODUCT_RECOMMENDED || [];
    var missingRequired = req.filter(function (f) { return !hasProductField(product, f, priceList); });
    var missingRecommended = rec.filter(function (f) { return !hasProductField(product, f, priceList); });
    var total = req.length + rec.length;
    return {
      pct: total ? (total - missingRequired.length - missingRecommended.length) / total : 1,
      missingRequired: missingRequired, missingRecommended: missingRecommended, complete: !missingRequired.length,
      level: missingRequired.length ? 'required' : missingRecommended.length ? 'recommended' : 'ok'
    };
  }

  // =====================================================================
  // 18) แผน NPD, รหัสชั่วคราว, ผูกรหัสจริง, ERP, Audit log
  // =====================================================================

  var NPD_STAGES = ['plan', 'concept', 'production', 'ready', 'launched'];

  // ขั้นของ NPD: ถึงเดือนเปิดตัวแล้ว (เทียบเดือนปัจจุบัน 'YYYY-MM') → 'launched' ระบบตั้งให้ / นอกนั้นตามที่บันทึก
  function npdStage(plan, currentKey) {
    if (plan.plannedLaunchDate && currentKey && absMonth(currentKey) >= absMonth(plan.plannedLaunchDate)) return 'launched';
    var s = plan.stage || 'plan';
    return s === 'launched' ? 'ready' : s;
  }

  // อนุมัติแผน NPD: ตั้งวันเริ่มขายของสินค้า และเพิ่ม Listing ของหน่วยที่วางแผน (ไม่ลบ Listing เดิม) → { products, listings }
  function applyNpdApproval(master, plan) {
    var products = copy(master.products), listings = copy(master.listings);
    products.forEach(function (p) { if (productKey(p) === plan.productKey && plan.plannedLaunchDate) p.launchDate = plan.plannedLaunchDate; });
    (plan.plannedAccounts || []).forEach(function (a) {
      if (!isListed(listings, plan.productKey, a.accountId)) listings.push({ productKey: plan.productKey, accountId: a.accountId });
    });
    return { products: products, listings: listings };
  }

  // สรุปแผน NPD: อยู่ในแผน SKU แล้วกี่หน่วย จาก plans = { <unitId>: { items } } ของปีแผน
  function npdCoverage(plan, plans) {
    var accs = (plan.plannedAccounts || []).map(function (a) { return a.accountId; });
    var inPlan = accs.filter(function (u) { return plans && plans[u] && plans[u].items && plans[u].items[plan.productKey]; });
    return { planned: accs.length, inPlan: inPlan.length, missing: accs.filter(function (u) { return inPlan.indexOf(u) < 0; }) };
  }

  // รหัสชั่วคราว NPD_{ปี}Q{ไตรมาส}_{ลำดับ} ตามวันเริ่มขาย (ไม่มีวัน = ไตรมาส 1 ของ fallbackYear) ลำดับต่อจากที่มีอยู่
  function nextTempCode(products, launchDate, fallbackYear) {
    var y = fallbackYear, q = 1;
    if (launchDate) { var d = parseDate(launchDate); y = d.y; q = Math.floor(d.m / 3) + 1; }
    var prefix = 'NPD_' + y + 'Q' + q + '_';
    var n = 0;
    (products || []).forEach(function (p) {
      [p.tempCode].concat(p.tempCodeHistory || []).forEach(function (c) {
        if (c && c.indexOf(prefix) === 0) n = Math.max(n, Number(c.slice(prefix.length)) || 0);
      });
    });
    return prefix + pad2(n + 1);
  }

  // ผูกรหัสจริง: ย้ายทุกข้อมูลที่อ้างรหัสชั่วคราวไปใช้ TR Code (สินค้า, Listing, ราคา, Promotion, แผน NPD) และเก็บ tempCode ไว้เป็นประวัติ
  // master = { products, listings, priceList, promotions, npdPlans } → { ok, error: 'empty' | 'notFound' | 'duplicate', master }
  // แผน SKU ทุกปีย้ายด้วย renamePlanKey (Module เรียกกับทุก Key plan.<ปี>.sku / forecast ที่บันทึกไว้)
  function bindTrCode(master, tempCode, trCode) {
    var code = String(trCode == null ? '' : trCode).trim();
    if (!code) return { ok: false, error: 'empty', master: master };
    var target = (master.products || []).filter(function (p) { return !p.trCode && p.tempCode === tempCode; })[0];
    if (!target) return { ok: false, error: 'notFound', master: master };
    var taken = (master.products || []).some(function (p) { return p.trCode === code || p.tempCode === code; });
    if (taken) return { ok: false, error: 'duplicate', master: master };
    var out = copy(master);
    out.products.forEach(function (p) { if (!p.trCode && p.tempCode === tempCode) p.trCode = code; });
    ['listings', 'priceList', 'promotions', 'npdPlans'].forEach(function (k) {
      (out[k] || []).forEach(function (r) { if (r.productKey === tempCode) r.productKey = code; });
    });
    return { ok: true, error: null, master: out };
  }

  // ย้าย Key ของสินค้าในแผน SKU (items.<from> → items.<to>) ไม่มี = คืนค่าเดิม
  function renamePlanKey(plan, from, to) {
    if (!plan || !plan.items || !plan.items[from]) return plan;
    var out = copy(plan);
    out.items[to] = out.items[from];
    delete out.items[from];
    return out;
  }

  // เปรียบเทียบกับ ERP (เฉพาะสินค้าที่มี TR Code) → { onlyErp: [แถว ERP], onlyMaster: [สินค้า], mismatches: [{ key, field, master, erp }] }
  function compareErp(products, priceList, erp, date) {
    var mine = (products || []).filter(function (p) { return p.trCode; });
    var byCode = {}, erpBy = {};
    mine.forEach(function (p) { byCode[p.trCode] = p; });
    (erp || []).forEach(function (r) { erpBy[r.trCode] = r; });
    var mismatches = [];
    mine.forEach(function (p) {
      var r = erpBy[p.trCode];
      if (!r) return;
      if ((p.name || '') !== (r.name || '')) mismatches.push({ key: p.trCode, field: 'name', master: p.name || '', erp: r.name || '' });
      if ((p.barcode || '') !== (r.barcode || '')) mismatches.push({ key: p.trCode, field: 'barcode', master: p.barcode || '', erp: r.barcode || '' });
      var rsp = rspOn(priceList, p.trCode, date);
      if (r.rsp != null && (rsp == null || Math.abs(rsp - r.rsp) > 0.005)) mismatches.push({ key: p.trCode, field: 'rsp', master: rsp, erp: r.rsp });
    });
    return {
      onlyErp: (erp || []).filter(function (r) { return !byCode[r.trCode]; }),
      onlyMaster: mine.filter(function (p) { return !erpBy[p.trCode]; }),
      mismatches: mismatches
    };
  }

  // รายการ Audit log ของฟิลด์ที่เปลี่ยน { entity, key, field, oldValue, newValue, by, at } (รูปเก็บเป็น true/false ไม่เก็บ data URL)
  // before = null → รายการสร้างใหม่ (field 'create') / after = null → รายการที่ถูกลบ (field 'delete')
  function auditDiff(entity, key, before, after, meta) {
    meta = meta || {};
    function entry(field, a, b) { return { entity: entity, key: key, field: field, oldValue: a, newValue: b, by: meta.by || '', at: meta.at || '' }; }
    if (!before) return [entry('create', null, key)];
    if (!after) return [entry('delete', key, null)];
    function val(f, v) { if (f === 'image') return !!v; return v === undefined ? null : copy(v); }
    var fields = {};
    Object.keys(before).concat(Object.keys(after)).forEach(function (f) { if (f !== 'updatedAt' && f !== 'createdAt') fields[f] = true; });
    return Object.keys(fields).filter(function (f) { return JSON.stringify(val(f, before[f])) !== JSON.stringify(val(f, after[f])); })
      .map(function (f) { return entry(f, val(f, before[f]), val(f, after[f])); });
  }

  // =====================================================================
  // 19) Top-down: สัดส่วน 2 คอลัมน์, การเติบโต, Waterfall, สัดส่วน Channel, แถวส่งออก
  // =====================================================================

  // % ของ Total ของหน่วยขาย = % ใน Channel × % ของ Total ของ Channel
  function pctOfTotal(unitPct, channelPct) { return (unitPct || 0) * (channelPct || 0); }

  // ส่วนต่างเป็นบาท = เป้าหมาย − ยอดขายปีก่อน (ไม่มียอดปีก่อน → null)
  function growthAmount(target, prior) { return prior != null ? (target || 0) - prior : null; }

  // สัดส่วนเต็ม % ที่รวม 100% (Largest remainder): [7.7, 8.7, 6.5] → [0.34, 0.38, 0.28]
  function roundShares(values) {
    var t = sum(values);
    if (!(t > 0)) return values.map(function () { return 0; });
    var raw = values.map(function (v) { return (v || 0) / t * 100; });
    var base = raw.map(Math.floor);
    var rest = 100 - sum(base);
    raw.map(function (v, i) { return { i: i, r: v - base[i] }; })
      .sort(function (a, b) { return b.r - a.r || a.i - b.i; })
      .slice(0, rest).forEach(function (x) { base[x.i] += 1; });
    return base.map(function (v) { return v / 100; });
  }

  // ที่มาของการเติบโต: ยอดขายปีก่อนรวม → ส่วนต่างของแต่ละ Channel → (ยังไม่จัดสรร) → Total Target
  // → { start, end, steps: [{ id, name, color, prior, target, delta, isNew }] } ผลรวม start + Σdelta = end
  function growthWaterfall(tree) {
    var steps = tree.children.map(function (c) {
      return { id: c.id, name: c.name, color: c.color, prior: c.prior, target: c.amount, delta: c.amount - (c.prior || 0), isNew: c.prior == null };
    });
    var rem = tree.remaining ? tree.remaining.amount : 0;
    if (Math.abs(rem) > settings().ALERT_TOLERANCE_BAHT) steps.push({ id: null, name: null, color: null, prior: null, target: null, delta: rem, isNew: false, unallocated: true });
    return { start: tree.prior || 0, end: tree.amount, steps: steps };
  }

  // สัดส่วน Channel ปีก่อนเทียบปีนี้ → { prior: [{ id, share }], target: [{ id, share }] } (เทียบกับผลรวมของแต่ละปี)
  function channelShareRows(tree) {
    var priorTotal = sum(tree.children.map(function (c) { return c.prior || 0; }));
    var targetTotal = sum(tree.children.map(function (c) { return c.amount; }));
    return {
      prior: tree.children.map(function (c) { return { id: c.id, share: priorTotal > 0 ? (c.prior || 0) / priorTotal : 0 }; }),
      target: tree.children.map(function (c) { return { id: c.id, share: targetTotal > 0 ? c.amount / targetTotal : 0 }; })
    };
  }

  // แถวสำหรับส่งออกหน้า Top-down (แบบแบน ไม่ Merge): Channel → หน่วยขาย · ท้ายไฟล์: Total + คงเหลือระดับ Total + คงเหลือแต่ละ Channel
  // → [{ kind: 'channel' | 'unit' | 'total' | 'remaining', scope, channelId, channel, unitId, unit, allocationUnit,
  //      prior, pctOfTotal, pctInChannel, amount, growth, growthAmount, status }]
  function topDownRows(tree) {
    var rows = [];
    tree.children.forEach(function (ch) {
      rows.push({ kind: 'channel', channelId: ch.id, channel: ch.name, allocationUnit: ch.allocationUnit, unitId: null, unit: null,
        prior: ch.prior, pctOfTotal: ch.pct, pctInChannel: 1, amount: ch.amount, growth: ch.growth, growthAmount: ch.growthAmount });
      ch.children.forEach(function (u) {
        rows.push({ kind: 'unit', channelId: ch.id, channel: ch.name, allocationUnit: ch.allocationUnit, unitId: u.id, unit: u.name,
          prior: u.prior, pctOfTotal: u.pctOfTotal, pctInChannel: u.pct, amount: u.amount, growth: u.growth, growthAmount: u.growthAmount });
      });
    });
    rows.push({ kind: 'total', prior: tree.prior, pctOfTotal: 1, pctInChannel: null, amount: tree.amount, growth: tree.growth, growthAmount: tree.growthAmount });
    rows.push({ kind: 'remaining', scope: 'total', pctOfTotal: tree.unallocatedPct, pctInChannel: null, amount: tree.remaining.amount, status: tree.remaining.status });
    tree.children.forEach(function (ch) {
      rows.push({ kind: 'remaining', scope: 'channel', channelId: ch.id, channel: ch.name, pctOfTotal: null, pctInChannel: ch.unallocatedPct,
        amount: ch.remaining.amount, status: ch.remaining.status });
    });
    return rows;
  }

  SP.core.calc = {
    findById: findById,
    sum: sum,
    // Channel และหน่วยแบ่งเป้า
    channelColor: channelColor,
    allUnits: allUnits,
    unitsOfChannel: unitsOfChannel,
    unitInfo: unitInfo,
    gpOf: gpOf,
    availableUnits: availableUnits,
    availableChannels: availableChannels,
    // Measure chain
    sellOutExVat: sellOutExVat,
    netSales: netSales,
    sellOutIncVat: sellOutIncVat,
    sellOutFromNet: sellOutFromNet,
    chain: chain,
    reverseChain: reverseChain,
    cellBreakdown: cellBreakdown,
    moneySplit: moneySplit,
    // Remaining / Top-down
    alertStatus: alertStatus,
    remaining: remaining,
    emptyRemaining: emptyRemaining,
    normalizeShares: normalizeShares,
    addMonthly: addMonthly,
    planMix: planMix,
    amountFromPct: amountFromPct,
    pctFromAmount: pctFromAmount,
    growth: growth,
    priorShares: priorShares,
    unitHistory: unitHistory,
    channelHistory: channelHistory,
    topDown: topDown,
    priorChannelShares: priorChannelShares,
    planUnits: planUnits,
    resolveSelection: resolveSelection,
    unitTarget: unitTarget,
    // Phasing
    priorMonthly: priorMonthly,
    channelMonthly: channelMonthly,
    phasingBasis: phasingBasis,
    defaultPhasing: defaultPhasing,
    phasingTotals: phasingTotals,
    sharesDiffer: sharesDiffer,
    seasonalityIndex: seasonalityIndex,
    seasonalityShares: seasonalityShares,
    monthlyTargets: monthlyTargets,
    // วันที่ / ราคา / Promotion / Clearance
    parseDate: parseDate,
    monthIndex: monthIndex,
    absMonth: absMonth,
    daysInMonth: daysInMonth,
    dateKey: dateKey,
    addDays: addDays,
    overlapDays: overlapDays,
    averagePrice: averagePrice,
    priceOn: priceOn,
    rspOn: rspOn,
    priceHistory: priceHistory,
    addPrice: addPrice,
    promoPrice: promoPrice,
    promoConflicts: promoConflicts,
    validatePromotion: validatePromotion,
    pricingOf: pricingOf,
    effectivePrice: effectivePrice,
    effectiveGp: effectiveGp,
    pricingDetail: pricingDetail,
    priceChangedMonths: priceChangedMonths,
    clearanceSplit: clearanceSplit,
    systemFill: systemFill,
    runRateOf: runRateOf,
    // Product Master / แผน SKU
    productKey: productKey,
    findProduct: findProduct,
    productStatus: productStatus,
    statusAt: statusAt,
    statusSegments: statusSegments,
    planYearStatus: planYearStatus,
    soldInYear: soldInYear,
    launchesIn: launchesIn,
    isListed: isListed,
    listedAccounts: listedAccounts,
    clearanceStockFor: clearanceStockFor,
    planBlockReason: planBlockReason,
    npdStartMonth: npdStartMonth,
    earliestStartMonth: earliestStartMonth,
    validStartMonth: validStartMonth,
    cellSource: cellSource,
    lockReason: lockReason,
    cellState: cellState,
    newPlanItem: newPlanItem,
    defaultSkuPlan: defaultSkuPlan,
    availableSkus: availableSkus,
    stopPlanItem: stopPlanItem,
    actualUnits: actualUnits,
    skuPlanGrid: skuPlanGrid,
    monthWindow: monthWindow,
    // หมวดสินค้า / Series / ความครบถ้วน
    TAX_LEVELS: TAX_LEVELS,
    taxonomyNode: taxonomyNode,
    taxonomyName: taxonomyName,
    taxonomyChildren: taxonomyChildren,
    taxonomyTree: taxonomyTree,
    taxonomyField: taxonomyField,
    taxonomyUsage: taxonomyUsage,
    removeTaxonomyNode: removeTaxonomyNode,
    addTaxonomyNode: addTaxonomyNode,
    moveTaxonomyNode: moveTaxonomyNode,
    productTaxonomy: productTaxonomy,
    seriesList: seriesList,
    inSeries: inSeries,
    sumRows: sumRows,
    hasProductField: hasProductField,
    productCompleteness: productCompleteness,
    // แผน NPD / รหัส / ERP / Audit
    NPD_STAGES: NPD_STAGES,
    npdStage: npdStage,
    applyNpdApproval: applyNpdApproval,
    npdCoverage: npdCoverage,
    nextTempCode: nextTempCode,
    bindTrCode: bindTrCode,
    renamePlanKey: renamePlanKey,
    compareErp: compareErp,
    auditDiff: auditDiff,
    // Top-down (v7)
    pctOfTotal: pctOfTotal,
    growthAmount: growthAmount,
    roundShares: roundShares,
    growthWaterfall: growthWaterfall,
    channelShareRows: channelShareRows,
    topDownRows: topDownRows,
    // ผู้รับผิดชอบ / Performance
    monthKey: monthKey,
    addMonths: addMonths,
    employedIn: employedIn,
    personStatus: personStatus,
    unitAssignments: unitAssignments,
    canRemoveUnit: canRemoveUnit,
    assignmentAt: assignmentAt,
    ownerOf: ownerOf,
    ownerMonths: ownerMonths,
    ownerSegments: ownerSegments,
    validateAssignments: validateAssignments,
    setOwner: setOwner,
    setEndMonth: setEndMonth,
    eligiblePeople: eligiblePeople,
    assignmentAlerts: assignmentAlerts,
    performanceByPerson: performanceByPerson,
    personPerformance: personPerformance,
    actualNetByUnit: actualNetByUnit
  };
})(window.SP);
