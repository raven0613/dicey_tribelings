import { MATERIAL_CONFIG, MATERIAL_BALANCE, FOOD_CAPACITY } from '../../configs/materials/materialConfig';
import { CREATURE_CONFIG as roles } from '../../configs/creatures/creatureConfig';
import { CREATURE_BALANCE as balance } from '../../configs/creatures/creatureBalanceConfig';
import type { CreatureBattleState, CreatureId } from '../../types/creatures';
import type { BattleComboSummary } from '../../types/battle';
import type { Dice } from '../../types/game';
import { getEffectiveFace } from '../dice/diceFaces';
import { ceilDamage } from './damageValue';
import { combatNumber } from './creatures/creatureState';

interface DescriptionInput {
  die: Dice;
  faceIndex: number;
  creature: CreatureId;
  summary: BattleComboSummary | null;
  state: CreatureBattleState;
}

/** 戰場專用的數值化說明；角色設定原句供獎勵、商店與骰面檢視共用。 */
export function describeBattleSkills({ die, faceIndex, creature, summary, state }: DescriptionInput) {
  const faces = die.faces.map(getEffectiveFace);
  const face = faces[faceIndex];
  const item = summary?.items.find((entry) => entry.diceId === die.id);
  const roleId = item?.rolledCreature === 'imposter' ? state.imposterTargets[die.id] ?? item.creature : item?.rolledCreature ?? creature;
  const role = roles[roleId];
  const events = summary?.events.filter((event) => event.sourceDiceId === die.id && !event.equipmentId) ?? [];
  const primary = events.filter((event) => event.skill === roleId);
  const inputs = item?.skillInputs ?? {};
  const count = inputs.count ?? 0;
  const attackChanges = primary.flatMap((event) => event.changes.filter((change) => change.kind === 'attack' && change.targetId === die.id));
  const gain = attackChanges.reduce((sum, change) => sum + ceilDamage(change.after) - ceilDamage(change.before), 0);
  const bonus = primary.flatMap((event) => event.changes.filter((change) => change.kind === 'bonus'))
    .reduce((sum, change) => sum + ceilDamage(change.after), 0);
  const shield = primary.flatMap((event) => event.changes.filter((change) => change.kind === 'shield'))
    .reduce((sum, change) => sum + change.after - change.before, 0);
  const targetName = (id: string) => roles[summary!.items.find((entry) => entry.diceId === id)!.creature].name;
  const currentGain = `本回合攻擊力 ${gain >= 0 ? '+' : ''}${gain}。`;
  const describe = (): string => {
    if (!summary || !item) return roleId === 'coward'
      ? `被重骰時留下 ${face.baseValue} 點護盾。` : role.description;
    switch (roleId) {
      case 'coward': return state.cowardShields[die.id] === undefined
        ? `被重骰時留下 ${face.baseValue} 點護盾。`
        : `本回合已留下 ${state.cowardShields[die.id]} 點護盾。`;
      case 'family': return `同骰有 ${count} 個其他土人家族，${currentGain}`;
      case 'sisters': return `場上有 ${count} 名土人姐妹花，需要 ${inputs.minimum} 名；${currentGain}`;
      case 'twins': return `同骰有 ${count} 個土人雙胞胎面，本回合取最高基礎攻擊力 ${ceilDamage(inputs.after!)}。`;
      case 'gang': return `同骰相鄰面有 ${count} 個土人混混，本回合追加 ${count} 次攻擊，每次 ${inputs.value} 點。`;
      case 'loner': return `同骰有 ${count} 個土人獨行俠面，基礎攻擊力 ×${balance.loner.multiplier}；${currentGain}`;
      case 'follower': return `左右鄰骰有 ${count} 個土人勇士面，最高基礎攻擊力 ${ceilDamage(inputs.value!)}；${currentGain}`;
      case 'warrior': return `左右鄰骰有 ${count} 個土人跟班面，${currentGain}`;
      case 'elder': return `場上有 ${count} 種不同土人，${currentGain}`;
      case 'royalGuard': return `同骰有 ${count} 個其他 [貴族] 土人面，${currentGain}`;
      case 'knight': return `場上有 ${count} 名其他 [普通] 土人，有 1 名即可觸發；${currentGain}`;
      case 'guard': return `場上有 ${count} 名 [普通] 或 [貴族] 土人，本回合提供 ${combatNumber(shield)} 點護盾。`;
      case 'artisan': return `同骰相鄰面有 ${count} 個 [職人] 面，本回合提供 ${combatNumber(shield)} 點護盾。`;
      case 'chef': return `同骰擲出 [食物] 時存入儲糧；土人廚師擲出時消耗全部儲糧。目前儲糧 ${state.storedFood[die.id] ?? 0}，本回合入庫後可用 ${inputs.value}，釋放 ${bonus} 點追加攻擊。`;
      case 'cheerleader': return `場上有 ${count} 名 [戰士]，本回合追加攻擊 ${bonus} 點。`;
      case 'thief': return `本回合發生 ${count} 次搶奪${inputs.blockedByRobbery ? '，土人毛賊因被搶奪而攻擊歸零' : ''}，追加攻擊 ${bonus} 點。`;
      case 'priest': return `本回合在場時目睹 ${count} 次重骰，累積 ${inputs.value} 點追加傷害；本回合追加攻擊 ${bonus} 點。`;
      case 'bulwark': return `本回合全隊累計獲得 ${inputs.value} 點護盾，追加攻擊 ${bonus} 點。`;
      case 'glutton': return `${count > 0 ? `場上有 ${count} 份 [食物]` : '場上沒有 [食物]'}，本回合攻擊力由 ${ceilDamage(inputs.before!)} 調整為 ${ceilDamage(inputs.after!)}。`;
      case 'herald': return `${count > 0 ? `本回合追加攻擊骰數 ${count}` : '本回合沒有追加攻擊'}，全隊每顆正常骰攻擊力 +${gain}。`;
      case 'princess': return `命令其他 [貴族] 土人再次攻擊，本回合共 ${count} 名符合條件。`;
      case 'boss': case 'bully': {
        const event = primary.find((entry) => entry.relation === 'robbery');
        const loss = event?.changes.find((change) => change.targetId !== die.id && change.kind === 'attack' && change.after < change.before);
        return loss ? `${roleId === 'boss' ? '隨機搶奪' : '搶奪相鄰'} ${targetName(loss.targetId)} ${ceilDamage(loss.before) - ceilDamage(loss.after)} 點攻擊，自身攻擊力 +${gain}。`
          : `${role.description}本回合沒有合法搶奪目標。`;
      }
      case 'farmer': {
        if (item.creature === 'food') return `場上沒有 [食物]，結算時轉化為 ${inputs.value} 點基礎攻擊力的好吃的。`;
        if (inputs.virtualFood) {
          const change = primary.flatMap((event) => event.changes).find((entry) => entry.targetId === 'virtual-food')!;
          return `場上有 1 份虛擬 [食物]，本回合數值由 ${change.before} 強化為 ${change.after}，供土人廚師儲糧。`;
        }
        const change = primary.flatMap((event) => event.changes).find((entry) => entry.kind === 'attack' && entry.targetId !== die.id);
        return `場上有 ${count} 份 [食物]，強化最近的 1 份好吃的，攻擊力 +${change ? combatNumber(change.after - change.before) : 0}。`;
      }
      case 'porter': return `連線共 ${count} 名；前方基礎攻擊力合計 ${inputs.value ?? 0}，${currentGain}`;
      case 'imposter': return '本回合首次出現時偽裝成場上最多的角色，全場皆為偽裝者；維持原身分。';
      case 'authority': {
        const target = primary.flatMap((event) => event.identities)[0];
        return target ? `相鄰有 ${count} 名合法 [普通] 土人，本回合將 ${targetName(target.diceId)} 視為 [貴族]。` : `${role.description}本回合沒有合法目標。`;
      }
      case 'teacher': return `${count > 0 ? `目前有 ${count} 顆最低基礎攻擊力 ${inputs.value} 的合法土人骰可重骰` : '目前有 0 顆合法土人骰可重骰'}；重骰後數值提高時，該土人攻擊力 +${balance.teacher.bonus}。${gain > 0 ? `本骰已獲得攻擊力 +${gain}。` : ''}`;
      case 'prankster': return `自身被重骰時，隨機重骰 1 顆土人鄰骰；目前可連鎖的合法鄰骰有 ${count} 顆。`;
      case 'food': return role.description;
    }
  };
  const chain = roleId === 'porter' ? summary?.events.find((event) => event.skill === 'porter'
    && event.participantDiceIds.includes(die.id)) : undefined;
  const abilities = [...new Set([...events.map((event) => event.ability), ...(chain ? [chain.ability] : [])])];
  const lines = new Map([[primary[0]?.ability ?? role.ability, describe()]]);
  for (const event of events) {
    if (event.skill === roleId || event.skill === 'material') continue;
    if (event.skill === 'priest') {
      const value = event.sourceFaceId ? state.priestAttacks[event.sourceFaceId]?.damage ?? 0 : 0;
      lines.set(event.ability, `土人祭司本回合在場時目睹 ${value / balance.priest.damagePerReroll} 次重骰，保留並釋放 ${ceilDamage(value)} 點追加攻擊。`);
      continue;
    }
    const values = event.changes.map((change) => {
      const attack = change.kind === 'attack' || change.kind === 'bonus';
      const difference = attack ? ceilDamage(change.after) - ceilDamage(change.before) : combatNumber(change.after - change.before);
      const kind = change.kind === 'shield' ? '護盾' : change.kind === 'food' ? '儲糧' : change.kind === 'bonus' ? '追加攻擊' : '攻擊力';
      return `${kind} ${difference >= 0 ? '+' : ''}${difference}`;
    });
    if (values.length) lines.set(event.ability, values.join('、'));
  }
  const description = [...lines].map(([ability, text]) => `${ability}：${text}`);
  if (item?.rolledCreature === 'imposter' && roleId !== 'imposter') description.unshift(`本回合偽裝成：${roles[roleId].name}。`);
  if (face.material) {
    const material = MATERIAL_CONFIG[face.material];
    const status = face.material === 'echo' ? state.echoUsed.includes(face.id) ? '已發動' : '尚未發動' : '';
    description.push(`${material.name}：${material.description}${status}`);
    if (face.material === 'negative') description.push(`目前基礎攻擊力 ${face.baseValue}，結算後 ${Math.max(0, face.baseValue - MATERIAL_BALANCE.decay)}。`);
  }
  if (item?.tags.includes('food') || roleId === 'chef') description.push(`全隊儲糧 ${Object.values(state.storedFood).reduce((sum, value) => sum + value, 0)}／${FOOD_CAPACITY.crocodile}，從左側依序入庫。`);
  if (state.lockedDice.includes(die.id)) description.push('免疫強制重骰。');
  return { abilities, description: description.join('\n') };
}
