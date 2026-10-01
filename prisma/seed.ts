import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

// Get connection string from .env (DIRECT_URL or DATABASE_URL)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing DATABASE_URL or DIRECT_URL in environment variables.");
}

// Set up pg pool and Prisma driver adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Create sample HAM teams
  const teamsData = [
    { name: "Genocide Hockey Club", shortName: "GNC" },
    { name: "Entangled Hockey Club", shortName: "ENT" },
    { name: "Scorpions Hockey Club", shortName: "SCP" },
    { name: "Supa Strikers", shortName: "SST" },
  ];

  const createdTeams = [];
  for (const team of teamsData) {
    const t = await prisma.team.create({
      data: team,
    });
    createdTeams.push(t);
  }

  // 2. Create competition and link teams
  const competition = await prisma.competition.create({
    data: {
      name: "Southern Region Senior League",
      season: "2026",
      teams: {
        create: createdTeams.map((team) => ({
          teamId: team.id,
        })),
      },
    },
  });

  console.log("Seed completed successfully!");
  console.log(`Created Competition: ${competition.name} (${competition.id})`);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });