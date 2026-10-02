-- 抽選応募トークンの発行記録。
--
-- これまでトークンは userId と LOTTERY_TOKEN_SECRET から毎回導出するだけで、
-- どこにも保存していなかった。そのため、シークレットを変えると発行済みトークンと
-- 照合できなくなり、退会したユーザーのトークンも突き合わせられなかった。
-- 初めて表示した時点で1行残し、以後はこの行を正とする。
CREATE TABLE lottery_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 退会しても発行した事実は残す（応募フォームの回答と突き合わせるため）
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lottery_tokens_user_id_key UNIQUE (user_id),
  CONSTRAINT lottery_tokens_token_key UNIQUE (token)
);

COMMENT ON TABLE lottery_tokens IS '抽選応募トークンの発行記録。1ユーザー1トークン。/admin/lottery で応募フォームの回答と照合する。';
COMMENT ON COLUMN lottery_tokens.user_id IS '発行先のユーザー。退会すると NULL になり、行は残る。';
COMMENT ON COLUMN lottery_tokens.token IS '応募フォームに貼り付けてもらう文字列。全体で一意。';

ALTER TABLE lottery_tokens ENABLE ROW LEVEL SECURITY;

-- 他人のトークンが読めると応募を横取りできるので、ポリシーは作らず service_role だけに開ける
REVOKE ALL ON lottery_tokens FROM anon, authenticated;
