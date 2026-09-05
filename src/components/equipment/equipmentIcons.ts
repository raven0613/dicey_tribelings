import {
  Flame,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const EQUIPMENT_ICONS: Record<string, LucideIcon> = {
  Flame,
  FlameKindling: Flame,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Wind,
  Zap,
};

export function getEquipmentIcon(iconName: string): LucideIcon {
  return EQUIPMENT_ICONS[iconName] ?? Sparkles;
}
