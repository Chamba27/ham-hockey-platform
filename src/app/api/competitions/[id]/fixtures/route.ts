import { NextRequest, NextResponse } from "next/server";
import { generateAndSaveFixturesForCompetition } from "../../../../lib/services/fixture";
import { prisma } from "../../../../lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: competitionId } = await params;

  let body: { doubleRoundRobin?: boolean } = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  try {
    const result = await generateAndSaveFixturesForCompetition(competitionId, {
      doubleRoundRobin: body.doubleRoundRobin,
    });

    return NextResponse.json(
      { message: "Fixtures generated successfully.", count: result.count },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    if (message.startsWith("Competition not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("at least 2 are required")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("Fixture generation failed:", error);
    return NextResponse.json(
      { error: "Something went wrong generating fixtures." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/competitions/[id]/fixtures
 *
 * Returns the full fixture/match schedule for a competition, in order.
 * Read-only — never changes anything, so no idempotency concerns like POST has.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: competitionId } = await params;

  const fixtures = await prisma.fixture.findMany({
    where: { competitionId },
    orderBy: [{ round: "asc" }, { id: "asc" }],
    select: {
      id: true,
      round: true,
      status: true,
      scheduledDate: true,
      homeTeam: { select: { id: true, name: true, shortName: true } },
      awayTeam: { select: { id: true, name: true, shortName: true } },
    },
  });

  return NextResponse.json({ competitionId, count: fixtures.length, fixtures });
}
