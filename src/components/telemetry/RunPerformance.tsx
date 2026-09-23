import { MILESTONE_LABELS, RUN_RESULT_LABELS } from '../../configs/telemetryConfig';
import { rerollSummary } from '../../service/telemetry/analytics';
import type { RunRecord } from '../../service/telemetry/types';
import { duration, number } from './format';

export function RunPerformance({ run, onInspect }: { run: RunRecord; onInspect: (id: number) => void }) {
  const rerolls = rerollSummary(run.battles);
  const rounds = run.battles.flatMap((battle) => battle.rounds);
  const total = (key: 'damageHp' | 'takenHp' | 'absorbed' | 'healing') => number(rounds.reduce((sum, round) => sum + round[key], 0));
  return <>
    <div className="telemetry-metrics">
      <div><span>前景遊玩</span><strong>{duration(run.activeMs)}</strong></div>
      <div><span>總經過時間</span><strong>{duration(run.elapsedMs)}</strong></div>
      <div><span>總重骰</span><strong>{rerolls.total} 次</strong></div>
      <div><span>平均每場重骰</span><strong>{number(rerolls.average)} 次</strong><small>{rerolls.completed} 場已結束戰鬥</small></div>
      <div><span>實際扣敵人 HP</span><strong>{total('damageHp')}</strong></div>
      <div><span>承受 HP 傷害</span><strong>{total('takenHp')}</strong></div>
      <div><span>護盾吸收</span><strong>{total('absorbed')}</strong></div>
      <div><span>戰鬥有效治療</span><strong>{total('healing')}</strong></div>
    </div>
    <section className="telemetry-section"><h4>完成紀錄</h4>
      {run.milestones.length ? run.milestones.map((item, index) => <div className="telemetry-history-row" key={index}>
        <div><strong>{MILESTONE_LABELS[item.kind]} · {item.name}</strong><p>前景 {duration(item.activeMs)} · 總經過 {duration(item.elapsedMs)}</p></div>
        <button type="button" onClick={() => onInspect(item.snapshotId)}>查看配置</button>
      </div>) : <p className="telemetry-note">尚無區域完成紀錄</p>}
    </section>
    <section className="telemetry-section"><h4>逐場戰鬥</h4>
      {run.battles.map((battle) => <details className="telemetry-die" key={battle.id}>
        <summary>#{battle.id + 1} {battle.enemyName}<span>{RUN_RESULT_LABELS[battle.outcome]} · {battle.rounds.length} 回合 · 重骰 {battle.rerolls} 次</span></summary>
        <p>{battle.location.regionName} · {battle.location.route === 'challenge' ? '挑戰路' : battle.location.route === 'safe' ? '穩定路' : '共同節點'}</p>
        <p className="telemetry-note">前景 {duration(battle.activeMs)} · 總經過 {duration(battle.elapsedMs)}</p>
        {battle.death && <p className="telemetry-death">致死：{battle.death.source} · {battle.death.intent} · 受擊前 HP {number(battle.death.beforeHit.hp)}／盾 {number(battle.death.beforeHit.shield)} · 敵人剩餘 HP {number(battle.death.afterHit.enemy?.hp ?? 0)}</p>}
        <div className="telemetry-inline-actions"><button type="button" onClick={() => onInspect(battle.startSnapshotId)}>進場配置</button>
          {battle.endSnapshotId !== null && <button type="button" onClick={() => onInspect(battle.endSnapshotId!)}>結束配置</button>}</div>
        <div className="telemetry-table-scroll"><table><thead><tr><th>回合</th><th>重骰</th><th>敵 HP 損失</th><th>敵盾損失</th><th>承傷</th><th>吸收</th><th>治療</th></tr></thead>
          <tbody>{battle.rounds.map((round) => <tr key={round.round}><td>{round.round}{!round.settled && '（未結算）'}</td><td>{round.rerolls}</td>
            <td>{number(round.damageHp)}</td><td>{number(round.damageShield)}</td><td>{number(round.takenHp)}</td><td>{number(round.absorbed)}</td><td>{number(round.healing)}</td></tr>)}</tbody></table></div>
      </details>)}
    </section>
    <p className="telemetry-note">{run.content.name} · 難度 {run.content.difficulty} · 遊戲 {run.gameVersion} · 平衡 {run.balanceVersion}</p>
  </>;
}
