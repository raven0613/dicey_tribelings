import { SKILL_KEYWORD_COLORS } from '../../configs/skillPresentationConfig';

const keywords = Object.keys(SKILL_KEYWORD_COLORS).sort((a, b) => b.length - a.length);
const pattern = new RegExp(`(${keywords.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

export function SkillText({ text }: { text: string }) {
  return <>{text.split(pattern).map((part, index) => SKILL_KEYWORD_COLORS[part]
    ? <span key={index} className="skill-keyword" style={{ color: SKILL_KEYWORD_COLORS[part] }}>{part}</span>
    : part)}</>;
}
