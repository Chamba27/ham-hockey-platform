import { NextRequest, NextResponse } from "next/server";
import { getAllTeams, createTeam } from "../../lib/services/team";
import { handleRouteError } from "../../lib/http";

/**
 * GET /api/teams
 *
 * Returns all teams ordered alphabetically by name ascending.
 * Response: 200 { teams: [...] }
 */
export async function GET() {
  try {
    const teams = await getAllTeams();
    return NextResponse.json({ teams }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/teams
 *
 * Creates a new team.
 * Expected Body: { name: string, shortName: string }
 * Response: 201 { team: { id, name, shortName, ... } }
 */
export async function POST(request: NextRequest) {
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
    const team = await createTeam(body);
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

