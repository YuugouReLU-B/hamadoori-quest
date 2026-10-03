import { randomUUID } from "node:crypto";
import {
  importMissionCsvRows,
  parseMissionCsv,
} from "@/features/admin/services/mission-csv-import";
import { adminClient } from "./utils";

describe("importMissionCsvRows", () => {
  const missionIds: string[] = [];
  let categoryId: string;
  const categorySlug = `test-category-${Date.now()}`;

  beforeAll(async () => {
    categoryId = randomUUID();
    const { error } = await adminClient.from("mission_category").insert({
      id: categoryId,
      slug: categorySlug,
      category_title: "テストカテゴリ",
      sort_no: 9999,
      category_kbn: "DEFAULT",
    });
    if (error) throw new Error(`テストカテゴリの作成に失敗: ${error.message}`);
  });

  afterAll(async () => {
    for (const missionId of missionIds) {
      await adminClient
        .from("mission_category_link")
        .delete()
        .eq("mission_id", missionId);
      await adminClient
        .from("mission_qr_codes")
        .delete()
        .eq("mission_id", missionId);
      await adminClient.from("missions").delete().eq("id", missionId);
    }
    await adminClient.from("mission_category").delete().eq("id", categoryId);
  });

  test("QR行は取り込まない（新しく作れるのは位置情報チェックインだけ）", async () => {
    const slug = `csv-import-qr-${Date.now()}`;
    const csv = [
      "slug,title,content,required_artifact_type,points,difficulty,event_date,latitude,longitude,radius_meters,icon_url,category_slug,is_featured,is_hidden",
      `${slug},CSVインポートQR,,QR,200,1,,,,,,${categorySlug},false,true`,
    ].join("\n");

    const rows = parseMissionCsv(csv);
    const result = await importMissionCsvRows(adminClient, rows);

    expect(result.succeeded).toEqual([]);
    expect(result.failed[0].errors.join(" ")).toContain("GEO_CHECKINのみ");

    const { data: mission } = await adminClient
      .from("missions")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    expect(mission).toBeNull();
  });

  test("GEO_CHECKIN行を登録できる（QRコードは発行しない）", async () => {
    const slug = `csv-import-geo-${Date.now()}`;
    const csv = [
      "slug,title,content,required_artifact_type,points,difficulty,event_date,latitude,longitude,radius_meters,icon_url,category_slug,is_featured,is_hidden",
      `${slug},CSVインポートGEO,,GEO_CHECKIN,100,1,,37.4,140.9,300,,${categorySlug},false,true`,
    ].join("\n");

    const rows = parseMissionCsv(csv);
    const result = await importMissionCsvRows(adminClient, rows);

    expect(result.failed).toEqual([]);
    const missionId = result.succeeded[0].missionId;
    missionIds.push(missionId);

    const { data: qr } = await adminClient
      .from("mission_qr_codes")
      .select("code")
      .eq("mission_id", missionId)
      .maybeSingle();
    expect(qr).toBeNull();
  });

  test("存在しないcategory_slugは行エラーになる", async () => {
    const slug = `csv-import-badcat-${Date.now()}`;
    const csv = [
      "slug,title,content,required_artifact_type,points,difficulty,event_date,latitude,longitude,radius_meters,icon_url,category_slug,is_featured,is_hidden",
      `${slug},存在しないカテゴリ,,GEO_CHECKIN,200,1,,37.4,140.9,300,,no-such-category,false,true`,
    ].join("\n");

    const rows = parseMissionCsv(csv);
    const result = await importMissionCsvRows(adminClient, rows);

    expect(result.succeeded).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].errors.join(" ")).toContain(
      "カテゴリが見つかりません",
    );
  });

  test("同じslugを再登録するとエラーになる", async () => {
    const slug = `csv-import-dup-${Date.now()}`;
    const csv = [
      "slug,title,content,required_artifact_type,points,difficulty,event_date,latitude,longitude,radius_meters,icon_url,category_slug,is_featured,is_hidden",
      `${slug},重複テスト,,GEO_CHECKIN,200,1,,37.4,140.9,300,,${categorySlug},false,true`,
    ].join("\n");

    const rows = parseMissionCsv(csv);
    const first = await importMissionCsvRows(adminClient, rows);
    missionIds.push(first.succeeded[0].missionId);

    const second = await importMissionCsvRows(adminClient, rows);

    expect(second.succeeded).toEqual([]);
    expect(second.failed[0].errors.join(" ")).toContain(
      "そのslugは既に使われています",
    );
  });
});
