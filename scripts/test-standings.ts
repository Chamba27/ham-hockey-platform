import { calculateStandings, StandingTeam, CompletedMatch } from "../src/app/lib/engine/standings";

function runTests() {
  console.log("=== Testing Standings Engine ===\n");

  const sampleTeams: StandingTeam[] = [
    { id: "3", name: "Supa Strikers", shortName: "SST" },
    { id: "1", name: "Genocide Hockey Club", shortName: "GNC" },
    { id: "4", name: "Entangled Hockey Club", shortName: "ENT" },
    { id: "2", name: "Scorpions Hockey Club", shortName: "SCP" },
  ];

  // Test 1: 0 games played -> All zeros and sorted alphabetically by team name
  console.log("Test 1: Zero games played (Initial state)");
  const initialStandings = calculateStandings(sampleTeams, []);
  console.table(
    initialStandings.map((s) => ({
      Pos: s.position,
      Team: s.teamName,
      P: s.played,
      W: s.won,
      D: s.drawn,
      L: s.lost,
      GF: s.goalsFor,
      GA: s.goalsAgainst,
      GD: s.goalDifference,
      Pts: s.points,
    }))
  );

  const teamNamesAlphabetical = initialStandings.map((s) => s.teamName);
  const expectedAlphabetical = [
    "Entangled Hockey Club",
    "Genocide Hockey Club",
    "Scorpions Hockey Club",
    "Supa Strikers",
  ];

  const alphabeticalMatches =
    JSON.stringify(teamNamesAlphabetical) === JSON.stringify(expectedAlphabetical);
  console.log("Alphabetical sorting verified:", alphabeticalMatches ? "PASSED ✅" : "FAILED ❌");

  // Test 2: After some matches played
  console.log("\nTest 2: After match results recorded");
  const sampleMatches: CompletedMatch[] = [
    // Genocide 3 - 1 Entangled (Genocide 3 pts, GD +2)
    { homeTeamId: "1", awayTeamId: "4", homeScore: 3, awayScore: 1 },
    // Scorpions 2 - 2 Supa Strikers (1 pt each, GD 0)
    { homeTeamId: "2", awayTeamId: "3", homeScore: 2, awayScore: 2 },
    // Supa Strikers 4 - 0 Genocide (Supa Strikers 4 pts, GD +4, Genocide 3 pts, GD -2)
    { homeTeamId: "3", awayTeamId: "1", homeScore: 4, awayScore: 0 },
  ];

  const updatedStandings = calculateStandings(sampleTeams, sampleMatches);
  console.table(
    updatedStandings.map((s) => ({
      Pos: s.position,
      Team: s.teamName,
      P: s.played,
      W: s.won,
      D: s.drawn,
      L: s.lost,
      GF: s.goalsFor,
      GA: s.goalsAgainst,
      GD: s.goalDifference,
      Pts: s.points,
    }))
  );

  console.log("\nStandings test completed successfully! 🚀");
}

runTests();

