import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { DICE_RESULT_PRESENTATION as config } from '../../configs/dicePresentationConfig';

function ResultLine({ children }: { children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const row = rowRef.current!;
    const text = textRef.current!;
    const fit = () => {
      // Attack portals briefly detach their contents while switching layers.
      if (!row.clientWidth) return;
      text.style.setProperty('--result-text-scale', String(Math.min(1, row.clientWidth / text.offsetWidth)));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    observer.observe(text);
    fit();
    return () => observer.disconnect();
  }, []);
  return <div className="die-result-row" ref={rowRef}>
    <span className="die-result-text" ref={textRef}>{children}</span>
  </div>;
}

export function DiceResultPanel({ labels, allocation }: { labels: string[]; allocation?: ReactNode }) {
  if (!labels.length && !allocation) return null;
  return <div className="die-result-panel" style={{
    '--result-line-height': `${config.lineHeight}px`,
    '--result-gap': `${config.gap}px`,
    '--result-padding-y': `${config.paddingY}px`,
    '--result-padding-x': `${config.paddingX}px`,
    '--result-font-size': `${config.fontSize}px`,
    height: config.rows * config.lineHeight + config.paddingY * 2,
  } as CSSProperties}>
    {labels.map((label, index) => <ResultLine key={index}>{label}</ResultLine>)}
    {allocation && <ResultLine>{allocation}</ResultLine>}
  </div>;
}
