import { NextRequest, NextResponse } from "next/server";
import { removeTeamFromCompetition } from "../../../../../lib/services/competition";
import { handleRouteError } from "../../../../../lib/http";

/**
 * DELETE /api/competitions/[id]/teams/[teamId]
 *
 * Removes a team from a competition if no fixtures have been generated yet.
 * Response: 200 { message: "Team removed from competition successfully.", competitionId, teamId }
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: competitionId, teamId } = await params;
    const result = await removeTeamFromCompetition(competitionId, teamId);
    return NextResponse.json(
      {
        message: "Team removed from competition successfully.",
        competitionId: result.competitionId,
        teamId: result.teamId,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

