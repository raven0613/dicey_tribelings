import { useGameViewport } from '../layout/GameViewportContext';
import { getDiceResultMetrics } from '../../service/dice/diceTrayLayout';
import type { CSSProperties, ReactNode } from 'react';
import { DICE_RESULT_PRESENTATION as config } from '../../configs/dicePresentationConfig';

function ResultLine({ children }: { children: ReactNode }) {
  return <div className="die-result-row">
    <span className="die-result-text">{children}</span>
  </div>;
}

export function DiceResultPanel({ labels, allocation }: { labels: string[]; allocation?: ReactNode }) {
  const { minimumFontSize } = useGameViewport();
  const metrics = getDiceResultMetrics(minimumFontSize);
  if (!labels.length && !allocation) return null;
  return <div className="die-result-panel" style={{
    '--result-line-height': `${metrics.lineHeight}px`,
    '--result-gap': `${config.gap}px`,
    '--result-padding-y': `${config.paddingY}px`,
    '--result-padding-x': `${config.paddingX}px`,
    '--result-font-size': `${metrics.fontSize}px`,
    height: metrics.height,
  } as CSSProperties}>
    {labels.map((label, index) => <ResultLine key={index}>{label}</ResultLine>)}
    {allocation && <ResultLine>{allocation}</ResultLine>}
  </div>;
}
