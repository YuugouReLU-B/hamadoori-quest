-- サイト全体の行動計測（流入元 → 回遊経路 → 滞在/スクロール → 獲得）を自前で貯めるための基盤。
--
-- 設計方針:
--   * セッション単位の属性（流入元・端末・IP由来の地域）は analytics_sessions に1行だけ持つ。
--     イベント側に流入元を複製しないことで、GA4 の「セッションのソース/メディア」相当を
--     素直な JOIN で出せるようにする。
--   * 1アクションごとの粒度は analytics_events。seq でセッション内の順序を保証し、
--     「どういう順番でどこを通ったか」をそのまま SQL で追えるようにする。
--   * 書き込みは必ず service_role（/api/analytics/collect）経由。RLS はポリシーを一切置かず、
--     anon / authenticated からは読めも書けもしない状態にする。
--     管理画面は isAdmin 判定のうえ createAdminClient で読む。

-- ============================================
-- 1. セッション（流入元・端末・地域）
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  -- クライアント生成の UUID。sendBeacon が順不同で届いてもここで束ねられる
  id UUID PRIMARY KEY,
  -- 1st party cookie で2年保持する訪問者ID。セッションを跨いだ再訪判定に使う
  visitor_id UUID NOT NULL,
  -- セッション途中でログインした場合は後からセットされる
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 流入元
  landing_path TEXT,
  landing_query TEXT,
  referrer TEXT,
  referrer_host TEXT,
  -- direct / organic_search / social / referral / campaign / internal
  channel TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  -- 既存の ?cv= キャンペーンコード / 紹介コードと突き合わせるための控え
  campaign_code TEXT,
  referral_code TEXT,

  -- 端末
  user_agent TEXT,
  browser TEXT,
  os TEXT,
  device_type TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  timezone TEXT,

  -- 位置（IP由来。プライバシーポリシー2条のアクセスログの範囲）
  ip_address INET,
  ip_country TEXT,
  ip_region TEXT,
  ip_city TEXT,
  ip_latitude DOUBLE PRECISION,
  ip_longitude DOUBLE PRECISION,

  is_bot BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_visitor ON public.analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_user ON public.analytics_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_channel ON public.analytics_sessions(channel, started_at DESC);
-- ボットを除いた集計がダッシュボードの既定なので、そこだけ狭く張る
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_human ON public.analytics_sessions(started_at DESC) WHERE is_bot = FALSE;

CREATE TRIGGER update_analytics_sessions_updated_at
  BEFORE UPDATE ON public.analytics_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. イベント（回遊経路・滞在・スクロール・獲得）
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  -- クライアント生成。sendBeacon は再送され得るので、これを冪等キーにして二重計上を防ぐ
  event_id UUID NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  -- セッションを辿らずに訪問者単位で引けるよう非正規化して持つ
  visitor_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- タブ単位の識別子と、そのタブ内での通し番号。
  -- 1セッションが複数タブに分かれても採番が衝突しないよう、seq は「セッション内」ではなく
  -- 「タブ内」で単調増加させる。セッション全体の順序は occurred_at で並べる
  tab_id UUID NOT NULL,
  seq INTEGER NOT NULL,
  -- 1回のページ表示を束ねるID。page_view / scroll_depth / page_engagement / click が
  -- 同じ値を持つので、「このページ表示で何秒滞在し何%まで読んだか」を GROUP BY 一発で出せる
  page_view_id UUID,
  event_name TEXT NOT NULL,

  -- occurred_at はクライアント時刻（端末時計のズレを含む）、received_at はサーバ受信時刻。
  -- 集計は received_at 、経路の前後関係は seq を使う
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  page_path TEXT,
  page_query TEXT,
  page_title TEXT,
  page_referrer TEXT,

  -- 滞在とスクロール
  -- engaged_ms: タブが可視かつ操作があった時間の累計（GA4 の「エンゲージメント時間」相当）
  -- visible_ms: タブが可視だった時間の累計
  -- ms_since_page_view: 同一ページの page_view からの経過ミリ秒
  engaged_ms INTEGER,
  visible_ms INTEGER,
  ms_since_page_view INTEGER,
  -- scroll_pct: そのイベント時点の到達率、max_scroll_pct: ページ離脱までの最大到達率
  scroll_pct SMALLINT,
  max_scroll_pct SMALLINT,
  -- 可視領域の下端が到達したページ内ピクセル位置と、ページ全長
  scroll_depth_px INTEGER,
  page_height_px INTEGER,

  -- 位置情報（GPS を既に取得している画面でのみ入る。それ以外は NULL）
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_accuracy_m DOUBLE PRECISION,

  -- ページ内のどこに何ミリ秒いたか。page_engagement にのみ入る。
  --   bands    : ページを高さで10等分した各帯が画面に映っていた時間（先頭が最上部）
  --   sections : <section> や data-analytics-section 単位の滞在時間と見出し
  -- 「どの画面のどの場所にどれくらいいたか」を、ページ側のマークアップに依存せず
  -- 必ず取れるようにするため、帯（bands）を主、セクションを補助として持つ
  region_dwell JSONB,

  -- イベント固有の追加情報（mission_slug, element_path, outbound_url など）
  props JSONB NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT analytics_events_scroll_pct_range CHECK (scroll_pct IS NULL OR (scroll_pct BETWEEN 0 AND 100)),
  CONSTRAINT analytics_events_max_scroll_pct_range CHECK (max_scroll_pct IS NULL OR (max_scroll_pct BETWEEN 0 AND 100))
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_order ON public.analytics_events(session_id, occurred_at, tab_id, seq);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_view ON public.analytics_events(page_view_id) WHERE page_view_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_received_at ON public.analytics_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_received ON public.analytics_events(event_name, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_path_received ON public.analytics_events(page_path, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_props ON public.analytics_events USING GIN (props);
-- 地図系の分析用。GPS が入っている行だけ
CREATE INDEX IF NOT EXISTS idx_analytics_events_gps ON public.analytics_events(gps_latitude, gps_longitude) WHERE gps_latitude IS NOT NULL;

-- ============================================
-- 3. RLS: 読み書きとも service_role のみ
-- ============================================
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- ポリシーを定義しない = anon / authenticated からは全拒否。
-- 収集APIと管理画面は service_role（createAdminClient）で RLS をバイパスして扱う。
REVOKE ALL ON public.analytics_sessions FROM anon, authenticated;
REVOKE ALL ON public.analytics_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.analytics_events_id_seq FROM anon, authenticated;

-- ============================================
-- 4. 保持期間の掃除用関数
-- ============================================
-- プライバシーポリシー上の保管方針に合わせて呼び出す想定。
-- pg_cron 等は本番側の都合があるのでここではスケジュールしない。
CREATE OR REPLACE FUNCTION public.purge_analytics_older_than(retention_days INTEGER DEFAULT 400)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- events は session への ON DELETE CASCADE で一緒に消える
  WITH removed AS (
    DELETE FROM public.analytics_sessions
    WHERE started_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM removed;

  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_analytics_older_than(INTEGER) FROM PUBLIC, anon, authenticated;
