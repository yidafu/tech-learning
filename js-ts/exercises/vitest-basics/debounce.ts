/**
 * 大纲章节：阶段 4 工程化
 * 主题：手写 debounce（纯实现，无第三方依赖）；由 debounce.test.ts 覆盖，可 npx tsx 单独冒烟
 * 运行：npx tsx exercises/vitest-basics/debounce.ts（冒烟）；测试：npx vitest run exercises/vitest-basics/
 * 预期输出：
 *   冒烟启动：连续调用 ping(a/b/c)，只有最后一次应存活
 *   60ms 后触发列表 = [c]
 */

/**
 * 防抖：wait 毫秒内的重复调用会不断重置计时器，只有「最后一次」在静默期结束后真正执行。
 * @param fn    要防抖的函数（同步或异步）
 * @param wait  静默期毫秒数，默认 300
 */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void | Promise<void>,
  wait = 300,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounced = (...args: A): void => {
    // 每次调用都取消上一个计时器——这就是「只保留最后一次」的全部秘密
    if (timer !== undefined) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      void fn(...args);
    }, wait);
  };
  return debounced;
}

// —— 冒烟段：真实定时器下肉眼验证一次（测试里换成 fake timers 精确推进）——
const meta = import.meta as ImportMeta & { env?: { MODE?: string } };
if (meta.env?.MODE !== 'test') {
  console.log('冒烟启动：连续调用 ping(a/b/c)，只有最后一次应存活');
  const fired: string[] = [];
  const ping = debounce((msg: string) => {
    fired.push(msg);
  }, 50);
  ping('a');
  ping('b'); // 取消 a
  ping('c'); // 取消 b，只有 c 计入 50ms 计时
  // 60ms 后观察：fired 应只含 'c'
  setTimeout(() => {
    console.log(`60ms 后触发列表 = [${fired.join(', ')}]`);
  }, 60);
}
