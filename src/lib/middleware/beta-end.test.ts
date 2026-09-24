/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import {
  createBetaEndApiResponse,
  createBetaEndNotFoundResponse,
  createBetaEndRedirectResponse,
  isBetaEndExcludedPath,
  resolveBetaEndResponse,
} from "./beta-end";

// preview判定は実物を使い、終了しているかどうかだけを差し替える
jest.mock("@/lib/utils/beta-end-mode", () => ({
  ...jest.requireActual("@/lib/utils/beta-end-mode"),
  shouldShowBetaEnd: jest.fn(),
}));

import { shouldShowBetaEnd } from "@/lib/utils/beta-end-mode";

const mockShouldShowBetaEnd = shouldShowBetaEnd as jest.MockedFunction<
  typeof shouldShowBetaEnd
>;

function createRequest(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

const EXCLUDED_PATHS = [
  "/admin",
  "/admin/missions",
  "/api/auth/line-start",
  "/api/auth/line-prepare",
  "/api/auth/line-callback",
  "/api/auth/callback",
  "/terms",
  "/privacy",
  "/api/analytics/collect",
];

describe("isBetaEndExcludedPath", () => {
  it.each(EXCLUDED_PATHS)("returns true for %s", (pathname) => {
    expect(isBetaEndExcludedPath(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/missions",
    "/administrator",
    "/api/analytics/other",
    "/api/users/abc/activity-timeline",
  ])("returns false for %s", (pathname) => {
    expect(isBetaEndExcludedPath(pathname)).toBe(false);
  });
});

describe("createBetaEndApiResponse", () => {
  it("returns a 503 JSON response", async () => {
    const response = createBetaEndApiResponse();

    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toBe("service_unavailable");
    expect(body.message).toBe("ベータ期間は終了しました。");
  });

  it("includes Retry-After header", () => {
    expect(createBetaEndApiResponse().headers.get("Retry-After")).toBe("3600");
  });

  it("includes Cache-Control no-store header", () => {
    expect(createBetaEndApiResponse().headers.get("Cache-Control")).toBe(
      "no-store",
    );
  });
});

describe("createBetaEndRedirectResponse", () => {
  it("redirects to /beta-ended with 307", () => {
    const response = createBetaEndRedirectResponse(createRequest("/missions"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(new URL(location!).pathname).toBe("/beta-ended");
  });

  it("strips search params from redirect URL", () => {
    const response = createBetaEndRedirectResponse(
      createRequest("/missions?foo=1"),
    );

    const location = response.headers.get("location");
    expect(new URL(location!).search).toBe("");
  });

  it("keeps only preview=beta-end when the original URL has it", () => {
    const response = createBetaEndRedirectResponse(
      createRequest("/missions?preview=beta-end&foo=1"),
    );

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/beta-ended");
    expect(location.search).toBe("?preview=beta-end");
    expect(location.searchParams.get("foo")).toBeNull();
  });
});

describe("createBetaEndNotFoundResponse", () => {
  it("returns an empty 404 response", () => {
    const response = createBetaEndNotFoundResponse();

    expect(response.status).toBe(404);
    expect(response.body).toBeNull();
  });
});

describe("resolveBetaEndResponse", () => {
  beforeEach(() => {
    mockShouldShowBetaEnd.mockReset();
  });

  describe("when the beta has ended", () => {
    beforeEach(() => {
      mockShouldShowBetaEnd.mockReturnValue(true);
    });

    it("redirects normal pages to /beta-ended with 307", () => {
      const response = resolveBetaEndResponse(createRequest("/missions"));

      expect(response).not.toBeNull();
      expect(response!.status).toBe(307);
      const location = new URL(response!.headers.get("location")!);
      expect(location.pathname).toBe("/beta-ended");
      expect(location.search).toBe("");
    });

    it("keeps preview=beta-end on the redirect target", () => {
      const response = resolveBetaEndResponse(
        createRequest("/missions?preview=beta-end&foo=1"),
      );

      const location = new URL(response!.headers.get("location")!);
      expect(location.pathname).toBe("/beta-ended");
      expect(location.search).toBe("?preview=beta-end");
    });

    it.each([
      "/api/batch/backfill-missing-xp",
      "/api/users/abc/activity-timeline",
      "/api/mcp",
    ])("returns 503 for API request %s", async (pathname) => {
      const response = resolveBetaEndResponse(createRequest(pathname));

      expect(response).not.toBeNull();
      expect(response!.status).toBe(503);

      const body = await response!.json();
      expect(body.error).toBe("service_unavailable");
    });

    it.each(EXCLUDED_PATHS)("returns null for excluded path %s", (pathname) => {
      expect(resolveBetaEndResponse(createRequest(pathname))).toBeNull();
    });

    it("returns null for /beta-ended itself", () => {
      expect(resolveBetaEndResponse(createRequest("/beta-ended"))).toBeNull();
    });

    it("returns null for /beta-ended with preview=beta-end", () => {
      expect(
        resolveBetaEndResponse(createRequest("/beta-ended?preview=beta-end")),
      ).toBeNull();
    });

    it("redirects non-GET requests the same way", () => {
      const response = resolveBetaEndResponse(
        createRequest("/missions", { method: "POST" }),
      );

      expect(response!.status).toBe(307);
      expect(new URL(response!.headers.get("location")!).pathname).toBe(
        "/beta-ended",
      );
    });

    it("redirects static HTML such as /welcome.html", () => {
      const response = resolveBetaEndResponse(createRequest("/welcome.html"));

      expect(response!.status).toBe(307);
      expect(new URL(response!.headers.get("location")!).pathname).toBe(
        "/beta-ended",
      );
    });
  });

  describe("when the beta has not ended", () => {
    beforeEach(() => {
      mockShouldShowBetaEnd.mockReturnValue(false);
    });

    it("returns 404 for /beta-ended", () => {
      const response = resolveBetaEndResponse(createRequest("/beta-ended"));

      expect(response).not.toBeNull();
      expect(response!.status).toBe(404);
    });

    it.each([
      "/missions",
      "/api/users/abc/activity-timeline",
      "/terms",
    ])("returns null for %s", (pathname) => {
      expect(resolveBetaEndResponse(createRequest(pathname))).toBeNull();
    });
  });
});
