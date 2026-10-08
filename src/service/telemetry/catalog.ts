import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import { CREATURE_BALANCE } from '../../configs/creatures/creatureBalanceConfig';
import { ALL_EQUIPMENT_CATALOG, EQUIPMENT_BALANCE } from '../../configs/equipment/equipmentConfig';
import { MATERIAL_CONFIG, MATERIAL_BALANCE } from '../../configs/materials/materialConfig';
import { MONSTER_CONFIG } from '../../configs/monsters/monsterConfig';

export function runCatalog() {
  return structuredClone({
    creatures: CREATURE_CONFIG,
    creatureBalance: CREATURE_BALANCE,
    equipments: ALL_EQUIPMENT_CATALOG,
    equipmentBalance: EQUIPMENT_BALANCE,
    materials: MATERIAL_CONFIG,
    materialBalance: MATERIAL_BALANCE,
    monsters: MONSTER_CONFIG,
  });
}
