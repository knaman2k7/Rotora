/**
 * Generalised shift-combination generator.
 *
 * Given:
 *  - shiftsAvailable: { "<day><type>": [null, null, ...] }
 *        the array length is just "how many people does this shift need"
 *  - keyholderAvailability: [ moringKeyholderIds[], eveningKeyholderIds[] ]
 *  - allAvailability:       [ morningAllIds[],      eveningAllIds[]      ]
 *  - fullTimeIds: ids of employees who are ONLY allowed on 8-hour shifts
 *
 * Shift code "xy":
 *    x = day, y = shift type (1 = morning-8, 2 = morning-6, 3 = evening-8, 4 = evening-6)
 *
 * Returns: an array of every valid full assignment, e.g.
 *    [ { "21": [2,4], "23": [1] }, { "21": [2,3], "23": [4] }, ... ]
 *
 * A "valid" assignment means:
 *   1. Every slot is filled by someone in the right availability pool
 *      (morning pool for y=1/2, evening pool for y=3/4).
 *   2. Nobody is used twice across the whole assignment (can't fill two
 *      slots / two shifts with the same person on the same day).
 *   3. Full-time employees never fill a 6-hour slot (y=2 or y=4).
 *   4. Across ALL morning shifts combined, at least one assigned person is
 *      a keyholder who was available that morning (same rule for evening).
 */
function generateScheduleCombinations({
  shiftsAvailable,
  keyholderAvailability,
  allAvailability,
  fullTimeIds = [],
}) {
  const fullTimeSet = new Set(fullTimeIds);

  // ---- 1. Parse each shift code into a usable descriptor -----------------
  const shifts = Object.keys(shiftsAvailable).map((code) => {
    const num = Number(code);
    const type = num % 10; // y
    const day = Math.floor(num / 10); // x
    const isMorning = type === 1 || type === 2;
    const is6Hour = type === 2 || type === 4;
    const slotsNeeded = shiftsAvailable[code].length;

    const basePool = isMorning ? allAvailability[0] : allAvailability[1];
    // Full-timers are dropped from the pool entirely for 6-hour shifts.
    const pool = is6Hour
      ? basePool.filter((id) => !fullTimeSet.has(id))
      : basePool.slice();

    return { code, day, type, isMorning, is6Hour, slotsNeeded, pool };
  });

  const hasMorningShift = shifts.some((s) => s.isMorning);
  const hasEveningShift = shifts.some((s) => !s.isMorning);

  // ---- helper: all size-k subsets of arr (order doesn't matter) ---------
  function combinations(arr, k) {
    const out = [];
    const chosen = [];
    (function rec(start) {
      if (chosen.length === k) {
        out.push(chosen.slice());
        return;
      }
      for (let i = start; i < arr.length; i++) {
        chosen.push(arr[i]);
        rec(i + 1);
        chosen.pop();
      }
    })(0);
    return out;
  }

  // ---- 2. Backtrack over shifts, keeping a global "already used" set ----
  const results = [];
  const assignment = {};

  function keyholderCheckPasses() {
    if (hasMorningShift) {
      const morningAssigned = shifts
        .filter((s) => s.isMorning)
        .flatMap((s) => assignment[s.code]);
      const morningOk = keyholderAvailability[0].some((id) =>
        morningAssigned.includes(id)
      );
      if (!morningOk) return false;
    }
    if (hasEveningShift) {
      const eveningAssigned = shifts
        .filter((s) => !s.isMorning)
        .flatMap((s) => assignment[s.code]);
      const eveningOk = keyholderAvailability[1].some((id) =>
        eveningAssigned.includes(id)
      );
      if (!eveningOk) return false;
    }
    return true;
  }

  function backtrack(index, used) {
    if (index === shifts.length) {
      if (keyholderCheckPasses()) {
        const snapshot = {};
        for (const s of shifts) snapshot[s.code] = assignment[s.code].slice();
        results.push(snapshot);
      }
      return;
    }

    const shift = shifts[index];
    const stillAvailable = shift.pool.filter((id) => !used.has(id));
    const combos = combinations(stillAvailable, shift.slotsNeeded);

    for (const combo of combos) {
      assignment[shift.code] = combo;
      combo.forEach((id) => used.add(id));

      backtrack(index + 1, used);

      combo.forEach((id) => used.delete(id));
    }
    delete assignment[shift.code];
  }

  backtrack(0, new Set());
  return results;
}


// ---------------------------------------------------------------------------
// Quick manual test against both scenarios from the prompt
// ---------------------------------------------------------------------------
console.log("=== Scenario 1 ===");
const scenario1 = generateScheduleCombinations({
shiftsAvailable: {
    21: [null, null],
    23: [null],
},
keyholderAvailability: [
    [2, 4],
    [1, 2, 4],
],
allAvailability: [
    [2, 4, 3, 5],
    [1, 2, 4, 3, 5],
],
fullTimeIds: [1, 2, 3],
});
console.log(`${scenario1.length} valid combinations`);
console.log(scenario1);

console.log("\n=== Scenario 2 ===");
const scenario2 = generateScheduleCombinations({
shiftsAvailable: {
    31: [null],
    32: [null],
    33: [null],
    34: [null],
},
keyholderAvailability: [
    [1, 2, 3],
    [1, 2, 3, 4],
],
allAvailability: [
    [1, 2, 3, 5],
    [1, 2, 4, 3, 5],
],
fullTimeIds: [1, 2, 3],
});
console.log(`${scenario2.length} valid combinations`);
console.log(scenario2.slice(0, 5), "... (truncated)");
