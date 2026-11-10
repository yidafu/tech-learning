/**
 * 大纲章节：阶段 4 工程化
 * 主题：依赖注入的数据服务——fetchUser 通过注入的 apiClient 取数，默认用 ./api.ts 的默认导出
 * 运行：npx tsx exercises/vitest-basics/userService.ts（冒烟）；测试：npx vitest run exercises/vitest-basics/
 * 预期输出：
 *   fetchUser(1) -> id=1, displayName=USER-1
 *   fetchUser(0) 抛错 -> fetchUser: id 必须为正整数，收到 0
 */
import getUserById, { type User } from './api';

// 依赖注入点：apiClient 是「取数函数」的抽象（类型别名）。
// 默认值引用 ./api.ts 的默认导出——所以测试里既可以用 vi.mock('./api.ts') 替换模块默认实现，
// 也可以直接注入一个假的 apiClient（两种解耦手段对照见 userService.test.ts）。
export type ApiClient = (id: number) => Promise<User>;

export interface UserWithDisplayName extends User {
  displayName: string;
}

export interface UserService {
  fetchUser: (id: number) => Promise<UserWithDisplayName>;
}

export function createUserService(apiClient: ApiClient = getUserById): UserService {
  return {
    async fetchUser(id: number): Promise<UserWithDisplayName> {
      // 服务边界校验：非法输入在触达网络层之前直接失败
      if (!Number.isInteger(id) || id <= 0) {
        throw new RangeError(`fetchUser: id 必须为正整数，收到 ${id}`);
      }
      const user = await apiClient(id);
      return { ...user, displayName: user.name.toUpperCase() };
    },
  };
}

// —— 冒烟段：默认注入（真实 api.ts），加一条非法输入路径 ——
const meta = import.meta as ImportMeta & { env?: { MODE?: string } };
if (meta.env?.MODE !== 'test') {
  const service = createUserService();
  const user = await service.fetchUser(1);
  console.log(`fetchUser(1) -> id=${user.id}, displayName=${user.displayName}`);
  try {
    await service.fetchUser(0);
  } catch (err) {
    console.log(`fetchUser(0) 抛错 -> ${(err as RangeError).message}`);
  }
}
