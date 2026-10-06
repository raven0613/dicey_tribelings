import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { RarityBadge } from '../dice/RarityBadge';
import { PaidRefreshButton } from '../common/PaidRefreshButton';
import { StickerPlacementDialog } from '../stickers/StickerPlacementDialog';
import { getRefreshCost } from '../../service/rewards/refreshService';
import { getSkipRewardGold } from '../../service/rewards/rewardService';
import { RewardBundleCard } from './RewardBundleCard';
import { RewardPackCard } from './RewardPackCard';
import type { StickerBundleReward } from '../../types/game';
import './rewardBundles.scss';

interface RewardModalProps {
  onOpenDiceBag: () => void;
  inspectingDice: boolean;
}

export function RewardModal({ onOpenDiceBag, inspectingDice }: RewardModalProps) {
  const state = useGameStore(useShallow(s => ({
    phase: s.combatPhase, nodeIndex: s.currentNodeIndex, options: s.battleRewardOptions,
    received: s.receivedRewardDice, dice: s.diceRewardOptions, extra: s.extraReward, flow: s.stickerFlow,
    opened: s.openedPackResult, gold: s.gold, refreshes: s.lootRefreshes,
    rank: s.enemies[0]?.rank, pool: s.dicePool,
    claim: s.claimBattleReward, skip: s.skipBattleReward,
    refresh: s.refreshBattleRewards, beginExtra: s.beginExtraReward,
  })));
  const [previewId, setPreviewId] = useState<string | null>(null);
  useEffect(() => setPreviewId(null), [state.phase, state.nodeIndex]);

  if (state.phase !== 'VICTORY' || state.received || state.dice.length || state.flow || state.opened) return null;
  if (state.extra) return inspectingDice ? null : (
    <div className="modal-overlay">
      <div className="reward-card" role="dialog" aria-modal="true" aria-label="黑市額外獎勵">
        <h2>黑市額外獎勵</h2>
        <p>{state.extra.name}</p>
        <RarityBadge rarity={state.extra.rarity} />
        <button type="button" className="btn-primary-modal" onClick={state.beginExtra}>領取</button>
      </div>
    </div>
  );
  if (!state.options.length) return null;

  const preview = state.options.find((option): option is StickerBundleReward => option.kind === 'bundle' && option.id === previewId);
  const covered = inspectingDice || Boolean(preview);
  const claim = (id: string) => {
    setPreviewId(null);
    state.claim(id);
  };

  return <>
    <div className="modal-overlay" inert={covered} aria-hidden={covered || undefined}>
      <div className="reward-card" role="dialog" aria-modal="true" aria-labelledby="reward-title">
        <div className="reward-header">
          <h2 id="reward-title">{state.rank === 'normal' ? '選擇一組戰利品' : '選擇一包貼紙'}</h2>
          <button type="button" className="btn-view-dice" onClick={onOpenDiceBag}>查看骰池</button>
        </div>
        <div className="reward-body">
          <div className="reward-bundles">
            {state.options.map(option => option.kind === 'bundle'
              ? <RewardBundleCard key={option.id} option={option} onPreview={() => setPreviewId(option.id)}
                onClaim={() => claim(option.id)} />
              : <RewardPackCard key={option.id} pack={option.pack} onClaim={() => claim(option.id)} />)}
          </div>
        </div>
        <div className="reward-footer">
          <div className="reward-refresh">
            <span>持有 {state.gold} 金幣</span>
            <PaidRefreshButton cost={getRefreshCost('loot', state.refreshes)} gold={state.gold}
              onRefresh={() => { setPreviewId(null); state.refresh(); }} />
          </div>
          <button type="button" className="btn-skip-reward" onClick={state.skip}>
            放棄並獲得 {getSkipRewardGold(state.rank!)} 金幣
          </button>
        </div>
      </div>
    </div>
    {preview && !inspectingDice && <StickerPlacementDialog key={preview.id}
      sticker={preview.sticker} dicePool={state.pool}
      subtitle="預覽明牌配置・選擇整組後揭曉其餘貼紙" exitLabel="返回選擇戰利品"
      onExit={() => setPreviewId(null)}
      footer={<button type="button" className="btn-primary-modal" onClick={() => claim(preview.id)}>選擇</button>} />}
  </>;
}
