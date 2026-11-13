#!/usr/bin/env node
/**
 * lab06 · mini 可观测平台后端 —— 教学骨架（零第三方依赖，只用 node: 内置模块）
 *
 * 把 Tempo/Mimir/Loki 各自的"最小内核"压进一个文件：OTLP 接收 → 存储 → 查询 API → 页面。
 * 用法：node server/server.mjs [--host 127.0.0.1] [--port 4318] [--sqlite [文件路径]]
 * 端点：
 *   POST /v1/traces | /v1/metrics | /v1/logs   OTLP/JSON 接收（支持 gzip；字段名按 protobuf JSON 规范）
 *   GET  /api/services                          服务清单（span 数 / 错误数 / 最近活动）
 *   GET  /api/traces?service=X&limit=N          trace 概览列表（按开始时间倒序）
 *   GET  /api/traces/:traceId                   单条 trace 的 span 明细（深度 + 属性 + 事件）
 *   GET  /api/metrics                           指标（按 名称+属性 分组的序列与最新值）
 *   GET  /api/logs?service=X&trace=T&limit=N    日志（trace 过滤 = 三支柱关联入口）
 *   GET  /                                      单文件页面（service 下拉 + trace 列表 + span 瀑布图）
 * 存储：内存 Map 为唯一查询数据源；--sqlite 时双写 SQLite、启动回放（重启不丢数据）。
 * 对照阅读：docs/notes/06-system-design/sdk-design-server.md 第 9 节（本骨架的"SDK 侧"对应物）
 */
import http from 'node:http';
import { gunzipSync } from 'node:zlib';

// ---------- 0. 命令行参数 ----------
function parseArgs(argv) {
  const out = { host: '127.0.0.1', port: 4318, sqlite: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--host') out.host = argv[++i];
    else if (argv[i] === '--port') out.port = Number(argv[++i]);
    else if (argv[i] === '--sqlite') {
      // --sqlite 不带值时用默认文件名；--help/--port 等被显式排除
      out.sqlite = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'mini-platform.db';
    } else if (argv[i] === '-h' || argv[i] === '--help') {
      console.log('用法: node server.mjs [--host 127.0.0.1] [--port 4318] [--sqlite [文件路径]]');
      process.exit(0);
    }
  }
  return out;
}

// ---------- 1. 内存存储：查询的唯一数据源 ----------
// 设计取舍（对照 storage-backends.md）：真实系统按访问模式分三副引擎（TSDB/日志索引/trace ID 点查），
// 这里教学从简：spans 按主键点查、traces 按 traceId 聚合、metrics 按名字分组、logs 全量数组扫描。
const store = {
  spans: new Map(),   // spanId -> 扁平化 span 记录
  traces: new Map(),  // traceId -> 聚合概览 { spanIds, services, errorCount, start, end, rootName }
  metrics: new Map(), // 指标名 -> { name, type, unit, points[] }
  logs: [],           // 日志记录数组（量小，直接扫）
};

// ---------- 2. 可选持久化：node:sqlite（Node >= 22.5；22.x 需 --experimental-sqlite） ----------
// 策略：写路径双写（内存 + SQLite），读路径只走内存；启动时回放。等价于"带 WAL 的简易版"。
let db = null;
async function initSqlite(file) {
  try {
    const { DatabaseSync } = await import('node:sqlite');
    db = new DatabaseSync(file);
    db.exec(`CREATE TABLE IF NOT EXISTS spans(span_id TEXT PRIMARY KEY, trace_id TEXT, ts INTEGER, data TEXT);
             CREATE TABLE IF NOT EXISTS metric_points(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, ts INTEGER, data TEXT);
             CREATE TABLE IF NOT EXISTS log_records(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, data TEXT);`);
    for (const r of db.prepare('SELECT data FROM spans').all()) upsertSpan(JSON.parse(r.data));
    for (const r of db.prepare('SELECT data FROM metric_points').all()) upsertMetricPoint(JSON.parse(r.data));
    for (const r of db.prepare('SELECT data FROM log_records ORDER BY ts').all()) store.logs.push(JSON.parse(r.data));
    console.log(`[sqlite] 已回放历史数据: ${store.spans.size} spans / ${store.logs.length} logs`);
    return true;
  } catch (err) {
    db = null;
    console.error(`[sqlite] 不可用（${err.code ?? err.message}），回退纯内存模式`);
    return false;
  }
}
const persist = {
  span: (s) => db && db.prepare('INSERT OR REPLACE INTO spans VALUES (?,?,?,?)').run(s.spanId, s.traceId, s.start, JSON.stringify(s)),
  metric: (p) => db && db.prepare('INSERT INTO metric_points(name, ts, data) VALUES (?,?,?)').run(p.name, p.ts, JSON.stringify(p)),
  log: (l) => db && db.prepare('INSERT INTO log_records(ts, data) VALUES (?,?)').run(l.ts, JSON.stringify(l)),
};

// ---------- 3. OTLP/JSON 解析（字段名 = protobuf JSON 映射的 camelCase） ----------
// AnyValue: { stringValue | intValue(字符串!) | doubleValue | boolValue | arrayValue | kvlistValue }
function anyValue(v = {}) {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.intValue !== undefined) return Number(v.intValue); // int64 在 OTLP/JSON 里是字符串
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.arrayValue?.values) return v.arrayValue.values.map(anyValue);
  if (v.kvlistValue?.values) return Object.fromEntries(v.kvlistValue.values.map((kv) => [kv.key, anyValue(kv.value)]));
  return null;
}
const attrsToMap = (list = []) => Object.fromEntries((list ?? []).map((kv) => [kv.key, anyValue(kv.value)]));
const isError = (st) => st.code === 2 || st.code === 'STATUS_CODE_ERROR';

function upsertSpan(s) {
  store.spans.set(s.spanId, s);
  let t = store.traces.get(s.traceId);
  if (!t) store.traces.set(s.traceId, (t = { traceId: s.traceId, spanIds: [], services: new Set(), errorCount: 0, start: s.start, end: s.end, rootName: '' }));
  if (!t.spanIds.includes(s.spanId)) t.spanIds.push(s.spanId); // 同一 span 重复上报时去重
  t.services.add(s.service);
  t.start = Math.min(t.start, s.start);
  t.end = Math.max(t.end, s.end);
  if (!s.parentSpanId) t.rootName = s.name; // root 可能晚于子 span 到达
  if (isError(s.status)) t.errorCount++;
}

function ingestTraces(body) {
  let n = 0;
  for (const rs of body.resourceSpans ?? []) {          // ResourceSpans[]：资源级属性（service.name 等）
    const resource = attrsToMap(rs.resource?.attributes);
    for (const ss of rs.scopeSpans ?? []) {             // ScopeSpans[]：埋点库身份（scope.name/version）
      for (const sp of ss.spans ?? []) {
        const rec = {
          traceId: (sp.traceId ?? '').toLowerCase(), spanId: sp.spanId ?? '', parentSpanId: sp.parentSpanId ?? '',
          name: sp.name, kind: sp.kind ?? 0, service: resource['service.name'] ?? 'unknown',
          resource, scope: ss.scope?.name ?? '',
          start: Number(sp.startTimeUnixNano ?? 0), end: Number(sp.endTimeUnixNano ?? 0),
          attrs: attrsToMap(sp.attributes),
          status: { code: sp.status?.code ?? 0, message: sp.status?.message ?? '' },
          events: (sp.events ?? []).map((e) => ({ name: e.name, ts: Number(e.timeUnixNano ?? 0), attrs: attrsToMap(e.attributes) })),
        };
        upsertSpan(rec); persist.span(rec); n++;
      }
    }
  }
  return n;
}

function upsertMetricPoint(p) {
  let m = store.metrics.get(p.name);
  if (!m) store.metrics.set(p.name, (m = { name: p.name, type: p.type, unit: p.unit, points: [] }));
  m.points.push(p);
}

function ingestMetrics(body) {
  let n = 0;
  for (const rm of body.resourceMetrics ?? []) {
    for (const sm of rm.scopeMetrics ?? []) {
      for (const m of sm.metrics ?? []) {
        const type = ['sum', 'gauge', 'histogram'].find((k) => m[k]); // 教学骨架只认这三种
        if (!type) continue;
        for (const dp of m[type].dataPoints ?? []) {
          const p = {
            name: m.name, type, unit: m.unit ?? '', attrs: attrsToMap(dp.attributes), ts: Number(dp.timeUnixNano ?? 0),
            value: type === 'histogram' ? undefined : dp.asInt !== undefined ? Number(dp.asInt) : dp.asDouble,
            hist: type === 'histogram'
              ? { count: Number(dp.count ?? 0), sum: dp.sum, bucketCounts: dp.bucketCounts?.map(Number), bounds: dp.explicitBounds }
              : undefined,
          };
          upsertMetricPoint(p); persist.metric(p); n++;
        }
      }
    }
  }
  return n;
}

function upsertLog(l) { store.logs.push(l); }

function ingestLogs(body) {
  let n = 0;
  for (const rl of body.resourceLogs ?? []) {
    const resource = attrsToMap(rl.resource?.attributes);
    for (const sl of rl.scopeLogs ?? []) {
      for (const lr of sl.logRecords ?? []) {
        const body2 = anyValue(lr.body ?? {});
        const rec = {
          ts: Number(lr.timeUnixNano ?? lr.observedTimeUnixNano ?? 0),
          service: resource['service.name'] ?? 'unknown',
          severity: lr.severityText ?? String(lr.severityNumber ?? ''),
          body: typeof body2 === 'string' ? body2 : JSON.stringify(body2),
          attrs: attrsToMap(lr.attributes),
          traceId: (lr.traceId ?? '').toLowerCase(), spanId: lr.spanId ?? '', // 日志带 trace 上下文 = 关联的关键
        };
        upsertLog(rec); persist.log(rec); n++;
      }
    }
  }
  return n;
}

// ---------- 4. 查询 API（对照 query-and-alerting.md：真实系统这里是 TraceQL/PromQL/LogQL） ----------
const round1 = (v) => Math.round(v * 10) / 10;
const clampInt = (v, min, max, dflt) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };
const KIND = { 0: 'unspecified', 1: 'internal', 2: 'server', 3: 'client', 4: 'producer', 5: 'consumer' };
const kindName = (k) => KIND[k] ?? String(k).replace(/^SPAN_KIND_/, '').toLowerCase();

function queryServices() {
  const by = new Map();
  for (const s of store.spans.values()) {
    let e = by.get(s.service);
    if (!e) by.set(s.service, (e = { name: s.service, spanCount: 0, errorCount: 0, lastSeen: 0 }));
    e.spanCount++;
    if (isError(s.status)) e.errorCount++;
    e.lastSeen = Math.max(e.lastSeen, s.end);
  }
  return [...by.values()].sort((a, b) => b.lastSeen - a.lastSeen)
    .map((e) => ({ ...e, lastSeenIso: new Date(e.lastSeen / 1e6).toISOString() })); // 纳秒 -> 毫秒
}

function queryTraces(q) {
  const limit = clampInt(q.get('limit'), 1, 200, 20);
  const service = q.get('service');
  let list = [...store.traces.values()];
  if (service) list = list.filter((t) => t.services.has(service));
  return list.sort((a, b) => b.start - a.start).slice(0, limit).map((t) => ({
    traceId: t.traceId, rootName: t.rootName || '(root 未到)', services: [...t.services],
    spanCount: t.spanIds.length, errorCount: t.errorCount,
    startIso: new Date(t.start / 1e6).toISOString(), durationMs: round1((t.end - t.start) / 1e6),
  }));
}

function queryTrace(id) {
  const t = store.traces.get(id.toLowerCase()); // Tempo 的核心访问模式：traceId 点查（无需扫描）
  if (!t) return null;
  const spans = t.spanIds.map((sid) => store.spans.get(sid)).filter(Boolean).sort((a, b) => a.start - b.start);
  // 深度 = 沿 parentSpanId 回溯的层数（真实系统在查询端或写入端算好，这里演示查询端推导）
  const depthOf = (s) => { let d = 0, p = s.parentSpanId, seen = new Set(); while (p && store.spans.has(p) && !seen.has(p)) { seen.add(p); p = store.spans.get(p).parentSpanId; d++; } return d; };
  return {
    traceId: t.traceId, startMs: t.start / 1e6, durationMs: round1((t.end - t.start) / 1e6), services: [...t.services],
    spans: spans.map((s) => ({
      spanId: s.spanId, parentSpanId: s.parentSpanId, depth: depthOf(s), name: s.name, kind: kindName(s.kind),
      service: s.service, startMs: s.start / 1e6, durationMs: round1((s.end - s.start) / 1e6),
      error: isError(s.status), status: s.status.message || undefined,
      attrs: { ...s.resource, ...s.attrs }, events: s.events, // 资源属性合并展示
    })),
  };
}

function queryMetrics() {
  return [...store.metrics.values()].map((m) => {
    const series = new Map(); // 按 属性集 分组 = 一条时间序列（Mimir/Prometheus 的 series 概念）
    for (const p of m.points) {
      const key = JSON.stringify(p.attrs);
      let e = series.get(key);
      if (!e) series.set(key, (e = { attrs: p.attrs, points: 0, lastTs: 0, value: null }));
      e.points++; e.lastTs = Math.max(e.lastTs, p.ts); e.value = m.type === 'histogram' ? p.hist : p.value;
    }
    return { name: m.name, type: m.type, unit: m.unit, series: [...series.values()] };
  });
}

function queryLogs(q) {
  const limit = clampInt(q.get('limit'), 1, 500, 50);
  const service = q.get('service'), trace = q.get('trace')?.toLowerCase();
  let list = store.logs;
  if (service) list = list.filter((l) => l.service === service);
  if (trace) list = list.filter((l) => l.traceId === trace); // trace -> logs：Grafana tracesToLogs 的最小版
  return [...list].sort((a, b) => b.ts - a.ts).slice(0, limit).map((l) => ({ ...l, tsIso: new Date(l.ts / 1e6).toISOString() }));
}

// ---------- 5. 单文件页面（内联 HTML+CSS+JS，fetch /api/* 渲染，无外部 CDN） ----------
const page = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"/><title>mini 可观测平台</title>
<style>
 body{font:13px/1.5 -apple-system,"PingFang SC",sans-serif;margin:0;padding:16px;background:#0f1116;color:#e6e6e6}
 h1{font-size:18px;margin:0 0 4px}.sub{color:#8b93a7;margin-bottom:12px}
 section{margin-bottom:22px}h2{font-size:14px;color:#9fb3c8;border-bottom:1px solid #262b36;padding-bottom:4px}
 select,button{background:#1a1f29;color:#e6e6e6;border:1px solid #333b4a;border-radius:4px;padding:4px 8px}
 table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:4px 8px;border-bottom:1px solid #222733}
 tr:hover{background:#171c26}.err{color:#ff6b6b}.ok{color:#69db7c}
 .wf-row{display:flex;align-items:center;margin:2px 0}
 .wf-name{width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .wf-wrap{flex:1;background:#1a1f29;border-radius:3px;height:14px;position:relative}
 .wf-bar{position:absolute;top:2px;height:10px;border-radius:2px;min-width:2px}
 details{margin-left:8px}pre{white-space:pre-wrap;color:#9fb3c8;max-width:520px}
</style></head><body>
<h1>mini 可观测平台</h1>
<div class="sub">OTLP/JSON 接收 → 内存存储 → 查询 API → 本页（单文件，无外部依赖）</div>
<section><h2>服务 / Traces</h2>
 <select id="service" onchange="loadTraces();loadLogs()"></select> <button onclick="refresh()">刷新</button>
 <table id="traces"><thead><tr><th>traceId</th><th>根 span</th><th>服务</th><th>span 数</th><th>错误</th><th>开始</th><th>耗时</th></tr></thead><tbody></tbody></table>
</section>
<section><h2>Trace 瀑布图</h2><div id="trace" class="sub">点击上方任意一行查看 span 时间条…</div></section>
<section><h2>指标</h2><div id="metrics" class="sub">（空）</div></section>
<section><h2>日志</h2><div id="logs" class="sub">（空）</div></section>
<script>
function fmtMs(v){return (Math.round(v*10)/10)+'ms'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function colorOf(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return 'hsl('+h+' 60% 45%)'}
function refresh(){fetch('/api/services').then(function(r){return r.json()}).then(function(svc){
  document.getElementById('service').innerHTML='<option value="">全部服务</option>'+svc.map(function(s){return '<option>'+esc(s.name)+'</option>'}).join('');
  loadTraces();loadLogs();});loadMetrics();}
function loadTraces(){var svc=document.getElementById('service').value;
  fetch('/api/traces?limit=30'+(svc?'&service='+encodeURIComponent(svc):'')).then(function(r){return r.json()}).then(function(list){
    document.querySelector('#traces tbody').innerHTML=list.map(function(t){
      return '<tr style="cursor:pointer" onclick="loadTrace(\\''+t.traceId+'\\')"><td><code>'+t.traceId.slice(0,16)+'…</code></td><td>'+esc(t.rootName)+'</td><td>'+t.services.map(esc).join(', ')+'</td><td>'+t.spanCount+'</td><td class="'+(t.errorCount?'err':'ok')+'">'+t.errorCount+'</td><td>'+new Date(t.startIso).toLocaleTimeString()+'</td><td>'+fmtMs(t.durationMs)+'</td></tr>';
    }).join('');});}
function loadTrace(id){fetch('/api/traces/'+id).then(function(r){return r.json()}).then(function(t){
  var rows=t.spans.map(function(s){
    var left=(s.startMs-t.startMs)/t.durationMs*100, width=Math.max(0.5,s.durationMs/t.durationMs*100);
    var extra=(s.events&&s.events.length?'\\nevents: '+JSON.stringify(s.events):'')+(s.status?'\\nstatus: '+s.status:'');
    return '<div class="wf-row"><div class="wf-name" style="padding-left:'+(s.depth*14)+'px">'+esc(s.name)+(s.error?' <span class="err">x</span>':'')+'</div>'
      +'<div class="wf-wrap"><div class="wf-bar" style="left:'+left+'%;width:'+width+'%;background:'+colorOf(s.service)+'"></div></div>'
      +'<div style="width:80px;text-align:right">'+fmtMs(s.durationMs)+'</div>'
      +'<details><summary>attrs</summary><pre>'+esc(JSON.stringify(s.attrs,null,1)+extra)+'</pre></details></div>';}).join('');
  document.getElementById('trace').innerHTML='<div class="sub">trace '+id+' · '+t.spans.length+' spans · '+fmtMs(t.durationMs)+'</div>'+rows;});}
function loadMetrics(){fetch('/api/metrics').then(function(r){return r.json()}).then(function(ms){
  document.getElementById('metrics').innerHTML=ms.length?('<table><thead><tr><th>指标</th><th>类型</th><th>序列（属性组 → 最新值）</th></tr></thead><tbody>'+ms.map(function(m){
    return '<tr><td><code>'+esc(m.name)+'</code></td><td>'+m.type+'</td><td>'+m.series.map(function(s){return esc(JSON.stringify(s.attrs))+' → <b>'+esc(JSON.stringify(s.value))+'</b> ('+s.points+' pts)'}).join('<br/>')+'</td></tr>';
  }).join('')+'</tbody></table>'):'（暂无指标）';});}
function loadLogs(){var svc=document.getElementById('service').value;
  fetch('/api/logs?limit=50'+(svc?'&service='+encodeURIComponent(svc):'')).then(function(r){return r.json()}).then(function(ls){
    document.getElementById('logs').innerHTML=ls.length?('<table><thead><tr><th>时间</th><th>级别</th><th>服务</th><th>内容</th><th>trace 关联</th></tr></thead><tbody>'+ls.map(function(l){
      return '<tr><td>'+new Date(l.tsIso).toLocaleTimeString()+'</td><td>'+esc(l.severity)+'</td><td>'+esc(l.service)+'</td><td>'+esc(l.body)
        +(Object.keys(l.attrs).length?' <details style="display:inline"><summary>attrs</summary><pre>'+esc(JSON.stringify(l.attrs))+'</pre></details>':'')
        +'</td><td>'+(l.traceId?'<a href="javascript:loadTrace(\\''+l.traceId+'\\')"><code>'+l.traceId.slice(0,12)+'…</code></a>':'—')+'</td></tr>';
    }).join('')+'</tbody></table>'):'（暂无日志）';});}
refresh();
</script></body></html>`;

// ---------- 6. HTTP 服务与路由 ----------
const send = (res, code, data) => res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }).end(JSON.stringify(data));

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let buf = Buffer.concat(chunks);
  if ((req.headers['content-encoding'] ?? '').includes('gzip')) buf = gunzipSync(buf); // OTLP 导出器常用 gzip
  return JSON.parse(buf.toString('utf8') || '{}');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const t0 = Date.now();
  try {
    // 3.1 OTLP 接收：真实 collector 在这层做的是限流/认证/协议解码（对照 ingestion-pipeline.md）
    if (req.method === 'POST' && /^\/v1\/(traces|metrics|logs)$/.test(url.pathname)) {
      const ct = req.headers['content-type'] ?? '';
      if (ct.includes('protobuf')) return send(res, 415, { error: '本骨架只实现 OTLP/JSON（content-type: application/json）' });
      const body = await readBody(req);
      const n = url.pathname.endsWith('traces') ? ingestTraces(body) : url.pathname.endsWith('metrics') ? ingestMetrics(body) : ingestLogs(body);
      console.log(`[ingest] ${url.pathname} ← ${n} 条记录（${Date.now() - t0}ms）`);
      return send(res, 200, {}); // OTLP HTTP 成功响应：空 ExportTraceServiceResponse
    }
    // 3.2 页面与查询 API
    if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(page); }
    if (url.pathname === '/api/services') return send(res, 200, queryServices());
    if (url.pathname === '/api/traces') return send(res, 200, queryTraces(url.searchParams));
    const m = url.pathname.match(/^\/api\/traces\/([0-9a-fA-F]+)$/);
    if (m) { const d = queryTrace(m[1]); return d ? send(res, 200, d) : send(res, 404, { error: 'trace not found' }); }
    if (url.pathname === '/api/metrics') return send(res, 200, queryMetrics());
    if (url.pathname === '/api/logs') return send(res, 200, queryLogs(url.searchParams));
    return send(res, 404, { error: 'not found' });
  } catch (err) { // 解析失败/未知异常：返回 400 并打日志，不让进程挂掉（接收端也要"永不伤害自己"）
    console.error(`[error] ${req.method} ${url.pathname}: ${err.message}`);
    send(res, 400, { error: err.message });
  }
});

// ---------- 7. 启动 ----------
const cfg = parseArgs(process.argv.slice(2));
if (cfg.sqlite) await initSqlite(cfg.sqlite); // top-level await（ESM）
server.listen(cfg.port, cfg.host, () => {
  console.log(`mini 可观测平台已启动: http://${cfg.host}:${cfg.port}/`);
  console.log(`  接收: POST /v1/traces | /v1/metrics | /v1/logs（OTLP/JSON）`);
  console.log(`  查询: GET /api/services | /api/traces | /api/traces/:id | /api/metrics | /api/logs`);
  console.log(`  存储: ${db ? `内存 + SQLite(${cfg.sqlite})` : '纯内存（重启即清空；加 --sqlite 开启持久化）'}`);
});
