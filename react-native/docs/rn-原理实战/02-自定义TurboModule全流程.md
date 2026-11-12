# 自定义 TurboModule 全流程

> 模块七 03/04 讲了 TurboModules 与 Codegen 的原理，本篇**亲手走一遍**：从 TS spec 到双平台实现再到 JS 调用。样例选一个真实有用的模块——原生侧埋点上报 `NativeAnalytics`：`logEvent(name, params)` 打日志并 Promise 回执，`getConstants` 暴露启动配置。

## 1. 目标接口（先定契约）

```ts
// specs/NativeAnalytics.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  logEvent(name: string, params: Object): Promise<void>; // 异步：落盘有 IO
  getPlatform(): string;                                  // 同步：纯取值（模块三 04）
  readonly constants: { flushIntervalMs: number } | object;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Analytics');
```

声明 codegen 输入（`package.json`）：

```json
{ "codegenConfig": { "name": "AppSpecs", "type": "modules", "jsSrcsDir": "./specs" } }
```

同步/异步的取舍在本篇不是风格问题：`logEvent` 走 Promise 因为要等原生落盘；`getPlatform` 同步因为它只是读一个值——**"需要等谁"的边界（模块三 04）在 spec 上直接落形**。

## 2. Android 实现（Kotlin）

`pod install` / gradle sync 后，Codegen 在 `build/generated/` 生成 `NativeAnalyticsSpec` 抽象类，实现它：

```kotlin
// android/app/src/main/java/com/rnlearn/AnalyticsModule.kt
import com.facebook.react.bridge.Promise
import com.rnspecs.NativeAnalyticsSpec

class AnalyticsModule : NativeAnalyticsSpec() {   // ← Codegen 生成的基类
  override fun getName() = "Analytics"

  override fun logEvent(name: String, params: Any?, promise: Promise) {
    Thread {                       // 重 IO 别占调用线程
      writeToFile(name, params)    // 伪代码：落盘/上报
      promise.resolve(null)
    }.start()
  }

  override fun getPlatform(): String = "android"
  override fun getConstants(): Map<String, Any> = mapOf("flushIntervalMs" to 5000)
}
```

注册（新架构入口）：

```kotlin
// AnalyticsPackage / TurboModuleManagerDelegate 的解析处
override fun getModule(name: String): Module? =
  if (name == "Analytics") AnalyticsModule() else null
```

注意三点：基类签名由 Codegen 决定（参数类型错了**编译不过**——模块四 02 的运行时炸消失）；`getName` 必须与 JS 端 `getEnforcing('Analytics')` 一致；模块首次被访问才实例化（模块七 03 的懒加载）。

## 3. iOS 实现（ObjC++）

Codegen 生成 `NativeAnalyticsSpec.h` 协议，`.mm` 实现：

```objc
// ios/AnalyticsModule.mm
#import <AppSpecs/NativeAnalyticsSpec.h>

@interface AnalyticsModule : NSObject <NativeAnalyticsSpec>
@end

@implementation AnalyticsModule {
  dispatch_queue_t _ioQueue;   // 自带串行队列，重 IO 隔离（模块七 03）
}
RCT_EXPORT_MODULE(Analytics)   // 名字对齐 JS 端

- (instancetype)init {
  if (self = [super init]) { _ioQueue = dispatch_queue_create("analytics.io", NULL); }
  return self;
}

- (void)logEvent:(NSString *)name params:(NSDictionary *)params
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(_ioQueue, ^{
    [self writeToFile:name params:params];
    resolve(nil);
  });
}

- (NSString *)getPlatform { return @"ios"; }
- (NSDictionary *)getConstantsToExport { return @{ @"flushIntervalMs": @5000 }; }
@end
```

在 `RCTTurboModuleManagerDelegate` 里按名字返回实例（与 Android 对称）。

## 4. JS 侧调用

```ts
import NativeAnalytics from '../specs/NativeAnalytics';

NativeAnalytics.getPlatform();                       // 同步返回，无 Promise
NativeAnalytics.logEvent('page_view', { id: 1 })     // Promise
  .then(() => console.log('flushed'));
```

全链路复盘（对照模块七 03 时序图）：首次 import → `__turboModuleProxy('Analytics')` → 原生实例化 → JSI HostObject 注入 → 此后每次调用是 C++ 直调，`logEvent` 的 Promise 由原生 executor 回调兑现——**全程无 JSON、无队列**。

## 5. 类型系统的边界（写 spec 前先读）

| 支持 | 不支持（常见误用） |
|------|-------------------|
| string / number / boolean | 联合类型 `a \| b` |
| 只读对象 `{ readonly k: string }` / 数组 | 泛型、可选属性（部分场景）、索引签名扩散 |
| Promise\<T\> / 回调 `(x: T) => void` | 对象里放函数属性（用回调参数表达） |
| `readonly constants` | class / enum（用常量对象） |

误用不产生警告，是 **codegen 阶段直接失败**（模块七 04）——报错定位到字段，改成可表达的形式即可。另一个纪律：**Promise 只 resolve 一次**，原生侧重复 resolve 在 release 下是未定义行为。

## 6. 验证与排错路线

1. 构建后先查 `build/generated/`（Android）/ Pods 的 generated 头文件（iOS）——spec 没被生成 = codegenConfig 没接上；
2. 运行时 `getEnforcing` 抛"module not found"：查 `getName`/名字是否一致、delegate 是否返回实例；
3. 调用无反应：确认方法没被编到旧 `NativeModules` 代理上（`import NativeModules` 走的是 Interop 形态，能力受限）；
4. 双端行为差异：先怀疑常量/线程（Android 默认在哪个 executor、iOS 自己的 queue），再怀疑业务代码。

## 小结

- 全流程五步：spec（TS）→ codegenConfig 声明 → 双平台实现生成基类/协议 → delegate 注册 → JS 直调；
- 同步/异步的形态在 spec 上就应该想清楚（等不等 IO），不是实现时的随手选择；
- 类型边界 = IDL 子集，codegen 失败是最常见的第一坑，报错即改；
- 走完本篇，模块七 03/04 的每一张图都有了对应的真实文件——原理与工程在此合流。
