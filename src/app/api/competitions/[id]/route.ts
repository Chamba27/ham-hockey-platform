import { NextRequest, NextResponse } from "next/server";
import {
  getCompetitionById,
  updateCompetition,
  deleteCompetition,
} from "../../../lib/services/competition";
import { handleRouteError } from "../../../lib/http";

/**
 * GET /api/competitions/[id]
 *
 * Retrieves a single competition by its unique identifier, including registered teams
 * ordered alphabetically by name, plus fixtureCount.
 * Response: 200 { competition }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competition = await getCompetitionById(id);
    return NextResponse.json({ competition }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * PATCH /api/competitions/[id]
 *
 * Partially updates an existing competition.
 * Expected Body: any of { name?, season? }, with at least one field present.
 * Response: 200 { competition }
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
    const competition = await updateCompetition(id, body);
    return NextResponse.json({ competition }, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * DELETE /api/competitions/[id]
 *
 * Deletes a competition by ID if it has no associated fixtures.
 * Response: 200 { message: "Competition deleted successfully.", id }
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteCompetition(id);
    return NextResponse.json(
      { message: "Competition deleted successfully.", id: result.id },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

