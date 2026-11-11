import { describe, expect, it } from "vitest";
import type { BaseConfig, BaseResponse } from "../types/backend";
import {
  parseBaseResponse,
  parseConnectionConfig,
  parseLocalFolderFiles,
} from "./backendResponse";

describe("backendResponse", () => {
  it("解析成功响应并保留泛型负载", () => {
    const response = parseBaseResponse<{ list: string[] }>(
      JSON.stringify({ response_code: 0, response_msg: { list: ["a"] } }),
    );

    expect(response.response_code).toBe(0);
    if (response.response_code === 0) {
      expect(response.response_msg.list).toEqual(["a"]);
    }
  });

  it("解析失败响应中的字符串错误信息", () => {
    const response: BaseResponse<null> = parseBaseResponse<null>(
      JSON.stringify({ response_code: 1, response_msg: "加载失败" }),
    );

    expect(response.response_code).toBe(1);
    expect(response.response_msg).toBe("加载失败");
  });

  it("解析 connection_json 与本地文件夹 JSON 数组", () => {
    const config: BaseConfig = parseConnectionConfig(
      JSON.stringify({
        base_config_enum: { sqlite: { file_path: "/tmp/test.db" } },
      }),
    );
    expect(config.base_config_enum.sqlite?.file_path).toBe("/tmp/test.db");

    expect(parseLocalFolderFiles('["a.txt","b.txt"]')).toEqual([
      "a.txt",
      "b.txt",
    ]);
  });
});
