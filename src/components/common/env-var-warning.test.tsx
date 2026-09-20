import { render, screen } from "@testing-library/react";
import { EnvVarWarning } from "./env-var-warning";

describe("EnvVarWarning", () => {
  describe("基本的な表示", () => {
    it("環境変数警告メッセージが表示される", () => {
      render(<EnvVarWarning />);

      expect(
        screen.getByText("Supabase environment variables required"),
      ).toBeInTheDocument();
    });

    it("Sign inリンクが表示される", () => {
      render(<EnvVarWarning />);

      expect(screen.getByText("Sign in")).toBeInTheDocument();
    });
  });

  describe("リンク", () => {
    it("ログイン導線を一本化したトップを指す", () => {
      render(<EnvVarWarning />);

      const signInLink = screen.getByRole("link", { name: "Sign in" });

      expect(signInLink).toHaveAttribute("href", "/");
    });
  });

  describe("状態", () => {
    it("ボタンが無効化されている", () => {
      render(<EnvVarWarning />);

      const signInLink = screen.getByRole("link", { name: "Sign in" });

      expect(signInLink).toHaveAttribute("disabled");
    });
  });
});
