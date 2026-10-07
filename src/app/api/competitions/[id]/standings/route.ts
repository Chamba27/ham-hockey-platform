import { NextRequest, NextResponse } from "next/server";
import { getCompetitionStandings } from "../../../../lib/services/standings";

/**
 * GET /api/competitions/[id]/standings
 *
 * Returns dynamic league standings calculated on-the-fly from
 * registered competition teams and completed fixture results.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: competitionId } = await params;

  try {
    const data = await getCompetitionStandings(competitionId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    if (message.startsWith("Competition not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("Failed to calculate standings:", error);
    return NextResponse.json(
      { error: "Something went wrong calculating standings." },
      { status: 500 }
    );
  }
}

