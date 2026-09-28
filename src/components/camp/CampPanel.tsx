import { useShallow } from 'zustand/react/shallow';
import { ArrowRight, Flame, Heart, Sparkles } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { CAMP_BUFFS, CAMP_CONFIG } from '../../configs/campConfig';
import { getRefreshCost } from '../../service/rewards/refreshService';
import { PaidRefreshButton } from '../common/PaidRefreshButton';
import './camp.scss';

export function CampPanel() {
  const { offer, refreshes, gold, hp, maxHp, choose, refresh, leave } = useGameStore(useShallow(state => ({
    offer: state.campOffer, refreshes: state.campRefreshes, gold: state.gold,
    hp: state.playerHp, maxHp: state.maxHp, choose: state.chooseCamp,
    refresh: state.refreshCamp, leave: state.advanceToNextNode,
  })));
  if (!offer) return null;
  const buff = CAMP_BUFFS[offer], full = hp >= maxHp;
  return <section className="camp-panel" aria-label={CAMP_CONFIG.title}>
    <header className="camp-header">
      <div><h2><Flame className="ui-icon" />{CAMP_CONFIG.title}</h2>
        <p>選擇一項後繼續前進 · HP {hp}/{maxHp} · {gold} 金幣</p></div>
      <button type="button" onClick={leave}>直接離開<ArrowRight className="ui-icon" /></button>
    </header>
    <div className="camp-options">
      <article>
        <h3><Heart className="ui-icon" />休息</h3>
        <p>免費恢復 {CAMP_CONFIG.healAmount} HP。</p>
        <button type="button" aria-disabled={full} onClick={() => choose('heal')}>
          {full ? '生命已滿' : '免費休息'}
        </button>
      </article>
      <article>
        <h3><Heart className="ui-icon" />充分休養</h3>
        <p>花 {CAMP_CONFIG.fullHealCost} 金幣恢復至最大生命。</p>
        <button type="button" aria-disabled={full} disabled={!full && gold < CAMP_CONFIG.fullHealCost}
          onClick={() => choose('fullHeal')}>
          {full ? '生命已滿' : `回滿生命 · ${CAMP_CONFIG.fullHealCost} 金幣`}
        </button>
      </article>
      <article>
        <h3><Sparkles className="ui-icon" />{buff.name}</h3>
        <p>下一場戰鬥：{buff.description}</p>
        <PaidRefreshButton cost={getRefreshCost('camp', refreshes)} gold={gold} onRefresh={refresh} />
        <button type="button" onClick={() => choose('buff')}>免費領取祝福</button>
      </article>
    </div>
  </section>;
}
