import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { HeaderLoginLink } from "./header-login-link";

// jest.setup.js が "/" を返す実装で固定しているので、テストごとに差し替える
jest.mock("next/navigation", () => ({ usePathname: jest.fn() }));
const mockUsePathname = usePathname as jest.Mock;

describe("HeaderLoginLink", () => {
  it("トップページでは出さない（押しても同じページに戻るだけのため）", () => {
    mockUsePathname.mockReturnValue("/");

    const { container } = render(<HeaderLoginLink />);

    expect(container).toBeEmptyDOMElement();
  });

  it("下層ページではトップへの導線を出し、戻り先を渡す", () => {
    mockUsePathname.mockReturnValue("/missions/visit-turtle-cycle");

    render(<HeaderLoginLink />);

    expect(
      screen.getByRole("link", { name: "LINEで登録/ログイン" }),
    ).toHaveAttribute("href", "/?returnUrl=%2Fmissions%2Fvisit-turtle-cycle");
  });

  it("戻り先はURLエンコードする", () => {
    mockUsePathname.mockReturnValue("/users/あいう");

    render(<HeaderLoginLink />);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/?returnUrl=${encodeURIComponent("/users/あいう")}`,
    );
  });
});
