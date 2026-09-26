import { ImageAssetGrid } from "@/features/dev-tools/components/image-asset-grid";
import {
  APP_ICON_ASSETS,
  ASSET_GROUPS,
  STATUS_LABEL,
} from "@/features/dev-tools/constants/image-assets";
import {
  listImageAssets,
  listRemoteOgpImages,
} from "@/features/dev-tools/services/image-assets";

export const dynamic = "force-dynamic";

export default async function DevImagesPage() {
  const [{ assets, missingFiles }, remoteOgp] = await Promise.all([
    listImageAssets(),
    listRemoteOgpImages(),
  ]);

  const counts = {
    replace: assets.filter((a) => a.status === "replace").length,
    recolor: assets.filter((a) => a.status === "recolor").length,
    undecided: assets.filter((a) => a.status === "undecided").length,
    keep: assets.filter((a) => a.status === "keep").length,
  };

  const unlisted = assets.filter((a) => a.group === "unlisted");

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold">画像アセット</h2>
        <p className="text-sm text-gray-600">全 {assets.length} 点</p>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        派生元から引き継いだ画像の一覧です。どこに出るか・作り直しが要るかを
        デザイン担当に渡すためのページです。
        <strong>「要差し替え」は派生元のロゴや世界観そのもの</strong>、
        <strong>
          「色の調整」は構図を流用できるが青緑が焼き込まれているもの
        </strong>
        を指します。焼き込まれた色は配色プリセットを変えても反映されません。
      </p>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["replace", "recolor", "undecided", "keep"] as const).map((key) => (
          <div key={key} className="rounded-lg border border-gray-200 p-3">
            <dt className="text-xs font-bold text-gray-600">
              {STATUS_LABEL[key]}
            </dt>
            <dd className="text-2xl font-bold">{counts[key]}</dd>
          </div>
        ))}
      </dl>

      {missingFiles.length > 0 && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-800">
            カタログに書かれているのに実ファイルが見つかりません
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
            {missingFiles.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ASSET_GROUPS.map((group) => {
        const groupAssets = assets.filter((a) => a.group === group.key);
        if (groupAssets.length === 0) return null;

        return (
          <div key={group.key} className="mb-10">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-base font-bold">{group.title}</h3>
              <p className="text-sm text-gray-500">
                {group.note} ・ {groupAssets.length} 点
              </p>
            </div>
            <ImageAssetGrid assets={groupAssets} />
          </div>
        );
      })}

      {unlisted.length > 0 && (
        <div className="mb-10">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-base font-bold">未分類</h3>
            <p className="text-sm text-gray-500">
              カタログに未登録 ・ {unlisted.length} 点
            </p>
          </div>
          <ImageAssetGrid assets={unlisted} />
        </div>
      )}

      <div className="mb-10">
        <h3 className="mb-1 text-base font-bold">アプリアイコン・ファビコン</h3>
        <p className="mb-3 text-sm text-gray-500">
          Next.js が <code>src/app</code> 直下から自動配信するため public/
          には無く、上の一覧には出ません。いずれも派生元のままです。
        </p>
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {APP_ICON_ASSETS.map((icon) => (
            <li
              key={icon.file}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
            >
              <span className="font-bold">{icon.label}</span>
              <code className="text-xs text-gray-500">{icon.file}</code>
              <span className="text-xs text-gray-600">{icon.usedIn}</span>
            </li>
          ))}
        </ul>
      </div>

      {remoteOgp.length > 0 && (
        <div className="mb-10">
          <h3 className="mb-1 text-base font-bold">
            外部ホストのOGP画像（{remoteOgp.length} 点）
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            クエストの <code>ogp_image_url</code>{" "}
            が派生元のストレージを直リンクしています。
            <strong>先方が消せば壊れます。</strong>
            画像を作り直すだけでなく、置き場所も用意する必要があります。
          </p>
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
            {remoteOgp.map(({ url, missions }) => (
              <li key={url} className="px-4 py-2.5">
                <code className="block break-all text-xs text-gray-600">
                  {url}
                </code>
                <p className="mt-1 text-xs text-gray-500">
                  {missions.join(" / ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
