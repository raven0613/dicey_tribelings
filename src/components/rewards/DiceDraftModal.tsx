import { useState } from 'react';
import { DiceNet } from '../dice/DiceNet';
import { instantiateRecipe } from '../../service/dice/diceDraft';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/gameStore';
import { DICE_DRAFT_CONFIG } from '../../configs/creatures/diceRecipeConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { getRefreshCost } from '../../service/rewards/refreshService';
import { SkillText } from '../common/SkillText';
import { PaidRefreshButton } from '../common/PaidRefreshButton';
export function DiceDraftModal({ onOpenDiceBag, inspectingDice }: { onOpenDiceBag: () => void; inspectingDice: boolean }) {
  const { options, choose, refresh, refreshes, gold, region } = useGameStore(useShallow(state => ({
    options: state.diceRewardOptions, choose: state.chooseRewardDice, refresh: state.refreshDiceReward,
    refreshes: state.diceRefreshes, gold: state.gold, region: state.mapNodes[state.currentNodeIndex].region,
  })));
  const [previewId, setPreviewId] = useState<string | null>(null);
  if (!options.length) return null;
  const preview = options.find(recipe => recipe.id === previewId);
  const cost = getRefreshCost('dice', refreshes);
  return <><div className="modal-overlay" inert={inspectingDice || !!preview} aria-hidden={inspectingDice || !!preview || undefined}>
    <div className="reward-card" role="dialog" aria-modal="true" aria-labelledby="dice-draft-title">
      <div className="reward-header"><div><h2 id="dice-draft-title">選擇一顆新骰子</h2></div>
        <button type="button" onClick={onOpenDiceBag}>查看骰池</button></div>
      <div className="reward-body">
        <div className="reward-options-grid">{options.map(recipe => <article className="reward-option-card" key={recipe.id}>
          <h3>{recipe.name}</h3><button type="button" onClick={() => setPreviewId(recipe.id)}>查看六面展開圖</button><ol className="recipe-faces">{recipe.faces.map(([creature, value], index) => <li key={index}>
            <strong>{CREATURE_CONFIG[creature].name} {value + DICE_DRAFT_CONFIG.regionBonus[region]}</strong>
            <details><summary>能力</summary><SkillText text={CREATURE_CONFIG[creature].description} /></details>
          </li>)}</ol><button type="button" className="btn-pick-reward" onClick={() => choose(recipe.id)}>選擇此骰</button>
        </article>)}</div>
      </div>
      <div className="reward-footer">
        <div className="reward-refresh">
          <span>持有 {gold} 金幣</span>
          <PaidRefreshButton cost={cost} gold={gold} onRefresh={refresh} />
        </div>
      </div>
    </div>
  </div>
    {preview && <div className="modal-overlay dice-net-overlay" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); setPreviewId(null); }
    }}><div className="dice-net-dialog" role="dialog" aria-modal="true" aria-labelledby="recipe-preview-title">
        <div className="modal-header"><h2 id="recipe-preview-title">{preview.name}</h2>
          <button type="button" onClick={() => setPreviewId(null)}>返回選擇</button></div>
        <div className="dice-net-body"><DiceNet dice={instantiateRecipe(preview, region, `preview-${preview.id}`)} /></div>
        <button type="button" className="btn-primary-modal" onClick={() => { choose(preview.id); setPreviewId(null); }}>選擇此骰</button>
      </div></div>}
  </>;
}
