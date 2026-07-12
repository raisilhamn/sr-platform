export type Sm2State = { ef: number; interval: number; reps: number };

export function sm2(ef: number, interval: number, reps: number, rating: number): Sm2State {
  let newEf = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (newEf < 1.3) newEf = 1.3;

  let newInterval: number;
  let newReps: number;
  if (rating < 3) {
    newInterval = 1;
    newReps = 0;
  } else {
    newReps = reps + 1;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 6;
    else newInterval = Math.round(interval * newEf);
  }
  return { ef: newEf, interval: newInterval, reps: newReps };
}
