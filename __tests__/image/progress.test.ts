import { describe, it, expect } from "vitest";
import { PROGRESS_CAP, progressFor } from "@/hooks/image/useGenerationProgress";

describe("progressFor (indicative visual progress)", () => {
  it("starts at zero", () => {
    expect(progressFor(0).fraction).toBe(0);
  });

  it("never claims completion: capped below 100 % however long it takes", () => {
    for (const ms of [1_000, 10_000, 45_000, 120_000, 10 * 60_000, 24 * 3_600_000]) {
      const { fraction } = progressFor(ms);
      expect(fraction).toBeLessThan(1);
      expect(fraction).toBeLessThanOrEqual(PROGRESS_CAP);
    }
  });

  it("only ever moves forward", () => {
    let previous = -1;
    for (let ms = 0; ms <= 120_000; ms += 500) {
      const { fraction } = progressFor(ms);
      expect(fraction).toBeGreaterThanOrEqual(previous);
      previous = fraction;
    }
  });

  it("slows down as it approaches the cap (fast start, long tail)", () => {
    const early = progressFor(5_000).fraction - progressFor(0).fraction;
    const late = progressFor(35_000).fraction - progressFor(30_000).fraction;
    expect(early).toBeGreaterThan(late * 5);
  });

  it("treats a negative elapsed time (clock skew) as zero", () => {
    expect(progressFor(-500)).toEqual(progressFor(0));
  });

  it("walks through honest waiting messages, ending on the 'slow' one", () => {
    expect(progressFor(0).stage).toBe("prepare");
    expect(progressFor(3_900).stage).toBe("prepare");
    expect(progressFor(4_000).stage).toBe("create");
    expect(progressFor(14_900).stage).toBe("create");
    expect(progressFor(15_000).stage).toBe("wait");
    expect(progressFor(34_900).stage).toBe("wait");
    expect(progressFor(35_000).stage).toBe("slow");
    expect(progressFor(600_000).stage).toBe("slow");
  });
});
