/**
 * 大纲章节：阶段 4 工程化
 * 主题：极简「网络层」——默认导出的 async 函数，供 userService 依赖注入与 vi.mock 演示
 * 运行：npx tsx exercises/vitest-basics/api.ts（冒烟）；测试：npx vitest run exercises/vitest-basics/
 * 预期输出：
 *   { id: 1, name: 'user-1', email: 'user-1@example.com' }
 */
export interface User {
  id: number;
  name: string;
  email: string;
}

// 真实场景这里应请求后端（fetch(`https://api.example.com/users/${id}`)）。
// 练习里返回固定数据 + 一次 0ms 延迟：延迟的意义是让调用路径「真的异步」，
// 测试没有 mock 它时也能走通；mock 它时则演示 vi.mock 对整个模块的替换。
export default async function getUserById(id: number): Promise<User> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  return { id, name: `user-${id}`, email: `user-${id}@example.com` };
}

// —— 冒烟段：只在「直接运行本文件」时执行，被别的文件 import 时不重复跑 ——
// ESM 没有 require.main === module 的等价物；惯用判断：进程入口文件 URL === import.meta.url。
// （不直接写 process.argv 是因为 tsconfig 里 types: [] 没引 Node 类型，这里做一次窄化断言）
const g = globalThis as { process?: { argv?: string[] } };
const entry = g.process?.argv?.[1];
const isEntry = entry !== undefined && import.meta.url === new URL(`file://${entry}`).href;
if (isEntry) {
  const user = await getUserById(1);
  console.log(user);
}
