/*
 * core/taxonomy.js — กฎของหมวดสินค้าและ Series (CR-15) — Pure functions ห้ามแตะ DOM ไม่อ่าน store
 *
 * tax      = { category: [{ id, name, parentId, level, active, order }], series: [... + startDate, endDate (Series คอลแลบ ไม่บังคับ)] }
 * kind     = 'category' (Category → Sub Category → Type) | 'series' (Series → Sub Series)
 * products = master.products (อ้างหมวดด้วย categoryId, subCategoryId, typeId, seriesId, subSeriesId / productKey = TR Code หรือรหัสชั่วคราว)
 * ทุกฟังก์ชันที่แก้ข้อมูลคืนสำเนาใหม่ ไม่แก้ค่าที่ส่งเข้ามา
 *
 *   buildTree(tax, kind)                              Tree ซ้อน [{ node, depth, path, children }]
 *   filterTree(tax, kind, filters, products, today)   รายการที่แสดงและจำนวน SKU ตามตัวกรอง → { show, match, count, cross, same }
 *   countSkus(node, products, crossFilter)            { total, filtered } (crossFilter จาก crossFilterOf)
 *   validateName(name, siblings)                      { ok, error: 'empty' | 'duplicate', name } (ไม่สนตัวพิมพ์และช่องว่างหัวท้าย)
 *   moveNode(tax, kind, nodeId, newParentId, products) ย้ายรายการ (พร้อมรายการย่อย) ไปอยู่ใต้รายการอื่น SKU ย้ายตาม
 *   moveSkus(products, fromId, toId, skuIds, tax)      ย้าย SKU ที่เลือกไปรายการระดับเดียวกัน → { ok, error, products, moved, unassigned }
 *   mergeNodes(tax, products, fromId, toId)            ย้าย SKU ทั้งหมดไปปลายทาง แล้วปิดใช้งานรายการต้นทาง (และรายการย่อย)
 *   canDelete(node, products, tax)                     true เฉพาะรายการที่ไม่มี SKU และไม่มีรายการย่อย
 *   findWarnings(tax, products, today)                 [{ kind, id, type: 'dupParent' | 'noSku' | 'expired' }]
 *   crossTab(products, rowDim, colDim, tax)            ตารางไขว้ Series × Category → { rows, cols, total }
 *   + addNode, renameNode, reorderNode, setActive, search, pathOf, children, descendants, seriesEnded, crossFilterOf, matches(p, crossFilter)
 * Test: tests/taxonomy.test.js (node tests/run.js taxonomy)
 */
(function (SP) {
  'use strict';

  var LEVELS = { category: ['CATEGORY', 'SUB_CATEGORY', 'TYPE'], series: ['SERIES', 'SUB_SERIES'] };
  var FIELDS = { CATEGORY: 'categoryId', SUB_CATEGORY: 'subCategoryId', TYPE: 'typeId', SERIES: 'seriesId', SUB_SERIES: 'subSeriesId' };

  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function norm(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' ').toLowerCase(); }
  function keyOf(p) { return p.trCode || p.tempCode || ''; }
  function kindOfLevel(level) { return LEVELS.category.indexOf(level) >= 0 ? 'category' : 'series'; }
  function fieldOf(node) { return node ? FIELDS[node.level] : null; }
  function list(tax, kind) { return (tax && tax[kind]) || []; }
  function find(tax, kind, id) {
    var l = list(tax, kind);
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  // หารายการจาก id ทั้งสองมิติ → { kind, node } | null
  function findAny(tax, id) {
    var n = find(tax, 'category', id);
    if (n) return { kind: 'category', node: n };
    n = find(tax, 'series', id);
    return n ? { kind: 'series', node: n } : null;
  }

  // รายการย่อยของ parentId (null = ระดับบนสุด) เรียงตาม order
  function children(tax, kind, parentId, activeOnly) {
    return list(tax, kind).filter(function (n) {
      return (n.parentId || null) === (parentId || null) && (!activeOnly || n.active !== false);
    }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function descendants(tax, kind, id) {
    var out = [];
    (function walk(pid) { children(tax, kind, pid).forEach(function (c) { out.push(c); walk(c.id); }); })(id);
    return out;
  }
  // เส้นทางจากบนสุดถึงรายการนี้ → [node]
  function pathOf(tax, kind, id) {
    var out = [];
    var n = find(tax, kind, id);
    var guard = 0;
    while (n && guard++ < 10) { out.unshift(n); n = n.parentId ? find(tax, kind, n.parentId) : null; }
    return out;
  }

  function buildTree(tax, kind) {
    return (function walk(parentId, depth, names) {
      return children(tax, kind, parentId).map(function (n) {
        var path = names.concat([n.name]);
        return { node: n, depth: depth, path: path, children: walk(n.id, depth + 1, path) };
      });
    })(null, 0, []);
  }

  // SKU ที่อ้างรายการนี้ (ตามฟิลด์ของระดับ)
  function productsOf(node, products) {
    var f = fieldOf(node);
    return f ? (products || []).filter(function (p) { return p[f] === node.id; }) : [];
  }

  // ตัวกรองข้ามมิติ: รายการที่เลือกของอีกมิติ → { <field>: [id] } ใช้เฉพาะรายการที่ไม่มีรายการย่อยถูกเลือกด้วย (เลือก Series + Sub Series = Sub Series)
  function effectiveSelection(tax, kind, ids) {
    var sel = (ids || []).filter(function (id) { return !!find(tax, kind, id); });
    return sel.filter(function (id) {
      var desc = descendants(tax, kind, id).map(function (d) { return d.id; });
      return !desc.some(function (d) { return sel.indexOf(d) >= 0; });
    });
  }
  function crossFilterOf(tax, kind, ids) {
    var eff = effectiveSelection(tax, kind, ids);
    if (!eff.length) return null;
    var out = {};
    eff.forEach(function (id) { var f = fieldOf(find(tax, kind, id)); (out[f] = out[f] || []).push(id); });
    return out;
  }
  function crossMatch(p, crossFilter) {
    if (!crossFilter) return true;
    return Object.keys(crossFilter).some(function (f) { return crossFilter[f].indexOf(p[f]) >= 0; });
  }

  function countSkus(node, products, crossFilter) {
    var own = productsOf(node, products);
    return { total: own.length, filtered: crossFilter ? own.filter(function (p) { return crossMatch(p, crossFilter); }).length : own.length };
  }

  // ชื่อ: ห้ามว่าง ห้ามซ้ำกับรายการอื่นภายใต้รายการแม่เดียวกัน (siblings = [ชื่อ] หรือ [node] ไม่รวมตัวเอง)
  function validateName(name, siblings) {
    var clean = String(name == null ? '' : name).trim().replace(/\s+/g, ' ');
    if (!clean) return { ok: false, error: 'empty', name: clean };
    var dup = (siblings || []).some(function (s) { return norm(typeof s === 'string' ? s : s.name) === norm(clean); });
    return dup ? { ok: false, error: 'duplicate', name: clean } : { ok: true, error: null, name: clean };
  }
  function siblingsOf(tax, kind, parentId, exceptId) {
    return children(tax, kind, parentId).filter(function (n) { return n.id !== exceptId; });
  }

  // เพิ่มรายการใต้ parentId (null = ระดับบนสุด) → { ok, error: 'depth' | 'empty' | 'duplicate', taxonomy, node }
  function addNode(tax, kind, parentId, name, id) {
    var levels = LEVELS[kind];
    var parent = parentId ? find(tax, kind, parentId) : null;
    var level = parent ? levels[levels.indexOf(parent.level) + 1] : levels[0];
    if (!level) return { ok: false, error: 'depth' };
    var v = validateName(name, siblingsOf(tax, kind, parentId));
    if (!v.ok) return { ok: false, error: v.error };
    var sib = children(tax, kind, parentId);
    var node = { id: id, name: v.name, parentId: parentId || null, level: level, active: true, order: sib.length ? (sib[sib.length - 1].order || 0) + 1 : 1 };
    if (kind === 'series' && level === 'SERIES') { node.startDate = null; node.endDate = null; }
    var out = copy(tax);
    out[kind].push(node);
    return { ok: true, error: null, taxonomy: out, node: node };
  }

  function renameNode(tax, kind, id, name) {
    var n = find(tax, kind, id);
    if (!n) return { ok: false, error: 'notFound' };
    var v = validateName(name, siblingsOf(tax, kind, n.parentId, id));
    if (!v.ok) return { ok: false, error: v.error };
    var out = copy(tax);
    find(out, kind, id).name = v.name;
    return { ok: true, error: null, taxonomy: out };
  }

  // จัดลำดับใหม่ภายในรายการแม่เดียวกันเท่านั้น: วาง id ไว้ก่อน (after = false) หรือหลัง targetId → { ok, error: 'parent' | 'notFound', taxonomy }
  function reorderNode(tax, kind, id, targetId, after) {
    var a = find(tax, kind, id), b = find(tax, kind, targetId);
    if (!a || !b) return { ok: false, error: 'notFound' };
    if ((a.parentId || null) !== (b.parentId || null)) return { ok: false, error: 'parent' };
    var ids = children(tax, kind, a.parentId).map(function (n) { return n.id; }).filter(function (x) { return x !== id; });
    var at = ids.indexOf(targetId) + (after ? 1 : 0);
    ids.splice(at, 0, id);
    var out = copy(tax);
    ids.forEach(function (x, i) { find(out, kind, x).order = i + 1; });
    return { ok: true, error: null, taxonomy: out };
  }

  // เปิด/ปิดใช้งาน (withChildren = รายการย่อยทั้งหมดด้วย)
  function setActive(tax, kind, id, active, withChildren) {
    var out = copy(tax);
    var n = find(out, kind, id);
    if (!n) return out;
    n.active = !!active;
    if (withChildren) descendants(out, kind, id).forEach(function (d) { find(out, kind, d.id).active = !!active; });
    return out;
  }

  // ฟิลด์ของสินค้าตามเส้นทางของรายการ (Face › Base → categoryId, subCategoryId) + ระดับที่ต่ำกว่า:
  //   ปลายทางมีรายการย่อยที่ใช้งานอยู่รายการเดียว → ใช้รายการนั้น / ไม่มีหรือมีหลายรายการ → null (ต้องกำหนดใหม่ในรายการสินค้า)
  function applyPath(p, tax, kind, node) {
    pathOf(tax, kind, node.id).forEach(function (a) { p[FIELDS[a.level]] = a.id; });
    var levels = LEVELS[kind];
    var cur = node, unassigned = false;
    for (var i = levels.indexOf(node.level) + 1; i < levels.length; i++) {
      var kids = cur ? children(tax, kind, cur.id, true) : [];
      cur = kids.length === 1 ? kids[0] : null;
      if (!cur && p[FIELDS[levels[i]]]) unassigned = true;
      p[FIELDS[levels[i]]] = cur ? cur.id : null;
    }
    if (kind === 'category') p.inferred = false;
    return unassigned;
  }

  // ย้าย SKU (productKey ใน skuIds) จาก fromId ไป toId ระดับเดียวกัน ปลายทางต้องใช้งานอยู่
  // → { ok, error: 'notFound' | 'level' | 'inactive' | 'same', products, moved, unassigned (จำนวนที่ระดับย่อยว่าง) }
  function moveSkus(products, fromId, toId, skuIds, tax) {
    var from = findAny(tax, fromId), to = findAny(tax, toId);
    if (!from || !to) return { ok: false, error: 'notFound', products: products, moved: 0, unassigned: 0 };
    if (from.kind !== to.kind || from.node.level !== to.node.level) return { ok: false, error: 'level', products: products, moved: 0, unassigned: 0 };
    if (fromId === toId) return { ok: false, error: 'same', products: products, moved: 0, unassigned: 0 };
    if (to.node.active === false) return { ok: false, error: 'inactive', products: products, moved: 0, unassigned: 0 };
    var f = fieldOf(from.node);
    var keys = skuIds || null;
    var moved = 0, unassigned = 0;
    var out = (products || []).map(function (p) {
      if (p[f] !== fromId || (keys && keys.indexOf(keyOf(p)) < 0)) return p;
      var q = copy(p);
      if (applyPath(q, tax, to.kind, to.node)) unassigned++;
      moved++;
      return q;
    });
    return { ok: true, error: null, products: out, moved: moved, unassigned: unassigned };
  }

  // รวม: ย้าย SKU ทั้งหมดของ fromId ไป toId แล้วปิดใช้งาน fromId และรายการย่อย → { ok, error, taxonomy, products, moved, unassigned }
  function mergeNodes(tax, products, fromId, toId) {
    var res = moveSkus(products, fromId, toId, null, tax);
    if (!res.ok) return { ok: false, error: res.error, taxonomy: tax, products: products, moved: 0, unassigned: 0 };
    var from = findAny(tax, fromId);
    return { ok: true, error: null, taxonomy: setActive(tax, from.kind, fromId, false, true), products: res.products, moved: res.moved, unassigned: res.unassigned };
  }

  // ย้ายรายการ (พร้อมรายการย่อยทั้งหมด) ไปอยู่ใต้รายการแม่ใหม่ระดับเดียวกับแม่เดิม ชื่อห้ามซ้ำกับรายการใต้ปลายทาง
  // SKU ที่อ้างรายการนี้ (และรายการย่อย) ได้ฟิลด์ระดับบนตามปลายทาง → { ok, error: 'notFound' | 'level' | 'same' | 'duplicate', taxonomy, products, moved }
  function moveNode(tax, kind, nodeId, newParentId, products) {
    var node = find(tax, kind, nodeId), parent = find(tax, kind, newParentId);
    if (!node || !parent) return { ok: false, error: 'notFound', taxonomy: tax, products: products, moved: 0 };
    var levels = LEVELS[kind];
    if (levels.indexOf(parent.level) !== levels.indexOf(node.level) - 1) return { ok: false, error: 'level', taxonomy: tax, products: products, moved: 0 };
    if ((node.parentId || null) === newParentId) return { ok: false, error: 'same', taxonomy: tax, products: products, moved: 0 };
    if (!validateName(node.name, siblingsOf(tax, kind, newParentId, nodeId)).ok) return { ok: false, error: 'duplicate', taxonomy: tax, products: products, moved: 0 };
    var out = copy(tax);
    var n = find(out, kind, nodeId);
    var sib = children(out, kind, newParentId);
    n.parentId = newParentId;
    n.order = sib.length ? (sib[sib.length - 1].order || 0) + 1 : 1;
    var f = fieldOf(node);
    var upper = pathOf(out, kind, newParentId);
    var moved = 0;
    var outProducts = (products || []).map(function (p) {
      if (p[f] !== nodeId) return p;
      var q = copy(p);
      upper.forEach(function (a) { q[FIELDS[a.level]] = a.id; });
      if (kind === 'category') q.inferred = false;
      moved++;
      return q;
    });
    return { ok: true, error: null, taxonomy: out, products: outProducts, moved: moved };
  }

  function canDelete(node, products, tax) {
    if (!node) return false;
    if (productsOf(node, products).length) return false;
    if (tax && children(tax, kindOfLevel(node.level), node.id).length) return false;
    return true;
  }

  function seriesEnded(node, today) { return !!(node && node.endDate && today && node.endDate < today); }

  // คำเตือน: ชื่อซ้ำกับรายการแม่ (Primer → Primer) · ไม่มี SKU · Series สิ้นสุดแล้ว
  function findWarnings(tax, products, today) {
    var out = [];
    ['category', 'series'].forEach(function (kind) {
      list(tax, kind).forEach(function (n) {
        var parent = n.parentId ? find(tax, kind, n.parentId) : null;
        if (parent && norm(parent.name) === norm(n.name)) out.push({ kind: kind, id: n.id, type: 'dupParent', parent: parent.name, name: n.name });
        if (!productsOf(n, products).length) out.push({ kind: kind, id: n.id, type: 'noSku', name: n.name });
        if (kind === 'series' && seriesEnded(n, today)) out.push({ kind: kind, id: n.id, type: 'expired', name: n.name });
      });
    });
    return out;
  }

  // รายการที่แสดงในแท็บ kind ตามตัวกรอง
  // filters = { category, subCategory, type, series, subSeries: [id], status: 'active' | 'inactive' | 'all', data: 'all' | 'noSku' | 'dupParent' | 'expired', showZero }
  //   มิติเดียวกับแท็บ = แสดงเฉพาะรายการที่เลือก ลูกหลาน และรายการแม่ในเส้นทาง / อีกมิติ = นับเฉพาะ SKU ที่ตรง (x / y) ซ่อนรายการที่ได้ 0 (ยกเว้น showZero)
  //   รายการที่ไม่ตรงแต่มีรายการย่อยที่ตรง แสดงเป็นเส้นทาง (show = true, match = false)
  // → { show: { id: bool }, match: { id: bool }, count: { id: { total, filtered } }, cross: { field: [id] } | null, same: bool }
  function filterTree(tax, kind, filters, products, today) {
    filters = filters || {};
    var sameIds = kind === 'category' ? [].concat(filters.category || [], filters.subCategory || [], filters.type || []) : [].concat(filters.series || [], filters.subSeries || []);
    var otherIds = kind === 'category' ? [].concat(filters.series || [], filters.subSeries || []) : [].concat(filters.category || [], filters.subCategory || [], filters.type || []);
    var other = kind === 'category' ? 'series' : 'category';
    var cross = crossFilterOf(tax, other, otherIds);
    var eff = effectiveSelection(tax, kind, sameIds);
    var allowed = null;
    if (eff.length) {
      allowed = {};
      eff.forEach(function (id) {
        allowed[id] = true;
        descendants(tax, kind, id).forEach(function (d) { allowed[d.id] = true; });
      });
    }
    var status = filters.status || 'active';
    var data = filters.data || 'all';
    var count = {}, match = {}, show = {};
    list(tax, kind).forEach(function (n) {
      var c = countSkus(n, products, cross);
      count[n.id] = c;
      var parent = n.parentId ? find(tax, kind, n.parentId) : null;
      var ok = (status === 'all' || (status === 'active' ? n.active !== false : n.active === false))
        && (!allowed || allowed[n.id])
        && (data === 'all' || (data === 'noSku' ? c.total === 0 : data === 'dupParent' ? !!parent && norm(parent.name) === norm(n.name) : data === 'expired' ? seriesEnded(n, today) : true))
        && (!cross || filters.showZero || c.filtered > 0);
      match[n.id] = ok;
    });
    list(tax, kind).forEach(function (n) {
      if (!match[n.id]) return;
      pathOf(tax, kind, n.id).forEach(function (a) { show[a.id] = true; });
    });
    return { show: show, match: match, count: count, cross: cross, same: !!eff.length };
  }

  // ค้นหาชื่อทุกระดับทั้งสองมิติ → [{ kind, node, path: [ชื่อ] }]
  function search(tax, q) {
    var s = norm(q);
    if (!s) return [];
    var out = [];
    ['category', 'series'].forEach(function (kind) {
      list(tax, kind).forEach(function (n) {
        if (norm(n.name).indexOf(s) >= 0) out.push({ kind: kind, node: n, path: pathOf(tax, kind, n.id).map(function (a) { return a.name; }) });
      });
    });
    return out;
  }

  // ตารางไขว้: rowDim / colDim = 'series' | 'subSeries' | 'category' | 'subCategory' | 'type' → นับ SKU ที่มีค่าทั้งสองมิติ
  //   tax (ไม่บังคับ) = ใช้ลำดับและชื่อของรายการ / ไม่ส่ง = ใช้ค่าที่พบในสินค้า
  // → { rows: [{ id, name, parentId, cells: { colId: n }, total }], cols: [{ id, name, parentId, total }], total }
  var DIM_FIELD = { series: 'seriesId', subSeries: 'subSeriesId', category: 'categoryId', subCategory: 'subCategoryId', type: 'typeId' };
  var DIM_LEVEL = { series: 'SERIES', subSeries: 'SUB_SERIES', category: 'CATEGORY', subCategory: 'SUB_CATEGORY', type: 'TYPE' };
  function dimItems(products, dim, tax) {
    var f = DIM_FIELD[dim];
    if (tax) {
      var kind = kindOfLevel(DIM_LEVEL[dim]);
      return buildFlat(tax, kind).filter(function (n) { return n.level === DIM_LEVEL[dim]; }).map(function (n) { return { id: n.id, name: n.name, parentId: n.parentId || null }; });
    }
    var seen = {}, out = [];
    (products || []).forEach(function (p) { if (p[f] && !seen[p[f]]) { seen[p[f]] = true; out.push({ id: p[f], name: p[f], parentId: null }); } });
    return out;
  }
  function buildFlat(tax, kind) {
    var out = [];
    (function walk(pid) { children(tax, kind, pid).forEach(function (n) { out.push(n); walk(n.id); }); })(null);
    return out;
  }
  function crossTab(products, rowDim, colDim, tax) {
    var rf = DIM_FIELD[rowDim], cf = DIM_FIELD[colDim];
    var rows = dimItems(products, rowDim, tax), cols = dimItems(products, colDim, tax);
    var rIdx = {}, cIdx = {};
    rows.forEach(function (r) { r.cells = {}; r.total = 0; rIdx[r.id] = r; });
    cols.forEach(function (c) { c.total = 0; cIdx[c.id] = c; });
    var total = 0;
    (products || []).forEach(function (p) {
      var r = rIdx[p[rf]], c = cIdx[p[cf]];
      if (!r || !c) return;
      r.cells[c.id] = (r.cells[c.id] || 0) + 1;
      r.total++;
      c.total++;
      total++;
    });
    return { rows: rows, cols: cols, total: total };
  }

  SP.core.taxonomy = {
    LEVELS: LEVELS,
    FIELDS: FIELDS,
    norm: norm,
    find: find,
    findAny: findAny,
    children: children,
    descendants: descendants,
    pathOf: pathOf,
    buildTree: buildTree,
    productsOf: productsOf,
    crossFilterOf: crossFilterOf,
    matches: crossMatch,
    countSkus: countSkus,
    filterTree: filterTree,
    validateName: validateName,
    addNode: addNode,
    renameNode: renameNode,
    reorderNode: reorderNode,
    setActive: setActive,
    moveNode: moveNode,
    moveSkus: moveSkus,
    mergeNodes: mergeNodes,
    canDelete: canDelete,
    seriesEnded: seriesEnded,
    findWarnings: findWarnings,
    search: search,
    crossTab: crossTab
  };
})(window.SP);
