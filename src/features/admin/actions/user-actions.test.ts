import { revalidatePath } from "next/cache";
import {
  getDeletionCandidate,
  getUserDataCounts,
} from "@/features/admin/services/admin-user-deletion";
import { requireAdmin } from "@/features/admin/services/authorize-admin";
import { deleteAccountByAdmin } from "@/features/user-profile/services/profile";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { deleteUserDataByAdmin } from "./user-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/features/admin/services/authorize-admin");
jest.mock("@/features/user-profile/services/profile", () => ({
  deleteAccountByAdmin: jest.fn(),
}));
jest.mock("@/lib/supabase/adminClient", () => ({
  createAdminClient: jest.fn(),
}));
jest.mock("@/features/admin/services/admin-user-deletion", () => ({
  getDeletionCandidate: jest.fn(),
  getUserDataCounts: jest.fn(),
  findLeftovers: (counts: Record<string, number>) =>
    Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([table]) => table),
}));

const insertLog = jest.fn(() => ({
  select: () => ({
    single: () => Promise.resolve({ data: { id: "log-1" }, error: null }),
  }),
}));
const storageList = jest.fn().mockResolvedValue({ data: [] });
const storageRemove = jest.fn().mockResolvedValue({ error: null });

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
  jest.mocked(getDeletionCandidate).mockResolvedValue({
    id: TARGET_ID,
    name: "削除対象さん",
    createdAt: "2026-10-01T00:00:00Z",
    lastSignInAt: null,
    lineIdTail: "abcd",
  });
  jest
    .mocked(getUserDataCounts)
    .mockResolvedValueOnce({ achievements: 3, "auth.users": 1 })
    .mockResolvedValueOnce({ achievements: 0, "auth.users": 0 });
  jest.mocked(createAdminClient).mockResolvedValue({
    from: jest.fn(() => ({ insert: insertLog })),
    storage: {
      from: jest.fn(() => ({ list: storageList, remove: storageRemove })),
    },
    rpc: jest.fn().mockResolvedValue({ error: null }),
  } as unknown as Awaited<ReturnType<typeof createAdminClient>>);
});

describe("deleteUserDataByAdmin", () => {
  it("確認入力がユーザーIDと一致すれば削除し、前後の件数と記録を残す", async () => {
    const result = await deleteUserDataByAdmin(TARGET_ID, TARGET_ID);

    expect(result).toEqual({
      success: true,
      countsBefore: { achievements: 3, "auth.users": 1 },
      countsAfter: { achievements: 0, "auth.users": 0 },
      leftovers: [],
      logId: "log-1",
    });
    expect(deleteAccountByAdmin).toHaveBeenCalledWith(TARGET_ID);
    expect(insertLog).toHaveBeenCalledWith({
      admin_user_id: ADMIN_ID,
      deleted_user_id: TARGET_ID,
      counts_before: { achievements: 3, "auth.users": 1 },
      counts_after: { achievements: 0, "auth.users": 0 },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users");
  });

  it("確認入力がニックネームと一致しても削除できる", async () => {
    const result = await deleteUserDataByAdmin(TARGET_ID, " 削除対象さん ");
    expect(result.success).toBe(true);
    expect(deleteAccountByAdmin).toHaveBeenCalledWith(TARGET_ID);
  });

  it("確認入力が一致しなければ削除しない", async () => {
    const result = await deleteUserDataByAdmin(TARGET_ID, "削除対象");
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(deleteAccountByAdmin).not.toHaveBeenCalled();
    expect(insertLog).not.toHaveBeenCalled();
  });

  it("管理者でなければ例外になり、削除しない", async () => {
    jest
      .mocked(requireAdmin)
      .mockRejectedValue(new Error("管理者権限が必要です"));

    await expect(deleteUserDataByAdmin(TARGET_ID, TARGET_ID)).rejects.toThrow(
      "管理者権限が必要です",
    );
    expect(deleteAccountByAdmin).not.toHaveBeenCalled();
  });

  it("自分自身は削除できない", async () => {
    const result = await deleteUserDataByAdmin(ADMIN_ID, ADMIN_ID);
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(deleteAccountByAdmin).not.toHaveBeenCalled();
  });

  it("対象が見つからなければ削除しない", async () => {
    jest.mocked(getDeletionCandidate).mockResolvedValue(null);
    const result = await deleteUserDataByAdmin(TARGET_ID, TARGET_ID);
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(deleteAccountByAdmin).not.toHaveBeenCalled();
  });

  it("削除に失敗したらエラーを返し、記録は残さない", async () => {
    jest
      .mocked(deleteAccountByAdmin)
      .mockRejectedValue(new Error("退会処理に失敗しました"));
    const result = await deleteUserDataByAdmin(TARGET_ID, TARGET_ID);
    expect(result).toEqual({ success: false, error: expect.any(String) });
    expect(insertLog).not.toHaveBeenCalled();
  });

  it("削除後も残っているデータがあれば知らせる", async () => {
    jest
      .mocked(getUserDataCounts)
      .mockReset()
      .mockResolvedValueOnce({ achievements: 3 })
      .mockResolvedValueOnce({ achievements: 1 });
    const result = await deleteUserDataByAdmin(TARGET_ID, TARGET_ID);
    expect(result.success && result.leftovers).toEqual(["achievements"]);
  });
});
