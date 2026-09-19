import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { PAID_REROLL_CONFIG } from '../../configs/controlConfig';
import { getPaidRerollCost } from '../../service/battle/rerollCost';
import { useGameStore } from '../../store/gameStore';

/** 僅在有待確認目標時掛載；原生 dialog 管理焦點與背景操作。 */
export function PaidRerollDialog() {
  const { creatureBattleState, equipments, gold, confirmPaidReroll, cancelPaidReroll } = useGameStore(useShallow((state) => ({
    creatureBattleState: state.creatureBattleState,
    equipments: state.equipments,
    gold: state.gold,
    confirmPaidReroll: state.confirmPaidReroll,
    cancelPaidReroll: state.cancelPaidReroll,
  })));
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const cost = getPaidRerollCost(creatureBattleState.paidRerolls, equipments);
  const text = PAID_REROLL_CONFIG.prompt;
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="paid-reroll-dialog" aria-labelledby="paid-reroll-title"
    onCancel={(event) => { event.preventDefault(); cancelPaidReroll(); }}>
    <h2 id="paid-reroll-title">{text.title}</h2>
    <p>{text.description} <strong>{cost} 金幣</strong></p>
    <label><input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />{text.dismiss}</label>
    <div className="paid-reroll-actions">
      <button type="button" className="btn-secondary-modal" onClick={cancelPaidReroll}>{text.cancel}</button>
      <button type="button" className="btn-primary-modal" disabled={gold < cost} onClick={() => confirmPaidReroll(dontShowAgain)}>
        {cost}<Coins size={17} aria-hidden="true" />{text.confirm}
      </button>
    </div>
  </dialog>;
}
