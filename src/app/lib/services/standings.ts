/**
 * src/app/lib/services/standings.ts
 *
 * Persistence bridge: loads competition teams and completed match results
 * from Prisma, then invokes the pure standings engine.
 */

import { prisma } from "../prisma";
import {
  calculateStandings,
  StandingTeam,
  CompletedMatch,
  TeamStanding,
} from "../engine/standings";

export interface CompetitionStandingsResult {
  competition: {
    id: string;
    name: string;
    season: string;
  };
  standings: TeamStanding[];
}

export async function getCompetitionStandings(
  competitionId: string
): Promise<CompetitionStandingsResult> {
  // 1. Fetch competition
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: { id: true, name: true, season: true },
  });

  if (!competition) {
    throw new Error(`Competition not found: ${competitionId}`);
  }

  // 2. Fetch all teams registered in this competition
  const competitionTeams = await prisma.competitionTeam.findMany({
    where: { competitionId },
    include: {
      team: {
        select: { id: true, name: true, shortName: true },
      },
    },
  });

  const teams: StandingTeam[] = competitionTeams.map((ct) => ({
    id: ct.team.id,
    name: ct.team.name,
    shortName: ct.team.shortName,
  }));

  // 3. Fetch all completed fixtures with their recorded results
  const completedFixtures = await prisma.fixture.findMany({
    where: {
      competitionId,
      status: "COMPLETED",
      result: {
        isNot: null,
      },
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      result: {
        select: {
          homeScore: true,
          awayScore: true,
        },
      },
    },
  });

  const matches: CompletedMatch[] = completedFixtures
    .filter((f) => f.result !== null)
    .map((f) => ({
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      homeScore: f.result!.homeScore,
      awayScore: f.result!.awayScore,
    }));

  // 4. Compute standings dynamically
  const standings = calculateStandings(teams, matches);

  return {
    competition,
    standings,
  };
}

