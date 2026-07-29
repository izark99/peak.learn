import { describe, expect, it } from "vitest";

import { buildForecast, countDue } from "@/lib/srs/forecast";

// Local noon, so day bucketing cannot be knocked over by the test runner's
// timezone offset.
const NOW = new Date(2026, 0, 15, 12, 0, 0);

function at(dayOffset: number, hour = 12) {
  return new Date(2026, 0, 15 + dayOffset, hour, 0, 0);
}

describe("buildForecast", () => {
  it("returns one bucket per day in the window", () => {
    const forecast = buildForecast([], NOW);

    expect(forecast).toHaveLength(7);
    expect(forecast[0].label).toBe("Today");
    expect(forecast[1].label).toBe("Tomorrow");
    expect(forecast[2].label).toBe("Sat"); // 17 Jan 2026
  });

  it("counts cards into the day they fall due", () => {
    const forecast = buildForecast([at(0), at(0, 20), at(1), at(3)], NOW);

    expect(forecast[0].count).toBe(2);
    expect(forecast[1].count).toBe(1);
    expect(forecast[3].count).toBe(1);
  });

  it("folds overdue cards into today rather than dropping them", () => {
    const forecast = buildForecast([at(-30), at(-1)], NOW);

    expect(forecast[0].count).toBe(2);
  });

  it("ignores cards due beyond the window", () => {
    const forecast = buildForecast([at(7), at(40)], NOW);

    expect(forecast.reduce((sum, day) => sum + day.count, 0)).toBe(0);
  });

  it("accepts ISO strings as well as Dates", () => {
    const forecast = buildForecast([at(1).toISOString()], NOW);

    expect(forecast[1].count).toBe(1);
  });

  it("skips unparseable dates instead of throwing", () => {
    const forecast = buildForecast(["not a date", at(0)], NOW);

    expect(forecast[0].count).toBe(1);
  });

  it("honours a custom window length", () => {
    expect(buildForecast([], NOW, 14)).toHaveLength(14);
  });
});

describe("countDue", () => {
  it("counts only cards due now or earlier", () => {
    expect(countDue([at(-1), at(0, 11), at(0, 13), at(2)], NOW)).toBe(2);
  });

  it("returns zero for an empty deck", () => {
    expect(countDue([], NOW)).toBe(0);
  });
});
