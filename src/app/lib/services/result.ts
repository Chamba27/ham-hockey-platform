/**
 * src/app/lib/services/result.ts
 *
 * Persistence layer: records a match result against a fixture, and marks
 * that fixture as COMPLETED in the same transaction so the two never
 * drift out of sync with each other.
 */

import { prisma } from "../prisma";

export interface RecordResultInput {
  homeScore: number;
  awayScore: number;
}

export interface RecordedResult {
  fixtureId: string;
  homeScore: number;
  awayScore: number;
}

export async function recordFixtureResult(
  fixtureId: string,
  input: RecordResultInput
): Promise<RecordedResult> {
  const { homeScore, awayScore } = input;

  if (!Number.isInteger(homeScore) || homeScore < 0) {
    throw new Error("homeScore must be a non-negative integer.");
  }

  if (!Number.isInteger(awayScore) || awayScore < 0) {
    throw new Error("awayScore must be a non-negative integer.");
  }

  const fixture = await prisma.fixture.findUnique({
    where: { id: fixtureId },
    select: { id: true },
  });

  if (!fixture) {
    throw new Error(`Fixture not found: ${fixtureId}`);
  }

  const savedResult = await prisma.$transaction(async (tx) => {
    const result = await tx.result.upsert({
      where: { fixtureId },
      create: { fixtureId, homeScore, awayScore },
      update: { homeScore, awayScore },
    });

    await tx.fixture.update({
      where: { id: fixtureId },
      data: { status: "COMPLETED" },
    });

    return result;
  });

  return {
    fixtureId: savedResult.fixtureId,
    homeScore: savedResult.homeScore,
    awayScore: savedResult.awayScore,
  };
}