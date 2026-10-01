import "dotenv/config";
import { prisma } from "../src/app/lib/prisma";
import { generateAndSaveFixturesForCompetition } from "../src/app/lib/services/fixture";

async function main() {
  console.log("Starting fixture generation test...\n");

  // 1. Fetch the seeded competition
  const competition = await prisma.competition.findFirst({
    where: { name: "Southern Region Senior League" },
  });

  if (!competition) {
    throw new Error(
      "Seeded competition 'Southern Region Senior League' not found. Ensure database is seeded."
    );
  }

  console.log(`Found Competition: ${competition.name} (ID: ${competition.id})`);

  // 2. Generate and persist round-robin fixtures
  const result = await generateAndSaveFixturesForCompetition(competition.id, {
    doubleRoundRobin: true,
  });

  console.log(`Successfully generated and saved ${result.count} fixtures!\n`);

  // 3. Query saved fixtures with Team relations to verify structure
  const savedFixtures = await prisma.fixture.findMany({
    where: { competitionId: competition.id },
    orderBy: [{ round: "asc" }, { id: "asc" }],
    select: {
      round: true,
      homeTeam: { select: { name: true, shortName: true } },
      awayTeam: { select: { name: true, shortName: true } },
    },
  });

  // 4. Format output into a clean table
  const formattedTable = savedFixtures.map((f) => ({
    Round: `Round ${f.round}`,
    "Home Team": `${f.homeTeam.name} (${f.homeTeam.shortName})`,
    "Away Team": `${f.awayTeam.name} (${f.awayTeam.shortName})`,
  }));

  console.table(formattedTable);
}

main()
  .catch((e) => {
    console.error("Error during fixture generation script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });