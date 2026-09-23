import type { BattleSkillLine } from '../../service/battle/battleSkillDescription';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { SkillText } from '../common/SkillText';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import type { FaceMaterial } from '../../types/materials';
import { createPortal } from 'react-dom';
import { DiceIdentityHeader } from '../dice/DiceIdentityHeader';

interface DiceInspection {
  creature?: CreatureId;
  tags?: readonly CreatureTag[];
  title: string;
  attack: number;
  description: string;
  lines?: BattleSkillLine[];
  material?: FaceMaterial;
  source?: string;
}
export function DiceHoverInfo({ info, target }: { info: DiceInspection; target: HTMLDivElement }) {
  return createPortal(<>
      <DiceIdentityHeader creature={info.creature} title={info.title} tags={info.tags} attack={info.attack} />
      <div className="hover-info-description">
        {info.source && <p><SkillText text={info.source} /></p>}
        {info.material && <span style={{ color: MATERIAL_CONFIG[info.material].color }}>
          {MATERIAL_CONFIG[info.material].symbol} {MATERIAL_CONFIG[info.material].name}
        </span>}
        {info.lines ? <div className="battle-skill-lines">{info.lines.map((line, index) => <div key={index} className={`battle-skill-line ${line.achieved === false ? 'is-unmet' : ''}`}>
          {line.achieved !== undefined && <span className="skill-stage-check" aria-label={line.achieved ? '已達成' : '未達成'}>{line.achieved ? '✓' : ''}</span>}
          <span className="skill-stage-copy"><SkillText text={line.text} /></span>
        </div>)}</div> : <p><SkillText text={info.description} /></p>}
      </div>
  </>, target);
}
