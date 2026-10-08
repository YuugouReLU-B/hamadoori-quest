import { redirect } from "next/navigation";
import type { Message } from "@/components/common/form-message";
import { getProfile, getUser } from "@/features/user-profile/services/profile";
import ProfileForm from "@/features/user-settings/components/profile-form";

type ProfileSettingsPageSearchParams = {
  new: string;
} & Message;

/**
 * 新規登録直後（?new=true）専用のページ。
 * それ以外のプロフィール編集は /users/[id]（マイページ）下部へ移した。
 */
export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<ProfileSettingsPageSearchParams | undefined>;
}) {
  const params = await searchParams;

  const user = await getUser();

  if (!user) {
    return redirect("/");
  }

  const isNew = Boolean(params?.new);

  if (!isNew) {
    return redirect(`/users/${user.id}`);
  }

  const publicUser = await getProfile(user.id);

  // 登録直後はトップではなく初回クエストクリア画面へ送る
  const nextUrlAfterSignup = "/welcome";

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="w-full max-w-md">
        <ProfileForm
          message={params}
          isNew={true}
          // LINEの表示名（本名のことが多い）を初期値にすると、そのまま登録して
          // 本名が公開されてしまう。ニックネームは利用者に一から入力してもらう
          initialProfile={{
            name: publicUser?.name || "",
          }}
          nextUrlAfterSignup={nextUrlAfterSignup}
        />
      </div>
    </div>
  );
}
