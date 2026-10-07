/**
 * src/app/lib/engine/standings.ts
 *
 * Pure standings/league table calculation engine for Field Hockey.
 *
 * Domain-isolated: no Prisma, no Next.js, no I/O.
 * Calculates points, goal difference, and ranks based on match results.
 * When no matches have been played, all teams start with 0s and are
 * ranked in alphabetical order by team name.
 */

export interface StandingTeam {
  id: string;
  name: string;
  shortName: string;
}

export interface CompletedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface TeamStanding {
  position: number;
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export const POINTS_SYSTEM = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
} as const;

/**
 * Calculates league standings dynamically from registered teams and completed match results.
 *
 * Sorting order:
 * 1. Points (descending)
 * 2. Goal Difference (descending)
 * 3. Goals For / Scored (descending)
 * 4. Team Name (alphabetical ascending)
 */
export function calculateStandings(
  teams: StandingTeam[],
  matches: CompletedMatch[]
): TeamStanding[] {
  // Initialize every team with 0 statistics
  const standingsMap = new Map<string, Omit<TeamStanding, "position">>();

  for (const team of teams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  // Accumulate results from all played matches
  for (const match of matches) {
    const home = standingsMap.get(match.homeTeamId);
    const away = standingsMap.get(match.awayTeamId);

    // If a team is not registered in this competition, skip
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      // Home win
      home.won += 1;
      home.points += POINTS_SYSTEM.WIN;
      away.lost += 1;
      away.points += POINTS_SYSTEM.LOSS;
    } else if (match.homeScore < match.awayScore) {
      // Away win
      away.won += 1;
      away.points += POINTS_SYSTEM.WIN;
      home.lost += 1;
      home.points += POINTS_SYSTEM.LOSS;
    } else {
      // Draw
      home.drawn += 1;
      home.points += POINTS_SYSTEM.DRAW;
      away.drawn += 1;
      away.points += POINTS_SYSTEM.DRAW;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  // Sort standings:
  // 1. Points DESC
  // 2. Goal Difference DESC
  // 3. Goals For DESC
  // 4. Team Name ASC (Alphabetical tie-breaker)
  const sorted = Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    return a.teamName.localeCompare(b.teamName);
  });

  // Assign 1-indexed position
  return sorted.map((entry, index) => ({
    position: index + 1,
    ...entry,
  }));
}

