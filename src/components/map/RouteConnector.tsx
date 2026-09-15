export function RouteConnector({ split, merge }: { split: boolean; merge: boolean }) {
  const path = split ? 'M0 50 H8 V25 H18 M8 50 V75 H18'
    : merge ? 'M0 25 H8 V50 H18 M0 75 H8 V50' : 'M0 50 H18';
  return <div className="route-connector" aria-hidden="true">
    <svg viewBox="0 0 18 100" preserveAspectRatio="none">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  </div>;
}
