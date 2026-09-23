import type { BuildSnapshot } from '../../service/telemetry/types';
import { number } from './format';

export function BuildDetails({ snapshot }: { snapshot: BuildSnapshot }) {
  const faces = snapshot.dice.reduce((total, die) => total + die.faces.length, 0);
  return <>
    <section className="telemetry-section">
      <div className="telemetry-section-heading"><h4>骰面組成</h4><span>{snapshot.dice.length} 顆骰子 · {faces} 面</span></div>
      <p className="telemetry-note">以永久角色占全部骰面計算，臨時貼紙列於下方配置。</p>
      <div className="telemetry-composition">
        {snapshot.composition.map((item) => <div className="telemetry-composition-row" key={item.creatureId}>
          <span>{item.name}</span><div className="telemetry-bar" aria-hidden="true"><i style={{ width: `${item.percent}%` }} /></div>
          <strong>{item.faces} 面 <small>{number(item.percent)}%</small></strong>
        </div>)}
      </div>
    </section>
    <section className="telemetry-section">
      <h4>持有裝備</h4>
      <div className="telemetry-chips">{snapshot.equipments.map((item) => <span key={item.id}>{item.name}</span>)}
        {!snapshot.equipments.length && <p className="telemetry-note">當時沒有裝備</p>}</div>
      <p className="telemetry-note">HP {number(snapshot.combat.hp)} / {snapshot.combat.maxHp} · 護盾 {number(snapshot.combat.shield)} · 金幣 {number(snapshot.combat.gold)} · Control {snapshot.combat.control}</p>
    </section>
    <section className="telemetry-section">
      <h4>完整骰池 · 由左至右</h4>
      {snapshot.dice.map((die) => <details key={die.id} className="telemetry-die">
        <summary>#{die.position + 1} {die.name} <span>{die.dieType} · {die.faces.length} 面</span></summary>
        <div className="telemetry-table-scroll"><table><thead><tr><th>面</th><th>永久角色</th><th>原始值</th><th>材質</th><th>當場有效配置</th></tr></thead>
          <tbody>{die.faces.map((face) => <tr key={face.id}>
            <td>{face.index + 1}{snapshot.combat.rolledIndices[die.position] === face.index && ' ↑'}</td>
            <td>{face.name}</td><td>{number(face.baseValue)}</td><td>{face.materialName ?? '普通'}{face.materialDecay ? `（衰減 ${face.materialDecay}）` : ''}</td>
            <td>{face.effectiveName} {number(face.effectiveBaseValue)}{face.temporarySticker && ' · 臨時貼紙'}</td>
          </tr>)}</tbody></table></div>
        <p className="telemetry-note">存糧 {number(snapshot.combat.creatureState.storedFood[die.id] ?? 0)} · 祭壇 {snapshot.combat.creatureState.altars[die.id] ?? 0}</p>
      </details>)}
      <p className="telemetry-note">消耗品：{snapshot.consumables.map((item) => item.name).join('、') || '無'}</p>
    </section>
  </>;
}
