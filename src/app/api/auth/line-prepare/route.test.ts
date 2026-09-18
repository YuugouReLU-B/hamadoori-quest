/**
 * @jest-environment node
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  LINE_LOGIN_COOKIE,
  LINE_STATE_PREFIX,
} from "@/features/auth/constants/line-login";
import { GET } from "./route";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

function setupCookieStore() {
  const store = { set: jest.fn(), delete: jest.fn(), get: jest.fn() };
  mockCookies.mockResolvedValue(store as never);
  return store;
}

describe("/api/auth/line-prepare", () => {
  const originalClientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_LINE_CLIENT_ID = "test-client-id";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_LINE_CLIENT_ID = originalClientId;
  });

  it("認可URLをJSONで返し、state cookie を発行する", async () => {
    const store = setupCookieStore();

    const response = await GET(
      new NextRequest("https://example.com/api/auth/line-prepare"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const authorizeUrl = new URL(body.authorizeUrl);
    expect(authorizeUrl.origin).toBe("https://access.line.me");
    // 通常フローではLINEアプリが起動できるよう自動ログインを殺さない
    expect(authorizeUrl.searchParams.get("disable_auto_login")).toBeNull();

    const state = authorizeUrl.searchParams.get("state");
    expect(state?.startsWith(LINE_STATE_PREFIX.initial)).toBe(true);
    expect(store.set).toHaveBeenCalledWith(
      LINE_LOGIN_COOKIE.state,
      state,
      expect.anything(),
    );
  });

  it("returnUrl は相対パスのときだけ cookie に保存する", async () => {
    const store = setupCookieStore();

    await GET(
      new NextRequest(
        "https://example.com/api/auth/line-prepare?returnUrl=https%3A%2F%2Fevil.example%2F",
      ),
    );

    expect(store.set).not.toHaveBeenCalledWith(
      LINE_LOGIN_COOKIE.returnUrl,
      expect.anything(),
      expect.anything(),
    );
  });

  it("クライアントIDが未設定なら500を返す", async () => {
    setupCookieStore();
    process.env.NEXT_PUBLIC_LINE_CLIENT_ID = "";
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await GET(
      new NextRequest("https://example.com/api/auth/line-prepare"),
    );

    expect(response.status).toBe(500);
    consoleError.mockRestore();
  });
});
