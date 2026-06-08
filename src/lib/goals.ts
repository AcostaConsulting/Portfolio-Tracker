// D.5 — Metas financieras (puro). Calcula el avance hacia una meta y una
// proyección lineal MUY simple (estimación, NO consejo financiero).

import type { Goal } from '../types';
import { diffDays } from './dates';

export interface GoalProgress {
  goal: Goal;
  pct: number; //        avance acotado a [0, 100]
  rawPct: number; //     avance sin acotar (puede superar 100)
  remaining: number; //  cuánto falta para la meta (>= 0)
  daysLeft: number | null; //   días hasta target_date (null si no hay fecha)
  timePct: number | null; //    % del tiempo transcurrido (null si no hay fecha)
  onTrack: boolean | null; //   avance >= tiempo transcurrido (null si no hay fecha)
  requiredPerMonth: number | null; // aporte mensual lineal para llegar a tiempo
}

export function computeGoalProgress(goal: Goal, currentValue: number, today: string): GoalProgress {
  const target = goal.target_amount;
  const rawPct = target > 0 ? (currentValue / target) * 100 : 0;
  const pct = Math.min(100, Math.max(0, rawPct));
  const remaining = Math.max(0, target - currentValue);

  let daysLeft: number | null = null;
  let timePct: number | null = null;
  let onTrack: boolean | null = null;
  let requiredPerMonth: number | null = null;

  if (goal.target_date) {
    daysLeft = diffDays(today, goal.target_date);
    const totalDays = diffDays(goal.created_at, goal.target_date);
    const elapsed = diffDays(goal.created_at, today);
    if (totalDays > 0) {
      timePct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
      onTrack = rawPct >= timePct;
    }
    if (daysLeft > 0 && remaining > 0) {
      requiredPerMonth = remaining / (daysLeft / 30);
    } else if (remaining > 0) {
      requiredPerMonth = remaining; // ya venció: falta todo "ahora"
    } else {
      requiredPerMonth = 0;
    }
  }

  return { goal, pct, rawPct, remaining, daysLeft, timePct, onTrack, requiredPerMonth };
}
