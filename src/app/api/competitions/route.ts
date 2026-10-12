import { NextRequest, NextResponse } from "next/server";
import {
  getAllCompetitions,
  createCompetition,
} from "../../lib/services/competition";
import { handleRouteError } from "../../lib/http";

/**
 * GET /api/competitions
 *
 * Returns all competitions ordered by season descending, then name ascending.
 * Each entry includes teamCount and fixtureCount.
 * Response: 200 { competitions: [...] }
 */
export async function GET() {
  try {
    const competitions = await getAllCompetitions();
    return NextResponse.json({ competitions }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/competitions
 *
 * Creates a new competition.
 * Expected Body: { name: string, season: string }
 * Response: 201 { competition: { id, name, season, ... } }
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
    const competition = await createCompetition(body);
    return NextResponse.json({ competition }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

