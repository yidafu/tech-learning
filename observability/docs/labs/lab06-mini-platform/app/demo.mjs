#!/usr/bin/env node
/**
 * lab06 demo · 手写埋点（零 SDK、零依赖）—— llm-observability.md §3.3 样例的 Node 版
 *
 * 模拟一个 RAG 网关（不真调模型 API），产出三类信号并手工拼 OTLP/JSON 发给 mini 平台：
 *   traces：两条 trace——
 *     #1 成功：POST /api/ask → rag.retrieve → embeddings → chat gpt-4o-mini（完整 gen_ai.* 属性集）
 *     #2 失败：POST /api/ask → chat gpt-4o-mini 命中限流（STATUS_CODE_ERROR + error.type + exception 事件）
 *   metrics：token 计数器（§4.1 约定名）+ 请求 counter + 时长直方图
 *   logs：与 trace 关联的日志（INFO 完成 / ERROR 失败 / DEBUG 调用详情事件，内容外置不落原文）
 *
 * 用法：node app/demo.mjs [--url http://127.0.0.1:4318]
 * 注意：这里故意"没有 SDK"——parent 关系要自己传、纳秒时间戳要自己算，
 *      这正是 sdk-design-server.md 第 2/3 节解释的 SDK 替你做的事。
 */
const url = (() => {
  const i = process.argv.indexOf('--url');
  return i > 0 ? process.argv[i + 1] : 'http://127.0.0.1:4318';
})();

// ---------- 极简"SDK"：span 只是一个普通对象，处理器/批量/重试统统没有（对照骨架笔记的取舍） ----------
const randHex = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const nowNs = () => Number(BigInt(Date.now()) * 1_000_000n + (process.hrtime.bigint() % 1_000_000n)); // 墙钟毫秒 + 纳秒小数
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// OTLP/JSON 属性构造：int64 必须写成字符串（protobuf JSON 映射）；数组用 arrayValue
const sAttr = (key, v) => {
  const t = typeof v;
  const value = t === 'number' ? (Number.isInteger(v) ? { intValue: String(v) } : { doubleValue: v })
    : t === 'boolean' ? { boolValue: v }
    : Array.isArray(v) ? { arrayValue: { values: v.map((x) => ({ stringValue: x })) } }
    : { stringValue: v };
  return { key, value };
};

const RESOURCE = { attributes: [
  { key: 'service.name', value: { stringValue: 'rag-gateway-demo' } },
  { key: 'service.version', value: { stringValue: '1.0.0' } },
] };
const SCOPE = { name: 'rag.gateway', version: '1.0.0' }; // Instrumentation Scope：埋点库自己的身份

const spans = [], logs = [];

function startSpan(name, { traceId, parent, kind = 'SPAN_KIND_INTERNAL', attributes = [] } = {}) {
  return {
    traceId, spanId: randHex(8), parentSpanId: parent?.spanId ?? '', name, kind,
    startTimeUnixNano: String(nowNs()), attributes: [...attributes],
    events: [], status: { code: 'STATUS_CODE_UNSET' },
  };
}

// 结束 span；失败路径按 §3.3：置 status=ERROR、写核心属性 error.type（注意：无 gen_ai. 前缀）
function endSpan(span, { errorType, message } = {}) {
  span.endTimeUnixNano = String(nowNs());
  if (errorType) {
    span.status = { code: 'STATUS_CODE_ERROR', message: message ?? errorType };
    span.attributes.push(sAttr('error.type', errorType));
    span.events.push({ name: 'exception', timeUnixNano: span.endTimeUnixNano, attributes: [
      sAttr('exception.type', errorType), sAttr('exception.message', message ?? ''),
    ] });
  }
  spans.push(span);
}

// 日志记录：带 traceId/spanId = 三支柱关联的最小实现（correlation.md 的老配方）
const log = (traceId, spanId, severity, body, attributes) => logs.push({
  timeUnixNano: String(nowNs()),
  severityNumber: severity === 'DEBUG' ? 5 : severity === 'ERROR' ? 17 : 9, severityText: severity,
  body: { stringValue: body }, attributes, traceId, spanId, traceFlags: 1,
});

// ---------- 业务：一次 /api/ask 的完整调用链 ----------
async function handleAsk(traceId, { fail = false } = {}) {
  const root = startSpan('POST /api/ask', { traceId, kind: 'SPAN_KIND_SERVER', attributes: [
    sAttr('http.request.method', 'POST'), sAttr('url.route', '/api/ask'),
  ] });

  const retrieve = startSpan('rag.retrieve', { traceId, parent: root, attributes: [
    sAttr('gen_ai.operation.name', 'retrieval'), sAttr('retrieval.hit_count', 3), sAttr('retrieval.top_k', 5),
  ] });
  await sleep(20 + Math.random() * 30);
  endSpan(retrieve);

  const embed = startSpan('embeddings text-embedding-3-small', { traceId, parent: root, kind: 'SPAN_KIND_CLIENT', attributes: [
    sAttr('gen_ai.operation.name', 'embeddings'), sAttr('gen_ai.provider.name', 'openai'),
    sAttr('gen_ai.request.model', 'text-embedding-3-small'), sAttr('gen_ai.usage.input_tokens', 523),
  ] });
  await sleep(30 + Math.random() * 40);
  endSpan(embed);

  // 推理 span：命名按约定 {gen_ai.operation.name} {gen_ai.request.model}
  const chat = startSpan('chat gpt-4o-mini', { traceId, parent: root, kind: 'SPAN_KIND_CLIENT', attributes: [
    sAttr('gen_ai.operation.name', 'chat'), sAttr('gen_ai.provider.name', 'openai'),
    sAttr('gen_ai.request.model', 'gpt-4o-mini'), sAttr('gen_ai.request.temperature', 0.7),
    sAttr('gen_ai.request.max_tokens', 1024), sAttr('gen_ai.prompt.name', 'support-bot'),
    sAttr('gen_ai.prompt.version', '17'),
  ] });
  const started = Date.now();

  if (fail) {
    await sleep(40); // 请求发出后才被供应商限流
    endSpan(chat, { errorType: 'RateLimitError', message: '429 Too Many Requests: quota exceeded' });
    endSpan(root, { errorType: 'RateLimitError', message: 'upstream llm call failed' });
    log(traceId, root.spanId, 'ERROR', 'llm call failed after retry budget', [sAttr('gen_ai.request.model', 'gpt-4o-mini')]);
    return { ok: false, ms: Date.now() - started };
  }

  await sleep(60 + Math.random() * 120); // 模拟 TTFT + 逐 token 输出
  chat.attributes.push(
    sAttr('gen_ai.response.model', 'gpt-4o-mini-2024-07-18'), // 实际服务快照：静默升级检测靠它（§5.3）
    sAttr('gen_ai.response.id', 'chatcmpl-demo-' + randHex(4)),
    sAttr('gen_ai.response.finish_reasons', ['stop']),
    sAttr('gen_ai.usage.input_tokens', 523), // token 数来自响应的 usage 字段（§3.3 要点）
    sAttr('gen_ai.usage.output_tokens', 180),
  );
  endSpan(chat);
  endSpan(root);
  // DEBUG 调用详情走日志通道（§2.2/§6.2：内容默认不采，这里演示外置引用 _ref 而非落原文）
  log(traceId, chat.spanId, 'DEBUG', 'gen_ai.client.inference.operation.details', [
    sAttr('gen_ai.prompt.name', 'support-bot'), sAttr('gen_ai.prompt.version', '17'),
    sAttr('gen_ai.input.messages_ref', 's3://telemetry/conv/' + traceId),
  ]);
  log(traceId, root.spanId, 'INFO', 'request completed', [sAttr('http.response.status_code', 200)]);
  return { ok: true, ms: Date.now() - started };
}

// ---------- 跑两条 trace：成功 + 限流失败 ----------
const okTrace = randHex(16);
const errTrace = randHex(16);
const r1 = await handleAsk(okTrace);
const r2 = await handleAsk(errTrace, { fail: true });

// ---------- metrics：token 计数器 + 请求 counter + 时长直方图（真实时长进桶） ----------
const chatAttrs = [
  sAttr('gen_ai.operation.name', 'chat'), sAttr('gen_ai.provider.name', 'openai'), sAttr('gen_ai.request.model', 'gpt-4o-mini'),
];
const now = () => String(nowNs());
const dp = (attrs, value) => ({ asInt: String(value), attributes: attrs, timeUnixNano: now() });
const secs = [r1.ms, r2.ms].map((ms) => ms / 1000);
const buckets = secs.map((s) => (s <= 0.1 ? [1, 0, 0] : s <= 0.25 ? [0, 1, 0] : [0, 0, 1]))
  .reduce((a, b) => a.map((x, i) => x + b[i]));
const metrics = { resourceMetrics: [{ resource: RESOURCE, scopeMetrics: [{ scope: SCOPE, metrics: [
  { name: 'gen_ai.client.inference.usage.input_tokens', unit: '{token}',
    sum: { aggregationTemporality: 1, isMonotonic: true, dataPoints: [dp(chatAttrs, 523)] } },
  { name: 'gen_ai.client.inference.usage.output_tokens', unit: '{token}',
    sum: { aggregationTemporality: 1, isMonotonic: true, dataPoints: [dp(chatAttrs, 180)] } },
  { name: 'llm.chat.requests',
    sum: { aggregationTemporality: 1, isMonotonic: true, dataPoints: [
      dp(chatAttrs, 1), dp([...chatAttrs, sAttr('error.type', 'RateLimitError')], 1)] } },
  { name: 'llm.chat.duration', unit: 's', histogram: { aggregationTemporality: 1, dataPoints: [{
    count: '2', sum: Math.round((secs[0] + secs[1]) * 1000) / 1000,
    bucketCounts: buckets.map(String), explicitBounds: [0.1, 0.25], attributes: chatAttrs, timeUnixNano: now() }] } },
] }] }] };

// ---------- 发送：OTLP/JSON over HTTP（真实 SDK 的导出器做的事被压缩成了三次 fetch） ----------
async function post(path, body) {
  const res = await fetch(url + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  console.log(`POST ${path} → ${res.status}`);
  if (res.status !== 200) throw new Error(`${path}: HTTP ${res.status} ${await res.text()}`);
}
await post('/v1/traces', { resourceSpans: [{ resource: RESOURCE, scopeSpans: [{ scope: SCOPE, spans }] }] });
await post('/v1/metrics', metrics);
await post('/v1/logs', { resourceLogs: [{ resource: RESOURCE, scopeLogs: [{ scope: SCOPE, logRecords: logs }] }] });

console.log(`\n完成，共 ${spans.length} spans / ${metrics.resourceMetrics[0].scopeMetrics[0].metrics.length} metrics / ${logs.length} logs`);
console.log(`成功 trace: ${okTrace}`);
console.log(`错误 trace: ${errTrace}（chat span 带 error.type=RateLimitError）`);
console.log(`查询: ${url}/api/traces/${okTrace}`);
console.log(`页面: ${url}/`);
