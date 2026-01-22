import { describe, it, expect } from "vitest";
import { hello } from "./hello";

describe("hello", () => {
  it("returns default greeting", () => {
    const result = hello({});
    expect(result.message).toBe("Hello World!");
    expect(result.locale).toBe("en");
  });

  it("greets with custom name", () => {
    const result = hello({ name: "Shane" });
    expect(result.message).toBe("Hello Shane!");
  });

  it("supports Chinese locale", () => {
    const result = hello({ name: "Shane", locale: "zh" });
    expect(result.message).toBe("你好 Shane！");
    expect(result.locale).toBe("zh");
  });

  it("supports Japanese locale", () => {
    const result = hello({ name: "Shane", locale: "ja" });
    expect(result.message).toBe("こんにちは Shane！");
  });

  it("falls back to English for unknown locale", () => {
    const result = hello({ name: "Shane", locale: "xx" });
    expect(result.message).toBe("Hello Shane!");
  });

  it("includes timestamp", () => {
    const result = hello({});
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

