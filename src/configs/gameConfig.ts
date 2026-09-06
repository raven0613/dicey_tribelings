export { INITIAL_DICE_POOL } from './creatures/initialDiceConfig';
export { ALL_STICKERS_CATALOG } from './creatures/creatureStickerConfig';
import { MapNode } from '../types/game';

export const INITIAL_PLAYER_STATS = {
  maxHp: 60,
  hp: 60,
  gold: 40,
  maxControl: 3,
  maxEquipmentSlots: 5,
};

export { INITIAL_EQUIPMENT, ALL_EQUIPMENT_CATALOG } from './equipment/equipmentConfig';

export const INITIAL_MAP_NODES: MapNode[] = [
  { id: 0, type: 'fight', enemyId: 'bubble_slime', title: '森林邊緣', description: '遭遇鼓泡史萊姆', completed: false, current: true },
  { id: 1, type: 'fight', enemyId: 'rock_goblin', title: '林間小徑', description: '遭遇投石哥布林・喀啦', completed: false, current: false },
  { id: 2, type: 'chest', title: '迷霧寶箱', description: '獲取貼紙包或珍稀裝備', completed: false, current: false },
  { id: 3, type: 'shop', title: '地精黑市', description: '購買一次性貼紙、裝備與補給', completed: false, current: false },
  { id: 4, type: 'fight', enemyId: 'thorn_boar', title: '荊棘坡道', description: '遭遇荊背岩豬', completed: false, current: false },
  { id: 5, type: 'elite', enemyId: 'moss_colossus', title: '苔冠石庭', description: '挑戰苔冠巨像', completed: false, current: false },
  { id: 6, type: 'chest', title: '古代密室', description: '獲取貼紙包或珍稀裝備', completed: false, current: false },
  { id: 7, type: 'shop', title: '流浪商人', description: '整備裝備與補給生命', completed: false, current: false },
  { id: 8, type: 'boss', enemyId: 'mistroot_mur', title: '霧冠樹心', description: '決戰霧冠古樹穆爾', completed: false, current: false },
];
