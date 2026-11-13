# mini-react-native 落地实现（M0–M5）

> 01 篇给了总设计与 M0–M5 里程碑，本篇把里程碑落到**可运行的最小代码**。宿主选择上做了一个务实替换：用 **Node.js + N-API 当作 JSI 的替身**（两者同为"引擎嵌入边界"，`napi_value ↔ jsi::Value` 语义同构），M0–M4 全部可跑，M5 给出接真平台的替换点。每个里程碑独立可验收。
>
> 本篇是走读视角（节选代码 + 决策理由）；**全量工程、验收输出与动手实验见 06–08 篇，事件上行闭环与收官自测见 09 篇**。

## 0. 为什么 N-API 可以"扮演"JSI

| JSI（真 RN） | N-API（本实现） | 共同语义 |
|--------------|-----------------|---------|
| `jsi::Runtime` | `napi_env` | 引擎上下文 |
| `jsi::Value` | `napi_value` | 跨边界值句柄 |
| `jsi::HostObject` | `napi_property_attributes` 导出的对象/函数 | 原生对象注入 JS |
| `jsi::Function::call` | `napi_call_function` | 同步直调 |

对照模块四 04 的五要素：我们同样在定义**通道（函数直调）、契约（类型签名）、线程（同进程同步）**——这正是"宿主进程暴露嵌入边界"的通用形态。

## M0：宿主进程 + 全局注入

`binding.gyp` + 一个 C++ 文件，把 `MiniNative.log` 注入 global：

```cpp
// mini_native.cc（N-API）
#include <napi.h>
Napi::Value Log(const Napi::CallbackInfo& info) {
  printf("[MiniNative] %s\n", info[0].ToString().Utf8Value().c_str());
  return info.Env().Undefined();
}
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("log", Napi::Function::New(env, Log));
  return exports;
}
NODE_API_MODULE(MiniNative, Init)
```

```js
// 验收：node -e "require('./build/Release/mini_native').log('hi')"
// 期望输出：[MiniNative] hi
```

对应真 RN：`ReactCommon` 里把 `TurboModuleBinding` 装进 global（模块七 03 的 `__turboModuleProxy`）。**M0 验证的是通道本身存在**。

## M1：视图原语（C++ 侧视图树）

```cpp
struct MiniView {
  int tag; std::string type; std::string props;  // JSON 字符串
  std::vector<int> children; double x=0,y=0,w=0,h=0;
};
static std::unordered_map<int, MiniView> g_tree; static int g_next = 1;

Napi::Value CreateView(const Napi::CallbackInfo& i) {
  g_tree[++g_next-1] = {g_next-1, i[0].ToString(), i[1].ToString(), {}, 0,0,0,0};
  return Napi::Number::New(i.Env(), g_next-1);   // 返回 tag
}
// AppendChild(parentTag, childTag) / SetProps(tag, json) / RemoveChild(...) 同型，略
```

**偷懒点要自觉**：props 传 JSON 字符串是"序列化通道"（模块四 01 的旧架构做法）；真 JSI 应传 `jsi::Object` 引用遍历（模块七 01）。这个退化是刻意的——留作对比作业。

## M2：渲染器（react-reconciler hostConfig）

JS 侧 ~50 行接通 React（对照模块五 01）：

```js
const Reconciler = require('react-reconciler');
const MiniNative = require('./build/Release/mini_native.node');

const hostConfig = {
  createInstance(type, props) {
    const tag = MiniNative.createView(type, JSON.stringify(props));
    return { tag, type, props };
  },
  appendInitialChild(p, c) { MiniNative.appendChild(p.tag, c.tag); },
  finalizeInitialChildren() { return false; },
  createTextInstance() { throw new Error('text via <text> node'); },
  appendChildToContainer(c, child) { MiniNative.appendChild(c.tag, child.tag); },
  prepareUpdate() { return true; },
  commitUpdate(inst, _payload, type, oldP, newP) {
    MiniNative.setProps(inst.tag, JSON.stringify(diffProps(oldP, newP)));
    MiniNative.requestLayout();           // 思考题①见第 5 节
  },
  removeChild(p, c) { MiniNative.removeChild(p.tag, c.tag); },
  getRootHostContext() { return null; }, getChildHostContext() { return null; },
  shouldSetTextContent() { return false; },
  clearContainer() {}, insertBefore() {}, prepareForCommit() {},
  resetAfterCommit() {}, supportsMutation: true, now: Date.now,
};
const render = (el) => {          // container = tag 0 的根视图
  MiniNative.createView('root', '{}');  // 约定 tag 0 为根
  Reconciler(hostConfig).createContainer(/*root*/{tag:0}, 1, null, false, null, '', ()=>{}, ()=>{});
  // updateContainer(el)…（boilerplate 略）
};
```

验收：`render(<view><text>hello</text></view>)` 后 `MiniNative.dumpTree()` 打印出两节点树。

## M3：状态与更新

M2 通了 M3 就是白送的——React 自己的机制：

```js
const App = () => {
  const [n, setN] = useState(0);
  useEffect(() => { const t = setInterval(() => setN(x => x + 1), 1000);
                     return () => clearInterval(t); }, []);
  return <view style={{padding:8}}><text>count: {n}</text></view>;
};
```

每秒一次 `commitUpdate → setProps → requestLayout`（真 RN 的对应物见模块五 03 的指令流）。**思考题②答案在此**：`instance` 只存 `{tag, type, props}` 纯数据——宿主对象不出 JSI 边界，编号是唯一身份（模块四 01"只有编号没有对象"）。

## M4：极简布局器（C++）

一维 flex 的最小实现——**布局在宿主侧**（对照模块五 02：Yoga 在 C++）：

```cpp
void Layout(MiniView& v) {                    // 先递归子级，再排主轴
  for (auto c : v.children) Layout(g_tree[c]);
  double px = pad(v,"padding"), off = px;
  for (auto c : v.children) {
    auto& ch = g_tree[c];
    double m = pad(ch.props, "margin");
    ch.x = v.x + off + m; ch.y = v.y + px + m;
    off += ch.w + 2*m;                        // row：沿 x 排；column 同理沿 y
  }
  v.w = max(fixed(v.props,"width"), off + px); v.h = /*同理*/;
}
// requestLayout() => Layout(g_tree[0]); DumpTree();   打印每节点 x/y/w/h
```

验收：嵌套 `view(row)` 里三个定宽子 `view`，dump 出的 x 等差、外层 w = 内宽 + padding。**思考题③答案**：布局放宿主侧，JS 只发结构变化——一帧内多次 setProps 只触发一次 Layout（把 requestLayout 做成"脏标记 + 帧末 flush"即模块五 03 的两班倒雏形）。

## M5：文本与上屏（真平台替换点）

- **文本度量**：字符数 × 单宽近似；接真平台时换成 CoreText（`CTLineGetTypographicBounds`）/ Android `Paint.measureText`——这是布局器里唯一"骗不了人"的平台依赖；
- **上屏**：把 `DumpTree` 换成遍历树创建真控件（macOS `NSView/NSTextField` 或 iOS `UIView/UILabel`，`Layout` 结果直接当 frame）；
- **双平台开关**：C++ 核心不动，平台层各一个 ~80 行的胶水文件——这正是真 RN"共享 C++、平台薄壳"的缩影（模块七）。

## 6. 复盘：三百行换来的对应关系

| 里程碑 | 我写的 | RN 里的对应物（差距） |
|--------|--------|----------------------|
| M0 | N-API 注入 | TurboModuleBinding（Codegen 契约） |
| M1 | MiniView + JSON props | ShadowNode + Props 结构体（引用非序列化） |
| M2 | hostConfig | ReactFabric hostConfig（props 差量算法） |
| M3 | tag 身份 | viewId 指令流（批处理） |
| M4 | 一维 flex + 脏标记 | Yoga（完整规范/缓存/文本测量） |
| M5 | 平台胶水 | Fabric mount（优先级调度、同步布局） |

## 小结

- M0–M5 每步都有独立验收；N-API 与 JSI 同为"引擎嵌入边界"，替换不掉的只有"序列化 vs 引用"这一课（它就是新旧架构的分界）；
- 三个思考题的答案都落在已有模块：commitUpdate 攒批（模块五 03）、tag 身份（模块四 01）、布局归宿主（模块五 02）；
- 做完的标志不是"能跑"，而是再看 ReactFabric/Yoga 源码时，每个设计决策都能说出"我遇到过这个问题"。
