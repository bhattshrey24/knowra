import { describe, expect, it } from "vitest";
import { INITIAL_SCHEDULING, scheduleNext, type SchedulingState } from "@/lib/learning/sm2";

describe("scheduleNext (SM-2)", () => {
  it("schedules the classic 1 → 6 → interval*ease progression on 'good'", () => {
    const first = scheduleNext(INITIAL_SCHEDULING, "good");
    expect(first).toMatchObject({ reps: 1, intervalDays: 1 });
    expect(first.ease).toBeCloseTo(2.5, 2);

    const second = scheduleNext(first, "good");
    expect(second).toMatchObject({ reps: 2, intervalDays: 6 });

    const third = scheduleNext(second, "good");
    expect(third.reps).toBe(3);
    expect(third.intervalDays).toBe(15); // round(6 * 2.5)
  });

  it("resets repetitions and interval on 'again' (a lapse)", () => {
    const learned: SchedulingState = { reps: 3, ease: 2.5, intervalDays: 15 };
    const lapsed = scheduleNext(learned, "again");
    expect(lapsed.reps).toBe(0);
    expect(lapsed.intervalDays).toBe(1);
    expect(lapsed.ease).toBeLessThan(2.5); // ease penalised
  });

  it("never lets ease fall below 1.3", () => {
    let state: SchedulingState = INITIAL_SCHEDULING;
    for (let i = 0; i < 20; i += 1) state = scheduleNext(state, "again");
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("raises ease for 'easy' and lowers it for 'hard'", () => {
    expect(scheduleNext(INITIAL_SCHEDULING, "easy").ease).toBeGreaterThan(2.5);
    expect(scheduleNext(INITIAL_SCHEDULING, "hard").ease).toBeLessThan(2.5);
  });
});
