import logoImg from '../assets/brand/logo.jpg';
import pushImg from '../assets/brand/push.jpg';
import pullImg from '../assets/brand/pull.jpg';
import legsImg from '../assets/brand/legs.jpg';
import aiCoachImg from '../assets/brand/ai-coach.jpg';

export { logoImg, pushImg, pullImg, legsImg, aiCoachImg };

export function getWorkoutDayBadge(dayName?: string | null): string | null {
  if (!dayName) return null;
  const lower = dayName.toLowerCase();
  if (lower.includes('push') || lower.includes('empuje')) return pushImg;
  if (lower.includes('pull') || lower.includes('tracci') || lower.includes('espalda')) return pullImg;
  if (lower.includes('leg') || lower.includes('pierna')) return legsImg;
  return null;
}
