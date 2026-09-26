import { getCurrentSeasonId } from "@/lib/services/seasons";
import { createAdminClient } from "@/lib/supabase/adminClient";
import {
  isEmailAlreadyUsedInReferral,
  isValidReferralCode,
} from "@/lib/validation/referral";

type ReferralArtifactType = "REFERRAL" | "REFERRED";

/**
 * 紹介クエストを required_artifact_type で1件引く。
 *
 * maybeSingle() を使わないのは、同じ種別のクエストが2件以上あっても
 * 落ちずに続行したいから。件数が分かる警告を出したうえで、
 * created_at 昇順（同値なら id 昇順）の先頭を採用する。
 * limit を掛けないので、警告に出る件数は実数。
 */
async function findReferralMission(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  artifactType: ReferralArtifactType,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("missions")
    .select("id")
    .eq("required_artifact_type", artifactType)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.warn(
      `紹介クエストの取得に失敗しました（required_artifact_type=${artifactType}）:`,
      error,
    );
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  if (data.length > 1) {
    console.warn(
      `required_artifact_type=${artifactType} のクエストが ${data.length} 件見つかりました。created_at 昇順の先頭1件を使います。`,
    );
  }

  return data[0];
}

/**
 * 紹介コード経由の新規登録に対して、紹介した側と紹介された側の双方を達成扱いにする。
 *
 * 実際の書き込みは RPC grant_referral_reward に寄せてある。achievements /
 * mission_artifacts / xp_transactions / user_levels の4テーブルを1トランザクションで
 * 更新し、「両方入るか、両方入らないか」にするため。
 *
 * 付帯処理なので、失敗しても登録フロー自体は止めない（警告ログのみ）。
 */
export async function grantReferralReward(
  referralCode: string,
  email: string,
  referredUserId: string,
) {
  const serviceSupabase = await createAdminClient();

  try {
    // REFERRED の text_content は NOT NULL なので、メールが無いと付与できない
    if (!email) {
      console.warn(
        "紹介の付与をスキップしました: 被紹介者のメールアドレスが空です",
      );
      return;
    }

    const normalizedEmail = email.toLowerCase();

    const [isValid, isDuplicate] = await Promise.all([
      isValidReferralCode(referralCode),
      isEmailAlreadyUsedInReferral(normalizedEmail),
    ]);

    if (!isValid || isDuplicate) {
      return;
    }

    // referral_code は UNIQUE（20250606221700）なので maybeSingle でよい
    const { data: referrerRecord } = await serviceSupabase
      .from("user_referral")
      .select("user_id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (!referrerRecord?.user_id) {
      console.warn(
        "紹介の付与をスキップしました: 紹介コードに対応する紹介者が見つかりません",
      );
      return;
    }

    const [referrerMission, referredMission] = await Promise.all([
      findReferralMission(serviceSupabase, "REFERRAL"),
      findReferralMission(serviceSupabase, "REFERRED"),
    ]);

    if (!referrerMission) {
      console.warn(
        "紹介の付与をスキップしました: 紹介した側のクエスト（REFERRAL）が見つかりません",
      );
      return;
    }

    if (!referredMission) {
      console.warn(
        "紹介の付与をスキップしました: 紹介された側のクエスト（REFERRED）が見つかりません",
      );
      return;
    }

    const seasonId = await getCurrentSeasonId();
    if (!seasonId) {
      console.warn(
        "紹介の付与をスキップしました: 有効なシーズンが見つかりません",
      );
      return;
    }

    const { data, error } = await serviceSupabase.rpc("grant_referral_reward", {
      p_referrer_user_id: referrerRecord.user_id,
      p_referred_user_id: referredUserId,
      p_referrer_mission_id: referrerMission.id,
      p_referred_mission_id: referredMission.id,
      p_season_id: seasonId,
      p_referred_email: normalizedEmail,
    });

    if (error) {
      console.warn("紹介の付与に失敗しました:", error);
      return;
    }

    // 0行はRPC側のガード（g3a / g3b）に当たったケース
    if (!data || data.length === 0) {
      console.warn(
        "紹介の付与をスキップしました: すでに付与済みです（被紹介者の達成、または同じメールの被紹介成果物が既に存在）",
      );
      return;
    }

    const [granted] = data;
    console.info(
      `紹介の付与が完了しました: 紹介した側の達成=${granted.referrer_achievement_id} / 紹介された側の達成=${granted.referred_achievement_id}`,
    );
  } catch (error) {
    console.warn("紹介コード処理エラー:", error);
  }
}
