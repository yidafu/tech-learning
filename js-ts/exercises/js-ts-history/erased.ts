// exercises/js-ts-history/erased.ts
// 大纲章节：阶段 5 补充专题（notes/stage-5-topics/28-js-ts-history.md 第二部分：可擦除设计的现场）
// 主题：同一份文件——类型在编译期全部消失，Node 直接当 JS 跑（type stripping）
// 运行：node exercises/js-ts-history/erased.ts   （Node ≥ 23.6 默认开启 type stripping；
//        类型只剥不查——能跑通 ≠ 类型对，早期版本可能伴随 ExperimentalWarning）
// 类型检查（另开一道工序，见 notes/stage-0-setup/00 的单文件命令）：
//   npx tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --lib es2022,dom exercises/js-ts-history/erased.ts
// 预期输出（Node v24 实测，无警告直接跑）：
//   { id: 1, title: 'erasure' } getTitle 1
//   erasure
//   ——注意 getTitle 这个字符串是**纯编译期**用模板字面量类型算出来的，
//     运行时它只是个普通 string；interface/泛型/satisfies 全部无运行时痕迹。

interface Post {
  id: number;
  title: string;
}

// 纯类型层：把每个键 k 变成 `get${大写 k}`（TS 4.1 起才可能，见笔记 28 对照表）
type Getters<T> = {
  [K in keyof T as `get${Capitalize<K & string>}`]: () => T[K];
};

const post = { id: 1, title: "erasure" } satisfies Post;

// getterName 的类型是 "getId" | "getTitle"（映射类型求值的结果），
// 运行时只是一个普通字符串——类型系统算完就扔，这正是「可擦除」
const getterName: keyof Getters<Post> = "getTitle";

console.log(post, getterName, post.id);

function first<T>(xs: T[]): T | undefined {
  return xs[0];
}
console.log(first<Post>([post])?.title);
