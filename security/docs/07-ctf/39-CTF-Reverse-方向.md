# 39 - CTF Reverse 方向：静态分析、算法还原与反调试对抗

> 日期：2026-11-04
> 所属大纲阶段：7. CTF 实战（Reverse 方向）
> 参考资料：
> - CTF Wiki Reverse 章节（ctf-wiki.org）
> - Ghidra 官方文档（ghidra-sre.org）与 NSA GitHub 仓库
> - x64dbg 官方文档（x64dbg.com）
> - Frida 官方文档（frida.re）
> - uncompyle6 / decompyle3 / pycdc 各自仓库 README
> - 看雪论坛（kanxue.com）CTF/加解密版块

> **合规声明**：本文全部技术仅限 **CTF 靶场环境**中分析题目附件，禁止用于绕过任何真实软件授权。

---

## 目录

1. [Reverse 题形态](#1-reverse-题形态)
2. [逆向通用方法论](#2-逆向通用方法论)
3. [逆向工具矩阵](#3-逆向工具矩阵)
4. [Ghidra 工作流与实战技巧](#4-ghidra-工作流与实战技巧)
5. [常见考点体系](#5-常见考点体系)
6. [反调试检测与绕过](#6-反调试检测与绕过)
7. [混淆与加壳](#7-混淆与加壳)
8. [脚本语言逆向](#8-脚本语言逆向)
9. [移动端（APK）](#9-移动端apk)
10. [算法还原后的两种解法：keygen 与 patch](#10-算法还原后的两种解法keygen-与-patch)
11. [完整例题 Walkthrough](#11-完整例题-walkthrough)
12. [做题习惯与刷题路线](#12-做题习惯与刷题路线)
13. [复盘模板](#13-复盘模板)
14. [自测问题](#14-自测问题)

---

## 1. Reverse 题形态

**逆向工程（Reverse Engineering, 逆向 / re）**：给定程序不给源码，目标是**理解程序逻辑**，找到「正确输入」（flag 或注册码）或还原内嵌算法。

附件形态一览：

| 附件 | 说明 |
| ---- | ---- |
| ELF（Linux 可执行）/ so（共享库） | 主流，64/32 位 |
| exe（Windows PE） | 常配反调试/壳 |
| apk（Android） | Java/Kotlin + 可能有 native so |
| js / html | 浏览器题、混淆 JS |
| pyc（Python 字节码） | 反编译为主 |
| wasm（WebAssembly） | 浏览器/新式混淆载体 |
| class/jar（Java）、dll、EFI、固件 bin | 各有专用工具链 |

判断依据永远是 `file xxx` 的输出。逆向题通常**本地运行即校验**（输入正确打印 flag，或直接把 flag 加密藏在比对里），少数题给远程 nc 服务（把逆出的算法写成爆破脚本打远程）。

---

## 2. 逆向通用方法论

```
第一眼观察
  file（架构/平台/strip 与否）
  strings（明文：提示、flag 片段、错误信息、库符号）
  壳检测（Windows: ExeinfoPe / DIE；Linux: 看 entry 与 section 异常）
  架构与端序（arm? mips? 大端?）
        ↓
静态分析
  ghidra/IDA 定位 main 与关键函数
  （找：字符串交叉引用、"correct/wrong" 比对点、命令行参数/输入处理）
  读懂核心算法
        ↓
动态验证
  跑程序喂样例输入，下断点验证静态理解
  有反调试先绕（第 6 节）
        ↓
两条出路
  写 keygen：把算法翻译成 Python 正向算出正确输入
  patch：改关键跳转直接打印 flag / 绕过校验
```

核心心法：**逆向不是从头读到尾**，而是「从结果反推」——先找「成功/失败」的分叉点，再往上看什么条件决定分叉。

---

## 3. 逆向工具矩阵

| 目标（平台 × 语言） | 首选工具 | 备注 |
| ---- | ---- | ---- |
| C/C++ ELF（Linux） | **Ghidra / IDA** | 静态反编译；动态用 gdb（pwndbg） |
| C/C++ PE（Windows） | **x64dbg**（动态）+ IDA/Ghidra（静态） | 壳与反调试主战场 |
| C#（.NET） | **dnSpy** | 直接反编译成 C#，可下断点/改 IL |
| Java（class/jar） | jd-gui / **jadx** | jadx 同时是 apk 主力 |
| Python（pyc） | uncompyle6 / decompyle3 / **pycdc** | 见第 8 节版本对应表 |
| Flash（swf） | **JPEXS FFDec** | 反编译 AS3 脚本 |
| JS | 浏览器 devtools | Sources/断点/AST 工具 |
| WASM | **wabt**（wasm2wat）/ wasmdecompile | 转文本再读 |
| Android（apk） | **jadx**（Java 层）+ frida（hook）+ ghidra（so） | 第 9 节 |
| 动态插桩（全平台） | **Frida** | 反调试绕过利器 |

---

## 4. Ghidra 工作流与实战技巧

Ghidra 基础操作见阶段 4 笔记（24 篇），这里补 CTF 实战技巧：

- **定位 main**：Symbol Tree → Functions；strip 过的程序找 `entry` → `__libc_start_main` 的第一个参数；
- **反编译窗口（Decompile）**：`Tab` 在汇编/伪 C 间切换；伪 C 是主战场；
- **批量重命名**：右键函数 → Rename（快捷键 `L`）；把 `FUN_00401360` 改成 `check_flag`，可读性瞬间提升；
- **结构体恢复**：Data Type Manager → new Structure，对伪 C 中反复出现的偏移访问定义结构体字段；
- **交叉引用（XREF）**：对关键字符串（"Wrong!"）右键 Show References to Address，直达判定点；
- **Ghidra Script**（Java/Python）批量处理（如全函数重命名、模式搜索）——概念级了解，遇到重复劳动再学；
- 保存工程（.gzf）到题目目录，方便赛后再看。

---

## 5. 常见考点体系

### 5.1 字符串比对

- **明文比对**：`strcmp(input, "flag{...}")` —— strings 就能出，新手第一题；
- **加密后比对**：对输入做 hash/编码再与常量比对。**识别 hash 特征**：比对串长度 32 hex → md5；40 → sha1；64 → sha256；处理过程有初始化魔数（md5 的 `0x67452301`，sha1 的 `0x67452301,0xEFCDAB89...`）→ 对号入座去解密/查库/爆破；
- **逐字符比对 + 早退出**：`for` 循环里 `if (input[i] != enc[i]) return 0;`——可逐位爆破（远程题）或直接还原。

### 5.2 逐字符异或（XOR）—— 识别模式

40 行内典型 XOR 逆向代码（伪 C，Ghidra 常见输出形态）：

```c
int check(char *input) {
    int i;
    char enc[48] = {0x1a,0x1f,0x0c,0x0c,0x1b,0x5a, /* ... */};
    for (i = 0; i < 0x24; i++) {                  // 长度 0x24=36
        if ((input[i] ^ key[i % keylen]) != enc[i])
            return 0;                             // 逐位异或后比对
    }
    return 1;
}
```

**识别模式三特征**：① 对输入逐下标循环；② 循环体只有「异或/加减」+ 比较两件小事；③ 没有任何库函数调用（无 md5 特征）。→ 直接猜 XOR，key 可见时一步还原：`flag[i] = enc[i] ^ key[i % keylen]`。key 不可见（key 藏在运行时）时动态调试取 key，或已知明文头 `flag{` 反推 key 前几位再验证周期。

### 5.3 base64 变种识别（换表）

- 识别：程序里有 64 字节的**自定义码表**常量（不等于标准表 `ABC...+/`）；
- 位置：Ghidra 里搜标准表前 8 字节没有、但存在 64 长度可打印串 → 就是表；
- 解法：Python `base64.b64decode(x, altchars=...)` 只支持换 2 字符，换全表用 `str.maketrans` 把密文映回标准表再解码。

### 5.4 常见算法魔数特征表

| 算法 | 魔数/结构特征 |
| ---- | ---- |
| **TEA/XTEA/XXTEA** | delta 常量 `0x9E3779B9`（黄金分割数）；循环里 32 轮移位异或 |
| **RC4** | **KSA（Key Scheduling Algorithm）结构**：256 次 `j = (j + S[i] + key[i % keylen]) % 256; swap(S[i], S[j])`；随后 PRGA 逐字节异或 |
| **AES** | **S 盒（S-box）识别**：表首 `0x63, 0x7c, 0x77, 0x7b...`（sbox[0]=0x63）；逆 S 盒首 `0x52`；Rcon 表 |
| **DES** | IP 置换表、8 个 S 盒、密钥循环左移表 |
| **MD5** | 初始 `0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476`，64 轮 F/G/H/I |
| **SHA1** | 初始 5 个 32 位常量，`0x5A827999` 等轮常量 |
| **CRC32** | 表首 `0x00000000, 0x77073096...` |

做题时直接在 Ghidra 里 `Search → For Long` 搜这些魔数。

### 5.5 控制流混淆（花指令）

**花指令（junk code / anti-disassembly）**：插入手工字节让反汇编器走偏，典型：

```asm
jmp short lab+1     ; 跳进下一条指令中间
db 0xE9             ; 多余字节被当成 jmp 的一部分 → 反汇编错位
lab: xor eax, eax   ; 真实指令
```

识别：Ghidra 里函数中部突然变成大片未分析/无意义指令、或 `jmp $+x` 跳到指令中间。去花思路（一句话）：动态跑（gdb 里看到的是真实执行流）或手工 patch 掉 junk 字节（nop 掉跳转与脏字节）再重新分析。

---

## 6. 反调试检测与绕过

### 6.1 常见检测点

**（1）ptrace 检测**（Linux 最常见）：程序自己 `ptrace(PTRACE_TRACEME, 0, 0, 0)`，已被调试时返回 -1：

```c
if (ptrace(PTRACE_TRACEME, 0, 0, 0) == -1) {
    puts("Debugger detected!");
    exit(1);          // 一个进程只能被 attach 一次：调试器在场则 TRACEME 失败
}
```

**（2）时间差检测**：

```c
t1 = rdtsc();             // x86 读时间戳计数器
do_something();
t2 = rdtsc();
if (t2 - t1 > 0xffffff) exit(1);   // 被单步/断点拖慢则超阈值
// 变体：gettimeofday / clock() / QueryPerformanceCounter
```

**（3）进程环境检查**：遍历 `/proc/self/status` 找 `TracerPid: 非0`；扫进程列表找 `gdb/ida/x64dbg` 进程名；Windows 上 `IsDebuggerPresent()`、`CheckRemoteDebuggerPresent`；父进程不是 shell/explorer 判定调试。

**（4）INT3/INT1 检测**：程序在关键函数头部自己 `int3`（被调试器断下）或扫描自身代码段有没有 0xCC（调试器下的软件断点字节），有则说明被断点。

### 6.2 绕过手段

| 手段 | 做法 | 适用 |
| ---- | ---- | ---- |
| **patch 检测分支** | 静态找到 `test eax,eax; jz ok` 改 `jnz`/nop；或把检测函数整体 patch 成 `mov eax,0; ret` | 通用首选 |
| **gdb 设置** | `catch syscall ptrace` 断住后改返回值；LD_PRELOAD 劫持 ptrace/time 函数 | Linux 快速验证 |
| **LD_PRELOAD hook** | 写个 so 覆盖 `ptrace`/`gettimeofday` 返回无害值：`long ptrace(){return 0;}`，`LD_PRELOAD=./hook.so ./crackme` | 不改文件 |
| **Frida hook** | 见下，跨平台最强 | Windows/apk/复杂题 |

### 6.3 Frida 入门（一段）

**Frida**：动态插桩框架，把 JS 注入目标进程，运行时改函数参数/返回值。安装：`pip install frida-tools`。

```bash
# 仅限 CTF 靶场环境
frida -f ./crackme -l hook.js     # spawn 启动并注入
# 或对已运行进程：frida -p <pid> -l hook.js
```

`hook.js` 模板（打印函数参数——逆向时「偷看」关键函数调用）：

```javascript
// 仅限 CTF 靶场环境
Interceptor.attach(Module.getExportByName(null, "ptrace"), {
    onEnter: function (args) {
        console.log("[ptrace] request=" + args[0].toInt32());
    },
    onLeave: function (retval) {
        retval.replace(0);              // 直接把返回值改成 0 → 绕过检测
    }
});
```

`Interceptor.attach(地址, {onEnter, onLeave})` 是最常用形态：onEnter 拿/改参数，onLeave 改返回值。Windows 内部函数地址用 `Module.getBaseAddress("crackme.exe").add(0x偏移)`。

---

## 7. 混淆与加壳

- **UPX 壳**：`strings` 看到大量 `UPX0 UPX1` 段名 / ExeinfoPe 直接报。脱壳：`upx -d cracked.exe`（官方工具直接脱）；
- **壳（Packer）原理一句话**：把原程序压缩/加密，运行时自解密再跳转执行——所以静态看不到真代码，动态 dump 即可；
- **VM 壳（如 VMProtect, vmp）**：把代码翻译成自定义字节码跑在虚拟机里，**trace + 符号执行成本极高**（概念级：比赛遇到要么动态 trace 求解，要么找该版本公开的分析器）；
- 通用脱壳思路：运行到 **OEP（Original Entry Point，原始入口）** 后 dump 内存重建（Windows 用 x64dbg + Scylla；识别 OEP：壳代码执行完毕出现「大片正常代码+VC 启动函数」特征）。

---

## 8. 脚本语言逆向

### 8.1 pyc 反编译实操

| Python 版本 | 工具 |
| ---- | ---- |
| 2.7 | uncompyle6 |
| 3.0 - 3.8 | uncompyle6 / decompyle3（3.7/3.8 用 decompyle3 更稳） |
| 3.9+ | **pycdc**（C++ 实现，支持最新但输出可读性略差） |

- **头文件魔数识别版本**：pyc 前 4 字节（3.3+）：

```bash
xxd task.pyc | head -1
# 00000000: 6f0d0d0a ...      magic 0x0d0d 需查表：
#   3.7: 420d0d0a   3.8: 550d0d0a   3.9: 610d0d0a   3.10: 6f0d0d0a   3.11: a70d0d0a
```

（技巧：`pip install xdis` 后 `python -c "from xdis import load_module"` 或查 CPython 源码 `importlib.util.MAGIC_NUMBER`；更快的办法——用对应版本的 python 重新 `import` 一个空文件生成 pyc 对比魔数。）

- **反编译失败降级**：版本太新/优化过 → 直接读**字节码（bytecode）**：`dis` 模块或 xdis。常见 opcode 速查：

| opcode | 含义 |
| ---- | ---- |
| `LOAD_FAST x` | 取局部变量 x |
| `LOAD_CONST c` | 取常量 c |
| `STORE_FAST x` | 存局部变量 x |
| `BINARY_ADD/SUBTRACT/MULTIPLY` | 弹两个操作数做加减乘 |
| `COMPARE_OP ==` | 比较 |
| `POP_JUMP_IF_FALSE` | 条件跳转（if 的样子） |
| `CALL_FUNCTION n` | 调函数（n 个参数） |
| `GET_ITER / FOR_ITER` | for 循环特征 |
| `RETURN_VALUE` | 返回 |

读法：按行号扫一遍，把 LOAD/BINARY 还原成表达式，`FOR_ITER` 圈出循环体，半小时能啃下一个加密函数。

### 8.2 .NET / dnSpy 一段

C# 题（exe/dll）直接 **dnSpy** 打开 → 反编译成可读 C# → 在关键函数（`CheckKey`）下断点调试；**改 IL 返回值套路**：右键方法 → Edit Method → 把 `return false;` 改成 `return true;` → Compile → File 保存，程序被「医好」。

### 8.3 JS 混淆

- **obfuscator.io 特征**：大数组 + `_0xabcd(decrypt_idx)` 取字符串函数、字符串数组轮转（自解密 IIFE）、控制流平坦化（大 switch）；
- **AST 还原思路一句话**：用 `@babel/parser` + `@babel/traverse` 写 Node 脚本，把 `_0xabcd(0x1a)` 这类常量调用求值内联、还原字符串与控制流（进阶，见「AST 还原混淆」系列文章）；
- **eval 解包套路**：混淆最终 `eval(x)` → 把 `eval` 换成 `console.log` 打印出真实代码，逐层剥洋葱。

---

## 9. 移动端（APK）

- **jadx 反编译**：`jadx app.apk` 或 `jadx-gui app.apk`——Java 层直接出可读 Java；找 `checkFlag`、native 方法声明（`native String check(String);`）；
- **Java 层 frida hook 示例**：

```javascript
// 仅限 CTF 靶场环境：hook Java 方法打印参数与返回值
Java.perform(function () {
    var Check = Java.use("com.ctf.app.Check");        // jadx 里看到的类名
    Check.check.implementation = function (input) {
        console.log("[check] input = " + input);
        var ret = this.check(input);
        console.log("[check] ret = " + ret);
        return ret;
    };
});
// 运行: frida -U -f com.ctf.app -l hook.js   （-U 指 USB 设备/模拟器）
```

- **native 层（so）**：so 用 ghidra 静态分析；hook 用 `Interceptor.attach(Module.findExportByName("libnative.so", "Java_com_ctf_app_Check_check"), ...)`（或按 JNI 动态注册的偏移地址 attach）；
- **常见反调试（root/模拟器检测）绕过思路**：检测点通常在 Java 层（`Build.TAGS` 含 test-keys、`/system/bin/su` 存在、常用模拟器文件）——用 frida 把检测方法 hook 成恒返回 false，或 Magisk hide 类隐藏 root；native 层 ptrace 检测同第 6 节。

深入：APK 静态逆向与重打包实操见笔记 42，Frida hook 与动态分析见笔记 45。

---

## 10. 算法还原后的两种解法：keygen 与 patch

### 10.1 写 keygen（推荐）

把逆出的算法**正向翻译**成 Python，算出程序要的正确输入：

```python
# 示例：逆向发现 flag = enc[i] ^ (i + 0x10) 逐字符，enc 已从二进制中提取
enc = bytes.fromhex("767d73746f207f7a68282944642d6c404b125b44174b075a")
flag = bytes(c ^ (i + 0x10) for i, c in enumerate(enc))
print(flag)     # b'flag{5imp13_x0r_k3yg3n!}'
```

优点：不动原文件、题目要求「算出输入」时唯一解、能出通解。逆向报告的「翻译」步骤就是 keygen。

### 10.2 patch（改程序）

定位**关键跳转**直接改语义：

- **x64dbg 流程**：命令行参数/输入处理下断点 → 单步到 `test eax,eax / jz 失败分支` → 选中 `jz` 行按空格改汇编为 `jnz` 或 nop → 右键 "Copy to executable" 保存新文件；
- **Ghidra patch 流程**：光标停在该指令 → 右键 Patch Instruction（输入新助记符）→ File → Export Program 保存；改 `jz` 为 `jnz`、或把 `call check` 后的比较 nop 掉；
- 常见目标：比较指令改跳转方向、`jz/jnz` 互换、把 `retn` 提前（跳过校验直达成功分支）。

什么时候 patch 什么时候 keygen：题目要 flag 字符串且藏在比对里 → keygen/直接还原；题目只要「让它打印 Congrats」且 flag 动态生成 → patch 后跑程序拿输出。

---

## 11. 完整例题 Walkthrough

> **仅限 CTF 靶场环境**（教学题 `xor_b64`：64 位 ELF，无壳无反调试，逻辑 = XOR + 自定义 base64 表）。

### 第一步：观察

```bash
file xor_b64
# ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped
strings -n 8 xor_b64 | head -30
# 发现：
#   Input your flag:
#   Wrong!
#   RSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/    ← base64 码表的一部分（开头被截断）
#   ABCDEFGHIJKLMNOPQRSTUVWXYZ...（另一个更长的串）
```

`strings` 直接暴露两个可疑常量：疑似自定义 base64 表与一段密文/表。记录下来。

### 第二步：Ghidra 静态分析

1. 打开 Ghidra → Auto-Analyze 全选 → Symbol Tree 里直接见 `main`（not stripped）；
2. 双击 main，Decompile 窗口读伪 C：

```c
undefined8 main(void) {
    char input[64]; char out[96];
    puts("Input your flag:");
    read(0, input, 64);
    transform(input, out);                    // 重命名为 transform
    if (memcmp(out, &ENC, 36) == 0)           // 与 36 字节常量比对（重命名 ENC）
        puts("Right!");
    else puts("Wrong!");
}
```

3. 进 `transform`（关键函数）：

```c
void transform(char *in, char *out) {
    int i; char tmp[96];
    size_t n = strlen(in);
    for (i = 0; (ulong)i < n; i++)
        tmp[i] = in[i] ^ KEY[i % 8];          // KEY 为 8 字节常量（Ghidra 里双击可见值）
    base64_custom(tmp, n, out);               // 用自定义表编码（表即 strings 里那个）
}
```

逻辑闭环：**输入 XOR 8 字节 key → 自定义 base64 → 与 ENC 比对**。

4. 从 Ghidra 提取常量：双击 `ENC` 记 36 字节 hex；双击 `KEY` 记 8 字节；双击表记完整 64 字符（`c3VwZXJ...` 类）。

### 第三步：写解码脚本（keygen 思路反向还原）

```python
#!/usr/bin/env python3
# 仅限 CTF 靶场环境
import base64

ENC   = bytes.fromhex("7531436975323253754464306C31647A77685A495434716D6F314B685259524B77573265")
TABLE = "RSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/ABCDEFGHIJKLMNOPQ"   # 自定义表（教学编造）
KEY   = bytes([0x10, 0x20, 0x30, 0x11, 0x22, 0x33, 0x44, 0x55])

# 1) 自定义 base64 解码：先把密文映回标准表，再 b64decode
std  = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
enc_str = ENC.decode()
mapped = enc_str.translate(str.maketrans(TABLE, std))
mid  = base64.b64decode(mapped)

# 2) XOR 还原（key 周期 8，与加密同式即可：x ^ k 两次还原）
flag = bytes(c ^ KEY[i % 8] for i, c in enumerate(mid))
print(flag)        # b'flag{r3v3rs3_1s_fun_r34lly}'
```

### 第四步：动态验证

```bash
./xor_b64
# Input your flag: flag{r3v3rs3_1s_fun_r34lly}
# Right!
```

本地运行验证通过（靶场环境）；若给远程服务则用该输入打 nc 拿正式 flag。

### 第五步：复盘（文字描述截图位）

- 本题「截图位」应有：strings 输出（发现码表）、Ghidra transform 伪 C、运行 Right! 回显——复盘时贴进笔记；
- 考点：逐字符 XOR（5.2）+ base64 换表（5.3）；
- 卡点常见：自定义表抄错一位全盘错（对照原二进制两遍）、XOR 周期算错；
- 迁移：见「64 长度可打印常量 + 36 字节比对串」→ 换表 base64 + 异或的组合题流水线。

---

## 12. 做题习惯与刷题路线

**习惯**：

- **Ghidra 工程管理**：每题一个目录（附件 + .gzf 工程 + exp 脚本 + 笔记），赛后可直接复现；
- **命名规范**：伪 C 里所有被理解的函数立刻改名（`sub_4013F0` → `b64_encode`），变量同理；改一个名，省十次读；
- **笔记记录关键地址**：main/check/关键跳转的**文件偏移与运行时地址**（base + offset），patch 与写 wp 都要用；
- 动静态来回切换，别在静态里硬啃超 30 分钟的函数——跑起来断点看真实数据流更快。

**刷题路线**：

| 阶段 | 内容 |
| ---- | ---- |
| 入门 | picoCTF Reverse 类全部（难度 1-2 星） |
| 基础 | **BUUCTF Reverse 50 题**：前 20 题（字符串/XOR/base64 变种）→ 中 20 题（TEA/RC4/魔数识别、upx、pyc）→ 后 10 题（反调试、dnSpy、apk） |
| 进阶 | 看雪 CTF 版块（KCTF/看雪试题解析）、吾爱破解培训区、各类 crackme 网站（crackmes.one） |
| 专项 | obfuscator.io 还原、wasm、vmp 分析（按兴趣） |

---

## 13. 复盘模板

```markdown
### [平台-题号] 题目名（方向：Reverse）
- **题目信息**：文件类型/架构/壳/反调试（file 与 ExeinfoPe 输出摘要）
- **考点**：如自定义 base64 + XOR（→ 本笔记 5.2/5.3）
- **卡点**：如「不知道 0x9E3779B9 是 TEA，把轮函数当乱码读了一小时」
- **新学知识**：新魔数/新工具用法/新 patch 技巧（附关键地址与最小复现）
- **同类题迁移**：识别特征（魔数/结构）→ 标准动作（查表定算法 → 找 key 与表 → 写还原脚本）
```

---

## 14. 自测问题

1. 逆向拿到陌生附件的前三条命令是什么？分别看什么信息？
2. md5 与 sha1 的比对串长度与初始化魔数分别是什么？
3. 写出 RC4 KSA 的核心两行伪代码；AES 靠什么魔数识别？
4. `0x9E3779B9` 是什么算法的特征？在 Ghidra 里如何搜索？
5. 自定义 base64 表的题如何用 Python 解？（`maketrans` 思路）
6. `ptrace(PTRACE_TRACEME)` 检测的原理是什么？列出三种绕过方式。
7. 时间差反调试（rdtsc）的原理？为什么单步会触发？
8. UPX 壳如何一键脱？VM 壳为什么难脱（一句话）？
9. pyc 的 magic number 如何判断 Python 版本？3.10 的 pyc 用什么工具反编译？
10. pyc 反编译失败时如何读字节码？`BINARY_ADD` 和 `POP_JUMP_IF_FALSE` 分别对应什么语义？
11. obfuscator.io 混淆的特征是什么？eval 解包的简单套路是什么？
12. Frida 的 `Interceptor.attach` 两个回调各能做什么？写出让 ptrace 返回 0 的 hook。
13. keygen 与 patch 各适用什么场景？x64dbg 里改 `jz` 为 `jnz` 的完整步骤？
14. APK 题的完整工具链是什么（Java 层/native 层各用什么）？

---

> 上一篇：[38-CTF-Crypto-方向.md](38-CTF-Crypto-方向.md)　下一篇：[40-CTF-Misc-方向.md](40-CTF-Misc-方向.md)
