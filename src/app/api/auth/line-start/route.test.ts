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
  const store = {
    set: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
  };
  mockCookies.mockResolvedValue(store as never);
  return store;
}

function authorizeUrlOf(response: Response) {
  return new URL(response.headers.get("location") as string);
}

describe("/api/auth/line-start", () => {
  const originalClientId = process.env.NEXT_PUBLIC_LINE_CLIENT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_LINE_CLIENT_ID = "test-client-id";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_LINE_CLIENT_ID = originalClientId;
  });

  it("通常フローでは自動ログインを無効化しない（LINEアプリが起動できるようにする）", async () => {
    const store = setupCookieStore();

    const response = await GET(
      new NextRequest("https://example.com/api/auth/line-start"),
    );

    const authorizeUrl = authorizeUrlOf(response);
    expect(authorizeUrl.origin).toBe("https://access.line.me");
    expect(authorizeUrl.searchParams.get("disable_auto_login")).toBeNull();
    expect(authorizeUrl.searchParams.get("state")).toMatch(
      new RegExp(`^${LINE_STATE_PREFIX.initial.replace(".", "\\.")}`),
    );
    // 中断された再試行の印が残っていても次の救済ができるように消す
    expect(store.delete).toHaveBeenCalledWith(LINE_LOGIN_COOKIE.autoLoginRetry);
  });

  it("noAutoLogin=1 の再試行では自動ログインを無効化し、再試行済みの印を残す", async () => {
    const store = setupCookieStore();

    const response = await GET(
      new NextRequest("https://example.com/api/auth/line-start?noAutoLogin=1"),
    );

    const authorizeUrl = authorizeUrlOf(response);
    expect(authorizeUrl.searchParams.get("disable_auto_login")).toBe("true");
    expect(authorizeUrl.searchParams.get("state")).toMatch(
      new RegExp(`^${LINE_STATE_PREFIX.autoLoginRetry.replace(".", "\\.")}`),
    );
    expect(store.set).toHaveBeenCalledWith(
      LINE_LOGIN_COOKIE.autoLoginRetry,
      "1",
      expect.anything(),
    );
  });

  it("returnUrl は相対パスのときだけ cookie に保存する", async () => {
    const store = setupCookieStore();

    await GET(
      new NextRequest(
        "https://example.com/api/auth/line-start?returnUrl=https%3A%2F%2Fevil.example%2F",
      ),
    );

    expect(store.set).not.toHaveBeenCalledWith(
      LINE_LOGIN_COOKIE.returnUrl,
      expect.anything(),
      expect.anything(),
    );
  });
});
