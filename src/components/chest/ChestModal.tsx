import { ChestStory } from '../story/ChestStory';
import { SkillText } from '../common/SkillText';
import React, { useState } from 'react';
import { ArrowRight, Check, Gift, Sparkles } from 'lucide-react';
import type { ChestRewardOption } from '../../types/game';
import { INITIAL_PLAYER_STATS } from '../../configs/gameConfig';
import { useGameStore } from '../../store/gameStore';
import {
  EquipmentTransferAnimation,
  getElementCenter,
  getEquipmentSlotCenter,
} from '../equipment/EquipmentTransferAnimation';
import type { TransferPoint } from '../equipment/EquipmentTransferAnimation';
import { getEquipmentIcon } from '../equipment/equipmentIcons';

type EquipmentRewardOption = Extract<ChestRewardOption, { kind: 'equipment' }>;

interface EquipmentTransferState {
  option: EquipmentRewardOption;
  start: TransferPoint;
  target: TransferPoint;
}

export const ChestModal: React.FC = () => {
  const {
    mapNodes,
    currentNodeIndex,
    chestRewardOptions,
    pendingEquipment,
    equipments,
    openChest,
    claimChestReward,
    skipChestReward,
  } = useGameStore();
  const [equipmentTransfer, setEquipmentTransfer] = useState<EquipmentTransferState | null>(null);
  const currentNode = mapNodes[currentNodeIndex];
  if (!currentNode || currentNode.type !== 'chest' || currentNode.completed) return null;
  const isOpened = chestRewardOptions.length > 0;

  const handleOptionClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    option: ChestRewardOption
  ) => {
    if (equipmentTransfer) return;
    if (option.kind === 'stickerPack') {
      claimChestReward(option);
      return;
    }
    if (equipments.length >= INITIAL_PLAYER_STATS.maxEquipmentSlots) {
      claimChestReward(option);
      return;
    }

    setEquipmentTransfer({
      option,
      start: getElementCenter(event.currentTarget),
      target: getEquipmentSlotCenter(equipments.length),
    });
  };

  const handleEquipmentArrival = () => {
    if (!equipmentTransfer) return;
    const { option } = equipmentTransfer;
    setEquipmentTransfer(null);
    claimChestReward(option);
  };

  const renderOption = (option: ChestRewardOption) => {
    const isSelected = equipmentTransfer?.option.id === option.id;
    const isDimmed = equipmentTransfer !== null && !isSelected;

    if (option.kind === 'stickerPack') {
      return (
        <button
          type="button"
          key={option.id}
          disabled={equipmentTransfer !== null}
          onClick={(event) => handleOptionClick(event, option)}
          className={`chest-relic-card pack-option ${isDimmed ? 'dimmed' : ''}`}
        >
          <div className="card-top-row"><span className={`rarity-tag ${option.pack.rarity}`}>{option.pack.rarity}</span><span className="type-tag">貼紙包</span></div>
          <div className="card-icon-center"><div className="icon-disc"><Gift size={28} /></div></div>
          <div className="card-name">{option.pack.name}</div>
          <div className="card-description"><SkillText text={option.pack.description} /></div>
          <span className="btn-select-relic">選擇並開啟</span>
        </button>
      );
    }

    const equipment = option.equipment;
    const Icon = getEquipmentIcon(equipment.iconName);
    return (
      <button
        type="button"
        key={option.id}
        disabled={equipmentTransfer !== null}
        onClick={(event) => handleOptionClick(event, option)}
        className={`chest-relic-card ${equipment.rarity} ${isSelected ? 'selected locked' : ''} ${isDimmed ? 'dimmed' : ''}`}
      >
        <div className="card-top-row"><span className={`rarity-tag ${equipment.rarity}`}>{equipment.rarity}</span><span className="type-tag">裝備</span></div>
        <div className="card-icon-center"><div className="icon-disc"><Icon size={28} /></div></div>
        <div className="card-name">{equipment.name}</div>
        <div className="card-description"><SkillText text={equipment.description} /></div>
        <span className="btn-select-relic">
          {isSelected ? <><Check size={14} />移動中</> : '選擇此裝備'}
        </span>
      </button>
    );
  };

  return (
    <div className="chest-wrapper" inert={pendingEquipment?.source === 'chest'}>
      {isOpened && <ChestStory key={currentNodeIndex} />}
      <div className={`chest-card ${isOpened ? 'opened' : ''}`}>
        <div className="chest-icon-box"><Gift size={36} /></div>
        <div className="chest-info">
          <div className="chest-title">{currentNode.title}</div>
          <div className="chest-desc">
            {isOpened
              ? '選擇一份補給，或跳過獎勵繼續救援。'
              : '寶箱提供裝備保證候選與主題貼紙包，三選一。'}
          </div>
        </div>

        {!isOpened ? (
          <>
            <div className="chest-rewards-preview">
              <div className="reward-item equip"><Sparkles size={18} color="#818cf8" /><span>裝備或貼紙包（三選一）</span></div>
            </div>
            <button type="button" onClick={openChest} className="btn-open-chest">
              <Gift size={18} /><span>開啟寶箱</span><ArrowRight size={18} />
            </button>
          </>
        ) : (
          <div className="chest-pick-section">
            <div className="chest-relics-grid">{chestRewardOptions.map(renderOption)}</div>
            <div className="chest-tip-footer"><Sparkles size={14} color="#fbbf24" /><span>裝備槽已滿時，可在下一步選擇舊裝備替換。</span></div>
            <button
              type="button"
              className="btn-secondary-modal"
              disabled={equipmentTransfer !== null}
              onClick={skipChestReward}
            >
              跳過獎勵，繼續前進<ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {equipmentTransfer && (
        <EquipmentTransferAnimation
          equipment={equipmentTransfer.option.equipment}
          start={equipmentTransfer.start}
          target={equipmentTransfer.target}
          onArrive={handleEquipmentArrival}
        />
      )}
    </div>
  );
};
