# 38 - CTF Crypto 方向：编码、古典密码与 RSA 攻击大全

> 日期：2026-11-04
> 所属大纲阶段：7. CTF 实战（Crypto 方向）
> 参考资料：
> - CTF Wiki Crypto 章节（ctf-wiki.org）
> - CryptoHack（cryptohack.org）官方模块与挑战说明
> - RsaCtfTool 仓库（github.com/RsaCtfTool/RsaCtfTool）
> - gmpy2 官方文档（gmpy2.readthedocs.io）
> - SageMath 官方站（sagemath.org）与 CoCalc（cocalc.com）
> - 本工作区阶段 2 密码学基础笔记

> **合规声明**：本文全部技术仅限 **CTF 靶场环境**，示例数据均为教学编造。

---

## 目录

1. [Crypto 题谱系](#1-crypto-题谱系)
2. [编码全家桶](#2-编码全家桶)
3. [古典密码](#3-古典密码)
4. [RSA 专题（重中之重）](#4-rsa-专题重中之重)
5. [对称密码题](#5-对称密码题)
6. [哈希题](#6-哈希题)
7. [随机数缺陷](#7-随机数缺陷)
8. [数学杂项](#8-数学杂项)
9. [完整例题 Walkthrough（两道）](#9-完整例题-walkthrough两道)
10. [刷题路线](#10-刷题路线)
11. [复盘模板](#11-复盘模板)
12. [自测问题](#12-自测问题)

---

## 1. Crypto 题谱系

**密码学（Cryptography）** 方向的 CTF 题大致四层：

```
编码（Encoding）      ← 不是加密，只是表示形式转换（base 組、hex、莫尔斯……）
   ↓
古典密码（Classical）  ← 前计算机时代的替换/置换（凯撒、维吉尼亚、栅栏……）
   ↓
现代数学              ← RSA/椭圆曲线/离散对数/格 的数论攻击（题量最大）
   ↓
现代实现缺陷          ← 分组模式误用、IV 可控、随机数可预测、padding oracle……
```

Crypto 是五个方向中最「吃数学」也最「可离线」的：题目通常只给一个附件（密文+参数），不需要搭环境，**Python 是唯一主力武器**。

---

## 2. 编码全家桶

### 2.1 特点与识别方法表

| 编码 | 字符集/形态 | 识别特征 | 示例 |
| ---- | ---- | ---- | ---- |
| Base16（hex） | `0-9A-F` | 纯十六进制字符、长度偶数 | `666C6167` |
| Base32 | `A-Z2-7` + `=` 填充 | 全大写字母数字、常见 `=====` 尾 | `MZXW6===` |
| Base64 | `A-Za-z0-9+/` + `=` | 最常见；大小写混合 | `ZmxhZw==` |
| Base85（Ascii85） | 可见 ASCII 大杂烩 | `<~` 开头（标准形式）或无符号密集 | `<~87cURD~>` |
| Base91 | `A-Za-z0-9!#$%...` | 无填充、含大量标点 | `nX]-<IBOQA` |
| URL 编码 | `%XX` | 百分号 | `flag%7Bx%7D` |
| rot13 | 字母保持大小写形态 | 看起来像「错乱单词」 | `synt{...}`（syn=fla） |
| 莫尔斯（Morse） | `.-` / `/` 分隔 | 点划 | `..-. .-..` |
| 培根（Bacon） | 两种状态（ab/大小写） | 五字符一组 | `aABAA` |
| 栅栏/置换 | 形态不变、顺序错乱 | 「字母都对但拼不成词」 | `fl{agga}...` |

一句话级了解（见到再查）：**JSFuck**（`[]()!+` 组成的 JS 代码，浏览器 console 直接跑）、**AAEncode**（颜文字混淆的 JS）——本质是「JS 代码的等价编码」，用浏览器 F12 console 解。

### 2.2 多级解码套路

CTF 常把编码串多层套娃（base64 → hex → base32 → rot13 → 明文）。套路：

1. 每解一层，重新按上表**重新识别**（不要假设下一层）；
2. 解出来的二进制数据（不可打印）→ 想到是 hex、base85、或**文件头**（`89 50 4E 47` 直接写文件变 PNG）。

### 2.3 CyberChef 使用详解

**CyberChef**（GCHQ 开源的浏览器端编解码工具，"Cyber Swiss Army Knife"）：

- **Magic** 操作（最常用）：把可疑数据拖进 Input，`Magic`（强度 3）会自动尝试多组合解码并给出置信度评分——多级套娃一键出结果；
- 常用 recipe：`From Base64`、`To Hex`、`ROT13`（支持自定义 amount 的 `ROT47`）、`XOR`（配 key/brute）、`Extract Files`（从数据里抽 PNG/ZIP）；
- 建议：clone 一份到本地离线用（比赛可能断网）。

### 2.4 Python 识别脚本思路

```python
import base64, re

def try_all(data: str) -> list[tuple[str, str]]:
    results = []
    for name, fn in [
        ("base64", lambda d: base64.b64decode(d + "=" * (-len(d) % 4)).decode(errors="ignore")),
        ("base32", lambda d: base64.b32decode(d + "=" * (-len(d) % 8)).decode(errors="ignore")),
        ("hex",    lambda d: bytes.fromhex(d).decode(errors="ignore")),
        ("rot13",  lambda d: __import__("codecs").encode(d, "rot13")),
    ]:
        try:
            out = fn(data.strip())
            printable = sum(c.isprintable() for c in out) / max(len(out), 1)
            if printable > 0.7:                     # 可打印率高的才报告
                results.append((name, out))
        except Exception:
            pass
    return results

# 思路：循环调用 try_all，每轮从结果挑一条继续解，直到出现 flag{ 前缀
```

---

## 3. 古典密码

### 3.1 凯撒密码（Caesar）与 rot 变体识别

**凯撒密码**：字母表固定位移。特殊位 rot13（自逆）。识别与破解：

- **rot 全试法**：26 个位移全打一遍（10 行 Python），肉眼挑有语义的；
- **词频/特征匹配**：密文里 `synt` 大概率是 `flag`（偏移 13）；高频字母对（英语 `e/t/a`）统计辅助。

```python
s = "synt{pnrfne_fxngr}"
for k in range(26):
    print(k, "".join(chr((ord(c) - (65 if c.isupper() else 97) + k) % 26
                         + (65 if c.isupper() else 97)) if c.isalpha() else c for c in s))
```

### 3.2 维吉尼亚密码（Vigenère）

**多表替换**：密钥循环作为不同位移。破解思路（了解原理 + 会用工具）：

1. **Kasiski 测验**找密钥长度：重复子串间距的公因数候选；
2. **重合指数（Index of Coincidence, IC）**验证长度：按长度分组后每组 IC 接近 0.065（英语单表特征）即正确；密钥长度枚举用**卡方检验（chi-squared）**对每组做频率匹配确定每个位移；
3. 工具：在线破解网站（如 dcode.fr 的 Vigenère 页）、CAP4（古典密码破解工具）；
4. CTF 实操：一般密钥本身就藏在题目信息里（题面单词、生日），先猜密钥再跑。

### 3.3 栅栏与置换

- **栅栏密码（Rail Fence）**：按行写按列读（或反之），只有位置变化；解法：栏数 2~10 全试；
- **列置换/矩阵置换**：给定列数填充、按某序读列；题目常给提示词（`key: 3142`）；
- 识别：字母频率分布正常（单表特征）但拼不出词 → 置换类。

### 3.4 简表：花式古典密码

| 密码 | 形态 | 提示 |
| ---- | ---- | ---- |
| 键盘密码 | `15 25 35...` 或坐标 | 数字对 → 九宫格/键盘布局 |
| 猪圈（Pigpen） | 图形符号 | 图片题给怪符号，查对照表 |
| 银河（Galactic/Standard） | 外星符号字体 | 同上，字体对照 |
| 与佛论禅/新佛曰 | 汉字佛经串 | 特征明显（`新佛曰：…`），在线工具一键 |
| 培根/摩尔斯/键盘图案 | 见第 2 节 | — |

---

## 4. RSA 专题（重中之重）

**RSA** 原理（公钥 n,e 加密 `c = m^e mod n`，私钥 d 解密 `m = c^d mod n`）与数论基础见**阶段 2 密码学笔记**。这里只讲攻击面。

### 4.1 CTF 常见题型全表

| 题型 | 识别特征 | 解法 |
| ---- | ---- | ---- |
| 小明文指数（小 e 大 m） | e=3，n 很大，c 长度 ≈ m | c 开 e 次方（无模） |
| e=1 / 极小 | e=1 | c 就是 m（或简单变换） |
| 共模攻击 | 同 n、两个不同 e 的两组密文 | 扩展欧几里得合并 |
| Wiener | e 特别大（与 n 同量级） | 连分数逼近求 d |
| 低加密指数广播（Hastad） | 同 e、不同 n、多组密文 | 中国剩余定理合并后开方 |
| p、q 相近 | n 可分解 | 费马分解 |
| p-1 光滑 | n 可分解 | Pollard p-1 |
| n 偏小（弱随机生成） | n 约 256 bit 以内 | yafu / factordb（更大先查 factordb，512 bit+ 需 NFS 级算力） |
| Rabin | e=2 | 开平方模 n（四种根） |
| Coppersmith | 明文/密钥部分已知、短填充 | sage 小根 |
| dp/dq 泄露 | 给了 dp、dq | 直接重构私钥解密 |
| e 与 φ(n) 不互素 | gcd(e, φ)≠1 | 开方类处理 |

### 4.2 逐类详解与代码

以下代码均**仅限 CTF 靶场环境**，依赖：`pip install gmpy2 pycryptodome`。

#### （1）小明文指数（e=3，m 小）

若 `m^3 < n`（如明文只有 12 字节、立方后 285 bit 仍小于 512 bit 的 n），则 c 没有真正取模，直接整数开三次方：

```python
from gmpy2 import iroot, mpz
n = mpz(6703903964971298549787012499102923063739682910296196688863163426177508059273620387413133068150917435555402286330391632612806768456305460566471842528703779)  # 512bit 模数
c, e = mpz(31850476042865764915157544366457015129746392594906476390213623335156313220315485271141), 3  # c = m^3 仅 285bit < n
m, ok = iroot(c, e)          # ok=True 说明 m^3 < n（c 未被取模），直接得明文
assert ok
print(bytes.fromhex(hex(m)[2:]))   # b'flag{tiny_e}'
```

变体：`m^3` 略大于 n（只模掉一点点）→ `iroot(c + k*n)` 枚举小 k。

#### （2）共模攻击（同 n 不同 e）

两组：(n, e1, c1)、(n, e2, c2)，加密同一 m 且 `gcd(e1,e2)=1`。由扩展欧几里得（Extended GCD）找到 `s1*e1 + s2*e2 = 1`，则：

```
c1^s1 * c2^s2 = m^(e1*s1) * m^(e2*s2) = m^(e1*s1 + e2*s2) = m  (mod n)
```

s 为负时用模逆（`pow(c, -1, n)`，Python 3.8+）：

```python
from gmpy2 import gcdext
def common_modulus(n, e1, e2, c1, c2):
    g, s1, s2 = gcdext(e1, e2)            # s1*e1 + s2*e2 = g(=1)
    assert g == 1
    if s1 < 0: c1, s1 = pow(c1, -1, n), -s1   # 负指数 → 模逆后变正
    if s2 < 0: c2, s2 = pow(c2, -1, n), -s2
    m = pow(c1, s1, n) * pow(c2, s2, n) % n
    return bytes.fromhex(hex(m)[2:])
```

#### （3）Wiener 攻击（大 e 小 d）

d 小（`d < n^0.25/3`）时 e/n 的**连分数（Continued Fraction）**展开逼近 k/d。直觉：`e·d ≡ 1 (mod φ)` → `e/n ≈ k/d` 是该分式的好有理逼近，连分数逐项收敛必经过 k/d。

```python
# 套路实现：对 e/n 求连分数渐近分数 p/q，逐个验证：
#   φ = (e*q - 1)//p 整除性检查 → 由 n = p*q 分解验证（解二次方程得 p,q）→ d = q
from gmpy2 import isqrt
def wiener(n, e):
    cf, a = [], n and e
    # ... 展开连分数（标准代码），对每个渐近分数 k/d：
    #   phi = (e*d - 1)//k; s = n - phi + 1; 判别式 s^2-4n 是否完全平方
    pass  # 完整实现参考 RsaCtfTool 或 CTF Wiki，比赛直接 RsaCtfTool --attack wiener
```

实战：识别特征是 **e 与 n 同位数**（e 很大）。直接 `RsaCtfTool -n ... -e ... --attack wiener --private`。

#### （4）低加密指数广播（Hastad）

同一小 e（=3）、不同 n_i、同一 m 的多组 (n_i, c_i)。用**中国剩余定理（Chinese Remainder Theorem, CRT）** 合并出 `m^3 (mod N1N2N3)`，若 `m^3 < N1N2N3` 则直接开方：

```python
from functools import reduce
def crt(pairs):                     # [(n1,c1),(n2,c2),...]
    N = reduce(lambda a, b: a * b, [n for n, _ in pairs])
    x = 0
    for n, c in pairs:
        Ni = N // n
        x += c * Ni * pow(Ni, -1, n)
    return x % N, N

x, N = crt([(n1, c1), (n2, c2), (n3, c3)])
m, ok = iroot(x, 3)   # ok=True 说明 m^3 < N 未被取模
```

#### （5）费马分解（p、q 相近）

`n = p*q`，p≈q 时 `n ≈ ((p+q)/2)^2`，从 `isqrt(n)` 起向上枚举 a，找 `a^2 - n = b^2`（完全平方）：

```python
from gmpy2 import isqrt, is_square
def fermat_factor(n):
    a = isqrt(n)
    if a * a < n: a += 1
    while True:
        b2 = a * a - n
        if is_square(b2):
            b = isqrt(b2)
            return int(a - b), int(a + b)     # p, q
        a += 1
# 识别特征：p、q 生成代码常见 next_prime(x) 与 next_prime(x+小偏移)
```

#### （6）Pollard p-1（p-1 光滑）

p-1 的因子都小时：取 a，算 `a^M mod n`（M 为大量小素数之积），由费马小定理该值 ≡ 1 (mod p) → `gcd(a^M - 1, n)` 暴露出 p：

```python
from gmpy2 import gcd, powmod
from sympy import primerange
def pollard_p1(n, B=100000):
    a = 2
    for p in primerange(2, B):
        a = powmod(a, p, n)          # M 逐步乘进每个小素数
        d = gcd(a - 1, n)
        if 1 < d < n:
            return int(d)            # p
    return None
```

#### （7）yafu / factordb 大数分解

n 不太大（约 256 bit 以内可单机现场分解；更大的先查 factordb，512 bit+ 需 NFS 级算力）或结构有弱点（p、q 相近 / p-1 光滑，走上面对应方法）时：

- **factordb.com**：先查库！很多题的 n 已经被分解过；
- **yafu**：本地分解利器：`yafu "factor(n 十进制串)"`；

#### （8）Rabin（e=2）

加密 `c = m^2 mod n`。解密 = 模 n 开平方：在 mod p 与 mod q 上各开方（p、q ≡ 3 mod 4 时直接 `m = c^((p+1)/4) mod p`），CRT 合并得 4 个根，逐个试出可读明文。

#### （9）Coppersmith 短填充攻击（一句话）+ sage

已知明文高位/密钥碎片（如 m = known_prefix + unknown_short）时，**Coppersmith 方法**（格基约简求小根）可恢复未知小部分——典型如短信填充攻击。工具：**SageMath** 的 `small_roots()`。sage 环境建议：本地装 sagemath（大）或用 **CoCalc**（在线）/ 官方 docker 镜像 `sagemath/sagemath`。

### 4.3 RSA 套路检查清单（拿到题看什么顺序）

```
1. n 能否直接分解？   → factordb 查 → yafu 试（约 256 bit 内单机可解；512 bit+ 需 NFS 级算力）
2. e 特殊？           → e=3 且 c 小 → 开方；e 巨大 → wiener；
                       e=2 → rabin；e=1 → c 即 m
3. 多组数据？         → 同 n 不同 e → 共模；同 e 不同 n → 广播
4. n 的结构提示？     → p、q 相近 → 费马；p-1 光滑 → pollard p-1
5. 泄露的额外参数？   → dp/dq/p+q/p-q/部分明文 → 对应构造
6. 都不像？           → RsaCtfTool --attack 跑全字典
```

### 4.4 工具

- **RsaCtfTool**：

```bash
# 仅限 CTF 靶场环境
RsaCtfTool -n <n> -e <e> --private --attack wiener     # 求私钥
RsaCtfTool -n <n> -e <e> --uncipher <c> --attack all   # 全攻击字典直接出明文
```

- **sage**：安装建议 = docker（`docker run -it sagemath/sagemath`）或 CoCalc 在线；本地装体积大但比赛离线可用；
- **gmpy2 常用 API 表**：

| API | 用途 |
| ---- | ---- |
| `iroot(x, k)` | 整数 k 次开方（返回根与是否精确） |
| `isqrt(x)` / `is_square(x)` | 整数平方根 / 完全平方判定 |
| `gcd(a,b)` / `gcdext(a,b)` | 最大公因数 / 扩展欧几里得（含系数） |
| `invert(a, m)` / `pow(a,-1,m)` | 模逆 |
| `next_prime(x)` | 下一个素数 |
| `mpz(x)` | 高精度整数（配合 pow 做模幂） |

---

## 5. 对称密码题

原理见阶段 2 密码学笔记（AES 结构、分组模式、CBC）。CTF 变体：

- **ECB 模式特征重排**：**电子密码本模式（Electronic Codebook, ECB）** 相同明文块→相同密文块。经典「拼图题」：给出 ECB 加密的图像/像素数据，重排密文块让解密图出现 flag 字样（识别：图片有明显的重复纹理块；解法：写脚本枚举块的排列或按位置拼接）；
- **CBC 首位可控**：解密时 `P1 = D(C1) ⊕ IV`，改 IV 第一字节只会影响 P1 的对应字节；想伪造首块 P1'（管理员用户名等）时构造 `IV' = D(C1) ⊕ P1'`——已知原明文 P1 时等价于 `IV' = IV ⊕ P1 ⊕ P1'`（对原 IV 逐字节异或调整）；
- **Padding Oracle**：解密端对 padding 合法性的差异反馈（报错/正常）成为 oracle，逐字节恢复明文/伪造密文。原理与推导见阶段 2 笔记；CTF 实操 = 手写 poc 脚本逐位探测（每字节最多 256 次请求）或用 `padbuster` 工具；
- **密钥重复使用 XOR（key reuse）**：`c1 = m1 xor K`、`c2 = m2 xor K` → `c1 xor c2 = m1 xor m2`（去掉 K）；两段英文/已知格式明文可互相拖出（ crib dragging：拿已知片段 `flag{` 去试每个偏移）。单次密钥复用 + 一段明文已知 → 直接还原另一段。

---

## 6. 哈希题

- **长度扩展攻击（Length Extension Attack）**：`hash(secret + message)` 结构（MD5/SHA1/SHA256 等 **Merkle–Damgård 结构**）下，已知 `hash(secret||msg)` 与 msg 长度，可算出 `hash(secret||msg||suffix)` 而不知 secret。原理见阶段 2 笔记。工具 **hashpumpy**：

```bash
# 仅限 CTF 靶场环境
pip install hashpumpy   # 或编译官方 python 绑定
hashpumpy -h
python3 -c "
from hashpumpy import hashpump
# 已知: hash(secret+'admin') 与数据 'admin'，追加 ':true'
new_hash, new_msg = hashpump('<已知哈希>', b'admin', b':true', 16)  # 16=secret 长度（枚举）
print(new_hash, new_msg)
"
```

- **哈希碰撞语义题**：如 `if (md5(a) == md5(b))`（详见 [36 篇 3.2](36-CTF-Web-方向.md#32-md5sha1-碰撞与数组绕过)，属 Web/Crypto 交叉）；「找 x 使 sha256(x) 以 000000 开头」= **工作量证明（Proof of Work, PoW）** 暴力题（多进程/显卡）；
- **国密 SM 系列**（SM2/SM3/SM4）：一句话——国内合规算法，题目会明说，用 `gmssl` Python 库对应替换 RSA/SHA/AES 的用法。

---

## 7. 随机数缺陷

**时间做种子**：`random.seed(int(time.time()))` 后生成的「随机」序列可预测。思路：

1. 由题面/文件时间戳缩小 seed 范围（服务器时间±窗口）；
2. 枚举 seed，用同样调用序列生成候选，与已知输出（如给了第一个随机数/密钥片段）比对；
3. 命中后预测 flag 相关值。

```python
import random, time
for seed in range(int(time.time()) - 120, int(time.time()) + 60):
    r = random.Random(seed)
    if r.random() == known_first_float:      # 与泄露值比对
        print("seed =", seed)
        break
```

进阶：**梅森旋转（Mersenne Twister）状态恢复**（624 个输出还原 `random` 内部状态预测后续，`pip install randcrack`）。

---

## 8. 数学杂项

- **离散对数（Discrete Logarithm, DLP）**：`y = g^x mod p` 求 x。p-1 光滑 → Pohlig-Hellman（sage `discrete_log` 自动选择算法）；小 p → BSGS（baby-step giant-step）；
- **格（Lattice）与 LLL**：一句话入门——把「多个线性方程 + 小未知量」建模为格，用 **LLL 格基约减算法（Lenstra–Lenstra–Lovász）** 找短向量即小未知量。入口场景：hidden number problem、背包密码、部分密钥泄露。工具：sage 的 `matrix(ZZ, ...).LLL()`；先看 CTF Wiki「格密码」章建立直觉；
- **二次剩余**：`x^2 ≡ a (mod p)`，Tonelli-Shanks 求平方根（Rabin 解密的基础）；Cipolla 算法备选。

---

## 9. 完整例题 Walkthrough（两道）

### 例题一：编码组合题（教学题）

> 仅限 CTF 靶场环境。题面：`Encrypted message: 98 97 98 121 99 116 102 123 99 ...`

**第一步：观察**——空格分隔的两位数，范围 32-126 → ASCII 十进制。

```bash
python3 -c "print(''.join(chr(int(x)) for x in '''98 97 98 121 99 116 102 123 99 111 100 101 125'''.split()))"
# → babyctf{code}
```

实际题目往往不止一层。教学题给完整链：

```bash
# 层 2：base64 → 层 3：hex → 层 4：rot13 → flag
echo 'ZmxhZ3ttdWx0aV9sYXllcnN9' | base64 -d     # flag{multi_layers}
# 若 CyberChef 一键: Magic 操作直接出 "flag{multi_layers}  (Base64, confidence 95%)"
```

**复盘**：识别关键在「字符集 + 分隔形态」；多解一层后**重新观察**，不要套思维定势。

### 例题二：RSA 共模攻击（教学题）

> 仅限 CTF 靶场环境。附件 `output.txt`：

```text
n  = 2824013958708217496949108842204627863351353911851577524683401930862693830361198499905873920998299862902356984638926539735738358699685591267606686406437339073087128338286694031947014423223877836597771843739938014411943159
e1 = 2767
e2 = 3659
c1 = 855779291741741489773103760700357315862438426667333031977235239348713340714907763568666118276191622481838628040822690969440162854825544846468827689409888826390187229662939186573877297189775286665061567807112322609438708
c2 = 439929667795031504314183466175169211333772436422759775655016562833763747131255735741681861176283466511157154986867405337486429002706254025984650457372423683620172759629804623659503307514872197371337832689302218808864470
```

**第一步：过检查清单**——n 约 730 bit，现场分解无望（先查 factordb 也无果）；e 正常大小；**两组 (e, c) 且 n 相同 → 共模攻击**。

**第二步：验证前提**：

```python
from math import gcd
gcd(2767, 3659)      # 1 → 共模可行
```

**第三步：解题脚本**：

```python
#!/usr/bin/env python3
# 仅限 CTF 靶场环境
from gmpy2 import gcdext

n, e1, e2 = (int(open("output.txt").read().split(k + " = ")[1].split("\n")[0])
             for k in ("n", "e1", "e2"))
# （实际按文件格式解析，此处示意）
n  = 2824013958708217496949108842204627863351353911851577524683401930862693830361198499905873920998299862902356984638926539735738358699685591267606686406437339073087128338286694031947014423223877836597771843739938014411943159
e1, e2 = 2767, 3659
c1 = 855779291741741489773103760700357315862438426667333031977235239348713340714907763568666118276191622481838628040822690969440162854825544846468827689409888826390187229662939186573877297189775286665061567807112322609438708
c2 = 439929667795031504314183466175169211333772436422759775655016562833763747131255735741681861176283466511157154986867405337486429002706254025984650457372423683620172759629804623659503307514872197371337832689302218808864470

g, s1, s2 = gcdext(e1, e2)                  # s1*e1 + s2*e2 = 1
assert g == 1
if s1 < 0:
    c1, s1 = pow(c1, -1, n), -s1            # 负指数→模逆
if s2 < 0:
    c2, s2 = pow(c2, -1, n), -s2
m = pow(c1, s1, n) * pow(c2, s2, n) % n
print(bytes.fromhex(hex(m)[2:]))             # b'flag{c0mm0n_m0du1us_a77ack}'
```

**第四步：复盘**——识别特征（同 n 双 e 双 c 一分钟内必须想到共模）；卡点通常是「负指数忘了模逆导致 TypeError」；迁移：凡给两组密文先 `gcd(e1,e2)` 检查，gcd≠1 时开方思路处理。

---

## 10. 刷题路线

| 阶段 | 平台/内容 | 量 |
| ---- | ---- | ---- |
| 入门 | **picoCTF** Cryptography 类 | 全部（建立手感） |
| 基础 | **CryptoHack**：模块化课程（INTRO → MATHEMATICS → SYMMETRIC → ASYMMETRIC CIPHERS，RSA 各挑战在 Asymmetric Ciphers 模块内），每模块挑战做完即入门到进阶 | 全课程（约 120 题，最推荐的专项资源） |
| 刷题 | **BUUCTF Crypto 50 题规划**：前 20 题（编码+古典+基础 RSA）→ 中 20 题（RSA 全题型轮一遍，每题对照第 4 节清单）→ 后 10 题（padding oracle、格、随机数） | 50 |
| 进阶 | 赛题复现（CTFtime 高 weight 赛事的 crypto wp + 原题） | 按弱点补 |

CryptoHack 使用要点：先修完 Introduction（Python 基础工具链），其 Asymmetric Ciphers 模块（含 RSA 系列挑战）的每道题对应本笔记 4.2 的一个攻击，做完正好闭环。

---

## 11. 复盘模板

```markdown
### [平台-题号] 题目名（方向：Crypto）
- **题目信息**：给了哪些参数（n,e,c / 密文对 / 模式细节）、格式
- **考点**：如共模攻击（→ 本笔记 4.2(2)；RSA 原理 → 阶段 2 笔记）
- **卡点**：如「负指数不会处理」「不知道 gcdext 返回三元组」
- **新学知识**：新攻击 + 最小复现代码（贴 gmpy2/sage 关键调用）
- **同类题迁移**：识别特征（参数形态）→ 直接对应攻击 → 脚本模板位置
```

---

## 12. 自测问题

1. base16/32/64/85/91 各自的字符集特征是什么？如何一眼区分 base32 与 base64？
2. 多级编码套娃题的标准流程是什么？CyberChef 的 Magic 操作做了什么？
3. 维吉尼亚破解中「重合指数」用来确定什么？卡方检验用来确定什么？
4. 共模攻击的前提条件是什么？写出 s1、s2 满足的等式，负指数如何处理？
5. Wiener 攻击的适用条件（d 的界）与识别特征（e 的形态）是什么？
6. Hastad 广播攻击为什么需要三组以上数据？合并用什么定理？
7. p、q 相近用什么分解方法？写出核心循环的两行伪代码。
8. Pollard p-1 的适用条件是什么？「光滑（smooth）」指什么？
9. e=2 的 Rabin 密码解密为什么会有四个候选明文？
10. Coppersmith 攻击适合什么场景（明文/密钥的什么特征）？用什么工具实现？
11. CBC 模式下改 IV 的第一个字节会影响解密明文的哪些字节？为什么？
12. 密钥复用 XOR 题中 `c1 xor c2` 得到什么？如何利用（crib dragging）？
13. hashpumpy 需要哪些输入？最后那个「key 长度」参数怎么处理（未知时）？
14. `random.seed(time.time())` 为什么可预测？枚举窗口怎么缩小？
15. 拿到 RSA 题的第一分钟你按什么顺序检查（复述清单）？

---

> 上一篇：[37-CTF-Pwn-方向.md](37-CTF-Pwn-方向.md)　下一篇：[39-CTF-Reverse-方向.md](39-CTF-Reverse-方向.md)
