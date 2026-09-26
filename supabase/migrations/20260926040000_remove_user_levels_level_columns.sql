-- レベルの概念を廃止する（ポイント／XPは残す）
--
-- user_levels から level と last_notified_level を落とし、それらを返していた
-- ビュー1本と RPC 10本を level 抜きで作り直す。ポイント（XP）の額・付与
-- タイミング・並び順は一切変えない。
--
-- 定義は「全マイグレーション適用後のローカルDB」の pg_get_viewdef /
-- pg_get_functiondef から採取したものを正とし、level に関わる項目だけを
-- 落としている（RETURNS TABLE の 1 項目と、select 句の該当行のみ。計38箇所）。
-- 過去のマイグレーション記述ではなく実体から起こしているので、途中で
-- 再定義された関数も最終形を保てる。
--
-- DROP → CREATE で失われる属性は明示的に付け直す:
--   ビュー : security_invoker / COMMENT / GRANT（anon, authenticated, service_role, bq_user）
--   関数   : GRANT EXECUTE（anon, authenticated, service_role）
-- SECURITY DEFINER / STABLE / LANGUAGE は pg_get_functiondef の出力に含まれるため
-- そのまま再現される。
--
-- CASCADE は使わない。依存を先に作り直してからカラムを落とす。

-- ==============================================
-- Part 1: level を返す RPC を落とす
-- ==============================================
-- 先に pg_proc を確認し、対象10関数それぞれのシグネチャがちょうど1本であること、
-- 旧オーバーロードが無いことを確認済み。

DROP FUNCTION IF EXISTS public.get_mission_ranking(mission_id uuid, limit_count integer);
DROP FUNCTION IF EXISTS public.get_period_mission_ranking(p_mission_id uuid, p_limit integer, p_start_date timestamp with time zone, p_season_id uuid);
DROP FUNCTION IF EXISTS public.get_period_prefecture_ranking(p_prefecture text, p_limit integer, p_start_date timestamp with time zone, p_season_id uuid);
DROP FUNCTION IF EXISTS public.get_period_ranking(p_limit integer, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_season_id uuid);
DROP FUNCTION IF EXISTS public.get_prefecture_ranking(prefecture text, limit_count integer);
DROP FUNCTION IF EXISTS public.get_user_mission_ranking(mission_id uuid, user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_period_mission_ranking(p_mission_id uuid, p_user_id uuid, p_start_date timestamp with time zone, p_season_id uuid);
DROP FUNCTION IF EXISTS public.get_user_period_prefecture_ranking(p_prefecture text, p_user_id uuid, p_start_date timestamp with time zone, p_season_id uuid);
DROP FUNCTION IF EXISTS public.get_user_period_ranking(target_user_id uuid, start_date timestamp with time zone, p_season_id uuid);
DROP FUNCTION IF EXISTS public.get_user_prefecture_ranking(prefecture text, target_user_id uuid);

-- ==============================================
-- Part 2: ビューとカラムを落とす
-- ==============================================

DROP VIEW IF EXISTS public.user_ranking_view;

-- 依存（ビュー・関数）を先に落としたので CASCADE は不要
ALTER TABLE public.user_levels
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS last_notified_level;

COMMENT ON TABLE public.user_levels IS 'ユーザーの獲得ポイント情報';

-- ==============================================
-- Part 3: ビューを level 抜きで作り直す
-- ==============================================
-- 並び順（ORDER BY と ROW_NUMBER() の OVER 句）は変更しない。

CREATE VIEW public.user_ranking_view AS
 SELECT ul.user_id,
    pup.name,
    pup.address_prefecture,
    ul.xp,
    ul.updated_at,
    row_number() OVER (ORDER BY ul.xp DESC, ul.updated_at) AS rank
   FROM user_levels ul
     JOIN public_user_profiles pup ON ul.user_id = pup.id
  ORDER BY ul.xp DESC, ul.updated_at;

-- 20260415075545_fix_supabase_security_issues.sql:13 で設定していたもの。
-- 落とすとセキュリティリンターの指摘が再発し、RLSの効き方も変わる
ALTER VIEW public.user_ranking_view SET (security_invoker = true);

COMMENT ON VIEW public.user_ranking_view IS '全ユーザーのXPベースランキング';

-- DROP 前にライブDBから採取した GRANT を同じ内容で付け直す
GRANT ALL ON TABLE public.user_ranking_view TO anon;
GRANT ALL ON TABLE public.user_ranking_view TO authenticated;
GRANT ALL ON TABLE public.user_ranking_view TO service_role;
GRANT SELECT ON TABLE public.user_ranking_view TO bq_user;

-- ==============================================
-- Part 4: RPC を level 抜きで作り直す
-- ==============================================
-- 引数（名前・型・デフォルト）は変更していない。Returns から level を落とすだけ。
-- get_user_period_prefecture_ranking は本文で get_user_prefecture_ranking を
-- 呼ぶため、呼ばれる側を先に作る。

CREATE OR REPLACE FUNCTION public.get_mission_ranking(mission_id uuid, limit_count integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, user_name text, address_prefecture text, xp integer, updated_at timestamp without time zone, clear_count bigint, total_points bigint, rank bigint)
 LANGUAGE sql
AS $function$
  with mission_stats as (
    select
      a.user_id,
      count(distinct a.id) as mission_clear_count,
      coalesce(sum(xt.xp_amount), 0) as total_mission_points
    from achievements a
    left join xp_transactions xt on
      xt.user_id = a.user_id and
      xt.source_id = a.id and  -- achievementのIDと比較
      xt.source_type in ('MISSION_COMPLETION', 'BONUS')  -- BONUSも含める
    where a.mission_id = get_mission_ranking.mission_id
    group by a.user_id
  )
  select
    u.id as user_id,
    u.name as user_name,
    u.address_prefecture as address_prefecture,
    r.xp as xp,
    r.updated_at as updated_at,
    coalesce(ms.mission_clear_count, 0) as clear_count,
    coalesce(ms.total_mission_points, 0) as total_points,
    rank() over (
      order by 
        coalesce(ms.total_mission_points, 0) desc,
        coalesce(ms.mission_clear_count, 0) desc,
        u.name asc  -- 同点同回数の場合は名前順
    ) as rank
  from public_user_profiles u
  left join user_ranking_view r on u.id = r.user_id
  left join mission_stats ms on u.id = ms.user_id
  where ms.mission_clear_count > 0  -- ミッションをクリアした人のみ表示
  order by rank
  limit get_mission_ranking.limit_count;
$function$;


CREATE OR REPLACE FUNCTION public.get_period_mission_ranking(p_mission_id uuid, p_limit integer DEFAULT 10, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_season_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(mission_id uuid, user_id uuid, user_name text, address_prefecture text, user_achievement_count bigint, total_points bigint, rank bigint, xp bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    -- Season-based ranking takes priority
    IF p_season_id IS NOT NULL THEN
        RETURN QUERY
        WITH achievement_stats AS (
            SELECT
                a.user_id,
                COUNT(DISTINCT a.id) AS achievement_count,
                COALESCE(SUM(pa.posting_count), 0) AS total_posting_count,
                COALESCE(SUM(xt.xp_amount), 0) AS total_xp
            FROM achievements a
            LEFT JOIN mission_artifacts ma ON a.id = ma.achievement_id
            LEFT JOIN posting_activities pa ON ma.id = pa.mission_artifact_id
            LEFT JOIN xp_transactions xt ON xt.source_id = a.id
                AND xt.source_type IN ('MISSION_COMPLETION', 'BONUS')
            WHERE a.mission_id = p_mission_id
            AND a.season_id = p_season_id
            AND (p_start_date IS NULL OR a.created_at >= p_start_date)
            GROUP BY a.user_id
        )
        SELECT
            p_mission_id as mission_id,
            ast.user_id,
            pup.name::TEXT as user_name,
            pup.address_prefecture::TEXT,
            CASE
                WHEN ast.total_posting_count > 0 THEN ast.total_posting_count
                ELSE ast.achievement_count
            END::BIGINT as user_achievement_count,
            ast.total_xp::BIGINT as total_points,
            RANK() OVER (ORDER BY ast.total_xp DESC, ast.achievement_count DESC, pup.name ASC)::BIGINT as rank,
            ul.xp::BIGINT,
            ul.updated_at
        FROM achievement_stats ast
        JOIN public_user_profiles pup ON ast.user_id = pup.id
        LEFT JOIN user_levels ul ON ast.user_id = ul.user_id AND ul.season_id = p_season_id
        ORDER BY ast.total_xp DESC, ast.achievement_count DESC, pup.name ASC
        LIMIT p_limit;
    ELSE
        -- Legacy period-based ranking (for backward compatibility)
        RETURN QUERY
        WITH achievement_stats AS (
            SELECT
                a.user_id,
                COUNT(DISTINCT a.id) AS achievement_count,
                COALESCE(SUM(pa.posting_count), 0) AS total_posting_count,
                COALESCE(SUM(xt.xp_amount), 0) AS total_xp
            FROM achievements a
            LEFT JOIN mission_artifacts ma ON a.id = ma.achievement_id
            LEFT JOIN posting_activities pa ON ma.id = pa.mission_artifact_id
            LEFT JOIN xp_transactions xt ON xt.source_id = a.id
                AND xt.source_type IN ('MISSION_COMPLETION', 'BONUS')
            WHERE a.mission_id = p_mission_id
            AND (p_start_date IS NULL OR a.created_at >= p_start_date)
            GROUP BY a.user_id
        ),
        latest_user_levels AS (
            SELECT DISTINCT ON (ul.user_id)
                ul.user_id,
                ul.xp,
                ul.updated_at
            FROM user_levels ul
            ORDER BY ul.user_id, ul.updated_at DESC
        )
        SELECT
            p_mission_id as mission_id,
            ast.user_id,
            pup.name::TEXT as user_name,
            pup.address_prefecture::TEXT,
            CASE
                WHEN ast.total_posting_count > 0 THEN ast.total_posting_count
                ELSE ast.achievement_count
            END::BIGINT as user_achievement_count,
            ast.total_xp::BIGINT as total_points,
            RANK() OVER (ORDER BY ast.total_xp DESC, ast.achievement_count DESC, pup.name ASC)::BIGINT as rank,
            COALESCE(lul.xp, 0)::BIGINT,
            COALESCE(lul.updated_at, now()) as updated_at
        FROM achievement_stats ast
        JOIN public_user_profiles pup ON ast.user_id = pup.id
        LEFT JOIN latest_user_levels lul ON ast.user_id = lul.user_id
        ORDER BY ast.total_xp DESC, ast.achievement_count DESC, pup.name ASC
        LIMIT p_limit;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_period_prefecture_ranking(p_prefecture text, p_limit integer DEFAULT 10, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_season_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, name text, address_prefecture text, rank bigint, xp bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    -- Season-based ranking takes priority
    IF p_season_id IS NOT NULL THEN
        RETURN QUERY
        WITH season_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS season_xp_total
            FROM xp_transactions xt
            WHERE xt.season_id = p_season_id
            AND (p_start_date IS NULL OR xt.created_at >= p_start_date)
            GROUP BY xt.user_id
        ),
        ranked_users AS (
            SELECT 
                sx.user_id,
                pup.name,
                pup.address_prefecture,
                RANK() OVER (ORDER BY sx.season_xp_total DESC) AS rank,
                sx.season_xp_total AS xp,
                ul.updated_at
            FROM season_xp sx
            JOIN public_user_profiles pup ON pup.id = sx.user_id
            JOIN user_levels ul ON ul.user_id = sx.user_id AND ul.season_id = p_season_id
            WHERE pup.address_prefecture = p_prefecture
            AND sx.season_xp_total > 0
        )
        SELECT 
            ru.user_id::UUID,
            ru.name::TEXT,
            ru.address_prefecture::TEXT,
            ru.rank::BIGINT,
            ru.xp::BIGINT,
            ru.updated_at::TIMESTAMPTZ
        FROM ranked_users ru
        ORDER BY ru.rank
        LIMIT p_limit;
    ELSE
        -- Legacy period-based ranking (for backward compatibility)
        RETURN QUERY
        WITH period_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS period_xp_total
            FROM xp_transactions xt
            WHERE (p_start_date IS NULL OR xt.created_at >= p_start_date)
            GROUP BY xt.user_id
        ),
        ranked_users AS (
            SELECT 
                px.user_id,
                pup.name,
                pup.address_prefecture,
                RANK() OVER (ORDER BY px.period_xp_total DESC) AS rank,
                px.period_xp_total as xp,
                COALESCE(ul.updated_at, now()) as updated_at
            FROM period_xp px
            JOIN public_user_profiles pup ON pup.id = px.user_id
            LEFT JOIN user_levels ul ON ul.user_id = px.user_id
            WHERE pup.address_prefecture = p_prefecture
            AND px.period_xp_total > 0
        )
        SELECT 
            ru.user_id::UUID,
            ru.name::TEXT,
            ru.address_prefecture::TEXT,
            ru.rank::BIGINT,
            ru.xp::BIGINT,
            ru.updated_at::TIMESTAMPTZ
        FROM ranked_users ru
        WHERE ru.rank <= p_limit
        ORDER BY ru.rank;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_period_ranking(p_limit integer DEFAULT 10, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_season_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, address_prefecture text, name text, rank bigint, updated_at timestamp with time zone, xp bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    -- Season-based ranking with optional date filtering
    IF p_season_id IS NOT NULL THEN
        RETURN QUERY
        WITH season_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS season_xp_total
            FROM xp_transactions xt
            WHERE xt.season_id = p_season_id
                -- Apply date filters within the season if provided
                AND (p_start_date IS NULL OR xt.created_at >= p_start_date)
                AND (p_end_date IS NULL OR xt.created_at < p_end_date)
            GROUP BY xt.user_id
        ),
        ranked_users AS (
            SELECT 
                sx.user_id,
                pup.address_prefecture,
                pup.name,
                RANK() OVER (ORDER BY sx.season_xp_total DESC) AS rank,
                ul.updated_at,
                sx.season_xp_total AS xp
            FROM season_xp sx
            JOIN public_user_profiles pup ON pup.id = sx.user_id
            JOIN user_levels ul ON ul.user_id = sx.user_id AND ul.season_id = p_season_id
            WHERE sx.season_xp_total > 0
        )
        SELECT 
            ru.user_id::UUID,
            ru.address_prefecture::TEXT,
            ru.name::TEXT,
            ru.rank::BIGINT,
            ru.updated_at::TIMESTAMPTZ,
            ru.xp::BIGINT
        FROM ranked_users ru
        ORDER BY ru.rank
        LIMIT p_limit;
    ELSE
        -- Period-based ranking without season (legacy support)
        RETURN QUERY
        WITH period_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS period_xp_total
            FROM xp_transactions xt
            WHERE 
                (p_start_date IS NULL OR xt.created_at >= p_start_date)
                AND (p_end_date IS NULL OR xt.created_at < p_end_date)
            GROUP BY xt.user_id
        ),
        ranked_users AS (
            SELECT 
                px.user_id,
                pup.address_prefecture::text,
                pup.name::text,
                RANK() OVER (ORDER BY px.period_xp_total DESC)::bigint as rank,
                COALESCE(ul.updated_at, now())::timestamptz as updated_at,
                px.period_xp_total::bigint as xp
            FROM period_xp px
            JOIN public_user_profiles pup ON pup.id = px.user_id
            LEFT JOIN user_levels ul ON ul.user_id = px.user_id
            WHERE px.period_xp_total > 0
        )
        SELECT 
            ru.user_id::UUID,
            ru.address_prefecture::TEXT,
            ru.name::TEXT,
            ru.rank::BIGINT,
            ru.updated_at::TIMESTAMPTZ,
            ru.xp::BIGINT
        FROM ranked_users ru
        WHERE ru.rank <= p_limit
        ORDER BY ru.rank;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_prefecture_ranking(prefecture text, limit_count integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, user_name text, address_prefecture text, rank bigint, xp integer, updated_at timestamp with time zone)
 LANGUAGE sql
AS $function$
  with ranked_users as (
    select 
      u.id as user_id,
      u.name as user_name,
      u.address_prefecture,
      coalesce(r.xp, 0) as xp,
      r.updated_at,
      rank() over (order by coalesce(r.xp, 0) desc, r.updated_at desc) as rank
    from public_user_profiles u
    left join user_ranking_view r on u.id = r.user_id
    where u.address_prefecture = get_prefecture_ranking.prefecture
      and coalesce(r.xp, 0) > 0  -- XPが0より大きいユーザーのみ
  )
  select 
    ranked_users.user_id,
    ranked_users.user_name,
    ranked_users.address_prefecture,
    ranked_users.rank,
    ranked_users.xp,
    ranked_users.updated_at
  from ranked_users
  order by ranked_users.rank
  limit get_prefecture_ranking.limit_count
$function$;


CREATE OR REPLACE FUNCTION public.get_user_mission_ranking(mission_id uuid, user_id uuid)
 RETURNS TABLE(user_id uuid, user_name text, address_prefecture text, xp integer, updated_at timestamp without time zone, clear_count bigint, total_points bigint, rank bigint)
 LANGUAGE sql
AS $function$
  with mission_stats as (
    select
      a.user_id,
      count(distinct a.id) as mission_clear_count,
      coalesce(sum(xt.xp_amount), 0) as total_mission_points
    from achievements a
    left join xp_transactions xt on
      xt.user_id = a.user_id and
      xt.source_id = a.id and  -- achievementのIDと比較
      xt.source_type in ('MISSION_COMPLETION', 'BONUS')  -- BONUSも含める
    where a.mission_id = get_user_mission_ranking.mission_id
    group by a.user_id
  ),
  ranked_users as (
    select
      u.id as user_id,
      u.name as user_name,
      u.address_prefecture as address_prefecture,
      r.xp as xp,
      r.updated_at as updated_at,
      coalesce(ms.mission_clear_count, 0) as clear_count,
      coalesce(ms.total_mission_points, 0) as total_points,
      rank() over (
        order by 
          coalesce(ms.total_mission_points, 0) desc,
          coalesce(ms.mission_clear_count, 0) desc,
          u.name asc
      ) as rank
    from public_user_profiles u
    left join user_ranking_view r on u.id = r.user_id
    left join mission_stats ms on u.id = ms.user_id
    where ms.mission_clear_count > 0
  )
  select * from ranked_users
  where user_id = get_user_mission_ranking.user_id;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_period_mission_ranking(p_mission_id uuid, p_user_id uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_season_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(mission_id uuid, user_id uuid, user_name text, address_prefecture text, user_achievement_count bigint, total_points bigint, rank bigint, xp bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    -- Season-based ranking takes priority
    IF p_season_id IS NOT NULL THEN
        RETURN QUERY
        WITH achievement_stats AS (
            SELECT
                a.user_id,
                COUNT(DISTINCT a.id) AS achievement_count,
                COALESCE(SUM(pa.posting_count), 0) AS total_posting_count,
                COALESCE(SUM(xt.xp_amount), 0) AS total_xp
            FROM achievements a
            LEFT JOIN mission_artifacts ma ON a.id = ma.achievement_id
            LEFT JOIN posting_activities pa ON ma.id = pa.mission_artifact_id
            LEFT JOIN xp_transactions xt ON xt.source_id = a.id
                AND xt.source_type IN ('MISSION_COMPLETION', 'BONUS')
            WHERE a.mission_id = p_mission_id
            AND a.season_id = p_season_id
            AND (p_start_date IS NULL OR a.created_at >= p_start_date)
            GROUP BY a.user_id
        ),
        ranked_stats AS (
            SELECT
                p_mission_id as mission_id,
                ast.user_id,
                pup.name::TEXT as user_name,
                pup.address_prefecture::TEXT,
                CASE
                    WHEN ast.total_posting_count > 0 THEN ast.total_posting_count
                    ELSE ast.achievement_count
                END::BIGINT as user_achievement_count,
                ast.total_xp::BIGINT as total_points,
                RANK() OVER (ORDER BY ast.total_xp DESC, ast.achievement_count DESC, pup.name ASC)::BIGINT as rank,
                ul.xp::BIGINT,
                ul.updated_at
            FROM achievement_stats ast
            JOIN public_user_profiles pup ON ast.user_id = pup.id
            LEFT JOIN user_levels ul ON ast.user_id = ul.user_id AND ul.season_id = p_season_id
        )
        SELECT rs.*
        FROM ranked_stats rs
        WHERE rs.user_id = p_user_id;
    ELSE
        -- Legacy period-based ranking (for backward compatibility)
        RETURN QUERY
        WITH achievement_stats AS (
            SELECT
                a.user_id,
                COUNT(DISTINCT a.id) AS achievement_count,
                COALESCE(SUM(pa.posting_count), 0) AS total_posting_count,
                COALESCE(SUM(xt.xp_amount), 0) AS total_xp
            FROM achievements a
            LEFT JOIN mission_artifacts ma ON a.id = ma.achievement_id
            LEFT JOIN posting_activities pa ON ma.id = pa.mission_artifact_id
            LEFT JOIN xp_transactions xt ON xt.source_id = a.id
                AND xt.source_type IN ('MISSION_COMPLETION', 'BONUS')
            WHERE a.mission_id = p_mission_id
            AND (p_start_date IS NULL OR a.created_at >= p_start_date)
            GROUP BY a.user_id
        ),
        latest_user_levels AS (
            SELECT DISTINCT ON (ul.user_id)
                ul.user_id,
                ul.xp,
                ul.updated_at
            FROM user_levels ul
            ORDER BY ul.user_id, ul.updated_at DESC
        ),
        ranked_stats AS (
            SELECT
                p_mission_id as mission_id,
                ast.user_id,
                pup.name::TEXT as user_name,
                pup.address_prefecture::TEXT,
                CASE
                    WHEN ast.total_posting_count > 0 THEN ast.total_posting_count
                    ELSE ast.achievement_count
                END::BIGINT as user_achievement_count,
                ast.total_xp::BIGINT as total_points,
                RANK() OVER (ORDER BY ast.total_xp DESC, ast.achievement_count DESC, pup.name ASC)::BIGINT as rank,
                COALESCE(lul.xp, 0)::BIGINT,
                COALESCE(lul.updated_at, now()) as updated_at
            FROM achievement_stats ast
            JOIN public_user_profiles pup ON ast.user_id = pup.id
            LEFT JOIN latest_user_levels lul ON ast.user_id = lul.user_id
        )
        SELECT rs.*
        FROM ranked_stats rs
        WHERE rs.user_id = p_user_id;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_period_ranking(target_user_id uuid, start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_season_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, address_prefecture text, name text, rank bigint, updated_at timestamp with time zone, xp bigint)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    -- Season-based ranking with optional date filtering
    IF p_season_id IS NOT NULL THEN
        RETURN QUERY
        WITH season_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS season_xp_total
            FROM xp_transactions xt
            WHERE xt.season_id = p_season_id
                -- Apply date filter within the season if provided
                AND (start_date IS NULL OR xt.created_at >= start_date)
            GROUP BY xt.user_id
        ),
        all_ranked_users AS (
            SELECT 
                sx.user_id,
                pup.address_prefecture,
                pup.name,
                RANK() OVER (ORDER BY sx.season_xp_total DESC) AS rank,
                ul.updated_at,
                sx.season_xp_total AS xp
            FROM season_xp sx
            JOIN public_user_profiles pup ON pup.id = sx.user_id
            JOIN user_levels ul ON ul.user_id = sx.user_id AND ul.season_id = p_season_id
            WHERE sx.season_xp_total > 0
        )
        SELECT 
            aru.user_id::UUID,
            aru.address_prefecture::TEXT,
            aru.name::TEXT,
            aru.rank::BIGINT,
            aru.updated_at::TIMESTAMPTZ,
            aru.xp::BIGINT
        FROM all_ranked_users aru
        WHERE aru.user_id = target_user_id;
    ELSE
        -- Period-based ranking without season (legacy support)
        RETURN QUERY
        WITH period_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS period_xp_total
            FROM xp_transactions xt
            WHERE (start_date IS NULL OR xt.created_at >= start_date)
            GROUP BY xt.user_id
        ),
        all_ranked_users AS (
            SELECT 
                px.user_id,
                pup.address_prefecture::text,
                pup.name::text,
                RANK() OVER (ORDER BY px.period_xp_total DESC)::bigint as rank,
                COALESCE(ul.updated_at, now())::timestamptz as updated_at,
                px.period_xp_total::bigint as xp
            FROM period_xp px
            JOIN public_user_profiles pup ON pup.id = px.user_id
            LEFT JOIN user_levels ul ON ul.user_id = px.user_id
            WHERE px.period_xp_total > 0
        )
        SELECT 
            aru.user_id::UUID,
            aru.address_prefecture::TEXT,
            aru.name::TEXT,
            aru.rank::BIGINT,
            aru.updated_at::TIMESTAMPTZ,
            aru.xp::BIGINT
        FROM all_ranked_users aru
        WHERE aru.user_id = target_user_id;
    END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_prefecture_ranking(prefecture text, target_user_id uuid)
 RETURNS TABLE(user_id uuid, user_name text, address_prefecture text, rank bigint, xp integer, updated_at timestamp with time zone)
 LANGUAGE sql
AS $function$
  with ranked_users as (
    select 
      u.id as user_id,
      u.name as user_name,
      u.address_prefecture,
      coalesce(r.xp, 0) as xp,
      r.updated_at,
      rank() over (order by coalesce(r.xp, 0) desc, r.updated_at desc) as rank
    from public_user_profiles u
    left join user_ranking_view r on u.id = r.user_id
    where u.address_prefecture = get_user_prefecture_ranking.prefecture
      and coalesce(r.xp, 0) > 0  -- XPが0より大きいユーザーのみ
  )
  select 
    ranked_users.user_id,
    ranked_users.user_name,
    ranked_users.address_prefecture,
    ranked_users.rank,
    ranked_users.xp,
    ranked_users.updated_at
  from ranked_users
  where ranked_users.user_id = get_user_prefecture_ranking.target_user_id
  order by ranked_users.rank;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_period_prefecture_ranking(p_prefecture text, p_user_id uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_season_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, name text, address_prefecture text, rank bigint, xp bigint, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    -- Season-based ranking takes priority
    IF p_season_id IS NOT NULL THEN
        RETURN QUERY
        WITH season_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS season_xp_total
            FROM xp_transactions xt
            WHERE xt.season_id = p_season_id
            AND (p_start_date IS NULL OR xt.created_at >= p_start_date)
            GROUP BY xt.user_id
        ),
        all_ranked_users AS (
            SELECT 
                sx.user_id,
                pup.name,
                pup.address_prefecture,
                RANK() OVER (ORDER BY sx.season_xp_total DESC) AS rank,
                sx.season_xp_total AS xp,
                ul.updated_at
            FROM season_xp sx
            JOIN public_user_profiles pup ON pup.id = sx.user_id
            JOIN user_levels ul ON ul.user_id = sx.user_id AND ul.season_id = p_season_id
            WHERE pup.address_prefecture = p_prefecture
            AND sx.season_xp_total > 0
        )
        SELECT 
            aru.user_id::UUID,
            aru.name::TEXT,
            aru.address_prefecture::TEXT,
            aru.rank::BIGINT,
            aru.xp::BIGINT,
            aru.updated_at::TIMESTAMPTZ
        FROM all_ranked_users aru
        WHERE aru.user_id = p_user_id;
    ELSE
        -- Legacy period-based ranking (for backward compatibility)
        RETURN QUERY
        WITH period_xp AS (
            SELECT 
                xt.user_id,
                SUM(xt.xp_amount) AS period_xp_total
            FROM xp_transactions xt
            WHERE (p_start_date IS NULL OR xt.created_at >= p_start_date)
            GROUP BY xt.user_id
        ),
        all_ranked_users AS (
            SELECT 
                px.user_id,
                pup.name,
                pup.address_prefecture,
                RANK() OVER (ORDER BY px.period_xp_total DESC) AS rank,
                px.period_xp_total as xp,
                COALESCE(ul.updated_at, now()) as updated_at
            FROM period_xp px
            JOIN public_user_profiles pup ON pup.id = px.user_id
            LEFT JOIN user_levels ul ON ul.user_id = px.user_id
            WHERE pup.address_prefecture = p_prefecture
            AND px.period_xp_total > 0
        )
        SELECT 
            aru.user_id::UUID,
            aru.name::TEXT,
            aru.address_prefecture::TEXT,
            aru.rank::BIGINT,
            aru.xp::BIGINT,
            aru.updated_at::TIMESTAMPTZ
        FROM all_ranked_users aru
        WHERE aru.user_id = p_user_id;
    END IF;
END;
$function$;

-- ==============================================
-- Part 5: 関数の実行権限を付け直す
-- ==============================================
-- DROP で失われるため。元は PUBLIC のほか anon / authenticated / service_role に
-- EXECUTE が付いていた（PUBLIC分は CREATE 時の既定で復元される）。

GRANT EXECUTE ON FUNCTION public.get_mission_ranking(mission_id uuid, limit_count integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_period_mission_ranking(p_mission_id uuid, p_limit integer, p_start_date timestamp with time zone, p_season_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_period_prefecture_ranking(p_prefecture text, p_limit integer, p_start_date timestamp with time zone, p_season_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_period_ranking(p_limit integer, p_start_date timestamp with time zone, p_end_date timestamp with time zone, p_season_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_prefecture_ranking(prefecture text, limit_count integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_mission_ranking(mission_id uuid, user_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_period_mission_ranking(p_mission_id uuid, p_user_id uuid, p_start_date timestamp with time zone, p_season_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_period_prefecture_ranking(p_prefecture text, p_user_id uuid, p_start_date timestamp with time zone, p_season_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_period_ranking(target_user_id uuid, start_date timestamp with time zone, p_season_id uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_prefecture_ranking(prefecture text, target_user_id uuid) TO anon, authenticated, service_role;
