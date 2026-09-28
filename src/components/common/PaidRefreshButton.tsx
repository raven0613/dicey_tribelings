import { RefreshCw } from 'lucide-react';

interface PaidRefreshButtonProps {
  cost: number;
  gold: number;
  onRefresh: () => void;
}

export function PaidRefreshButton({ cost, gold, onRefresh }: PaidRefreshButtonProps) {
  const insufficientGold = gold < cost;

  return (
    <button type="button" className="btn-paid-refresh" disabled={insufficientGold} onClick={onRefresh}>
      <RefreshCw className="ui-icon" aria-hidden="true" />
      <span>刷新（{cost} 金幣）</span>
      {insufficientGold && <span className="refresh-unavailable">金幣不足</span>}
    </button>
  );
}
