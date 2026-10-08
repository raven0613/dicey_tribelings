import type { BuildSnapshot } from '../../service/telemetry/types';

export function BackpackDetails({ snapshot }: { snapshot: BuildSnapshot }) {
  return (
    <section className="telemetry-section">
      <h4>背包與臨時配置</h4>
      <p>
        永久貼紙：
        {snapshot.permanentStickers === undefined
          ? '未記錄'
          : snapshot.permanentStickers.map((item) => item.name).join('、') || '無'}
      </p>
      <p>臨時貼紙：{snapshot.consumables.map((item) => item.name).join('、') || '無'}</p>
      {snapshot.temporaryPlacements === undefined ? (
        <p className="telemetry-note">戰前臨時配置：未記錄</p>
      ) : snapshot.temporaryPlacements.length === 0 ? (
        <p className="telemetry-note">無待套用的臨時配置</p>
      ) : (
        snapshot.temporaryPlacements.map((placement) => (
          <p key={placement.consumable.instanceId}>
            {placement.consumable.name} →{' '}
            {snapshot.dice.find((die) => die.id === placement.diceId)?.name} 第{' '}
            {placement.faceIndex + 1} 面{placement.direction && ` · ${placement.direction}`}
          </p>
        ))
      )}
    </section>
  );
}
