import type { BattleSkillLine } from '../../service/battle/battleSkillDescription';
import { SkillText } from './SkillText';

export function SkillLines({ lines }: { lines: readonly BattleSkillLine[] }) {
  return <span className="battle-skill-lines">{lines.map((line, index) =>
    <span key={index} className={`battle-skill-line ${line.achieved === false ? 'is-unmet' : ''}`}>
      {line.achieved !== undefined && <span className="skill-stage-check" aria-label={line.achieved ? '已達成' : '未達成'}>
        {line.achieved ? '✓' : ''}
      </span>}
      <span className="skill-stage-copy"><SkillText text={line.text} /></span>
    </span>)}</span>;
}
