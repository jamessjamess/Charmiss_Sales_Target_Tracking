/*
 * core/seed.js — นำเข้าข้อมูลจริงจาก data/seed/ เข้าโครง Product Master (CR-11) ทำครั้งเดียวตอนโหลด ก่อน store
 *
 * อ่าน data/:  productImport (data/products.js), seed ตามชื่อใน productImport.seed (data/seed/seed-charmiss.js),
 *              taxonomy, listingRules (data/listings.js), priceImport (data/pricing.js), erpImport (data/erp-snapshot.js),
 *              accounts, territories, channels, history, settings
 * เขียน:       SP.data.products, taxonomy.series, listings, basePrices · promoPrices (CR-30), erpSnapshot,
 *              CR-30: taxonomy.category[TYPE].codePrefix (ค่าตั้งต้น) · codeCounters · codeMigration และรหัสใหม่ใน npdPlans / actuals / planSeeds,
 *              history.years.<ปีของ seed>.skuQty (ยอดขายราย SKU), history.years.<ปี>.monthly ของหน่วยที่มียอดราย SKU จริง
 *              (รูปแบบรายเดือนจาก SKU ยอดทั้งปีเท่าเดิม), history.runRate,
 *              history.skuStart (CR-26 เดือนเริ่มขายราย SKU สำหรับอายุการขาย),
 *              history.years.<ปีก่อนหน้า>.skuQty (CR-27 ยอดราย SKU ปี 2025 จากยอดหน่วยขาย — ยอดอ้างอิงของ CR-24 ใช้ค่านี้แทนค่าประมาณการ)
 * store:       ไม่อ่าน ไม่เขียน (store โหลดหลังไฟล์นี้ ค่าตั้งต้นของ master.* จึงเป็นข้อมูลที่นำเข้าแล้ว)
 *
 * ขั้นตอน (ไม่มีการสุ่ม ผลลัพธ์เหมือนเดิมทุกครั้ง / สูตรเรียก SP.core.calc):
 *   1. สินค้า: seed.products + productImport.newProducts → โครง Product Master
 *      Series จาก Campaign (ยกเว้น notSeries เช่น Existing) · หมวดสินค้าจากคำในชื่อ (calc.inferCategory, inferred: true)
 *      ขนาดบรรจุจากชื่อ (5g, 50ml) · Status ไม่เก็บ (คำนวณจากวันที่)
 *   2. ราคา (CR-30): ราคาหลัก RSP (rsp) · TT_DEALER (dealerPrice) มีผล priceImport.baseFrom + priceImport.changes
 *      ราคาต่อ Account เดิม (CR-18) → Promotion Price ระดับหน่วยขาย ทุกเดือน priceImport.promoFrom – ธ.ค. ปีแผนสุดท้าย
 *   3. Listing: seed.listings (ชื่อ Account → id) · สินค้าใหม่ → newProductUnits · หน่วยอื่นตาม listingRules.units
 *   4. ยอดขายปีก่อนราย SKU: หน่วยใน seed = history ของ seed / หน่วยอื่น = รูปแบบของหน่วยต้นแบบ (from) เฉพาะ SKU ที่ Listing
 *      ปรับให้ Net Sales แต่ละเดือนเท่ากับ history.years.<ปี>.monthly ของหน่วยนั้น · Run-rate = เฉลี่ย RUN_RATE_MONTHS เดือนจริงล่าสุด
 *   5. ERP ตัวอย่าง: สินค้าที่มี TR Code + ความต่างใน erpImport
 *   6. CR-26 ประวัติย้อนหลัง (seed มียอดราย SKU แค่ปี 2026): เดือนเริ่มขายราย SKU (startMonths)
 *      sourceStatus NPD-2025 → settings.AGING_NPD_START (ต.ค. 2025) · Active / Discontinued → AGING_START_FROM + (เลข TR Code mod จำนวนเดือนในช่วง)
 *      ยอดรายเดือนปี 2022–2024 = รูปแบบปี 2026 ของ SKU ตั้งแต่เดือนเริ่มขาย (calc.skuBackfill คำนวณจากค่านี้ ไม่เก็บซ้ำ)
 *   7. CR-27 ยอดราย SKU ปี 2025 (priorSkuQty): ยอดหน่วยขายเดือน M ปี 2025 (history monthly · Net Sales) × สัดส่วน Net Sales ของ SKU
 *      เดือน M ปี 2026 (เดือนนั้นหน่วยขายเป็น 0 = สัดส่วนทั้งปี 2026) เฉพาะ SKU ที่เริ่มขายแล้ว (skuStart ≤ เดือนนั้น) ÷ Net Sales ต่อชิ้น
 *      ของเดือนนั้น (ไม่มีราคาปี 2025 = ราคาปี 2026) ปัดเป็นชิ้น → ผลรวม SKU ≈ ยอดหน่วยขาย (±1 ชิ้นต่อ SKU)
 */
(function (SP) {
  'use strict';

  var calc = SP.core.calc;

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function seriesIdOf(name) { return 'ser-' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // ชื่อ Account / เขตใน seed → id ของหน่วยขาย (ไม่สนตัวพิมพ์)
  function unitIdOf(data, name) {
    var n = String(name || '').trim().toLowerCase();
    var u = calc.allUnits(data).filter(function (x) { return x.name.toLowerCase() === n || x.id === n; })[0];
    return u ? u.id : null;
  }

  // ขนาดบรรจุจากชื่อ: '... 5g' → { packSize: 5, uom: 'g' } / '110 ml.' → 110 ml
  function packOf(name) {
    var m = /(\d+(?:\.\d+)?)\s*(g|ml)\b/i.exec(String(name || ''));
    return m ? { packSize: Number(m[1]), uom: m[2].toLowerCase() } : { packSize: null, uom: '' };
  }

  // 1) สินค้า + Series
  function buildProducts(seed, cfg, tax) {
    var series = [], ids = {};
    function seriesId(name) {
      if (!name || (cfg.notSeries || []).indexOf(name) >= 0) return null;
      if (!ids[name]) {
        ids[name] = seriesIdOf(name);
        series.push({ id: ids[name], name: name, parentId: null, level: 'SERIES', active: true, order: series.length + 1 });
      }
      return ids[name];
    }
    var stamp = ((seed.meta && seed.meta.generated) || '2026-01-01') + 'T09:00:00';
    function make(src) {
      var cat = calc.inferCategory(src.name, cfg.categoryRules, tax);
      var pack = packOf(src.name);
      var sid = seriesId(src.series);
      var skipped = !sid && (cfg.notSeries || []).indexOf(src.series) >= 0;
      return {
        trCode: src.trCode || '', tempCode: src.tempCode || '', barcode: '',
        name: src.name, nameEn: '', shortName: src.shortName || '',
        categoryId: cat ? cat.categoryId : null, subCategoryId: cat ? cat.subCategoryId : null, typeId: cat ? cat.typeId : null,
        inferred: !!cat,
        seriesId: sid, subSeriesId: null, packSize: pack.packSize, uom: pack.uom, image: null, inTrcloud: !!src.trCode,
        launchDate: src.launchDate || null, discontinueMonth: src.discontinueMonth || null, clearance: null,
        note: src.note || (skipped ? cfg.notSeriesNote : ''), createdAt: src.createdAt || stamp, updatedAt: src.createdAt || stamp
      };
    }
    function withQuarter(p, src) {
      if (src.launchQuarter) p.launchQuarter = src.launchQuarter;   // CR-30 แผน NPD แบบไตรมาส
      if (src.deletedFrom) p.deletedFrom = src.deletedFrom;           // CR-35 Status Delete (ตัวอย่าง)
      if (src.isSample) p.isSample = true;
      // CR-34: คำขอ NPD จาก Sales (ข้อมูลตัวอย่าง) = โครงเดียวกับ calc.createSalesNpd
      if (src.source) { p.source = src.source; p.requestedBy = src.requestedBy || ''; p.requestedAt = src.requestedAt || ''; p.request = src.request ? JSON.parse(JSON.stringify(src.request)) : null; }
      return p;
    }
    return { products: (seed.products || []).map(make).concat((cfg.newProducts || []).map(function (src) { return withQuarter(make(src), src); })), series: series };
  }

  // 2) ราคาหลักรายเดือน (CR-30): RSP · TT_DEALER มีผลตั้งแต่ baseFrom + ราคาที่เปลี่ยนตามรอบเวลา (changes)
  function buildPrices(data, seed, cfg, pcfg) {
    var list = [];
    var by = cfg.importedBy || '';
    var from = pcfg.baseFrom || String(cfg.priceFrom || '').slice(0, 7);
    var at = from + '-01T09:00:00';
    (seed.products || []).concat(cfg.newProducts || []).forEach(function (src) {
      var key = src.trCode || src.tempCode;
      if (src.rsp > 0) list = calc.setBasePrice(list, { productKey: key, priceType: 'RSP', effectiveMonth: from, price: src.rsp, by: by, at: at }).list;
      if (src.dealerPrice > 0) list = calc.setBasePrice(list, { productKey: key, priceType: 'TT_DEALER', effectiveMonth: from, price: src.dealerPrice, by: by, at: at }).list;
    });
    (pcfg.changes || []).forEach(function (c) { var res = calc.setBasePrice(list, c); if (res.ok) list = res.list; });
    return list;
  }

  // ราคาต่อ Account เดิม (CR-18 ราคาเดียวทั้งปี) → Promotion Price ระดับหน่วยขาย ทุกเดือน promoFrom – ธ.ค. ปีแผนสุดท้าย
  function buildPromoPrices(data, seed, cfg, pcfg) {
    var out = [];
    var years = (data.settings.PLAN_YEARS || [data.settings.DEFAULT_PLAN_YEAR]);
    var from = pcfg.promoFrom || pcfg.baseFrom || '2024-01';
    var last = Math.max.apply(null, years);
    (seed.accountPrices || []).forEach(function (a) {
      var unit = unitIdOf(data, a.account);
      var info = unit ? calc.unitInfo(data, unit) : null;
      if (!info || !(a.rsp > 0)) return;
      for (var y = Number(from.slice(0, 4)); y <= last; y++) {
        for (var m = 0; m < 12; m++) {
          var key = calc.monthKey(y, m);
          if (key < from) continue;
          out = calc.setPromoPrice(out, a.trCode, info.channel.id, unit, key, a.rsp, { by: cfg.importedBy || '', at: from + '-01T09:00:00' });
        }
      }
    });
    return out;
  }

  // 3) Listing
  function buildListings(data, seed, cfg, rules, products) {
    var out = [], seen = {};
    function add(key, unit) { var k = key + '|' + unit; if (unit && !seen[k]) { seen[k] = true; out.push({ productKey: key, accountId: unit }); } }
    var base = {};
    (seed.listings || []).forEach(function (l) {
      var unit = unitIdOf(data, l.account);
      add(l.trCode, unit);
      if (unit) (base[unit] = base[unit] || []).push(l.trCode);
    });
    // CR-30: สินค้าใหม่ที่ระบุ units ใช้หน่วยขายของรายการนั้น (ว่าง = ยังไม่ Listing) · ไม่ระบุ = newProductUnits
    (cfg.newProducts || []).forEach(function (p) { (p.units || rules.newProductUnits || []).forEach(function (u) { add(p.tempCode, u); }); });
    var byKey = {};
    products.forEach(function (p) { byKey[calc.productKey(p)] = p; });
    var seriesName = {};
    (cfg.seriesList || []).forEach(function (s) { seriesName[s.id] = s.name; });
    (rules.units || []).forEach(function (r) {
      (base[r.from] || []).forEach(function (key) {
        var p = byKey[key];
        if (!p) return;
        if ((r.excludeTypes || []).indexOf(p.typeId) >= 0) return;
        if ((r.excludeSeries || []).indexOf(seriesName[p.seriesId]) >= 0) return;
        add(key, r.unit);
      });
    });
    return out;
  }

  // Net Sales ต่อชิ้นของสินค้าในหน่วยขาย เดือน m ปี year (ราคาที่มีผล × (1 − GP) ตามสูตรใน calc)
  function unitNet(d, key, unit, year, m) {
    var det = calc.pricingDetail(d, key, unit, year, m);
    return calc.chain({ units: 1, price: det.price, gp: det.gp }).netSales || 0;   // GP 0 (TT) = ÷ (1 + VAT) อย่างเดียว
  }

  // ปรับให้ผลรวมเป็นจำนวนเต็มเท่ากับ total โดยคงสัดส่วน (Largest remainder)
  function scaleTo(values, total) { return calc.distributeAnnual(total, values); }

  // 4) ยอดขายปีก่อนราย SKU + รูปแบบรายเดือนของหน่วย + Run-rate
  function buildHistory(d, seed, rules, listings) {
    var history = d.history;
    var S = d.settings;
    var runRate = {};
    Object.keys(seed).forEach(function (field) {
      var m = /^history(\d{4})$/.exec(field);
      if (!m) return;
      var year = Number(m[1]);
      var y = history.years[year] = history.years[year] || { actualMonths: 12, monthly: {} };
      var qty = y.skuQty = y.skuQty || {};
      // หน่วยที่มียอดราย SKU จริง
      Object.keys(seed[field]).forEach(function (name) {
        var unit = unitIdOf(d, name);
        if (!unit) return;
        qty[unit] = copy(seed[field][name]);
        // รูปแบบรายเดือนของหน่วย = Net Sales จาก SKU / ยอดทั้งปีคงตาม monthly เดิม (ไม่มี = ใช้ยอดจาก SKU)
        var net = [];
        for (var mm = 0; mm < 12; mm++) {
          net.push(calc.sum(Object.keys(qty[unit]).map(function (k) { return (qty[unit][k][mm] || 0) * unitNet(d, k, unit, year, mm); })));
        }
        var total = y.monthly[unit] ? calc.sum(y.monthly[unit]) : Math.round(calc.sum(net));
        y.monthly[unit] = scaleTo(net, total);
      });
      // หน่วยอื่น: รูปแบบของหน่วยต้นแบบ เฉพาะ SKU ที่ Listing ปรับให้ Net Sales แต่ละเดือน = monthly ของหน่วยนั้น
      (rules.units || []).forEach(function (r) {
        var src = qty[r.from];
        var target = y.monthly[r.unit];
        if (!src || !target || qty[r.unit]) return;
        var keys = listings.filter(function (l) { return l.accountId === r.unit && src[l.productKey]; }).map(function (l) { return l.productKey; });
        var out = {};
        keys.forEach(function (k) { out[k] = []; });
        for (var mm = 0; mm < 12; mm++) {
          var value = calc.sum(keys.map(function (k) { return (src[k][mm] || 0) * unitNet(d, k, r.unit, year, mm); }));
          var f = value > 0 ? target[mm] / value : 0;
          keys.forEach(function (k) { out[k].push(Math.round((src[k][mm] || 0) * f)); });
        }
        qty[r.unit] = out;
      });
      Object.keys(qty).forEach(function (unit) {
        Object.keys(qty[unit]).forEach(function (k) {
          var rr = calc.runRateFrom(qty[unit][k], y.actualMonths, S.RUN_RATE_MONTHS);
          if (rr != null) (runRate[k] = runRate[k] || {})[unit] = Math.round(rr);
        });
      });
    });
    history.runRate = runRate;
    return history;
  }

  // 6) CR-26: เดือนเริ่มขายราย SKU (กำหนดตายตัว ไม่สุ่ม) → { <productKey>: 'YYYY-MM' } เฉพาะสินค้าใน seed (สินค้าใหม่ปี 2027 ไม่มีประวัติ)
  function startMonths(products, S) {
    var K = SP.core.clock;
    var from = K.parse(S.AGING_START_FROM), to = K.parse(S.AGING_START_TO);
    var span = (to.year - from.year) * 12 + (to.month - from.month) + 1;
    var out = {};
    (products || []).forEach(function (src) {
      var key = src.trCode || src.tempCode;
      if (!key) return;
      if (src.sourceStatus === 'NPD-2025') { out[key] = S.AGING_NPD_START; return; }
      var digits = String(key).replace(/\D/g, '');
      var n = digits ? Number(digits) : String(key).split('').reduce(function (s, ch) { return s + ch.charCodeAt(0); }, 0);
      out[key] = K.addMonths(S.AGING_START_FROM, n % span);
    });
    return out;
  }

  // 7) CR-27: ยอดราย SKU ปีก่อนหน้าปีที่มียอดราย SKU (2025) — กำหนดตายตัว ไม่สุ่ม · แก้ history ที่ส่งเข้ามา
  function priorSkuQty(d, history, start) {
    var ys = Object.keys(history.years).filter(function (y) { return history.years[y].skuQty; }).map(Number);
    if (!ys.length) return history;
    var py = Math.max.apply(null, ys), y0 = py - 1;
    var prev = history.years[y0];
    if (!prev || !prev.monthly) return history;
    var src = history.years[py].skuQty;
    var K = SP.core.clock;
    var qty = prev.skuQty = prev.skuQty || {};
    Object.keys(src).forEach(function (unit) {
      var target = prev.monthly[unit];
      if (!target || qty[unit]) return;
      var keys = Object.keys(src[unit]);
      var annual = {};
      keys.forEach(function (k) {
        var t = 0;
        for (var mm = 0; mm < 12; mm++) t += (src[unit][k][mm] || 0) * unitNet(d, k, unit, py, mm);
        annual[k] = t;
      });
      var out = {};
      keys.forEach(function (k) { out[k] = []; });
      for (var m = 0; m < 12; m++) {
        var ym = K.key(y0, m + 1);
        var elig = keys.filter(function (k) { return !start[k] || start[k] <= ym; });
        var w = elig.map(function (k) { return (src[unit][k][m] || 0) * unitNet(d, k, unit, py, m); });
        if (!(calc.sum(w) > 0)) w = elig.map(function (k) { return annual[k]; });
        var W = calc.sum(w);
        keys.forEach(function (k) { out[k].push(0); });
        if (!(W > 0) || !(target[m] > 0)) continue;
        elig.forEach(function (k, i) {
          var per = unitNet(d, k, unit, y0, m) || unitNet(d, k, unit, py, m);
          out[k][m] = per > 0 ? Math.round(target[m] * w[i] / W / per) : 0;
        });
      }
      qty[unit] = out;
    });
    return history;
  }

  // 5) ERP ตัวอย่าง
  function buildErp(products, basePrices, cfg, erp) {
    var out = [];
    products.forEach(function (p) {
      if (!p.trCode || (erp.notInErp || []).indexOf(p.trCode) >= 0) return;
      var rsp = calc.rspAt(basePrices, p.trCode, String(cfg.priceFrom).slice(0, 7));
      out.push({
        trCode: p.trCode,
        name: (erp.rename && erp.rename[p.trCode]) || p.name,
        barcode: (erp.barcode && erp.barcode[p.trCode]) || '',
        rsp: erp.rsp && erp.rsp[p.trCode] != null ? erp.rsp[p.trCode] : rsp
      });
    });
    return out.concat(copy(erp.onlyErp || []));
  }

  // นำเข้าทั้งหมด: data = SP.data → { products, series, basePrices, promoPrices, listings, history, erpSnapshot } (แก้ history ของ data โดยตรง)
  function build(data) {
    var cfg = data.productImport;
    var seed = cfg && data[cfg.seed];
    if (!seed) return null;
    var built = buildProducts(seed, cfg, data.taxonomy);
    var basePrices = buildPrices(data, seed, cfg, data.priceImport || {});
    var promoPrices = buildPromoPrices(data, seed, cfg, data.priceImport || {});
    var listCfg = { newProducts: cfg.newProducts, seriesList: built.series };
    var listings = buildListings(data, seed, listCfg, data.listingRules || {}, built.products);
    var d = {};
    Object.keys(data).forEach(function (k) { d[k] = data[k]; });
    d.products = built.products;
    d.basePrices = basePrices;
    d.promoPrices = promoPrices;
    d.listings = listings;
    var history = buildHistory(d, seed, data.listingRules || {}, listings);
    history.skuStart = startMonths(seed.products, data.settings);
    priorSkuQty(d, history, history.skuStart);   // CR-27
    return {
      products: built.products, series: built.series, basePrices: basePrices, promoPrices: promoPrices, listings: listings, history: history,
      erpSnapshot: buildErp(built.products, basePrices, cfg, data.erpImport || {})
    };
  }

  var result = build(SP.data);
  if (result) {
    SP.data.products = result.products;
    SP.data.taxonomy.series = result.series.concat((SP.data.taxonomy.series || []).filter(function (s) {
      return !result.series.some(function (x) { return x.id === s.id; });
    }));
    SP.data.basePrices = result.basePrices;
    SP.data.promoPrices = result.promoPrices;
    SP.data.listings = result.listings;
    SP.data.history = result.history;
    SP.data.erpSnapshot = result.erpSnapshot;
    // CR-30: เลขนำหน้า Product Code ตั้งต้นของทุก Type + แปลงรหัสชั่วคราวของสินค้าใหม่เป็นรหัสระบบ (ย้ายการอ้างอิงทั้งหมด)
    var cat = SP.core.catalog;
    SP.data.taxonomy = cat.applyPrefixDefaults(SP.data.taxonomy, SP.data.products);
    var coded = cat.assignSystemCodes({
      products: SP.data.products, listings: SP.data.listings, basePrices: SP.data.basePrices, promoPrices: SP.data.promoPrices,
      npdPlans: SP.data.npdPlans, taxonomy: SP.data.taxonomy, actuals: SP.data.actuals, planSeeds: SP.data.planSeeds
    });
    ['products', 'listings', 'basePrices', 'promoPrices', 'npdPlans', 'actuals', 'planSeeds'].forEach(function (k) { SP.data[k] = coded.data[k]; });
    SP.data.codeCounters = coded.counters;
    SP.data.codeMigration = coded.map;
    // CR-30 รอบ 3: Listing เดิม → สถานะ วางขาย + เดือนเริ่มวางขาย (แผน NPD ต่อหน่วย หรือเดือนเปิดตัว)
    SP.data.listings = SP.core.calc.normalizeListings(SP.data.listings, SP.data.products, SP.data.npdPlans);
    // CR-34: Listing จาก SKU Planning — สินค้าที่ Sales ขอ NPD (ทุก Listing ของสินค้านั้น) + listingRules.salesListings (เพิ่มหลังสร้างยอดขายย้อนหลัง)
    var reqKeys = {};
    SP.data.products.forEach(function (p) { if (p.source === 'SALES_REQUEST') reqKeys[SP.core.calc.productKey(p)] = p; });
    SP.data.listings = SP.data.listings.map(function (l) {
      var rp = reqKeys[l.productKey];   // CR-35: Key ของคำขอ = ID ภายใน (REQ-nnn)
      if (!rp) return l;
      var o = JSON.parse(JSON.stringify(l));
      o.addedBy = 'SALES'; o.source = 'skuPlanning'; o.addedByName = rp.requestedBy || null; o.addedAt = rp.requestedAt || null;
      return o;
    });
    ((SP.data.listingRules || {}).salesListings || []).forEach(function (r) {
      var key = (SP.data.codeMigration || {})[r.productKey] || r.productKey;
      SP.data.listings = SP.core.calc.addSalesListings(SP.data.listings, [key], [r.unit], { fromMonth: r.fromMonth, at: r.at, by: r.by });
    });
    // CR-36: ข้อมูลตัวอย่างที่แก้สินค้าจาก seed (ไม่แก้ data/seed/) · productImport.samplePatches = [{ trCode, patch }] ใส่ทับฟิลด์ของสินค้านั้น
    ((SP.data.productImport || {}).samplePatches || []).forEach(function (sp) {
      SP.data.products = SP.data.products.map(function (pr) {
        if (pr.trCode !== sp.trCode) return pr;
        var o = JSON.parse(JSON.stringify(pr));
        Object.keys(sp.patch).forEach(function (k) { o[k] = JSON.parse(JSON.stringify(sp.patch[k])); });
        return o;
      });
    });
  }

  SP.core.seed = { build: build, imported: !!result, packOf: packOf, seriesIdOf: seriesIdOf, startMonths: startMonths, priorSkuQty: priorSkuQty };
})(window.SP);
