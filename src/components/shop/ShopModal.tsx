import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { ElementType } from '../../types/game';
import {
  Store,
  Coins,
  Heart,
  Sparkles,
  Dices,
  Flame,
  Wind,
  Zap,
  Snowflake,
  Circle,
  ArrowRight,
} from 'lucide-react';

export const ShopModal: React.FC = () => {
  const {
    mapNodes,
    currentNodeIndex,
    gold,
    playerHp,
    maxHp,
    shopStickers,
    shopEquipments,
    shopDice,
    buyShopItem,
    advanceToNextNode,
  } = useGameStore();

  const currentNode = mapNodes[currentNodeIndex];
  if (!currentNode || currentNode.type !== 'shop' || currentNode.completed) return null;

  const getElementBadge = (elem: ElementType) => {
    switch (elem) {
      case 'fire':
        return <span style={{ color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Flame size={12} /> 火</span>;
      case 'wind':
        return <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Wind size={12} /> 風</span>;
      case 'thunder':
        return <span style={{ color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Zap size={12} /> 雷</span>;
      case 'ice':
        return <span style={{ color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Snowflake size={12} /> 冰</span>;
      default:
        return <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Circle size={12} /> 普</span>;
    }
  };

  return (
    <div className="shop-card">
      {/* Header */}
      <div className="shop-header">
        <div className="shop-header-left">
          <div className="shop-avatar">
            <Store size={24} />
          </div>
          <div className="shop-title-box">
            <div className="shop-title">{currentNode.title}</div>
            <div className="shop-subtitle">購買高級貼紙、遺物裝備或收購全新骰子擴充骰池！</div>
          </div>
        </div>

        <div className="shop-header-right">
          <div className="gold-badge">
            <Coins size={16} color="#fbbf24" />
            <span>{gold} 金幣</span>
          </div>

          <button
            onClick={advanceToNextNode}
            className="btn-leave-shop"
          >
            <span>離開商店</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Section 1: Stickers For Sale */}
      <div>
        <div className="section-title">
          <Sparkles size={14} color="#fbbf24" />
          <span>骰面貼紙 (購買後直接進入黏貼)</span>
        </div>
        <div className="stickers-shop-grid">
          {shopStickers.map((sticker) => {
            const cost = sticker.cost || 20;
            const canAfford = gold >= cost;

            return (
              <div
                key={sticker.id}
                className="shop-sticker-card"
              >
                <div>
                  <div className="card-top">
                    <span className={sticker.isDisposable ? 'disposable-tag' : 'perm-tag'}>
                      {sticker.isDisposable ? '一次性' : '永久'}
                    </span>
                    <span className="rarity-tag">{sticker.rarity}</span>
                  </div>
                  <div className="card-val-row">
                    <span className="card-val">{sticker.baseValue}</span>
                    <span>{getElementBadge(sticker.element)}</span>
                  </div>
                  <div className="card-name">{sticker.name}</div>
                  <p className="card-desc">
                    {sticker.description}
                  </p>
                </div>

                <button
                  onClick={() => buyShopItem('sticker', sticker.id)}
                  disabled={!canAfford}
                  className={`btn-buy-sticker ${canAfford ? 'can-buy' : 'cannot-buy'}`}
                >
                  <Coins size={14} />
                  <span>{cost} 金幣</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Equipment & New Dice & Heal */}
      <div className="shop-bottom-grid">
        {/* Equipments */}
        <div className="shop-column">
          <div className="section-title">
            <Sparkles size={14} color="#818cf8" />
            <span>裝備遺物 (35 金幣)</span>
          </div>
          {shopEquipments.map((eq) => {
            const canAfford = gold >= 35;
            return (
              <div key={eq.id} className="shop-item-card">
                <div>
                  <div className="item-name">{eq.name}</div>
                  <p className="item-desc">{eq.description}</p>
                </div>
                <button
                  onClick={() => buyShopItem('equipment', eq.id)}
                  disabled={!canAfford}
                  className={`btn-buy-action equip-buy ${!canAfford ? 'disabled' : ''}`}
                >
                  <Coins size={14} />
                  <span>購買 (35 金幣)</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* New Dice */}
        <div className="shop-column">
          <div className="section-title">
            <Dices size={14} color="#34d399" />
            <span>擴充新骰子 (45 金幣)</span>
          </div>
          {shopDice.map((d) => {
            const canAfford = gold >= 45;
            return (
              <div key={d.id} className="shop-item-card">
                <div>
                  <div className="item-name">{d.name}</div>
                  <div className="item-sub">{d.faces.length} 面 • 初始偏向特定屬性</div>
                </div>
                <button
                  onClick={() => buyShopItem('dice', d.id)}
                  disabled={!canAfford}
                  className={`btn-buy-action dice-buy ${!canAfford ? 'disabled' : ''}`}
                >
                  <Coins size={14} />
                  <span>加入骰池 (45 金幣)</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Heal Station */}
        <div className="shop-column">
          <div className="section-title">
            <Heart size={14} color="#fb7185" />
            <span>旅店休養</span>
          </div>
          <div className="shop-item-card heal-station">
            <div>
              <div className="item-name">恢復生命值 (+25 HP)</div>
              <p className="item-sub">目前 HP: {playerHp}/{maxHp}</p>
            </div>
            <button
              onClick={() => buyShopItem('heal', '')}
              disabled={gold < 20 || playerHp >= maxHp}
              className={`btn-buy-action heal-buy ${gold < 20 || playerHp >= maxHp ? 'disabled' : ''}`}
            >
              <Coins size={14} />
              <span>治療 (+25 HP, 20 金幣)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
