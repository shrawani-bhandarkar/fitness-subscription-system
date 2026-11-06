import assert from "node:assert/strict";
import test from "node:test";
import Plan from "../models/Plan.js";

function makePlan(overrides = {}) {
  return new Plan({
    name: "Test Fitness Plan",
    durationMonths: 3,
    baseMonthlyPrice: 10_000,
    ...overrides,
  });
}

test("Plan model defaults to active with no discount or benefits", () => {
  const plan = makePlan();

  assert.equal(plan.isActive, true);
  assert.equal(plan.discountPercentage, 0);
  assert.deepEqual(plan.benefits, []);
});

test("Plan model rejects invalid duration, price, discount, and benefits", async () => {
  const cases = [
    { durationMonths: 1.5, expectedPath: "durationMonths" },
    { durationMonths: 61, expectedPath: "durationMonths" },
    { baseMonthlyPrice: 0, expectedPath: "baseMonthlyPrice" },
    { baseMonthlyPrice: Number.MAX_SAFE_INTEGER + 1, expectedPath: "baseMonthlyPrice" },
    { discountPercentage: 100, expectedPath: "discountPercentage" },
    { benefits: Array.from({ length: 21 }, (_, index) => `Benefit ${index}`), expectedPath: "benefits" },
    { benefits: ["x".repeat(121)], expectedPath: "benefits" },
    { benefits: ["   "], expectedPath: "benefits" },
  ];

  for (const { expectedPath, ...overrides } of cases) {
    await assert.rejects(makePlan(overrides).validate(), (error) => {
      assert.ok(error.errors[expectedPath], `${expectedPath} should be invalid`);
      return true;
    });
  }
});
