export const CREATURE_BALANCE = {
  family: { bonus: 2 }, sisters: { minimum: 2, bonus: 3 },
  gang: { damagePerNeighbor: 2 }, boss: { multiplier: 1.2 }, loner: { multiplier: 2 },
  follower: { range: 1 }, cheerleader: { damagePerWarrior: 2 },
  guard: { shield: 2 }, warrior: { bonusPerFollower: 2 }, elder: { bonusPerSpecies: 2 },
  artisan: { shield: 1 }, priest: { damagePerReroll: 2 }, knight: { bonus: 3 },
  teacher: { bonus: 3 }, royalGuard: { bonusPerNoble: 2 }, farmer: { foodBonus: 3 },
  glutton: { foodMultiplier: 1, hungryMultiplier: 0.9 },
  bully: { stolenFraction: 0.5, multiplier: 1.1, craftsmanMultiplier: 2 },
  herald: { bonusPerAttack: 1 }, princess: { packLimit: 2, packChance: 0.05, guaranteedNode: 3 },
} as const;
