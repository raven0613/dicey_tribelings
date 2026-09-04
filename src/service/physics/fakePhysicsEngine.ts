import { soundService } from '../audio/soundService';

export interface DicePhysicsState {
  id: string;
  // Current coordinates (normalized pixels relative to tray container)
  x: number;
  y: number;
  z: number; // height off ground
  // Velocities
  vx: number;
  vy: number;
  vz: number;
  // Rotations in degrees
  rotX: number;
  rotY: number;
  rotZ: number;
  // Angular velocities
  wX: number;
  wY: number;
  wZ: number;
  // Target rest state
  targetX: number;
  targetY: number;
  targetRotX: number;
  targetRotY: number;
  targetRotZ: number;
  targetFaceIndex: number;
  // Physics lifecycle
  elapsed: number;
  totalDuration: number; // usually 0.75s ~ 0.9s
  isFinished: boolean;
  hasBounced: boolean;
}

// Map face index (0-5) for standard 3D cube to target rotation angles (deg)
export function getRotationForFaceIndex(faceIndex: number): { rotX: number; rotY: number; rotZ: number } {
  switch (faceIndex) {
    case 0: // Front
      return { rotX: 0, rotY: 0, rotZ: 0 };
    case 1: // Back
      return { rotX: 0, rotY: 180, rotZ: 0 };
    case 2: // Right
      return { rotX: 0, rotY: -90, rotZ: 0 };
    case 3: // Left
      return { rotX: 0, rotY: 90, rotZ: 0 };
    case 4: // Top
      return { rotX: -90, rotY: 0, rotZ: 0 };
    case 5: // Bottom
      return { rotX: 90, rotY: 0, rotZ: 0 };
    default:
      return { rotX: 0, rotY: 0, rotZ: 0 };
  }
}

export function initDicePhysics(
  id: string,
  targetFaceIndex: number,
  slotIndex: number,
  totalSlots: number,
  containerWidth = 600,
  containerHeight = 240,
  isReroll = false
): DicePhysicsState {
  const targetRotation = getRotationForFaceIndex(targetFaceIndex);

  // Compute neat tray resting position
  const spacing = Math.min(100, (containerWidth - 80) / Math.max(1, totalSlots));
  const startX = (containerWidth - (totalSlots - 1) * spacing) / 2;
  const targetX = startX + slotIndex * spacing;
  const targetY = containerHeight / 2 + 15;

  // Initial throw position and burst velocity
  const spawnAngle = (Math.PI * 0.25) + Math.random() * (Math.PI * 0.5);
  const throwDist = 180 + Math.random() * 80;
  const initX = isReroll ? targetX + (Math.random() - 0.5) * 60 : targetX - Math.cos(spawnAngle) * throwDist;
  const initY = isReroll ? targetY - 120 : targetY - Math.sin(spawnAngle) * throwDist;

  // Angular tumble spins (at least 2~3 full turns)
  const spinsX = (Math.random() > 0.5 ? 1 : -1) * (720 + Math.random() * 720);
  const spinsY = (Math.random() > 0.5 ? 1 : -1) * (720 + Math.random() * 720);
  const spinsZ = (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360);

  return {
    id,
    x: initX,
    y: initY,
    z: 120 + Math.random() * 80,
    vx: (targetX - initX) / 0.5,
    vy: (targetY - initY) / 0.5,
    vz: 180 + Math.random() * 60,
    rotX: targetRotation.rotX + spinsX,
    rotY: targetRotation.rotY + spinsY,
    rotZ: targetRotation.rotZ + spinsZ,
    wX: spinsX / 0.5,
    wY: spinsY / 0.5,
    wZ: spinsZ / 0.5,
    targetX,
    targetY,
    targetRotX: targetRotation.rotX,
    targetRotY: targetRotation.rotY,
    targetRotZ: targetRotation.rotZ,
    targetFaceIndex,
    elapsed: 0,
    totalDuration: 0.75 + Math.random() * 0.15, // 0.75s ~ 0.9s strictly between 0.6s and 1.0s
    isFinished: false,
    hasBounced: false,
  };
}

/**
 * Updates a single die's fake physics step
 * @param state Current physics state
 * @param dt Delta time in seconds (e.g. 0.016s)
 */
export function stepDicePhysics(state: DicePhysicsState, dt: number): DicePhysicsState {
  if (state.isFinished) return state;

  const next = { ...state };
  next.elapsed += dt;
  const progress = Math.min(1, next.elapsed / next.totalDuration);

  // Phase 1: Tumble & Bounce (0% to ~65% of time)
  // Phase 2: Snap & Align to determined readable face (65% to 100%)
  const snapStart = 0.65;

  if (progress < snapStart) {
    const pSub = progress / snapStart;
    const easeOutQuad = 1 - (1 - pSub) * (1 - pSub);

    // Parabolic motion with gravity & bounce
    next.z = Math.max(0, 100 * (1 - easeOutQuad) * (1 + 0.5 * Math.sin(pSub * Math.PI * 2.5)));
    next.x = state.x + (state.targetX - state.x) * easeOutQuad;
    next.y = state.y + (state.targetY - state.y) * easeOutQuad;

    // Check bounce trigger
    if (pSub > 0.45 && !next.hasBounced) {
      next.hasBounced = true;
      soundService.playDiceBounce();
    }

    // High tumble rotation
    const rotDecay = 1 - easeOutQuad;
    next.rotX = state.targetRotX + (state.rotX - state.targetRotX) * rotDecay;
    next.rotY = state.targetRotY + (state.rotY - state.targetRotY) * rotDecay;
    next.rotZ = state.targetRotZ + (state.rotZ - state.targetRotZ) * rotDecay;
  } else {
    // Smooth magnetic snapping to exact readable target angle and position
    const snapT = (progress - snapStart) / (1 - snapStart);
    // Smooth cubic ease out
    const ease = 1 - Math.pow(1 - snapT, 3);

    next.z = Math.max(0, (1 - ease) * 10);
    next.x = state.targetX;
    next.y = state.targetY;

    next.rotX = state.rotX + (state.targetRotX - state.rotX) * ease;
    next.rotY = state.targetRotY + (state.targetRotY - state.rotY) * ease;
    next.rotZ = state.targetRotZ + (state.targetRotZ - state.rotZ) * ease;

    if (progress >= 1 && !state.isFinished) {
      next.isFinished = true;
      next.x = state.targetX;
      next.y = state.targetY;
      next.z = 0;
      next.rotX = state.targetRotX;
      next.rotY = state.targetRotY;
      next.rotZ = state.targetRotZ;
      soundService.playDiceSnap();
    }
  }

  return next;
}
