/**
 * scripts/test-team-validation.ts
 *
 * Unit tests for the pure team validation and normalization engine (src/app/lib/engine/team.ts).
 *
 * Runs without database or network dependencies.
 */

import {
  validateCreateTeamInput,
  validateUpdateTeamInput,
} from "../src/app/lib/engine/team";

interface TestCase {
  name: string;
  run: () => boolean;
}

const testCases: TestCase[] = [
  // 1. Valid create input
  {
    name: "Valid create input succeeds",
    run: () => {
      const result = validateCreateTeamInput({
        name: "Blantyre Hockey Club",
        shortName: "BHC",
      });
      return (
        result.isValid === true &&
        result.data?.name === "Blantyre Hockey Club" &&
        result.data?.shortName === "BHC" &&
        result.errors.length === 0
      );
    },
  },

  // 2. Trimming and uppercase normalization
  {
    name: "Trims whitespace from name and shortName, normalizes shortName to UPPERCASE",
    run: () => {
      const result = validateCreateTeamInput({
        name: "   Scorpions Hockey Club   ",
        shortName: "  scp  ",
      });
      return (
        result.isValid === true &&
        result.data?.name === "Scorpions Hockey Club" &&
        result.data?.shortName === "SCP"
      );
    },
  },

  // 3. Name length boundaries
  {
    name: "Rejects name shorter than 2 characters",
    run: () => {
      const result = validateCreateTeamInput({
        name: "A",
        shortName: "TEST",
      });
      return (
        result.isValid === false &&
        result.errors.some((e) => e.includes("between 2 and 80 characters"))
      );
    },
  },
  {
    name: "Rejects name longer than 80 characters",
    run: () => {
      const result = validateCreateTeamInput({
        name: "H".repeat(81),
        shortName: "TEST",
      });
      return (
        result.isValid === false &&
        result.errors.some((e) => e.includes("between 2 and 80 characters"))
      );
    },
  },

  // 4. shortName boundaries and pattern
  {
    name: "Rejects shortName with length < 2 or > 5 or with special characters",
    run: () => {
      const r1 = validateCreateTeamInput({ name: "Valid Team", shortName: "A" });
      const r2 = validateCreateTeamInput({ name: "Valid Team", shortName: "TOOLONG" });
      const r3 = validateCreateTeamInput({ name: "Valid Team", shortName: "A-B" });
      return (
        r1.isValid === false &&
        r2.isValid === false &&
        r3.isValid === false &&
        r1.errors.some((e) => e.includes("2 to 5 alphanumeric")) &&
        r2.errors.some((e) => e.includes("2 to 5 alphanumeric")) &&
        r3.errors.some((e) => e.includes("2 to 5 alphanumeric"))
      );
    },
  },

  // 5. Wrong types & non-object bodies
  {
    name: "Rejects non-string types and non-object body payloads",
    run: () => {
      const r1 = validateCreateTeamInput(null);
      const r2 = validateCreateTeamInput("just a string");
      const r3 = validateCreateTeamInput([1, 2, 3]);
      const r4 = validateCreateTeamInput({ name: 123, shortName: true });
      return (
        r1.isValid === false &&
        r2.isValid === false &&
        r3.isValid === false &&
        r4.isValid === false &&
        r4.errors.some((e) => e.includes("Team name must be a string")) &&
        r4.errors.some((e) => e.includes("Team shortName must be a string"))
      );
    },
  },

  // 6. Unknown / unexpected body keys
  {
    name: "Rejects unknown fields in body",
    run: () => {
      const result = validateCreateTeamInput({
        name: "Valid Team",
        shortName: "VAL",
        extraField: "malicious or unknown",
      });
      return (
        result.isValid === false &&
        result.errors.some((e) => e.includes("Unknown field 'extraField'"))
      );
    },
  },

  // 7. Returns ALL validation problems at once
  {
    name: "Returns multiple errors at once when both fields are invalid",
    run: () => {
      const result = validateCreateTeamInput({
        name: "X", // too short
        shortName: "INVALID!", // non-alphanumeric & too long
      });
      return (
        result.isValid === false &&
        result.errors.length >= 2 &&
        result.errors.some((e) => e.includes("between 2 and 80")) &&
        result.errors.some((e) => e.includes("2 to 5 alphanumeric"))
      );
    },
  },

  // 8. Update (PATCH) validation - valid single field
  {
    name: "PATCH accepts valid name-only update",
    run: () => {
      const result = validateUpdateTeamInput({
        name: "  Renamed Hockey Club  ",
      });
      return (
        result.isValid === true &&
        result.data?.name === "Renamed Hockey Club" &&
        result.data?.shortName === undefined
      );
    },
  },
  {
    name: "PATCH accepts valid shortName-only update and uppercases it",
    run: () => {
      const result = validateUpdateTeamInput({
        shortName: "  rhc  ",
      });
      return (
        result.isValid === true &&
        result.data?.shortName === "RHC" &&
        result.data?.name === undefined
      );
    },
  },

  // 9. Update (PATCH) - rejects empty body
  {
    name: "PATCH rejects empty body with zero updatable fields",
    run: () => {
      const result = validateUpdateTeamInput({});
      return (
        result.isValid === false &&
        result.errors.some((e) =>
          e.includes("At least one field ('name' or 'shortName') must be provided")
        )
      );
    },
  },

  // 10. Update (PATCH) - rejects invalid fields or unknown fields
  {
    name: "PATCH rejects invalid field values and unknown fields",
    run: () => {
      const r1 = validateUpdateTeamInput({ name: "X" });
      const r2 = validateUpdateTeamInput({ randomKey: "test" });
      return (
        r1.isValid === false &&
        r2.isValid === false &&
        r1.errors.some((e) => e.includes("between 2 and 80 characters")) &&
        r2.errors.some((e) => e.includes("Unknown field 'randomKey'"))
      );
    },
  },
];

function runAllTests() {
  console.log("==================================================");
  console.log("   TEAM VALIDATION ENGINE (UNIT TESTS)            ");
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

