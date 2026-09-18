import type { cookies } from "next/headers";

/**
 * Supabase の認証cookieから user_id を「リフレッシュを起こさずに」読み取る。
 *
 * なぜ auth.getUser() を使わないか:
 *   計測ビーコンは操作のたびに飛ぶ。ここで getUser() を呼ぶとトークンの
 *   リフレッシュが同時多発し、refresh_token のローテーションによって
 *   後発が "Invalid Refresh Token: Already Used" で失敗する。
 *   これは src/proxy.ts のコメントにあるスマホでの意図しないログアウトと同じ経路で、
 *   解析のために本番のログイン状態を壊すのは割に合わない。
 *
 * 署名検証をしていないことについて:
 *   ここで得た user_id は「どのユーザーの行動か」を後から突き合わせるための
 *   分析用の値にすぎず、認可の判断には一切使わない。
 *   偽装された場合の影響は解析データが汚れることに限られ、
 *   さらに analytics_events.user_id は auth.users への外部キー制約があるため
 *   実在しないIDは書き込み時点で弾かれる。
 */

interface SupabaseSessionCookie {
  access_token?: string;
  user?: { id?: string };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @supabase/ssr はサイズ超過時に cookie を .0 / .1 と分割して保存する */
function readAuthCookieValue(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const all = cookieStore.getAll();

  const chunks = all
    .filter(({ name }) => /^sb-.+-auth-token(\.\d+)?$/.test(name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (chunks.length === 0) return null;
  return chunks.map(({ value }) => value).join("");
}

function decodeBase64Json(value: string): unknown {
  // 新しい @supabase/ssr は "base64-" プレフィックス付きで保存する
  const payload = value.startsWith("base64-") ? value.slice(7) : value;

  try {
    return JSON.parse(payload);
  } catch {
    // JSONとして読めなければ base64 とみなす
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** JWT のペイロードから sub と exp を取り出す（署名検証はしない） */
function readJwtClaims(token: string): { sub?: string; exp?: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function readUserIdFromAuthCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): string | null {
  const raw = readAuthCookieValue(cookieStore);
  if (!raw) return null;

  const session = decodeBase64Json(raw) as SupabaseSessionCookie | null;
  if (!session) return null;

  // 期限切れのトークンは「ログアウト済み」として扱う
  if (session.access_token) {
    const claims = readJwtClaims(session.access_token);
    if (claims?.exp && claims.exp * 1000 < Date.now()) {
      return null;
    }
    if (claims?.sub && UUID_PATTERN.test(claims.sub)) {
      return claims.sub;
    }
  }

  const userId = session.user?.id;
  return typeof userId === "string" && UUID_PATTERN.test(userId)
    ? userId
    : null;
}
