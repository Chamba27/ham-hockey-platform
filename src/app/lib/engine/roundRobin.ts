/**
 * lib/engine/roundRobin.ts
 *
 * Pure round-robin fixture scheduling engine.
 *
 * Domain-isolated: no Prisma, no Next.js, no I/O. Takes a list of team IDs
 * and returns a list of fixtures with round numbers. Safe to unit test in
 * isolation and safe to call from any layer (API route, server action, script).
 */

export interface GeneratedFixture {
  homeTeamId: string;
  awayTeamId: string;
  round: number;
}

export interface GeneratorOptions {
  /** Default: true (Home & Away legs) */
  doubleRoundRobin?: boolean;
}

/**
 * Generates a round-robin schedule using the "circle method":
 * one team is held fixed, the rest rotate around it once per round.
 * This guarantees every team meets every other team exactly once per leg.
 *
 * If the number of teams is odd, a `null` "bye" slot is added so the
 * algorithm still works — any pairing involving the bye is simply skipped,
 * which means one team sits out each round.
 */
export function generateRoundRobinFixtures(
  teamIds: string[],
  options?: GeneratorOptions
): GeneratedFixture[] {
  const doubleRoundRobin = options?.doubleRoundRobin ?? true;

  if (teamIds.length < 2) {
    return [];
  }

  // Work on a copy so we never mutate the caller's array.
  const hasBye = teamIds.length % 2 !== 0;
  const rotation: (string | null)[] = hasBye ? [...teamIds, null] : [...teamIds];

  const numTeams = rotation.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;

  const firstLegFixtures: GeneratedFixture[] = [];

  // Fix the first team in place; rotate everyone else around it.
  const fixed = rotation[0];
  let others = rotation.slice(1);

  for (let round = 1; round <= numRounds; round++) {
    const roundTeams = [fixed, ...others];

    for (let i = 0; i < half; i++) {
      const teamA = roundTeams[i];
      const teamB = roundTeams[numTeams - 1 - i];

      // Skip any pairing that involves the bye slot.
      if (teamA === null || teamB === null) {
        continue;
      }

      // Alternate which side is "home" round by round so one team doesn't
      // always get stuck away against the fixed team.
      const teamAIsHome = round % 2 !== 0;
      firstLegFixtures.push({
        homeTeamId: teamAIsHome ? teamA : teamB,
        awayTeamId: teamAIsHome ? teamB : teamA,
        round,
      });
    }

    // Rotate: move the last element of `others` to the front.
    others = [others[others.length - 1], ...others.slice(0, others.length - 1)];
  }

  if (!doubleRoundRobin) {
    return firstLegFixtures;
  }

  // Second leg: mirror every fixture with home/away swapped, offset rounds.
  const secondLegFixtures: GeneratedFixture[] = firstLegFixtures.map((fixture) => ({
    homeTeamId: fixture.awayTeamId,
    awayTeamId: fixture.homeTeamId,
    round: fixture.round + numRounds,
  }));

  return [...firstLegFixtures, ...secondLegFixtures];
}
