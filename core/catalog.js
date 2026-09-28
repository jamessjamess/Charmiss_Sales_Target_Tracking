/*
 * core/catalog.js — ฟังก์ชันล้วนของ Product Master (CR-30) ไม่อ่าน/เขียน store ไม่แตะ DOM
 *
 * Product Code (CR-30 ข้อ 1.2): ระบบสร้างให้เสมอ แก้ไม่ได้หลังสร้าง · เลขเดียวกับ TRCLOUD (Product Master เป็นต้นทาง)
 *   รูปแบบ = {เลขนำหน้าของ Type 2 หลัก}{ลำดับ 3 หลัก} รวม 5 หลัก ขั้นละ settings.CODE_STEP (10) ถัดจากรหัสที่มากที่สุดในกลุ่มเดียวกัน
 *   กลุ่ม = เลขนำหน้า (2 หลักแรก) นับทุกสินค้าใน Product Master + เลขล่าสุดที่เคยออก (master.codeCounters) — เลขที่ใช้แล้วไม่นำกลับมาใช้
 *   เลขนำหน้าเก็บที่ Type (taxonomy.category[].codePrefix) · ค่าตั้งต้น = 2 หลักแรกที่พบมากที่สุดใน Type นั้น ห้ามซ้ำกับ Type อื่น
 * ใน TRCLOUD: product.inTrcloud (true = เปิดแล้ว · false = ยังไม่เปิด) ตั้งจากผลเปรียบเทียบกับ ERP
 * Preset คอลัมน์ส่วนตัว (ข้อ 2.3): ui.columnPresets = { <userId>: { <tableId>: { presets: [{ id, name, columns }], defaultId, columns } } }
 */
(function (SP) {
  'use strict';

  var calc = SP.core.calc;

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function settings() { return SP.data.settings || {}; }
  function step() { return settings().CODE_STEP || 10; }
  function digits() { return settings().CODE_DIGITS || 5; }

  // ---------------------------------------------------------------------
  // Product Code
  // ---------------------------------------------------------------------

  // เลขนำหน้าของรหัส (2 หลักแรก) เฉพาะรหัสตัวเลขตามรูปแบบ · อื่นๆ = null
  function prefixOf(code) {
    var s = String(code == null ? '' : code);
    return new RegExp('^\\d{' + digits() + '}$').test(s) ? s.slice(0, 2) : null;
  }

  function typeNodes(tax) { return ((tax && tax.category) || []).filter(function (n) { return n.level === 'TYPE'; }); }

  // เลขนำหน้าตั้งต้นของทุก Type จากสินค้าที่มีอยู่ → { <typeId>: prefix }
  //   Type ที่มีสินค้ามากกว่าเลือกก่อน · ใช้ 2 หลักที่พบมากที่สุดที่ยังไม่ถูก Type อื่นใช้ (Lip Stick 16 ชนกับ Blush → 17)
  function typePrefixDefaults(products, tax) {
    var counts = {};
    (products || []).forEach(function (p) {
      var pre = prefixOf(p.trCode);
      if (!pre || !p.typeId) return;
      counts[p.typeId] = counts[p.typeId] || {};
      counts[p.typeId][pre] = (counts[p.typeId][pre] || 0) + 1;
    });
    var taken = {};
    typeNodes(tax).forEach(function (n) { if (n.codePrefix) taken[n.codePrefix] = n.id; });
    var out = {};
    Object.keys(counts).map(function (t) {
      var total = Object.keys(counts[t]).reduce(function (s, k) { return s + counts[t][k]; }, 0);
      return { typeId: t, total: total };
    }).sort(function (a, b) { return b.total - a.total || (a.typeId < b.typeId ? -1 : 1); }).forEach(function (r) {
      var node = typeNodes(tax).filter(function (n) { return n.id === r.typeId; })[0];
      if (!node || node.codePrefix) return;
      var list = Object.keys(counts[r.typeId]).sort(function (a, b) { return counts[r.typeId][b] - counts[r.typeId][a] || (a < b ? -1 : 1); });
      var pick = list.filter(function (pre) { return !taken[pre]; })[0];
      if (!pick) return;
      taken[pick] = r.typeId;
      out[r.typeId] = pick;
    });
    return out;
  }

  // ใส่เลขนำหน้าตั้งต้นให้ Type ที่ยังไม่มี → taxonomy ใหม่
  function applyPrefixDefaults(tax, products) {
    var out = copy(tax);
    var defs = typePrefixDefaults(products, out);
    (out.category || []).forEach(function (n) { if (n.level === 'TYPE' && !n.codePrefix && defs[n.id]) n.codePrefix = defs[n.id]; });
    return out;
  }

  function typePrefix(tax, typeId) {
    var n = typeNodes(tax).filter(function (x) { return x.id === typeId; })[0];
    return n && n.codePrefix ? String(n.codePrefix) : null;
  }

  // ตรวจเลขนำหน้าที่จะตั้งให้ Type → null | 'format' (ต้องเป็นตัวเลข 2 หลัก) | 'duplicate' (ซ้ำกับ Type อื่น)
  function prefixError(tax, typeId, prefix) {
    var s = String(prefix == null ? '' : prefix).trim();
    if (!s) return null;
    if (!/^\d{2}$/.test(s)) return 'format';
    return typeNodes(tax).some(function (n) { return n.id !== typeId && String(n.codePrefix || '') === s; }) ? 'duplicate' : null;
  }

  // เลขล่าสุดของแต่ละกลุ่มจากสินค้าที่มีอยู่ → { <prefix>: number }
  function initialCounters(products) {
    var out = {};
    (products || []).forEach(function (p) {
      var pre = prefixOf(p.trCode);
      if (pre) out[pre] = Math.max(out[pre] || 0, Number(p.trCode));
    });
    return out;
  }

  // รหัสที่มากที่สุดของกลุ่ม (สินค้าใน Master + เลขล่าสุดที่เคยออก)
  function groupMax(products, prefix, counters) {
    var max = counters && counters[prefix] ? Number(counters[prefix]) : 0;
    (products || []).forEach(function (p) { if (prefixOf(p.trCode) === prefix) max = Math.max(max, Number(p.trCode)); });
    return max;
  }

  // รหัสถัดไปของ Type → { ok, code, prefix, error: 'type' (ยังไม่เลือก Type) | 'prefix' (Type ยังไม่มีเลขนำหน้า) | 'full' (เต็มกลุ่ม) }
  //   กลุ่มว่าง = {prefix}000 · ต่อจากรหัสสูงสุด = ปัดขึ้นเป็นขั้นถัดไป (12240 → 12250 · 11032 → 11040)
  function nextCode(products, tax, typeId, counters) {
    if (!typeId) return { ok: false, code: null, prefix: null, error: 'type' };
    var prefix = typePrefix(tax, typeId);
    if (!prefix) return { ok: false, code: null, prefix: null, error: 'prefix' };
    var base = Number(prefix) * Math.pow(10, digits() - 2);
    var max = groupMax(products, prefix, counters);
    var n = max ? (Math.floor(max / step()) + 1) * step() : base;
    if (n >= base + Math.pow(10, digits() - 2)) return { ok: false, code: null, prefix: prefix, error: 'full' };
    return { ok: true, code: String(n), prefix: prefix, error: null };
  }

  // จดเลขที่ออกแล้ว → counters ใหม่
  function takeCode(counters, code) {
    var out = copy(counters || {});
    var pre = prefixOf(code);
    if (pre) out[pre] = Math.max(Number(out[pre] || 0), Number(code));
    return out;
  }

  // ---------------------------------------------------------------------
  // CR-35: คำขอ NPD จาก Sales — ID ภายใน REQ-nnn + ลำดับคำขอ (codeCounters.request · ไม่ใช้ซ้ำ ไม่รีเซ็ต) · รหัสชั่วคราวที่แสดง = calc.requestCodeOf
  //   confirmRequest(master, key, input { name, typeId }, meta) = ทีม Product ยืนยัน (Request → Planned): Product Code 5 หลักจาก nextCode ·
  //   tempCode = รหัสชั่วคราวตอนยืนยัน · Key (id) คงเดิม แผน SKU / Listing / ราคาจึงอยู่ครบ → { ok, master, code, tempCode, error: 'notRequest' | 'name' | 'type' | 'prefix' | 'full' }
  // ---------------------------------------------------------------------
  function requestId(seq) { var s = String(seq); while (s.length < 3) s = '0' + s; return 'REQ-' + s; }
  function nextRequestSeq(products, counters) {
    var max = Number((counters || {}).request || 0);
    (products || []).forEach(function (p) { if (p.requestSeq > max) max = Number(p.requestSeq); });
    return max + 1;
  }
  function takeRequestSeq(counters, seq) { var out = copy(counters || {}); out.request = Math.max(Number(out.request || 0), Number(seq)); return out; }
  function previewConfirmCode(master, typeId) { return nextCode(master.products, master.taxonomy, typeId, master.codeCounters); }
  function confirmRequest(master, key, input, meta) {
    meta = meta || {};
    input = input || {};
    var p = calc.findProduct(master.products, key);
    if (!calc.isRequestProduct(p)) return { ok: false, error: 'notRequest', master: master };
    var name = String(input.name == null ? p.name : input.name).trim();
    if (!name) return { ok: false, error: 'name', master: master };
    var typeId = input.typeId || p.typeId;
    var coded = nextCode(master.products, master.taxonomy, typeId, master.codeCounters);
    if (!coded.ok) return { ok: false, error: coded.error, master: master };
    var out = copy(master);
    var temp = calc.requestCodeOf(p);
    var chain = SP.core.taxonomy && SP.core.taxonomy.find ? SP.core.taxonomy.find(master.taxonomy, 'category', typeId) : null;
    out.products = out.products.map(function (x) {
      if (calc.productKey(x) !== key) return x;
      x.trCode = coded.code;
      x.tempCode = temp;
      x.name = name;
      if (typeId !== x.typeId) {
        x.typeId = typeId;
        var sub = chain && chain.parentId ? SP.core.taxonomy.find(master.taxonomy, 'category', chain.parentId) : null;
        if (sub) { x.subCategoryId = sub.id; x.categoryId = sub.parentId || x.categoryId; }
        x.inferred = false;
      }
      x.confirmedAt = meta.at || '';
      x.confirmedBy = meta.by || '';
      x.updatedAt = meta.at || x.updatedAt;
      return x;
    });
    out.npdPlans = (out.npdPlans || []).map(function (n) {
      if (n.productKey !== key) return n;
      n.confirmedAt = meta.at || '';
      n.confirmedBy = meta.by || '';
      return n;
    });
    out.codeCounters = takeCode(master.codeCounters, coded.code);
    return { ok: true, master: out, code: coded.code, tempCode: temp, error: null };
  }

  // ---------------------------------------------------------------------
  // แปลงรหัสชั่วคราวของข้อมูลตั้งต้นเป็นรหัสระบบ (ครั้งเดียวตอนโหลด · core/seed.js)
  //   CR-35: คำขอ NPD จาก Sales (source SALES_REQUEST) ไม่ออก Product Code — ได้ ID ภายใน REQ-nnn + requestSeq ตามลำดับในไฟล์ (ย้ายการอ้างอิงเหมือนกัน)
  //   data = { products, listings, basePrices, promoPrices, npdPlans, taxonomy, actuals, planSeeds }
  //   ย้ายการอ้างอิงด้วย calc.bindTrCode (สินค้า Listing ราคา แผน NPD) + ยอดขายจริงและค่าตั้งต้นแผน SKU ราย productKey
  //   → { data (ชุดใหม่), map: { <รหัสเดิม>: <รหัสใหม่> }, counters }
  // ---------------------------------------------------------------------
  function assignSystemCodes(data) {
    var out = {};
    Object.keys(data).forEach(function (k) { out[k] = data[k]; });
    var master = { products: copy(out.products || []), listings: copy(out.listings || []), basePrices: copy(out.basePrices || []),
      promoPrices: copy(out.promoPrices || []), npdPlans: copy(out.npdPlans || []) };
    var counters = initialCounters(master.products);
    var map = {};
    master.products.filter(function (p) { return !p.trCode && p.tempCode && p.source === 'SALES_REQUEST'; }).forEach(function (p) {
      var temp = p.tempCode;
      var seq = nextRequestSeq(master.products, counters);
      var id = requestId(seq);
      p.id = id;
      p.requestSeq = seq;
      counters = takeRequestSeq(counters, seq);
      ['listings', 'basePrices', 'promoPrices', 'npdPlans'].forEach(function (k) { (master[k] || []).forEach(function (r) { if (r.productKey === temp) r.productKey = id; }); });
      map[temp] = id;
    });
    master.products.filter(function (p) { return !p.trCode && p.tempCode && p.source !== 'SALES_REQUEST'; }).map(function (p) { return p.tempCode; }).forEach(function (temp) {
      var p = master.products.filter(function (x) { return x.tempCode === temp; })[0];
      var res = nextCode(master.products, out.taxonomy, p.typeId, counters);
      if (!res.ok) return;
      var bound = calc.bindTrCode(master, temp, res.code);
      if (!bound.ok) return;
      master = bound.master;
      counters = takeCode(counters, res.code);
      map[temp] = res.code;
    });
    master.products.forEach(function (p) { delete p.tempCode; delete p.tempCodeHistory; delete p.trCodeHold; });
    function rekeyUnits(byUnit) {
      if (!byUnit) return byUnit;
      var o = copy(byUnit);
      Object.keys(o).forEach(function (u) {
        Object.keys(map).forEach(function (from) { if (o[u] && o[u][from] != null) { o[u][map[from]] = o[u][from]; delete o[u][from]; } });
      });
      return o;
    }
    ['actuals', 'planSeeds'].forEach(function (k) {
      if (!out[k] || !out[k].years) return;
      var a = copy(out[k]);
      Object.keys(a.years).forEach(function (y) { a.years[y] = rekeyUnits(a.years[y]); });
      out[k] = a;
    });
    ['products', 'listings', 'basePrices', 'promoPrices', 'npdPlans'].forEach(function (k) { out[k] = master[k]; });
    return { data: out, map: map, counters: counters };
  }

  // ---------------------------------------------------------------------
  // ใน TRCLOUD
  // ---------------------------------------------------------------------

  // CR-35: ยังไม่เปิดใน TRCLOUD = คำขอ NPD (Status Request · ยังไม่มี Product Code 5 หลัก) · มี Product Code แล้ว = เลขเดียวกับ TRCLOUD
  function inTrcloud(p) { return !!p && !calc.isRequestProduct(p); }

  // สถานะ ใน TRCLOUD ที่ต่างจากผลเปรียบเทียบ (มีรหัสใน ERP = เปิดแล้ว) → [{ key, from, to }]
  function trcloudChanges(products, erp) {
    var codes = {};
    (erp || []).forEach(function (r) { codes[r.trCode] = true; });
    return (products || []).filter(function (p) { return p.trCode && inTrcloud(p) !== !!codes[p.trCode]; })
      .map(function (p) { return { key: p.trCode, from: inTrcloud(p), to: !!codes[p.trCode] }; });
  }

  function applyTrcloud(products, changes) {
    var out = copy(products || []);
    (changes || []).forEach(function (c) { out.forEach(function (p) { if (p.trCode === c.key) p.inTrcloud = c.to; }); });
    return out;
  }

  // สินค้าใหม่จากแถว ERP ที่ยังไม่มีใน Product Master (นำเข้าด้วยรหัสเดิม ไม่สร้างรหัสใหม่)
  //   หมวดสินค้ากำหนดจากคำในชื่อ (inferred) · Series และเดือนเปิดตัวว่าง = ขาดข้อมูลจำเป็นจนกว่าทีม Product จะเติม
  function productFromErp(row, tax, rules, meta) {
    meta = meta || {};
    var cat = calc.inferCategory(row.name, rules || [], tax);
    return {
      trCode: String(row.trCode), barcode: row.barcode || '', name: row.name || '', nameEn: '', shortName: '',
      categoryId: cat ? cat.categoryId : null, subCategoryId: cat ? cat.subCategoryId : null, typeId: cat ? cat.typeId : null, inferred: !!cat,
      seriesId: null, subSeriesId: null, packSize: null, uom: '', image: null, launchDate: null, discontinueMonth: null, clearance: null,
      inTrcloud: true, note: '', createdAt: meta.at || '', updatedAt: meta.at || ''
    };
  }

  // ---------------------------------------------------------------------
  // CR-30 ข้อ 4.2 นำเข้าราคาหลักจาก Excel: table = แถวของชีตแรก (export.readTable) · columns = { code: [ชื่อหัวคอลัมน์], <priceType>: [...] }
  //   หาแถวหัวที่มีคอลัมน์ Product Code · ค่าที่ต่างจากราคาที่มีผล ณ month = รายการที่จะบันทึก (มีผล month)
  //   → { changes: [{ key, type, old, price }], same (ค่าเท่าเดิม), unknown: [รหัสที่ไม่มีใน Product Master], invalid (ราคาไม่ใช่ตัวเลข > 0), header }
  // ---------------------------------------------------------------------
  function priceImportDiff(table, columns, basePrices, month, products) {
    function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase(); }
    var alias = {};
    Object.keys(columns || {}).forEach(function (f) { (columns[f] || []).forEach(function (n) { alias[norm(n)] = f; }); });
    var header = -1;
    for (var i = 0; i < (table || []).length && header < 0; i++) if ((table[i] || []).some(function (c) { return alias[norm(c)] === 'code'; })) header = i;
    var out = { changes: [], same: 0, unknown: [], invalid: 0, header: header };
    if (header < 0) return out;
    var map = {};
    table[header].forEach(function (c, j) { var f = alias[norm(c)]; if (f && map[f] == null) map[f] = j; });
    var known = {};
    (products || []).forEach(function (p) { known[calc.productKey(p)] = true; });
    table.slice(header + 1).forEach(function (r) {
      var key = String((r || [])[map.code] == null ? '' : r[map.code]).trim();
      if (!key) return;
      if (!known[key]) { if (out.unknown.indexOf(key) < 0) out.unknown.push(key); return; }
      Object.keys(map).forEach(function (type) {
        if (type === 'code') return;
        var raw = String(r[map[type]] == null ? '' : r[map[type]]).replace(/[,\s฿]/g, '');
        if (raw === '') return;
        var price = Number(raw);
        if (!isFinite(price) || price <= 0) { out.invalid += 1; return; }
        price = Math.round(price * 100) / 100;
        var old = calc.basePriceAt(basePrices, key, type, month);
        if (old != null && Math.abs(old - price) < 0.005) { out.same += 1; return; }
        out.changes.push({ key: key, type: type, old: old, price: price });
      });
    });
    return out;
  }

  // ---------------------------------------------------------------------
  // Preset คอลัมน์ส่วนตัว
  //   system = [{ id, columns }] Preset ของระบบ (ลบไม่ได้) · ค่าเริ่มต้นของผู้ใช้ = defaultId (ไม่มี = Preset ระบบตัวแรก)
  // ---------------------------------------------------------------------

  function tableState(all, userId, tableId) {
    var u = (all && all[userId]) || {};
    var t = u[tableId] || {};
    var out = { presets: copy(t.presets || []), defaultId: t.defaultId || null, columns: t.columns ? copy(t.columns) : null };
    if (t.version != null) out.version = t.version;   // CR-33 (ensureVersion)
    return out;
  }

  function withTable(all, userId, tableId, fn) {
    var out = copy(all || {});
    out[userId] = out[userId] || {};
    var t = tableState(out, userId, tableId);
    fn(t);
    out[userId][tableId] = t;
    return out;
  }

  // Preset ทั้งหมดที่ผู้ใช้เห็น = ของระบบ + ของผู้ใช้คนนี้เท่านั้น
  function presetsFor(all, userId, tableId, system) {
    return (system || []).map(function (p) { return { id: p.id, columns: copy(p.columns), system: true }; })
      .concat(tableState(all, userId, tableId).presets.map(function (p) { return { id: p.id, name: p.name, columns: p.columns, system: false }; }));
  }

  function findPreset(list, id) { return (list || []).filter(function (p) { return p.id === id; })[0] || null; }

  // คอลัมน์ที่แสดงตอนนี้: ที่เลือกไว้ล่าสุด → Preset เริ่มต้นของผู้ใช้ → Preset ระบบตัวแรก (กรองเฉพาะคอลัมน์ที่มีอยู่ใน known)
  function currentColumns(all, userId, tableId, system, known) {
    var t = tableState(all, userId, tableId);
    var list = presetsFor(all, userId, tableId, system);
    var cols = t.columns || (findPreset(list, t.defaultId) || list[0] || { columns: [] }).columns;
    return known ? cols.filter(function (k) { return known.indexOf(k) >= 0; }) : cols;
  }

  function setColumns(all, userId, tableId, columns) {
    return withTable(all, userId, tableId, function (t) { t.columns = copy(columns); });
  }

  // บันทึก Preset ใหม่ (ชื่อซ้ำของผู้ใช้คนเดิม = เขียนทับ) → { all, id }
  function savePreset(all, userId, tableId, name, columns) {
    var n = String(name || '').trim();
    var id = null;
    var out = withTable(all, userId, tableId, function (t) {
      var same = t.presets.filter(function (p) { return p.name === n; })[0];
      if (same) { same.columns = copy(columns); id = same.id; return; }
      var i = 1;
      while (t.presets.some(function (p) { return p.id === 'u' + i; })) i++;
      id = 'u' + i;
      t.presets.push({ id: id, name: n, columns: copy(columns) });
    });
    return { all: out, id: id };
  }

  function removePreset(all, userId, tableId, id) {
    return withTable(all, userId, tableId, function (t) {
      t.presets = t.presets.filter(function (p) { return p.id !== id; });
      if (t.defaultId === id) t.defaultId = null;
    });
  }

  function setDefaultPreset(all, userId, tableId, id) {
    return withTable(all, userId, tableId, function (t) { t.defaultId = id || null; });
  }

  // CR-33: เวอร์ชัน Preset ของตาราง — เวอร์ชันที่เก็บไว้ต่างจาก version = ล้าง Preset · คอลัมน์ที่เลือก · ค่าเริ่มต้นของผู้ใช้คนนี้ 1 ครั้ง
  //   (ใช้เมื่อค่าเริ่มต้นของระบบเปลี่ยน) → { all, reset (true = มีค่าเดิมถูกล้าง) } · version ว่าง = ไม่ทำอะไร
  function ensureVersion(all, userId, tableId, version) {
    if (version == null) return { all: all, reset: false };
    var t = (all && all[userId] && all[userId][tableId]) || null;
    if (t && t.version === version) return { all: all, reset: false };
    var had = !!t && (!!(t.presets && t.presets.length) || !!t.columns || !!t.defaultId);
    var out = copy(all || {});
    out[userId] = out[userId] || {};
    out[userId][tableId] = { presets: [], defaultId: null, columns: null, version: version };
    return { all: out, reset: had };
  }

  // คืนค่าตั้งต้น = ล้างค่าเริ่มต้นและคอลัมน์ที่เลือกไว้ของผู้ใช้ (Preset ที่บันทึกไว้ยังอยู่)
  function resetColumns(all, userId, tableId) {
    return withTable(all, userId, tableId, function (t) { t.defaultId = null; t.columns = null; });
  }

  SP.core.catalog = {
    requestId: requestId, nextRequestSeq: nextRequestSeq, takeRequestSeq: takeRequestSeq, previewConfirmCode: previewConfirmCode, confirmRequest: confirmRequest,
    prefixOf: prefixOf,
    typePrefixDefaults: typePrefixDefaults,
    applyPrefixDefaults: applyPrefixDefaults,
    typePrefix: typePrefix,
    prefixError: prefixError,
    initialCounters: initialCounters,
    groupMax: groupMax,
    nextCode: nextCode,
    takeCode: takeCode,
    assignSystemCodes: assignSystemCodes,
    inTrcloud: inTrcloud,
    trcloudChanges: trcloudChanges,
    applyTrcloud: applyTrcloud,
    productFromErp: productFromErp,
    priceImportDiff: priceImportDiff,
    tableState: tableState,
    ensureVersion: ensureVersion,
    presetsFor: presetsFor,
    currentColumns: currentColumns,
    setColumns: setColumns,
    savePreset: savePreset,
    removePreset: removePreset,
    setDefaultPreset: setDefaultPreset,
    resetColumns: resetColumns
  };
})(window.SP);
