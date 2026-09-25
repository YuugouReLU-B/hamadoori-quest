-- mission_artifactsのartifact_type制約にREFERREDを追加
--
-- REFERRED は「紹介されて登録した側（被紹介者）」の達成に使う。
-- 紹介した側の REFERRAL と対になる種別で、保存する内容も REFERRAL と同じく
-- text_content（被紹介者のメールアドレス）のみ。
--
-- 直前の状態は 20260416070000_add_residential_poster_artifact_type.sql が定義している。
-- CHECK制約は ALTER で項目を足せないため、DROP してから作り直す。
-- 既存の許可値は1つも落とさないこと。

-- ==============================================
-- Part 1: check_artifact_type制約にREFERREDを追加
-- ==============================================

ALTER TABLE mission_artifacts
DROP CONSTRAINT IF EXISTS check_artifact_type;

ALTER TABLE mission_artifacts
ADD CONSTRAINT check_artifact_type
CHECK (artifact_type IN ('LINK', 'TEXT', 'EMAIL', 'IMAGE', 'IMAGE_WITH_GEOLOCATION', 'REFERRAL', 'REFERRED', 'POSTING', 'POSTER', 'QUIZ', 'LINK_ACCESS', 'YOUTUBE', 'YOUTUBE_COMMENT', 'RESIDENTIAL_POSTER'));

-- ==============================================
-- Part 2: ensure_artifact_data制約にREFERREDを追加
-- REFERREDはREFERRALと同じパターン（text_contentに被紹介者のメールを保存）
-- ==============================================

ALTER TABLE mission_artifacts
DROP CONSTRAINT IF EXISTS ensure_artifact_data;

ALTER TABLE mission_artifacts
ADD CONSTRAINT ensure_artifact_data CHECK (
  (
    (
      (artifact_type = 'LINK'::text)
      AND (link_url IS NOT NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'TEXT'::text)
      AND (text_content IS NOT NULL)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
    )
    OR (
      (artifact_type = 'EMAIL'::text)
      AND (text_content IS NOT NULL)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
    )
    OR (
      (artifact_type = 'IMAGE'::text)
      AND (image_storage_path IS NOT NULL)
      AND (link_url IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'IMAGE_WITH_GEOLOCATION'::text)
      AND (image_storage_path IS NOT NULL)
      AND (link_url IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'REFERRAL'::text)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NOT NULL)
    )
    OR (
      (artifact_type = 'REFERRED'::text)
      AND (text_content IS NOT NULL)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
    )
    OR (
      (artifact_type = 'POSTING'::text)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NOT NULL)
    )
    OR (
      (artifact_type = 'POSTER'::text)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NOT NULL)
    )
    OR (
      (artifact_type = 'QUIZ'::text)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'LINK_ACCESS'::text)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'YOUTUBE'::text)
      AND (link_url IS NOT NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'YOUTUBE_COMMENT'::text)
      AND (link_url IS NOT NULL)
      AND (image_storage_path IS NULL)
      AND (text_content IS NULL)
    )
    OR (
      (artifact_type = 'RESIDENTIAL_POSTER'::text)
      AND (text_content IS NOT NULL)
      AND (link_url IS NULL)
      AND (image_storage_path IS NULL)
    )
  )
);
