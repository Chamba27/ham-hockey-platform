import { NextRequest, NextResponse } from "next/server";
import { recordFixtureResult } from "../../../../lib/services/result";

/**
 * POST /api/fixtures/[id]/result
 *
 * Records (or corrects) the score for a single fixture, and marks it
 * COMPLETED. A body IS required here — there's no sensible default
 * for a score.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: fixtureId } = await params;

  let body: { homeScore?: unknown; awayScore?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON with homeScore and awayScore." },
      { status: 400 }
    );
  }

  if (typeof body.homeScore !== "number" || typeof body.awayScore !== "number") {
    return NextResponse.json(
      { error: "Both homeScore and awayScore are required and must be numbers." },
      { status: 400 }
    );
  }

  try {
    const result = await recordFixtureResult(fixtureId, {
      homeScore: body.homeScore,
      awayScore: body.awayScore,
    });

    return NextResponse.json(
      { message: "Result recorded successfully.", result },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";

    if (message.startsWith("Fixture not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("non-negative integer")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("Recording result failed:", error);
    return NextResponse.json(
      { error: "Something went wrong recording the result." },
      { status: 500 }
    );
  }
}