import { NextRequest, NextResponse } from "next/server";
import { registerTeamForCompetition } from "../../../../lib/services/competition";
import { handleRouteError } from "../../../../lib/http";

/**
 * POST /api/competitions/[id]/teams
 *
 * Registers a team into a competition.
 * Expected Body: { teamId: string }
 * Response: 201 { competitionId, team: { id, name, shortName } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let body: unknown;

  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "Request body must not be empty." },
        { status: 400 }
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  try {
    const { id: competitionId } = await params;
    const result = await registerTeamForCompetition(competitionId, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

