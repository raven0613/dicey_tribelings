import type { ReactNode } from 'react';
import { useSkillTooltip } from './useSkillTooltip';

export function SkillTooltip({ text, children }: { text: string; children: ReactNode }) {
  const { tooltip, tooltipProps } = useSkillTooltip(text);
  return <span {...tooltipProps} className="skill-tooltip-trigger" tabIndex={0}>{children}{tooltip}</span>;
}
