/*
 * core/store.js — ส่งข้อมูลข้าม Module (ทางเดียวที่ Module ใช้เก็บค่า)
 *
 * Key ทั้งหมด (ชื่อเต็ม) — ข้อมูลแผนแยกตามปี:
 *   app.planYear                      ปีแผนที่เลือกใน Header                         default: DEFAULT_PLAN_YEAR
 *   plan.<ปี>.topDown                 { total, channels: [channelId], pct, units: { <channelId>: [unitId] } }
 *                                     default: data/targets.js years.<ปี> / ไม่มี = 0 + defaultChannels/defaultUnits
 *   plan.<ปี>.phasing.<unitId>        { monthPct: [12 สัดส่วน], edited: bool }       default: Seasonality ปีก่อนของหน่วย
 *                                     → ไม่มี ใช้ของ Channel → ไม่มี เท่ากันทุกเดือน (calc.defaultPhasing)
 *   plan.<ปี>.sku.<unitId>            { method, items: { <productKey>: { startMonth, qty: [12], overrides: [12 bool], stopped } } }
 *                                     method = วิธีเติมยอดของช่องระบบเติม 'lastYear' | 'runRate' (ไม่มี = DEFAULT_FILL_METHOD)
 *                                     แผนครั้งแรก (Baseline)  default: calc.defaultSkuPlan (สินค้าที่ Listing และขายอยู่
 *                                     + NPD ที่แผน NPD อนุมัติแล้ว + ค่าตั้งต้นรายช่องจาก data/plan-seeds.js)
 *   plan.<ปี>.forecast.<unitId>       โครงเดียวกัน ใช้ในโหมดปรับแผน   default: สำเนาของ plan.<ปี>.sku.<unitId>
 *                                     (โหมดปรับแผนเขียนที่นี่เท่านั้น ไม่เขียนทับ Baseline)
 *   plan.<ปี>.workflow.<step>.<unitId|all>  { status, history: [{ action, by, at, note }], snapshot }
 *                                     step = topDown (all) | phasing | sku | forecast | baseline (all)  default: ฉบับร่าง
 *                                     baseline.snapshot = { gp, priceList, promotions } ราคาตอนล็อก (ใช้คำนวณแผนครั้งแรกหลังล็อก)
 *                                     + report (CR-12) = ตัวเลขทั้งหมดของรายงานสรุปแผนตอนล็อก (core/report.js build) — รายงานที่ล็อกแล้วอ่านจากที่นี่
 *   plan.<ปี>.baselineVersions        [{ no, code, at, by }] ประวัติเลขฉบับของรายงาน ({ปี}-BL-{nn}) ต่อท้ายทุกครั้งที่ล็อก Baseline   default: []
 *   master.products                   Product Master (ไม่แยกปี)   default: data/products.js
 *   master.listings                   [{ productKey, accountId (= unitId) }] (ไม่แยกปี)   default: data/listings.js
 *   master.taxonomy                   หมวดสินค้าและ Series   default: data/taxonomy.js
 *   master.priceList                  ราคาตามวันที่มีผล   default: data/pricing.js
 *   master.accountPrices              ราคาต่อ Account [{ productKey, accountId, price }] ราคาเดียวทั้งปี รวม VAT (CR-18)   default: data/pricing.js (จาก seed)
 *   master.promotions                 Promotion Price   default: data/promotions.js
 *   master.npdPlans                   แผน NPD (มี workflow ของตัวเอง)   default: data/npd.js
 *   master.audit                      Audit log [{ entity, key, field, oldValue, newValue, by, at }]   default: []
 *   master.accounts / master.territories / master.salespeople / master.assignments
 *                                     Account, เขตการขาย, Sales Person, ผู้รับผิดชอบตามช่วงเดือน (ไม่แยกปี)
 *                                     default: data/accounts.js, territories.js, salespeople.js, assignments.js
 *   master.stores                     ร้านค้า TT (CR-16 นำเข้าจาก data/seed/ อ่านอย่างเดียว)   default: core/stores.js
 *   master.storeAssignments           [{ storeId, territoryId, fromMonth, toMonth | null }] ร้านอยู่ในเขตใดในเดือนใด
 *   master.storeMoves                 [{ at, by, to, fromMonth, storeIds, before }] การย้ายร้านที่บันทึกแล้ว (ใช้หาการย้ายหลังอนุมัติเป้าหมาย)   default: []
 *   master.provinceSuggestions        { <territoryId>: [จังหวัด] } จังหวัดแนะนำของเขต
 *   ui.selection                      { channel, unit } ที่เลือกใน subChannelPicker (หน้า Phasing และวางแผน SKU ใช้ร่วมกัน)
 *   ui.planMode                       'initial' สร้างแผนครั้งแรก | 'reforecast' ปรับแผน (ใช้ได้หลังล็อก Baseline)
 *   ui.currentMonth                   เดือนปัจจุบันจำลองของปีแผน (0–11)   default: DEMO_FORECAST_MONTH
 *   ui.productMaster.channel          Channel ที่เลือกในหน้า Product Master
 *   ui.masterChannel                  Channel ที่เลือกในหน้า Account (หรือ 'all')
 *   ui.role                           บทบาทจำลอง { type: 'management' | 'director' | 'sales', personId }  default: DEFAULT_ROLE
 *   ui.sidebarCollapsed               Side Menu พับอยู่หรือไม่
 *   ui.seriesFilter                   [Series / Sub Series ที่เลือก] (หน้าวางแผน SKU และ Product Master ใช้ร่วมกัน ว่าง = ทุก Series)
 *   ui.productColumns                 คอลัมน์เพิ่มเติมที่เลือกในหน้ารายการสินค้า
 *   ui.skuShowLastYear                หน้าวางแผน SKU แสดงยอดปีก่อน (บรรทัดเล็กใต้ตัวเลข + คอลัมน์ปีก่อน / การเติบโต)
 *   ui.summaryTab                     แท็บล่าสุดของขั้นที่ 4: 'status' ติดตามสถานะ | 'report' รายงานสรุปแผน   default: null
 *                                     (null = ตามสถานะ: ยังไม่ล็อก Baseline → ติดตามสถานะ / ล็อกแล้ว → รายงานสรุปแผน)
 *   app.dataVersion                   รุ่นโครงข้อมูลของค่าที่เก็บไว้ (เปลี่ยนรุ่น = ล้างค่าที่ลองแก้ไว้ครั้งเดียว)
 *
 * API: get(key) / set(key, value) / remove(key) กลับไปใช้ค่าตั้งต้น / reset() ล้างทุก Key
 *      isSet(key) / keys() / onChange(fn) / status { persistent, crossPage }
 *      year() = ปีแผนที่เลือก / planKey('topDown') = 'plan.<ปีที่เลือก>.topDown'
 *      master() = { products, listings, taxonomy, priceList, accountPrices, promotions, npdPlans, audit, accounts, territories, salespeople,
 *                   assignments, stores, storeAssignments, storeMoves, provinceSuggestions } จาก master.*
 *      data()   = SP.data ที่แทน Master ทุกชุดด้วยค่าใน master.*
 *                 (ส่งให้ calc แทน SP.data เพื่อให้ค่าที่แก้ในหน้า Master มีผลทุกหน้า)
 *                 CR-16: ยอดขายปีก่อนของเขต TT ของปีแผนที่เลือก = ร้านที่อยู่ในเขต ณ เดือนแรกของปีแผน (core/stores.js applyHistory)
 *                 ก่อนอนุมัติจัดสรรเป้าหมายประจำปีใช้ร้านปัจจุบัน / หลังอนุมัติใช้ร้าน ณ เวลาที่อนุมัติ
 *      role() = บทบาทจำลอง / currentKey() = เดือนปัจจุบันจำลองแบบ 'YYYY-MM' / today() = วันแรกของเดือนนั้น 'YYYY-MM-01'
 *      appendAudit(entries) = ต่อท้าย master.audit
 *      workflowStates() = { '<step>.<unitId|all>': state } ของปีที่เลือก / saveWorkflowStates(map)
 * get() คืนสำเนาเสมอ แก้ค่าที่ได้โดยไม่ set() จะไม่มีผล
 *
 * เก็บค่าในหน่วยความจำ และบันทึกผ่าน adapter (ตอนนี้คือ sessionStorage)
 * ถ้าจะเปลี่ยนไปใช้ Backend ให้เขียน adapter ใหม่ที่มี load/save/remove/clear เหมือนกัน
 * โดยไม่ต้องแก้ Module
 */
(function (SP) {
  'use strict';

  var PREFIX = 'SP:';
  // รุ่นโครงข้อมูล: v6 เปลี่ยนสินค้าเป็น productKey (TR Code / รหัสชั่วคราว) / 7 = CR-11 สินค้าจริงจาก data/seed/
  // 8 = CR-16 เขต TT และ Sales Person TT จากข้อมูลร้านค้าจริง (id เขตเปลี่ยน)
  // 9 = CR-18 ราคารวม VAT + ราคาต่อ Account แยกจาก Price List (master.accountPrices)
  // ค่าที่เก็บจากรุ่นก่อนใช้ต่อไม่ได้ (ล้างครั้งเดียวตอนโหลด)
  var DATA_VERSION = 9;

  function sessionAdapter() {
    var ss;
    try {
      ss = window.sessionStorage;
      ss.setItem(PREFIX + '__test', '1');
      ss.removeItem(PREFIX + '__test');
    } catch (e) {
      return memoryAdapter();
    }
    function ownKeys() {
      var out = [];
      for (var i = 0; i < ss.length; i++) {
        var k = ss.key(i);
        if (k && k.indexOf(PREFIX) === 0) out.push(k);
      }
      return out;
    }
    return {
      persistent: true,
      load: function () {
        var out = {};
        ownKeys().forEach(function (k) {
          try { out[k.slice(PREFIX.length)] = JSON.parse(ss.getItem(k)); } catch (e) { /* ข้ามค่าที่อ่านไม่ได้ */ }
        });
        return out;
      },
      save: function (key, value) { try { ss.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* เต็มหรือถูกปิด */ } },
      remove: function (key) { try { ss.removeItem(PREFIX + key); } catch (e) { /* ignore */ } },
      clear: function () { ownKeys().forEach(function (k) { try { ss.removeItem(k); } catch (e) { /* ignore */ } }); }
    };
  }

  function memoryAdapter() {
    return {
      persistent: false,
      load: function () { return {}; },
      save: function () {},
      remove: function () {},
      clear: function () {}
    };
  }

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  var DEFAULTS = [
    {
      match: /^app\.planYear$/,
      make: function () { return SP.data.settings.DEFAULT_PLAN_YEAR; }
    },
    {
      match: /^plan\.(\d{4})\.topDown$/,
      make: function (year) {
        var d = SP.data.targets.years[year];
        return d
          ? { total: d.total, channels: clone(d.channels), pct: clone(d.pct), units: clone(d.units) }
          : { total: 0, channels: clone(SP.data.targets.defaultChannels), pct: {}, units: clone(SP.data.targets.defaultUnits) };
      }
    },
    {
      match: /^plan\.(\d{4})\.phasing\.(.+)$/,
      make: function (year, id) { return { monthPct: SP.core.calc.defaultPhasing(data(), Number(year), id), edited: false }; }
    },
    {
      match: /^plan\.(\d{4})\.sku\.(.+)$/,
      make: function (year, id) {
        var withDefaults = !!SP.data.targets.years[year];
        var seeds = withDefaults && SP.data.planSeeds && SP.data.planSeeds.years[year] ? SP.data.planSeeds.years[year][id] : null;
        return SP.core.calc.defaultSkuPlan(master(), id, Number(year), withDefaults, seeds);
      }
    },
    {
      match: /^plan\.(\d{4})\.forecast\.(.+)$/,
      make: function (year, id) { return get('plan.' + year + '.sku.' + id); }
    },
    {
      match: /^plan\.(\d{4})\.workflow\.(.+)$/,
      make: function () { return { status: 'draft', history: [] }; }
    },
    { match: /^plan\.(\d{4})\.baselineVersions$/, make: function () { return []; } },
    { match: /^master\.products$/, make: function () { return clone(SP.data.products); } },
    { match: /^master\.listings$/, make: function () { return clone(SP.data.listings); } },
    { match: /^master\.taxonomy$/, make: function () { return clone(SP.data.taxonomy); } },
    { match: /^master\.priceList$/, make: function () { return clone(SP.data.priceList); } },
    { match: /^master\.accountPrices$/, make: function () { return clone(SP.data.accountPrices || []); } },
    { match: /^master\.promotions$/, make: function () { return clone(SP.data.promotions); } },
    { match: /^master\.npdPlans$/, make: function () { return clone(SP.data.npdPlans); } },
    { match: /^master\.audit$/, make: function () { return []; } },
    { match: /^master\.accounts$/, make: function () { return clone(SP.data.accounts); } },
    { match: /^master\.territories$/, make: function () { return clone(SP.data.territories); } },
    { match: /^master\.salespeople$/, make: function () { return clone(SP.data.salespeople); } },
    { match: /^master\.assignments$/, make: function () { return clone(SP.data.assignments); } },
    { match: /^master\.stores$/, make: function () { return clone(SP.data.stores || []); } },
    { match: /^master\.storeAssignments$/, make: function () { return clone(SP.data.storeAssignments || []); } },
    { match: /^master\.storeMoves$/, make: function () { return []; } },
    { match: /^master\.provinceSuggestions$/, make: function () { return clone(SP.data.provinceSuggestions || {}); } },
    {
      match: /^ui\.selection$/,
      make: function () {
        var id = SP.data.settings.DEFAULT_UNIT;
        var info = SP.core.calc.unitInfo(SP.data, id);
        return { channel: info ? info.channel.id : SP.data.channels[0].id, unit: id };
      }
    },
    { match: /^ui\.planMode$/, make: function () { return 'initial'; } },
    { match: /^ui\.currentMonth$/, make: function () { return SP.data.settings.DEMO_FORECAST_MONTH; } },
    {
      match: /^ui\.productMaster\.channel$/,
      make: function () { var p = get(planKey('topDown')); return (p.channels && p.channels[0]) || SP.data.channels[0].id; }
    },
    { match: /^ui\.masterChannel$/, make: function () { return 'all'; } },
    { match: /^ui\.role$/, make: function () { return { type: SP.data.settings.DEFAULT_ROLE, personId: null }; } },
    { match: /^ui\.sidebarCollapsed$/, make: function () { return false; } },
    { match: /^ui\.seriesFilter$/, make: function () { return []; } },
    { match: /^ui\.productColumns$/, make: function () { return []; } },
    { match: /^ui\.skuShowLastYear$/, make: function () { return false; } },
    { match: /^ui\.summaryTab$/, make: function () { return null; } },
    { match: /^app\.dataVersion$/, make: function () { return DATA_VERSION; } }
  ];

  function defaultFor(key) {
    for (var i = 0; i < DEFAULTS.length; i++) {
      var m = DEFAULTS[i].match.exec(key);
      if (m) return DEFAULTS[i].make.apply(null, m.slice(1));
    }
    return undefined;
  }

  var adapter = sessionAdapter();
  var values = adapter.load();
  var listeners = [];

  // ---------------------------------------------------------------------
  // ค่าจากรุ่นก่อนที่ยังค้างใน sessionStorage (แปลงครั้งเดียวตอนโหลด แล้วบันทึกกลับ)
  //   phasing เคยเก็บเป็น Array → { monthPct, edited } / ui.phasing.selection → ui.selection
  //   ui.selection { account } → { unit } / topDown { accounts } → { units, channels }
  //   master.products campaign → series
  //   plan.<ปี>.salesPerson.<unitId> → master.assignments ทั้งปี แล้วลบ Key เดิม (เลิกใช้)
  // ---------------------------------------------------------------------
  function migrate() {
    var changed = [];
    // รุ่นโครงข้อมูลเปลี่ยน → ล้างค่าที่ลองแก้ไว้ทั้งหมด (คงปีแผนและการพับเมนู) ครั้งเดียว
    if (Object.keys(values).length && values['app.dataVersion'] !== DATA_VERSION) {
      Object.keys(values).forEach(function (k) {
        if (k === 'app.planYear' || k === 'ui.sidebarCollapsed') return;
        delete values[k];
        adapter.remove(k);
      });
    }
    if (values['app.dataVersion'] !== DATA_VERSION) put('app.dataVersion', DATA_VERSION);
    function put(k, v) { values[k] = v; changed.push(k); }
    Object.keys(values).forEach(function (k) {
      if (/^plan\.\d{4}\.phasing\./.test(k) && Array.isArray(values[k])) put(k, { monthPct: values[k], edited: true });
      if (/^plan\.\d{4}\.topDown$/.test(k) && values[k] && values[k].accounts && !values[k].units) {
        var td = values[k];
        td.units = td.accounts;
        delete td.accounts;
        if (!td.channels) td.channels = SP.data.channels.map(function (c) { return c.id; }).filter(function (id) { return td.units[id]; });
        put(k, td);
      }
    });
    if (values['ui.phasing.selection'] && !values['ui.selection']) put('ui.selection', values['ui.phasing.selection']);
    var sel = values['ui.selection'];
    if (sel && sel.account && !sel.unit) put('ui.selection', { channel: sel.channel, unit: sel.account });
    var old = Object.keys(values).filter(function (k) { return /^plan\.\d{4}\.salesPerson\./.test(k); });
    if (old.length) {
      var list = values['master.assignments'] ? values['master.assignments'] : clone(SP.data.assignments);
      old.forEach(function (k) {
        var m = /^plan\.(\d{4})\.salesPerson\.(.+)$/.exec(k);
        var res = SP.core.calc.setOwner(list, m[2], values[k] || null, m[1] + '-01', m[1] + '-12', null);
        if (res.ok) list = res.list;
        delete values[k];
        adapter.remove(k);
      });
      put('master.assignments', list);
    }
    changed.forEach(function (k) { adapter.save(k, values[k]); });
  }
  migrate();

  // เปิดจากไฟล์ในเครื่อง: Chrome/Edge ให้ location.origin = 'file://' และแชร์ sessionStorage ข้ามหน้าได้
  // Firefox ให้ 'null' เพราะมองแต่ละไฟล์เป็นคนละ Origin ค่าจึงไม่ส่งต่อข้ามหน้า
  var opaqueFileOrigin = location.protocol === 'file:' &&
    (String(location.origin) === 'null' || /firefox\//i.test(navigator.userAgent));

  function emit(key) { listeners.forEach(function (fn) { fn(key); }); }

  function get(key) { return clone(Object.prototype.hasOwnProperty.call(values, key) ? values[key] : defaultFor(key)); }

  function set(key, value) {
    values[key] = clone(value);
    adapter.save(key, values[key]);
    emit(key);
  }

  // ปีแผนที่เลือก (ถ้าค่าที่เก็บไว้ไม่อยู่ใน PLAN_YEARS ใช้ปีตั้งต้น)
  function year() {
    var y = Number(get('app.planYear'));
    return SP.data.settings.PLAN_YEARS.indexOf(y) >= 0 ? y : SP.data.settings.DEFAULT_PLAN_YEAR;
  }

  function planKey(suffix) { return 'plan.' + year() + '.' + suffix; }

  function master() {
    return {
      products: get('master.products'),
      listings: get('master.listings'),
      taxonomy: get('master.taxonomy'),
      priceList: get('master.priceList'),
      accountPrices: get('master.accountPrices'),
      promotions: get('master.promotions'),
      npdPlans: get('master.npdPlans'),
      audit: get('master.audit'),
      accounts: get('master.accounts'),
      territories: get('master.territories'),
      salespeople: get('master.salespeople'),
      assignments: get('master.assignments'),
      stores: get('master.stores'),
      storeAssignments: get('master.storeAssignments'),
      storeMoves: get('master.storeMoves'),
      provinceSuggestions: get('master.provinceSuggestions')
    };
  }

  function data() {
    var d = {};
    Object.keys(SP.data).forEach(function (k) { d[k] = SP.data[k]; });
    var m = master();
    Object.keys(m).forEach(function (k) { d[k] = m[k]; });
    // CR-16: ยอดขายปีก่อนของเขต TT ตามร้านที่อยู่ในเขต (หลังอนุมัติจัดสรรเป้าหมายประจำปี = ร้าน ณ เวลาที่อนุมัติ)
    var S = SP.core.stores;
    if (S) d = S.applyHistory(d, year(), S.approvedAt(get('plan.' + year() + '.workflow.topDown.all')));
    return d;
  }

  // บทบาทจำลอง: Sales Person ที่ไม่อยู่ใน Master แล้ว → กลับไปใช้บทบาทตั้งต้น
  function role() {
    var r = get('ui.role') || {};
    if (r.type === 'sales' && !SP.core.calc.findById(get('master.salespeople'), r.personId)) return { type: SP.data.settings.DEFAULT_ROLE, personId: null };
    return r;
  }

  function currentKey() { return SP.core.calc.monthKey(year(), Number(get('ui.currentMonth')) || 0); }

  // วันที่ "วันนี้" จำลอง = วันแรกของเดือนปัจจุบันจำลอง (ใช้ตัดสินราคาปัจจุบัน Status ของรายการสินค้า และวันที่มีผลตั้งต้น)
  function today() { return currentKey() + '-01'; }

  // ต่อท้าย Audit log (master.audit) entries จาก calc.auditDiff
  function appendAudit(entries) {
    if (!entries || !entries.length) return;
    set('master.audit', get('master.audit').concat(entries));
  }

  // สถานะ Workflow ทั้งปี (y = ปีแผน ไม่ส่ง = ปีที่เลือก)
  function workflowStates(y) {
    var prefix = 'plan.' + (y || year()) + '.workflow.';
    var out = {};
    Object.keys(values).forEach(function (k) { if (k.indexOf(prefix) === 0) out[k.slice(prefix.length)] = clone(values[k]); });
    return out;
  }

  function saveWorkflowStates(map, y) {
    var before = workflowStates(y);
    Object.keys(map).forEach(function (k) {
      if (JSON.stringify(before[k]) !== JSON.stringify(map[k])) set('plan.' + (y || year()) + '.workflow.' + k, map[k]);
    });
  }

  SP.core.store = {
    get: get,
    year: year,
    master: master,
    data: data,
    role: role,
    currentKey: currentKey,
    today: today,
    appendAudit: appendAudit,
    workflowStates: workflowStates,
    saveWorkflowStates: saveWorkflowStates,
    planKey: planKey,
    getDefault: function (key) { return clone(defaultFor(key)); },
    set: set,
    remove: function (key) {
      delete values[key];
      adapter.remove(key);
      emit(key);
    },
    reset: function () {
      values = {};
      adapter.clear();
      // เก็บรุ่นข้อมูลไว้ ไม่อย่างนั้นค่าที่ตั้งหลังรีเซ็ต (เช่น มุมมองผู้ใช้) ถูกล้างอีกครั้งตอนเปิดหน้าถัดไป
      values['app.dataVersion'] = DATA_VERSION;
      adapter.save('app.dataVersion', DATA_VERSION);
      emit(null);
    },
    isSet: function (key) { return Object.prototype.hasOwnProperty.call(values, key); },
    keys: function () { return Object.keys(values); },
    onChange: function (fn) { listeners.push(fn); },
    status: { persistent: adapter.persistent, crossPage: adapter.persistent && !opaqueFileOrigin }
  };
})(window.SP);
