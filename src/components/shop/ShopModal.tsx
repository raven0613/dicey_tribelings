import React from 'react';
import { ArrowRight, Coins, Heart, Sparkles, Store } from 'lucide-react';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { useGameStore } from '../../store/gameStore';
import { CreatureBadge } from '../dice/CreatureBadge';

export const ShopModal: React.FC = () => {
  const {
    mapNodes,
    currentNodeIndex,
    gold,
    playerHp,
    maxHp,
    shopStickers,
    shopEquipments,
    buyShopSticker,
    buyShopEquipment,
    buyHeal,
    advanceToNextNode,
  } = useGameStore();
  const currentNode = mapNodes[currentNodeIndex];
  if (!currentNode || currentNode.type !== 'shop' || currentNode.completed) return null;

  return (
    <div className="shop-card">
      <div className="shop-header">
        <div className="shop-header-left">
          <div className="shop-avatar"><Store size={24} /></div>
          <div className="shop-title-box">
            <div className="shop-title">{currentNode.title}</div>
            <div className="shop-subtitle">購買戰術貼紙、裝備與補給。新骰子由關卡進度解鎖。</div>
          </div>
        </div>
        <div className="shop-header-right">
          <div className="gold-badge"><Coins size={16} color="#fbbf24" /><span>{gold} 金幣</span></div>
          <button type="button" onClick={advanceToNextNode} className="btn-leave-shop">離開商店<ArrowRight size={14} /></button>
        </div>
      </div>

      <section>
        <div className="section-title"><Sparkles size={14} color="#fbbf24" /><span>戰術貼紙（確認收納或替換後扣款）</span></div>
        <div className="stickers-shop-grid">
          {shopStickers.map((sticker) => {
            const cost = sticker.cost ?? SHOP_CONFIG.defaultStickerCost;
            return (
              <article key={sticker.id} className="shop-sticker-card">
                <div>
                  <div className="card-top"><span className="disposable-tag">整場戰鬥</span><span className="rarity-tag">{sticker.rarity}</span></div>
                  <div className="card-val-row"><span className="card-val">{sticker.baseValue}</span><CreatureBadge creature={sticker.creature} /></div>
                  <div className="card-name">{sticker.name}</div>
                  <p className="card-desc">{sticker.description}</p>
                </div>
                <button type="button" onClick={() => buyShopSticker(sticker.id)} disabled={gold < cost} className={`btn-buy-sticker ${gold >= cost ? 'can-buy' : 'cannot-buy'}`}>
                  <Coins size={14} />{cost} 金幣
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <div className="shop-bottom-grid">
        <section className="shop-column">
          <div className="section-title"><Sparkles size={14} color="#818cf8" /><span>裝備遺物（{SHOP_CONFIG.equipmentCost} 金幣）</span></div>
          {shopEquipments.map((equipment) => (
            <article key={equipment.id} className="shop-item-card">
              <div><div className="item-name">{equipment.name}</div><p className="item-desc">{equipment.description}</p></div>
              <button type="button" onClick={() => buyShopEquipment(equipment.id)} disabled={gold < SHOP_CONFIG.equipmentCost} className={`btn-buy-action equip-buy ${gold < SHOP_CONFIG.equipmentCost ? 'disabled' : ''}`}>
                <Coins size={14} />購買（{SHOP_CONFIG.equipmentCost} 金幣）
              </button>
            </article>
          ))}
        </section>

        <section className="shop-column">
          <div className="section-title"><Heart size={14} color="#fb7185" /><span>旅店休養</span></div>
          <article className="shop-item-card heal-station">
            <div><div className="item-name">恢復生命值（+{SHOP_CONFIG.healAmount} HP）</div><p className="item-sub">目前 HP：{playerHp}/{maxHp}</p></div>
            <button type="button" onClick={buyHeal} disabled={gold < SHOP_CONFIG.healCost || playerHp >= maxHp} className={`btn-buy-action heal-buy ${gold < SHOP_CONFIG.healCost || playerHp >= maxHp ? 'disabled' : ''}`}>
              <Coins size={14} />治療（{SHOP_CONFIG.healCost} 金幣）
            </button>
          </article>
        </section>
      </div>
    </div>
  );
};
