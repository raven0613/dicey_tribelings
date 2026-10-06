import { getRefreshCost } from '../../service/rewards/refreshService';
import { useShallow } from 'zustand/react/shallow';
import { MaterialBadge } from '../dice/MaterialBadge';
import { SkillText } from '../common/SkillText';
import { RarityBadge } from '../dice/RarityBadge';
import React from 'react';
import { ArrowRight, Coins, Heart, Sparkles, Store } from 'lucide-react';
import { SHOP_CONFIG } from '../../configs/shopConfig';
import { useGameStore } from '../../store/gameStore';
import { StickerBadge } from '../stickers/StickerBadge';
import { PaidRefreshButton } from '../common/PaidRefreshButton';

export const ShopModal: React.FC = () => {
  const {
    mapNodes,
    currentNodeIndex,
    gold, shopRefreshes, refreshShop,
    playerHp,
    maxHp,
    shopStickers, shopPacks, buyShopPack,
    shopEquipments,
    buyShopSticker,
    buyShopEquipment,
    buyHeal,
    advanceToNextNode,
  } = useGameStore(useShallow((state) => ({
    mapNodes: state.mapNodes,
    currentNodeIndex: state.currentNodeIndex,
    gold: state.gold, shopRefreshes: state.shopRefreshes, refreshShop: state.refreshShop,
    playerHp: state.playerHp,
    maxHp: state.maxHp,
    shopStickers: state.shopStickers, shopPacks: state.shopPacks, buyShopPack: state.buyShopPack,
    shopEquipments: state.shopEquipments,
    buyShopSticker: state.buyShopSticker,
    buyShopEquipment: state.buyShopEquipment,
    buyHeal: state.buyHeal,
    advanceToNextNode: state.advanceToNextNode,
  })));
  const currentNode = mapNodes[currentNodeIndex];
  if (!currentNode || currentNode.type !== 'shop' || currentNode.completed) return null;

  return (
    <div className="shop-card">
      <div className="shop-header">
        <div className="shop-header-left">
          <div className="shop-avatar"><Store className="ui-icon" /></div>
          <div className="shop-title-box">
            <div className="shop-title">{currentNode.title}</div>
            <div className="shop-subtitle">購買永久改造、戰術貼紙、裝備與補給。</div>
          </div>
        </div>
        <div className="shop-header-right">
          <div className="gold-badge"><Coins className="ui-icon" color="#fbbf24" /><span>{gold} 金幣</span></div>
          <PaidRefreshButton cost={getRefreshCost('shop', shopRefreshes)} gold={gold} onRefresh={refreshShop} />
          <button type="button" onClick={advanceToNextNode} className="btn-leave-shop">離開商店<ArrowRight className="ui-icon" /></button>
        </div>
      </div>

      <div className="shop-body">
        <section>
          <div className="section-title"><Sparkles className="ui-icon" color="#fbbf24" /><span>永久與臨時貼紙</span></div>
          <div className="stickers-shop-grid">
            {shopStickers.map((sticker) => {
              const cost = sticker.cost ?? SHOP_CONFIG.disposableCost;
              return (
                <article key={sticker.id} className="shop-sticker-card">
                  <div>
                    <div className="card-top"><span className="disposable-tag">{sticker.isDisposable ? '臨時貼紙' : '永久改造'}</span><RarityBadge rarity={sticker.rarity} /></div>
                    <div className="card-val-row"><span className="card-val">{sticker.creature === 'directional' ? '定向翻面' : '沿用骰面點數'}</span><StickerBadge creature={sticker.creature} /></div>
                    <div className="card-name">{sticker.name}</div>
                    {sticker.isDisposable === false && <MaterialBadge material={sticker.material} description />}
                    <p className="card-desc"><SkillText text={sticker.description} /></p>
                  </div>
                  <button type="button" onClick={() => buyShopSticker(sticker.id)} disabled={gold < cost} className="btn-buy-sticker">
                    <Coins className="ui-icon" />{cost} 金幣
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section><div className="section-title">主題貼紙包・每包三張永久貼紙</div>
          <div className="stickers-shop-grid">{shopPacks.map(pack => <article key={pack.id} className="shop-sticker-card">
            <h3>{pack.name}</h3><p>{pack.description}</p><button type="button" className="btn-buy-sticker" disabled={gold < SHOP_CONFIG.packCost} onClick={() => buyShopPack(pack.id)}>購買・{SHOP_CONFIG.packCost} 金幣</button>
          </article>)}</div>
        </section>
        <div className="shop-bottom-grid">
          <section className="shop-column">
            <div className="section-title"><Sparkles className="ui-icon" color="#818cf8" /><span>裝備（{SHOP_CONFIG.equipmentCost} 金幣）</span></div>
            {shopEquipments.map((equipment) => (
              <article key={equipment.id} className="shop-item-card">
                <div><div className="item-name">{equipment.name}</div><p className="item-desc"><SkillText text={equipment.description} /></p></div>
                <button type="button" onClick={() => buyShopEquipment(equipment.id)} disabled={gold < SHOP_CONFIG.equipmentCost} className={`btn-buy-action equip-buy ${gold < SHOP_CONFIG.equipmentCost ? 'disabled' : ''}`}>
                  <Coins className="ui-icon" />購買（{SHOP_CONFIG.equipmentCost} 金幣）
                </button>
              </article>
            ))}
          </section>

          <section className="shop-column">
            <div className="section-title"><Heart className="ui-icon" color="#fb7185" /><span>旅店休養</span></div>
            <article className="shop-item-card heal-station">
              <div><div className="item-name">恢復生命值（+{SHOP_CONFIG.healAmount} HP）</div><p className="item-sub">目前 HP：{playerHp}/{maxHp}</p></div>
              <button type="button" onClick={buyHeal} aria-disabled={playerHp >= maxHp} disabled={playerHp < maxHp && gold < SHOP_CONFIG.healCost} className={`btn-buy-action heal-buy ${playerHp < maxHp && gold < SHOP_CONFIG.healCost ? 'disabled' : ''}`}>
                <Coins className="ui-icon" />{playerHp >= maxHp ? '生命已滿' : `治療（${SHOP_CONFIG.healCost} 金幣）`}
              </button>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
};
