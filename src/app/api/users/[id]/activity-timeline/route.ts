import { type NextRequest, NextResponse } from "next/server";
import { getUserActivityTimeline } from "@/features/user-activity/services/timeline";
import { getUser } from "@/features/user-profile/services/profile";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit")) || 20;
    const offset = Number(searchParams.get("offset")) || 0;
    const seasonId = searchParams.get("seasonId") || undefined;

    const { id } = await params;

    // 活動タイムライン（どのクエストをいつ達成したか）は本人にだけ返す。
    // 他人のものは存在も伏せる
    const viewer = await getUser();
    if (viewer?.id !== id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const timeline = await getUserActivityTimeline(id, limit, offset, seasonId);

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error("Failed to fetch activity timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity timeline" },
      { status: 500 },
    );
  }
}
