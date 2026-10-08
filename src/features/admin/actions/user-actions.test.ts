import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { deleteAccountByAdmin } from "@/features/user-profile/services/profile";
import { deleteUserByAdmin } from "./user-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/features/admin/services/authorize-admin");
jest.mock("@/features/user-profile/services/profile", () => ({
  deleteAccountByAdmin: jest.fn(),
}));
jest.mock("@/lib/supabase/adminClient", () => ({
  createAdminClient: jest.fn(),
}));

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const TARGET_ID = "00000000-0000-0000-0000-000000000002";

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(requireAdmin)
    .mockResolvedValue({ id: ADMIN_ID } as Awaited<
      ReturnType<typeof requireAdmin>
    >);
  jest.mocked(deleteAccountByAdmin).mockResolvedValue(undefined);
});

describe("deleteUserByAdmin", () => {
  it("管理者は他のユーザーを退会させられる", async () => {
    expect(await deleteUserByAdmin(TARGET_ID)).toEqual({ success: true });

    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(deleteAccountByAdmin).toHaveBeenCalledWith(TARGET_ID);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("管理者でなければ例外になり、削除しない", async () => {
    jest
      .mocked(requireAdmin)
      .mockRejectedValue(new Error("管理者権限が必要です"));

    await expect(deleteUserByAdmin(TARGET_ID)).rejects.toThrow(
      "管理者権限が必要です",
    );
    expect(deleteAccountByAdmin).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("自分自身は退会させられない", async () => {
    const result = await deleteUserByAdmin(ADMIN_ID);

    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(deleteAccountByAdmin).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("削除に失敗したらエラーを返す", async () => {
    jest
      .mocked(deleteAccountByAdmin)
      .mockRejectedValue(new Error("退会処理に失敗しました"));

    const result = await deleteUserByAdmin(TARGET_ID);

    expect(result).toEqual({
      success: false,
      error: "ユーザーの削除に失敗しました",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
