import { ACTIVITY_LABELS } from '../../configs/telemetryConfig';
import type { Activity, ActivityTotals } from '../../service/telemetry/decisionTypes';
import { duration } from './format';

export function ActivityDetails({ totals }: { totals?: ActivityTotals }) {
  if (!totals) return <p className="telemetry-note">分階段耗時：未記錄</p>;
  return (
    <div className="telemetry-chips">
      {(Object.keys(ACTIVITY_LABELS) as Activity[])
        .filter((key) => totals[key] > 0)
        .map((key) => (
          <span key={key}>
            {ACTIVITY_LABELS[key]} {duration(totals[key])}
          </span>
        ))}
    </div>
  );
}
