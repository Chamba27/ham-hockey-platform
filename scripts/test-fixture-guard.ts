/**
 * scripts/test-fixture-guard.ts
 *
 * Unit tests for the pure fixture guard and reset confirmation engine
 * (src/app/lib/engine/fixtureGuard.ts).
 *
 * Tests ONLY pure engine functions. Zero database, network, or framework dependencies.
 */

import {
  evaluateGenerationGuard,
  validateResetConfirmation,
} from "../src/app/lib/engine/fixtureGuard";

interface TestCase {
  name: string;
  run: () => boolean;
}

const testCases: TestCase[] = [
  // 1. Generation guard: 0 results and 0 fixtures
  {
    name: "evaluateGenerationGuard: Allowed when 0 fixtures and 0 results",
    run: () => {
      const res = evaluateGenerationGuard({ fixtureCount: 0, resultCount: 0 });
      return res.allowed === true;
    },
  },

  // 2. Generation guard: fixtures exist but 0 results
  {
    name: "evaluateGenerationGuard: Allowed when fixtures exist but 0 results are recorded",
    run: () => {
      const res = evaluateGenerationGuard({ fixtureCount: 12, resultCount: 0 });
      return res.allowed === true;
    },
  },

  // 3. Generation guard: blocked with 1 result
  {
    name: "evaluateGenerationGuard: Blocked with 1 recorded result, reason mentions count and reset",
    run: () => {
      const res = evaluateGenerationGuard({ fixtureCount: 6, resultCount: 1 });
      return (
        res.allowed === false &&
        res.reason.includes("1 match result(s)") &&
        res.reason.toLowerCase().includes("reset")
      );
    },
  },

  // 4. Generation guard: blocked with many results, with count in reason
  {
    name: "evaluateGenerationGuard: Blocked with multiple results, reason contains exact count (5)",
    run: () => {
      const res = evaluateGenerationGuard({ fixtureCount: 12, resultCount: 5 });
      return (
        res.allowed === false &&
        res.reason.includes("5 match result(s)") &&
        res.reason.toLowerCase().includes("reset")
      );
    },
  },

  // 5. Reset confirmation: "RESET" accepted
  {
    name: "validateResetConfirmation: Exact string 'RESET' is accepted",
    run: () => {
      const res = validateResetConfirmation("RESET");
      return (
        res.isValid === true &&
        res.data === "RESET" &&
        res.errors.length === 0
      );
    },
  },

  // 6. Reset confirmation rejections
  {
    name: "validateResetConfirmation: Lowercase 'reset' is rejected",
    run: () => {
      const res = validateResetConfirmation("reset");
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("'RESET'"))
      );
    },
  },
  {
    name: "validateResetConfirmation: Capitalized 'Reset' is rejected",
    run: () => {
      const res = validateResetConfirmation("Reset");
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("'RESET'"))
      );
    },
  },
  {
    name: "validateResetConfirmation: Leading-whitespace ' RESET' is rejected (no trimming trick)",
    run: () => {
      const res = validateResetConfirmation(" RESET");
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("'RESET'"))
      );
    },
  },
  {
    name: "validateResetConfirmation: Empty string '' is rejected",
    run: () => {
      const res = validateResetConfirmation("");
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("'RESET'"))
      );
    },
  },
  {
    name: "validateResetConfirmation: null is rejected with clear message",
    run: () => {
      const res = validateResetConfirmation(null);
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("null"))
      );
    },
  },
  {
    name: "validateResetConfirmation: undefined (missing) is rejected with clear message",
    run: () => {
      const res = validateResetConfirmation(undefined);
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("required"))
      );
    },
  },
  {
    name: "validateResetConfirmation: boolean true is rejected as non-string",
    run: () => {
      const res = validateResetConfirmation(true);
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("string"))
      );
    },
  },
  {
    name: "validateResetConfirmation: number 123 is rejected as non-string",
    run: () => {
      const res = validateResetConfirmation(123);
      return (
        res.isValid === false &&
        res.errors.some((e) => e.includes("string"))
      );
    },
  },
];

function runAllTests() {
  console.log("==================================================");
  console.log("  FIXTURE GUARD & RESET ENGINE (UNIT TESTS)       ");
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

