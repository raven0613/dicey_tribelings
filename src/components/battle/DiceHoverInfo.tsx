import { CREATURE_CONFIG, CREATURE_TAG_NAMES } from '../../configs/creatures/creatureConfig';
import type { CreatureId, CreatureTag } from '../../types/creatures';
import { SkillText } from '../common/SkillText';
import { MATERIAL_CONFIG } from '../../configs/materials/materialConfig';
import type { FaceMaterial } from '../../types/materials';

export interface DiceInspection {
  creature?: CreatureId;
  tags?: CreatureTag[];
  title: string;
  description: string;
  material?: FaceMaterial;
}
export function DiceHoverInfo({ info }: { info: DiceInspection | null }) {
  return <div className="board-right" id="dice-hover-information" aria-live="polite">
    {info ? <>
      <div className="hover-info-title">
        {info.creature && <span aria-hidden="true">{CREATURE_CONFIG[info.creature].emoji}</span>}

        <strong><SkillText text={info.title} /></strong>

        {info.tags && <span className="hover-info-tags">{info.tags.map((tag) => CREATURE_TAG_NAMES[tag]).join('・')}</span>}
        {info.material && <span style={{ color: MATERIAL_CONFIG[info.material].color }}>
          {MATERIAL_CONFIG[info.material].symbol} {MATERIAL_CONFIG[info.material].name}
        </span>}
      </div>

      <p><SkillText text={info.description} /></p>
    </> : <span className="hover-info-placeholder">移到骰子上，查看能力與連動關係</span>}

  </div>;
}
