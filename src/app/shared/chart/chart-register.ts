import { Chart, registerables } from 'chart.js';

let registered = false;

/** Chart.js needs its controllers/elements registered exactly once per app lifetime. */
export function ensureChartRegistered(): void {
  if (registered) return;
  Chart.register(...registerables);
  registered = true;
}
