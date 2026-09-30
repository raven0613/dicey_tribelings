import type { BattleSkillLine } from '../../service/battle/battleSkillDescription';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { SkillText } from '../common/SkillText';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import type { FaceMaterial } from '../../types/materials';
import { createPortal } from 'react-dom';
import { DiceIdentityHeader } from '../dice/DiceIdentityHeader';
import { SkillLines } from '../common/SkillLines';

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
        {info.lines ? <SkillLines lines={info.lines} /> : <p><SkillText text={info.description} /></p>}
      </div>
  </>, target);
}
