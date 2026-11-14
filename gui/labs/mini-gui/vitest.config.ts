import { defineConfig } from "vitest/config";

// 只跑 src/ 下的测试：build/.scriptc-raylib-source/ 是 scriptc-raylib 的暂存副本，
// 里面的 .test.ts 是同一批文件，不排除会导致测试翻倍。
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
