/**
 * 大纲章节：阶段 4 工程化
 * 主题：Vitest Mock——vi.mock 模块工厂（hoisting 与 vi.hoisted）、vi.fn 调用记录、vi.spyOn 恢复
 * 运行：npx vitest run exercises/vitest-basics/
 * 预期输出：（vitest 摘要；时间数字随机器变化）
 *   ✓ exercises/vitest-basics/userService.test.ts (8 tests)
 *   与其他两个测试文件合计 Test Files 3 passed / Tests 21 passed
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from './api';
import { createUserService } from './userService';

// —— vi.mock 的提升（hoisting）机制 ——
// vi.mock(...) 会被 vitest 在编译期提升到文件最顶部，先于所有 import 执行——
// 否则模块在 import 时就加载完了，mock 无从插手。
// 推论：factory 里引用「文件顶层稍后才初始化的变量」会因 TDZ 抛
//   ReferenceError: Cannot access 'xxx' before initialization
// 解法：vi.hoisted——它同样被提升，且保证在 vi.mock 之前执行，返回值可在 factory 里安全使用。
const { mockGetUserById, loadedUsers } = vi.hoisted(() => ({
  mockGetUserById: vi.fn(),
  loadedUsers: [] as Array<{ id: number; name: string }>,
}));

// 整个 './api.ts' 模块被 factory 的返回值替换：
// userService.ts 里 `import getUserById from './api'` 拿到的就是这个 mockGetUserById
vi.mock('./api.ts', () => ({
  default: mockGetUserById,
}));

beforeEach(() => {
  // 只清调用记录，不动各用例自己设置的实现
  mockGetUserById.mockClear();
  loadedUsers.length = 0;
});

const alice: User = { id: 1, name: 'alice', email: 'alice@example.com' };
const bob: User = { id: 2, name: 'bob', email: 'bob@example.com' };

describe('vi.mock 模块 mock：./api.ts 被整体替换', () => {
  it('默认 apiClient 来自被 mock 的模块默认导出，fetchUser 走 mock 数据', async () => {
    mockGetUserById.mockResolvedValue(alice);
    const service = createUserService(); // 不传 apiClient → 默认值 = getUserById（已被 mock）
    const user = await service.fetchUser(1);
    expect(user.displayName).toBe('ALICE');
    expect(mockGetUserById).toHaveBeenCalledWith(1); // 调用参数被记录
  });

  it('调用记录：次数与第 N 次调用的参数', async () => {
    mockGetUserById.mockResolvedValue(bob);
    const service = createUserService();
    await service.fetchUser(2);
    await service.fetchUser(2);
    expect(mockGetUserById).toHaveBeenCalledTimes(2);
    expect(mockGetUserById).toHaveBeenNthCalledWith(2, 2);
  });

  it('vi.hoisted 共享变量：mock 实现里写入，测试主体里断言', async () => {
    mockGetUserById.mockImplementation(async (id: number) => {
      loadedUsers.push({ id, name: `user-${id}` }); // 这里能引用 loadedUsers，因为它也被提升了
      return { id, name: `user-${id}`, email: `${id}@example.com` };
    });
    const service = createUserService();
    const user = await service.fetchUser(7);
    expect(user.displayName).toBe('USER-7');
    expect(loadedUsers).toEqual([{ id: 7, name: 'user-7' }]);
  });

  it('mockResolvedValueOnce：一次性返回值排队消费', async () => {
    mockGetUserById.mockResolvedValueOnce(alice).mockResolvedValueOnce(bob);
    const service = createUserService();
    await expect(service.fetchUser(1)).resolves.toMatchObject({ displayName: 'ALICE' });
    await expect(service.fetchUser(2)).resolves.toMatchObject({ displayName: 'BOB' });
  });

  it('非法 id 在触达网络层之前就失败（mock 未被调用）', async () => {
    mockGetUserById.mockResolvedValue(alice);
    const service = createUserService();
    await expect(service.fetchUser(0)).rejects.toThrow(RangeError);
    expect(mockGetUserById).not.toHaveBeenCalled();
  });
});

describe('vi.fn：可编程的假函数', () => {
  it('记录调用参数与返回值（mock.calls / mock.results）', () => {
    const fn = vi.fn((x: number) => x * 2);
    expect(fn(3)).toBe(6);
    expect(fn(21)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 3);
    expect(fn.mock.results[1]?.value).toBe(42);
  });

  it('mockReset：清调用记录，并把实现重置回 vi.fn(fn) 的原始实现', () => {
    const fn = vi.fn(() => 42);
    expect(fn()).toBe(42);
    fn.mockImplementation(() => 7);
    expect(fn()).toBe(7);
    fn.mockReset(); // vitest 语义：回到 vi.fn 的原始实现（jest 里会变成返回 undefined）
    expect(fn()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1); // 之前的记录被清空，只剩 reset 后这一次
  });
});

describe('vi.spyOn：替换对象方法，可恢复', () => {
  it('spy 包装原方法；mockRestore 后原实现回归', async () => {
    const client = {
      load: async (id: number): Promise<User> => ({ id, name: `user-${id}`, email: `${id}@example.com` }),
    };
    const spy = vi.spyOn(client, 'load').mockResolvedValue(alice);
    const service = createUserService((id) => client.load(id)); // 注入的方法已被 spy 包装
    const user = await service.fetchUser(1);
    expect(user.displayName).toBe('ALICE');
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore(); // 恢复原实现并清空记录
    const direct = await client.load(9);
    expect(direct.name).toBe('user-9');
    expect(spy).not.toHaveBeenCalled();
  });
});
