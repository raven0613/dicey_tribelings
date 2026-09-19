interface Point { x: number; y: number }

/** Split an upward-arching quadratic at its minimum y, preserving the exact curve. */
export function getCharacterEntrancePaths(start: Point, control: Point, press: Point) {
  const peakTime = (start.y - control.y) / (start.y - 2 * control.y + press.y);
  const interpolate = (from: Point, to: Point): Point => ({
    x: from.x + (to.x - from.x) * peakTime,
    y: from.y + (to.y - from.y) * peakTime,
  });
  const riseControl = interpolate(start, control);
  const pressControl = interpolate(control, press);
  const peak = interpolate(riseControl, pressControl);
  const rise = `M${start.x} ${start.y} Q${riseControl.x} ${riseControl.y} ${peak.x} ${peak.y}`;
  const descent = `Q${pressControl.x} ${pressControl.y} ${press.x} ${press.y}`;
  return {
    rise,
    curve: `${rise} ${descent}`,
    complete: `${rise} ${descent} L0 0`,
  };
}
