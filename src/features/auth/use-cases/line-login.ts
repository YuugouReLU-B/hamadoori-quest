import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LINE_FRIEND_METADATA_KEY } from "@/features/auth/utils/line-friend";
import { parseIdTokenPayload } from "@/lib/utils/jwt-utils";
import type { LineApiClient } from "../types/line-api-client";

export type LineLoginInput = {
  code: string;
  redirectUri: string;
  onUserCreated?: (userId: string) => Promise<void>;
};

export type LineLoginResult =
  | {
      success: true;
      userId: string;
      email: string;
      isNewUser: boolean;
      tempPassword: string;
      /** リンクされたLINE公式アカウントと友だちか。判定できない場合は null */
      isOfficialAccountFriend: boolean | null;
    }
  | { success: false; error: string };

/**
 * 友だち状態が判定できたときだけメタデータに書く。
 * 取得失敗（null）で既存の値を上書きして false にしないための分岐。
 */
function buildFriendshipMetadata(isFriend: boolean | null) {
  if (isFriend === null) return {};
  return {
    [LINE_FRIEND_METADATA_KEY]: isFriend,
    line_friendship_checked_at: new Date().toISOString(),
  };
}

export async function lineLogin(
  adminSupabase: SupabaseClient,
  lineApiClient: LineApiClient,
  input: LineLoginInput,
): Promise<LineLoginResult> {
  // 1. LINE APIでトークンと交換
  const tokens = await lineApiClient.exchangeCodeForTokens(
    input.code,
    input.redirectUri,
  );

  // 2. IDトークンからユーザー情報を取得
  if (!tokens.id_token) {
    return { success: false, error: "IDトークンが取得できませんでした" };
  }
  const userInfo = parseIdTokenPayload(tokens.id_token);
  const lineUserId = userInfo.sub as string;
  if (!lineUserId) {
    return { success: false, error: "LINEユーザーIDが取得できませんでした" };
  }

  // 公式アカウントの友だち状態。bot_prompt で友だち追加した場合はここで true になる。
  // 未リンクや取得失敗時は null（ログインは止めない）
  const isOfficialAccountFriend = await lineApiClient.getFriendshipStatus(
    tokens.access_token,
  );

  const email = (userInfo.email as string) || `line-${lineUserId}@line.local`;
  const name = (userInfo.name as string) || "LINEユーザー";
  const image = userInfo.picture as string | undefined;

  // 3. 既存ユーザーチェック
  const { data: userResults, error: userFetchError } = await adminSupabase.rpc(
    "get_user_by_line_id",
    {
      line_user_id: lineUserId,
    },
  );

  if (userFetchError) {
    throw new Error("Failed to check user existence");
  }

  const existingUser = userResults?.[0] || null;
  let userId: string;
  let isNewUser = false;
  let loginEmail = email;

  if (existingUser) {
    const metadata = existingUser.user_metadata as {
      provider?: string;
      picture?: string;
    };

    if (metadata?.provider === "line") {
      // LINEで作成されたユーザー → ログイン（メタデータ更新）
      userId = existingUser.id;
      // DB上のemailを使う（ユーザーがメール変更済みの場合に対応）
      loginEmail = (existingUser.email as string) || email;
      await adminSupabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...metadata,
          line_user_id: lineUserId,
          line_linked_at: new Date().toISOString(),
          picture: image || metadata?.picture,
          ...buildFriendshipMetadata(isOfficialAccountFriend),
        },
      });
    } else {
      // email+passwordで作成されたユーザー → エラー
      return {
        success: false,
        error: "このメールアドレスは既に登録されています。",
      };
    }
  } else {
    // 新規ユーザー。生年月日は取得しなくなったため、ここでの必須チェックは行わない
    const { data: newUser, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          sub: "",
          name,
          email,
          provider: "line",
          line_user_id: lineUserId,
          email_verified: true,
          line_linked_at: new Date().toISOString(),
          phone_verified: false,
          picture: image,
          ...buildFriendshipMetadata(isOfficialAccountFriend),
        },
      });

    if (createError || !newUser.user) {
      if (createError?.message?.includes("already been registered")) {
        return {
          success: false,
          error: "このメールアドレスは既に登録されています。",
        };
      }
      throw new Error(`Failed to create user: ${createError?.message}`);
    }

    userId = newUser.user.id;
    isNewUser = true;

    // subフィールドを設定
    await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: { ...newUser.user.user_metadata, sub: userId },
    });

    // ユーザー作成後のコールバック（ポイント情報の初期化等）
    if (input.onUserCreated) {
      await input.onUserCreated(userId);
    }
  }

  // 4. 一時パスワードを設定
  const tempPassword = randomBytes(32).toString("base64");
  const { error: passwordError } =
    await adminSupabase.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

  if (passwordError) {
    console.error("Failed to set temporary password:", passwordError);
  }

  return {
    success: true,
    userId,
    email: loginEmail,
    isNewUser,
    tempPassword,
    isOfficialAccountFriend,
  };
}
