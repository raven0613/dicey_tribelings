import { EQUIPMENT_BALANCE as b } from './equipmentConfig';

export const EQUIPMENT_ACTIONS = {
  FORMATION: { action: 'swap', label: '換位', prompt: '選擇左骰，與右骰交換', cost: b.formationCost, currency: 'Control' },
  WHISTLE: { action: 'lock', label: '保護', prompt: '選擇要保護的骰子', cost: b.whistleCost, currency: 'Control' },
  PRISM: { action: 'flip', label: '翻面', prompt: '選擇骰子，翻至對面', cost: b.prismCost, currency: 'Control' },
} as const;
