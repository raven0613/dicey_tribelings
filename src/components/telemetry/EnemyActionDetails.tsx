import { DAMAGE_SOURCE_LABELS } from '../../configs/telemetryConfig';
import type { RoundRecord } from '../../service/telemetry/types';
import { number } from './format';

export function EnemyActionDetails({ rounds }: { rounds: RoundRecord[] }) {
  return (
    <details>
      <summary>逐敵人招式與反制</summary>
      {rounds.map((round) => (
        <div className="telemetry-offer" key={round.round}>
          <strong>第 {round.round} 回合</strong>
          {round.enemyActions === undefined ? (
            <p className="telemetry-note">未記錄</p>
          ) : round.enemyActions.length === 0 ? (
            <p className="telemetry-note">尚無敵人行動</p>
          ) : (
            round.enemyActions.map((action, index) => (
              <p key={index}>
                {action.enemyName} ·{' '}
                {action.source === 'grapple' ? DAMAGE_SOURCE_LABELS.grapple : action.intent}：
                {action.hits} 次命中 · 傷害 {number(action.damage)} · HP 損失{' '}
                {number(action.hpLoss)} · 吸收 {number(action.absorbed)}
                {action.counterTriggered && ' · 反制成功'}
                {action.cancelled && ' · 行動取消'}
              </p>
            ))
          )}
        </div>
      ))}
    </details>
  );
}
