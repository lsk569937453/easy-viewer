import { describe, expect, it } from "vitest";
import {
  formatJsonValue,
  getTypeMeta,
  parseRedisCommandResponse,
} from "./redisKeyUtils";

describe("getTypeMeta", () => {
  it("已知类型返回中文标签与语义色", () => {
    expect(getTypeMeta("string")).toEqual({ label: "字符串", tone: "info" });
    expect(getTypeMeta("zset")).toEqual({ label: "有序集合", tone: "info" });
    expect(getTypeMeta("hash")).toEqual({ label: "哈希", tone: "success" });
  });

  it("未知类型回退为原始值与 neutral", () => {
    expect(getTypeMeta("stream")).toEqual({ label: "stream", tone: "neutral" });
    expect(getTypeMeta(null)).toEqual({ label: "未知", tone: "neutral" });
  });
});

describe("formatJsonValue", () => {
  it("对象与数组 JSON 美化输出", () => {
    expect(formatJsonValue('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(formatJsonValue("[1,2]")).toBe("[\n  1,\n  2\n]");
  });

  it("纯文本、非对象 JSON 与空值返回 null", () => {
    expect(formatJsonValue("hello")).toBeNull();
    expect(formatJsonValue("123")).toBeNull();
    expect(formatJsonValue("")).toBeNull();
  });
});

describe("parseRedisCommandResponse", () => {
  it("response_code=0 时返回命令结果", () => {
    const response = parseRedisCommandResponse(
      JSON.stringify({
        response_code: 0,
        response_msg: {
          response_type: "string",
          value: "PONG",
          execution_time_ms: 1,
        },
      }),
    );
    expect(response?.response_type).toBe("string");
    expect(response?.value).toBe("PONG");
  });

  it("response_code≠0 与非法 JSON 均返回 null", () => {
    expect(
      parseRedisCommandResponse(
        JSON.stringify({ response_code: 1, response_msg: "boom" }),
      ),
    ).toBeNull();
    expect(parseRedisCommandResponse("not-json")).toBeNull();
  });
});
