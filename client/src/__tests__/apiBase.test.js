import { describe, it, expect, afterEach } from "vitest";
import { getApiBaseUrl } from "../services/apiBase.js";

describe("API Base URL Resolver", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
  });

  it("should return configured API URL trimmed of trailing slashes", () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/";
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
  });

  it("should return empty string when NEXT_PUBLIC_API_URL is not set", () => {
    process.env.NEXT_PUBLIC_API_URL = "";
    expect(getApiBaseUrl()).toBe("");
  });
});
