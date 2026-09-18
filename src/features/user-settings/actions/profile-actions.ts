"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  extractAvatarPathFromUrl,
  shouldDeleteOldAvatar,
  validateAvatarFile,
} from "@/features/user-settings/utils/avatar-helpers";
import { sendWelcomeMail } from "@/lib/services/mail";
import { createAdminClient } from "@/lib/supabase/adminClient";
import { createClient } from "@/lib/supabase/client";
import { validateReturnUrl } from "@/lib/validation/url";
import type { MailClient } from "../types/mail-client";
import { updateProfile as updateProfileUseCase } from "../use-cases/update-profile";

export type UpdateProfileResult = {
  success: boolean;
  error?: string;
};

export type UploadAvatarResult = {
  success: boolean;
  avatarPath?: string;
  error?: string;
};

/** 本番用メールクライアント */
const prodMailClient: MailClient = {
  sendWelcomeMail: (to) => sendWelcomeMail(to),
};

export async function updateProfile(
  _previousState: UpdateProfileResult | null,
  formData: FormData,
): Promise<UpdateProfileResult | null> {
  const supabaseServiceClient = await createAdminClient();
  const supabaseClient = createClient();

  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) {
    console.error("User not found");
    return redirect("/sign-in");
  }

  // フォームデータの取得
  const name = formData.get("name")?.toString() ?? "";

  const avatar_file = formData.get("avatar") as File | null;
  const hasNewAvatarFile = !!(avatar_file && avatar_file.size > 0);

  const avatarValidation = validateAvatarFile(avatar_file);
  if (!avatarValidation.valid) {
    return {
      success: false,
      error: avatarValidation.error,
    };
  }

  // アバターに触らないフォーム（ニックネームだけの登録・編集）では、
  // 旧アバターの取得も削除もしない。以前は無条件に public_user_profiles を
  // 1件SELECTしていて、そのぶんDBとの往復が増えていた。
  // また、avatar_path を送らないフォームからの更新で
  // 既存のアバターが消える状態にもなっていた
  const touchesAvatar = hasNewAvatarFile || formData.has("avatar_path");

  let avatar_path: string | null | undefined;

  if (touchesAvatar) {
    avatar_path = (formData.get("avatar_path") as string | null) ?? null;

    const { data: publicProfile } = await supabaseServiceClient
      .from("public_user_profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    const previousAvatarUrl = publicProfile?.avatar_url || null;

    if (
      shouldDeleteOldAvatar(previousAvatarUrl, avatar_path, hasNewAvatarFile)
    ) {
      try {
        const filePath = previousAvatarUrl
          ? extractAvatarPathFromUrl(previousAvatarUrl)
          : null;

        if (filePath) {
          const { error: deleteError } = await supabaseServiceClient.storage
            .from("avatars")
            .remove([filePath]);

          if (deleteError) {
            console.error("Error deleting old avatar:", deleteError);
          }
        }
      } catch (error) {
        console.error("Error deleting old avatar:", error);
      }
    }

    if (avatar_file && hasNewAvatarFile) {
      try {
        const fileExt = avatar_file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const fileBuffer = await avatar_file.arrayBuffer();

        const { error } = await supabaseServiceClient.storage
          .from("avatars")
          .upload(fileName, fileBuffer, {
            contentType: avatar_file.type,
            upsert: true,
          });

        if (error) {
          console.error("Upload error:", error);
        }
        avatar_path = fileName;
      } catch (error) {
        console.error("Avatar upload error during profile update:", error);
      }
    }
  }

  // ユースケース呼び出し
  const result = await updateProfileUseCase(
    {
      adminSupabase: supabaseServiceClient,
      mail: prodMailClient,
    },
    {
      userId: user.id,
      email: user.email,
      name,
      avatarPath: avatar_path,
    },
  );

  if (!result.success) {
    return result;
  }

  revalidatePath("/settings/profile");
  revalidatePath(`/users/${user.id}`);

  // 新規登録時は、クライアントに戻してから router.push するのではなく
  // ここで遷移させる。往復が1回減るぶん、登録完了から次の画面までが速い
  const nextUrl = validateReturnUrl(formData.get("nextUrl")?.toString());
  if (nextUrl) {
    redirect(nextUrl);
  }

  return result;
}
