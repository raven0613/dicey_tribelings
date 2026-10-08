export const CREATURE_BALANCE = {
  sisters: { shareMultiplier: 3 },
  family: { bonusPerFace: 2 }, chef: { storagePerFace: 2 },
  twins: { facesPerPair: 2 }, gang: { fraction: 0.5 }, boss: { perRobbery: 0.2 },
  loner: { multiplier: 2 }, follower: { range: 1, fraction: 0.5, perFace: 0.15 },
  warrior: { bonusPerFollower: 2, perFacingFollower: 1 }, elder: { bonusPerFace: 2 },
  artisan: { shield: 2 }, knight: { bonus: 3 }, teacher: { bonus: 3 },
  authority: { bonusPerNoble: 2 }, prankster: { inheritance: 0.5 },
  fruit: { bonus: 2, highBonus: 4 }, food: { storageMultiplier: 2 },
  bully: { stolenFraction: 0.5, multiplier: 1.5, craftsmanMultiplier: 2.5 },
  detective: { multiplier: 1.2 }, herald: { bonusPerAttack: 1, bonusDiceDamage: 1 },
  princess: { packLimit: 2, packChance: 0.05, guaranteedNode: 15 },
} as const;
