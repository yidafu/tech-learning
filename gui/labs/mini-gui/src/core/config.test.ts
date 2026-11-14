import { describe, expect, it } from "vitest";
import { envNumber, pingPong } from "../core/config";

describe("envNumber", () => {
  it("未设置时返回 fallback", () => {
    expect(envNumber(undefined, 60)).toBe(60);
  });

  it("合法数字字符串被解析", () => {
    expect(envNumber("120", 60)).toBe(120);
    expect(envNumber("2.5", 60)).toBe(2.5);
    expect(envNumber("0", 60)).toBe(0);
  });

  it("非法值回退 fallback", () => {
    expect(envNumber("abc", 60)).toBe(60);
    expect(envNumber("", 60)).toBe(60); // 空串视为未设置（Number("") === 0 的陷阱）
  });
});

describe("pingPong", () => {
  const left = 60;
  const len = 200;

  it("前半程线性增长", () => {
    expect(pingPong(0, left, len)).toBe(60);
    expect(pingPong(100, left, len)).toBe(160);
    expect(pingPong(200, left, len)).toBe(260);
  });

  it("后半程折返", () => {
    expect(pingPong(300, left, len)).toBe(160); // 400-300
    expect(pingPong(400, left, len)).toBe(60); // 回到起点
  });

  it("循环周期为 2*len", () => {
    expect(pingPong(400 + 50, left, len)).toBe(pingPong(50, left, len));
  });

  it("len<=0 时不发散", () => {
    expect(pingPong(123, left, 0)).toBe(left);
  });
});
