/**
 * 外部の地図アプリへのリンク。
 *
 * 端末の標準の地図アプリ（iOSならマップ、AndroidならGoogleマップ）が
 * 開くように、緯度経度で検索するURLを組む。
 */
export function googleMapsSearchUrl(
  latitude: number,
  longitude: number,
): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * クエストから開く地図リンク。
 *
 * 管理画面で入れたGoogleマップの共有URLがあればそれを使う。座標から組んだ
 * 検索URLは店名も営業情報も出ない素のピンになってしまうため、場所が特定
 * できる共有URLの方を優先する。
 */
export function questMapHref(
  googleMapUrl: string | null | undefined,
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (googleMapUrl) return googleMapUrl;
  if (latitude === null || longitude === null) return null;
  return googleMapsSearchUrl(latitude, longitude);
}
