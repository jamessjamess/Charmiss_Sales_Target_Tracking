/*
 * core/seed.js — นำเข้าข้อมูลจริงจาก data/seed/ เข้าโครง Product Master (CR-11) ทำครั้งเดียวตอนโหลด ก่อน store
 *
 * อ่าน data/:  productImport (data/products.js), seed ตามชื่อใน productImport.seed (data/seed/seed-charmiss.js),
 *              taxonomy, listingRules (data/listings.js), priceImport (data/pricing.js), erpImport (data/erp-snapshot.js),
 *              accounts, territories, channels, history, settings, promotions
 * เขียน:       SP.data.products, taxonomy.series, listings, priceList, accountPrices (CR-18), erpSnapshot,
 *              history.years.<ปีของ seed>.skuQty (ยอดขายราย SKU), history.years.<ปี>.monthly ของหน่วยที่มียอดราย SKU จริง
 *              (รูปแบบรายเดือนจาก SKU ยอดทั้งปีเท่าเดิม), history.runRate
 * store:       ไม่อ่าน ไม่เขียน (store โหลดหลังไฟล์นี้ ค่าตั้งต้นของ master.* จึงเป็นข้อมูลที่นำเข้าแล้ว)
 *
 * ขั้นตอน (ไม่มีการสุ่ม ผลลัพธ์เหมือนเดิมทุกครั้ง / สูตรเรียก SP.core.calc):
 *   1. สินค้า: seed.products + productImport.newProducts → โครง Product Master
 *      Series จาก Campaign (ยกเว้น notSeries เช่น Existing) · หมวดสินค้าจากคำในชื่อ (calc.inferCategory, inferred: true)
 *      ขนาดบรรจุจากชื่อ (5g, 50ml) · Status ไม่เก็บ (คำนวณจากวันที่)
 *   2. ราคา: RSP ทั่วไป · SELL_IN (dealerPrice) ของ Channel ใน priceImport.dealerChannels · priceImport.changes
 *      ราคาต่อ Account (CR-18) = SP.data.accountPrices [{ productKey, accountId, price }] ราคาเดียวทั้งปี (รวม VAT) ไม่อยู่ใน Price List
 *   3. Listing: seed.listings (ชื่อ Account → id) · สินค้าใหม่ → newProductUnits · หน่วยอื่นตาม listingRules.units
 *   4. ยอดขายปีก่อนราย SKU: หน่วยใน seed = history ของ seed / หน่วยอื่น = รูปแบบของหน่วยต้นแบบ (from) เฉพาะ SKU ที่ Listing
 *      ปรับให้ Net Sales แต่ละเดือนเท่ากับ history.years.<ปี>.monthly ของหน่วยนั้น · Run-rate = เฉลี่ย RUN_RATE_MONTHS เดือนจริงล่าสุด
 *   5. ERP ตัวอย่าง: สินค้าที่มี TR Code + ความต่างใน erpImport
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
        trCode: src.trCode || '', tempCode: src.tempCode || '', tempCodeHistory: [], internalCode: '', barcode: '',
        name: src.name, nameEn: '', shortName: src.shortName || '',
        categoryId: cat ? cat.categoryId : null, subCategoryId: cat ? cat.subCategoryId : null, typeId: cat ? cat.typeId : null,
        inferred: !!cat,
        seriesId: sid, subSeriesId: null, itemType: 'SALE', packSize: pack.packSize, uom: pack.uom, image: null,
        launchDate: src.launchDate || null, discontinueMonth: src.discontinueMonth || null, clearance: null,
        note: src.note || (skipped ? cfg.notSeriesNote : ''), createdAt: src.createdAt || stamp, updatedAt: src.createdAt || stamp
      };
    }
    return { products: (seed.products || []).map(make).concat((cfg.newProducts || []).map(make)), series: series };
  }

  // 2) Price List
  function buildPrices(data, seed, cfg, pcfg) {
    var list = [];
    var by = cfg.importedBy || '';
    function from(src) { return src.launchDate && src.launchDate > cfg.priceFrom ? src.launchDate : cfg.priceFrom; }
    (seed.products || []).concat(cfg.newProducts || []).forEach(function (src) {
      var key = src.trCode || src.tempCode;
      var f = from(src);
      if (src.rsp > 0) list.push({ productKey: key, priceType: 'RSP', channelId: null, accountId: null, price: src.rsp, effectiveFrom: f, effectiveTo: null, by: by, at: f + 'T09:00:00' });
      (pcfg.dealerChannels || []).forEach(function (ch) {
        if (src.dealerPrice > 0) list.push({ productKey: key, priceType: 'SELL_IN', channelId: ch, accountId: null, price: src.dealerPrice, effectiveFrom: f, effectiveTo: null, by: by, at: f + 'T09:00:00' });
      });
    });

    (pcfg.changes || []).forEach(function (c) {
      var res = calc.addPrice(list, c);
      if (res.ok) list = res.list;
    });
    return list;
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
    (cfg.newProducts || []).forEach(function (p) { (rules.newProductUnits || []).forEach(function (u) { add(p.tempCode, u); }); });
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

  // 5) ERP ตัวอย่าง
  function buildErp(products, priceList, cfg, erp) {
    var out = [];
    products.forEach(function (p) {
      if (!p.trCode || (erp.notInErp || []).indexOf(p.trCode) >= 0) return;
      var rsp = calc.rspOn(priceList, p.trCode, cfg.priceFrom);
      out.push({
        trCode: p.trCode,
        name: (erp.rename && erp.rename[p.trCode]) || p.name,
        barcode: (erp.barcode && erp.barcode[p.trCode]) || '',
        rsp: erp.rsp && erp.rsp[p.trCode] != null ? erp.rsp[p.trCode] : rsp
      });
    });
    return out.concat(copy(erp.onlyErp || []));
  }

  // นำเข้าทั้งหมด: data = SP.data → { products, series, priceList, listings, history, erpSnapshot } (แก้ history ของ data โดยตรง)
  function build(data) {
    var cfg = data.productImport;
    var seed = cfg && data[cfg.seed];
    if (!seed) return null;
    var built = buildProducts(seed, cfg, data.taxonomy);
    var priceList = buildPrices(data, seed, cfg, data.priceImport || {});
    // CR-18: ราคาต่อ Account จาก seed (ชื่อ Account → id) ราคาเดียวทั้งปี
    var accountPrices = [];
    (seed.accountPrices || []).forEach(function (a) {
      var unit = unitIdOf(data, a.account);
      if (unit && a.rsp > 0) accountPrices = calc.setAccountPrice(accountPrices, a.trCode, unit, a.rsp);
    });
    var listCfg = { newProducts: cfg.newProducts, seriesList: built.series };
    var listings = buildListings(data, seed, listCfg, data.listingRules || {}, built.products);
    var d = {};
    Object.keys(data).forEach(function (k) { d[k] = data[k]; });
    d.products = built.products;
    d.priceList = priceList;
    d.accountPrices = accountPrices;
    d.listings = listings;
    var history = buildHistory(d, seed, data.listingRules || {}, listings);
    return {
      products: built.products, series: built.series, priceList: priceList, accountPrices: accountPrices, listings: listings, history: history,
      erpSnapshot: buildErp(built.products, priceList, cfg, data.erpImport || {})
    };
  }

  var result = build(SP.data);
  if (result) {
    SP.data.products = result.products;
    SP.data.taxonomy.series = result.series.concat((SP.data.taxonomy.series || []).filter(function (s) {
      return !result.series.some(function (x) { return x.id === s.id; });
    }));
    SP.data.priceList = result.priceList;
    SP.data.accountPrices = result.accountPrices;
    SP.data.listings = result.listings;
    SP.data.history = result.history;
    SP.data.erpSnapshot = result.erpSnapshot;
  }

  SP.core.seed = { build: build, imported: !!result, packOf: packOf, seriesIdOf: seriesIdOf };
})(window.SP);
