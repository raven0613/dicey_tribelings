import { Layers } from 'lucide-react';
import type { StickerPack } from '../../types/game';
import { SkillText } from '../common/SkillText';

export function RewardPackCard({ pack, onClaim }: { pack: StickerPack; onClaim: () => void }) {
  return <article className="reward-bundle">
    <div className="reward-pack-cover">
      <Layers aria-hidden="true" />
      <strong>{pack.name}</strong>
      <span>{pack.stickerCount} 張永久貼紙</span>
    </div>
    <p><SkillText text={pack.description} /></p>
    <button type="button" className="btn-primary-modal" onClick={onClaim}>選擇</button>
  </article>;
}
