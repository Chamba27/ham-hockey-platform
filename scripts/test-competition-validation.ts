/**
 * scripts/test-competition-validation.ts
 *
 * Unit tests for the pure competition validation engine (src/app/lib/engine/competition.ts).
 *
 * Tests all boundary conditions, type guards, normalization, and shape requirements.
 * Zero database, network, or framework dependencies.
 */

import {
  validateCreateCompetitionInput,
  validateUpdateCompetitionInput,
  validateRegisterTeamInput,
} from "../src/app/lib/engine/competition";

interface TestCase {
  name: string;
  run: () => boolean;
}

const testCases: TestCase[] = [
  // 1. Name boundaries (Create)
  {
    name: "Create: Name of exactly 2 characters passes",
    run: () => {
      const res = validateCreateCompetitionInput({ name: "AB", season: "2026" });
      return res.isValid === true && res.data?.name === "AB";
    },
  },
  {
    name: "Create: Name of exactly 80 characters passes",
    run: () => {
      const name80 = "C".repeat(80);
      const res = validateCreateCompetitionInput({ name: name80, season: "2026" });
      return res.isValid === true && res.data?.name === name80;
    },
  },
  {
    name: "Create: Name of 1 character fails",
    run: () => {
      const res = validateCreateCompetitionInput({ name: "A", season: "2026" });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("between 2 and 80 characters"))
      );
    },
  },
  {
    name: "Create: Name of 81 characters fails",
    run: () => {
      const name81 = "C".repeat(81);
      const res = validateCreateCompetitionInput({ name: name81, season: "2026" });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("between 2 and 80 characters"))
      );
    },
  },
  {
    name: "Create: Whitespace-only name fails",
    run: () => {
      const res = validateCreateCompetitionInput({ name: "     ", season: "2026" });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("between 2 and 80 characters"))
      );
    },
  },
  {
    name: "Create: Trims whitespace around name and season",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "  National Hockey League  ",
        season: "  2026  ",
      });
      return (
        res.isValid === true &&
        res.data?.name === "National Hockey League" &&
        res.data?.season === "2026"
      );
    },
  },

  // 2. Season format validation
  {
    name: "Create: Season '2026' passes",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "Southern League",
        season: "2026",
      });
      return res.isValid === true && res.data?.season === "2026";
    },
  },
  {
    name: "Create: Season '2026/2027' passes",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "Southern League",
        season: "2026/2027",
      });
      return res.isValid === true && res.data?.season === "2026/2027";
    },
  },
  {
    name: "Create: Season '26' fails",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "Southern League",
        season: "26",
      });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("4-digit year or year range"))
      );
    },
  },
  {
    name: "Create: Season '2026-2027' fails",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "Southern League",
        season: "2026-2027",
      });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("4-digit year or year range"))
      );
    },
  },
  {
    name: "Create: Season 'abcd' fails",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "Southern League",
        season: "abcd",
      });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("4-digit year or year range"))
      );
    },
  },

  // 3. Types and unexpected properties
  {
    name: "Create: Non-string field types fail",
    run: () => {
      const res = validateCreateCompetitionInput({ name: 12345, season: true });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("name must be a string")) &&
        res.errors.some((e) => e.includes("season must be a string"))
      );
    },
  },
  {
    name: "Create: Unknown fields in body fail",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "Valid League",
        season: "2026",
        extraField: "not allowed",
      });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("Unknown field 'extraField'"))
      );
    },
  },
  {
    name: "Create: Multiple errors returned at once",
    run: () => {
      const res = validateCreateCompetitionInput({
        name: "A",
        season: "invalid",
      });
      return (
        res.isValid === false &&
        res.errors.length >= 2 &&
        res.errors.some((e) => e.includes("between 2 and 80 characters")) &&
        res.errors.some((e) => e.includes("4-digit year or year range"))
      );
    },
  },

  // 4. Non-object bodies across all 3 validators
  {
    name: "Create: Non-object body fails (null, string, array)",
    run: () => {
      const r1 = validateCreateCompetitionInput(null);
      const r2 = validateCreateCompetitionInput("just a string");
      const r3 = validateCreateCompetitionInput([1, 2, 3]);
      return r1.isValid === false && r2.isValid === false && r3.isValid === false;
    },
  },
  {
    name: "Update: Non-object body fails (null, string, array)",
    run: () => {
      const r1 = validateUpdateCompetitionInput(null);
      const r2 = validateUpdateCompetitionInput("just a string");
      const r3 = validateUpdateCompetitionInput([1, 2, 3]);
      return r1.isValid === false && r2.isValid === false && r3.isValid === false;
    },
  },
  {
    name: "RegisterTeam: Non-object body fails (null, string, array)",
    run: () => {
      const r1 = validateRegisterTeamInput(null);
      const r2 = validateRegisterTeamInput("just a string");
      const r3 = validateRegisterTeamInput([1, 2, 3]);
      return r1.isValid === false && r2.isValid === false && r3.isValid === false;
    },
  },

  // 5. Update (PATCH) validation
  {
    name: "Update: Empty body with zero fields fails",
    run: () => {
      const res = validateUpdateCompetitionInput({});
      return (
        res.isValid === false &&
        res.errors.some((e) =>
          e.includes("At least one field ('name' or 'season') must be provided")
        )
      );
    },
  },
  {
    name: "Update: Name-only update succeeds",
    run: () => {
      const res = validateUpdateCompetitionInput({
        name: "Southern Region Premier League",
      });
      return (
        res.isValid === true &&
        res.data?.name === "Southern Region Premier League" &&
        res.data?.season === undefined
      );
    },
  },
  {
    name: "Update: Season-only update succeeds",
    run: () => {
      const res = validateUpdateCompetitionInput({
        season: "2026/2027",
      });
      return (
        res.isValid === true &&
        res.data?.season === "2026/2027" &&
        res.data?.name === undefined
      );
    },
  },
  {
    name: "Update: Invalid name or unknown fields fail",
    run: () => {
      const r1 = validateUpdateCompetitionInput({ name: "X" });
      const r2 = validateUpdateCompetitionInput({ unknownProperty: "123" });
      return (
        r1.isValid === false &&
        r2.isValid === false &&
        r1.errors.some((e) => e.includes("between 2 and 80 characters")) &&
        r2.errors.some((e) => e.includes("Unknown field 'unknownProperty'"))
      );
    },
  },

  // 6. Register team validation
  {
    name: "RegisterTeam: Valid teamId succeeds",
    run: () => {
      const res = validateRegisterTeamInput({ teamId: "uuid-1234-abcd" });
      return res.isValid === true && res.data?.teamId === "uuid-1234-abcd";
    },
  },
  {
    name: "RegisterTeam: Missing teamId fails",
    run: () => {
      const res = validateRegisterTeamInput({});
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("teamId is required"))
      );
    },
  },
  {
    name: "RegisterTeam: Empty or whitespace-only teamId fails",
    run: () => {
      const res = validateRegisterTeamInput({ teamId: "    " });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("teamId must not be empty"))
      );
    },
  },
  {
    name: "RegisterTeam: Non-string teamId fails",
    run: () => {
      const res = validateRegisterTeamInput({ teamId: 99999 });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("teamId must be a string"))
      );
    },
  },
  {
    name: "RegisterTeam: Unknown fields fail",
    run: () => {
      const res = validateRegisterTeamInput({
        teamId: "uuid-1234",
        bonusField: "danger",
      });
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("Unknown field 'bonusField'"))
      );
    },
  },
];

function runAllTests() {
  console.log("==================================================");
  console.log("  COMPETITION VALIDATION ENGINE (UNIT TESTS)      ");
  console.log("==================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    try {
      const passed = tc.run();
      if (passed) {
        console.log(`[PASSED] ✅ ${tc.name}`);
        passedCount++;
      } else {
        console.error(`[FAILED] ❌ ${tc.name}`);
        failedCount++;
      }
    } catch (err) {
      console.error(`[FAILED] 💥 ${tc.name} (threw error: ${err})`);
      failedCount++;
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllTests();

