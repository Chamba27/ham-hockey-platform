import { NextRequest, NextResponse } from "next/server";
import {
  getTeamById,
  updateTeam,
  deleteTeam,
} from "../../../lib/services/team";
import { handleRouteError } from "../../../lib/http";

/**
 * GET /api/teams/[id]
 *
 * Retrieves a single team by its unique identifier.
 * Response: 200 { team }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const team = await getTeamById(id);
    return NextResponse.json({ team }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/teams/[id]
 *
 * Partially updates an existing team.
 * Expected Body: any of { name?, shortName? }, with at least one field present.
 * Response: 200 { team }
 */
export async function PATCH(
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
    const { id } = await params;
    const team = await updateTeam(id, body);
    return NextResponse.json({ team }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/teams/[id]
 *
 * Deletes a team by its unique identifier if it has no active dependencies.
 * Response: 200 { message: "Team deleted successfully.", id }
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteTeam(id);
    return NextResponse.json(
      { message: "Team deleted successfully.", id: result.id },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

