import { DICE_ROLL_PRESENTATION as motion } from '../../configs/dicePresentationConfig';
import { soundService } from '../audio/soundService';

export interface DiceRollAnimation {
  x: number; y: number; height: number; rotation: number; scale: number;
  startX: number; startY: number; startRotation: number;
  targetX: number; targetY: number; targetFaceIndex: number; faceCount: number;
  faceIndex: number; elapsed: number; duration: number; isFinished: boolean; hasBounced: boolean;
}

export function createDiceRollAnimation(targetX: number, targetY: number, targetFaceIndex: number,
  faceCount: number, reroll = false): DiceRollAnimation {
  const startX = targetX + (Math.random() - 0.5) * (reroll ? motion.rerollOffset : motion.startOffsetX);
  const startY = targetY - (reroll ? motion.rerollOffset : motion.startOffsetY);
  const startRotation = (Math.random() < 0.5 ? -1 : 1) * 360 * (motion.turns + Math.random() * motion.turnVariation);
  return { x: startX, y: startY, height: 0, rotation: startRotation, scale: 1,
    startX, startY, startRotation, targetX, targetY, targetFaceIndex, faceCount,
    faceIndex: targetFaceIndex, elapsed: 0, duration: motion.duration + Math.random() * motion.durationVariation,
    isFinished: false, hasBounced: false };
}

export function stepDiceRollAnimation(state: DiceRollAnimation, dt: number): DiceRollAnimation {
  if (state.isFinished) return state;
  const elapsed = Math.min(state.duration, state.elapsed + dt);
  const progress = elapsed / state.duration;
  const travel = 1 - (1 - Math.min(1, progress / motion.settleAt)) ** 3;
  const bounce = progress < motion.bounceAt ? 0 : Math.sin((progress - motion.bounceAt) / (1 - motion.bounceAt) * Math.PI);
  const hasBounced = progress >= motion.bounceAt;
  if (hasBounced && !state.hasBounced) soundService.playDiceBounce();
  if (progress === 1) soundService.playDiceSnap();
  return { ...state, elapsed, hasBounced, isFinished: progress === 1,
    x: state.startX + (state.targetX - state.startX) * travel,
    y: state.startY + (state.targetY - state.startY) * travel,
    height: progress < motion.bounceAt ? Math.sin(progress / motion.bounceAt * Math.PI) * motion.arcHeight : bounce * motion.bounceHeight,
    rotation: state.startRotation * (1 - travel), scale: 1 + bounce * 0.05,
    faceIndex: progress >= motion.settleAt ? state.targetFaceIndex
      : (state.targetFaceIndex + Math.ceil((state.duration - elapsed) / motion.faceInterval)) % state.faceCount,
  };
}
