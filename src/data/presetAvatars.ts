export interface PresetAvatar {
  id: string;
  number: number;
  name: string;
  nameAr: string;
  subtitle: string;
  subtitleAr: string;
  ringColor: string;
  glowColor: string;
  shadowClass: string;
  iconType: string;
  svgDataUri: string;
}

/**
 * Generates an SVG Data URI for a preset avatar with neon glowing ring and dark circular backdrop
 */
function createPresetSvg(
  number: number,
  ringColor: string,
  glowColor: string,
  innerSvgContent: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="bg_${number}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="70%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <filter id="glow_${number}" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="ring_grad_${number}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="${ringColor}"/>
      <stop offset="100%" stop-color="${ringColor}"/>
    </linearGradient>
  </defs>

  <!-- Background base -->
  <circle cx="64" cy="64" r="58" fill="url(#bg_${number})"/>

  <!-- Neon Glowing Ring -->
  <circle cx="64" cy="64" r="57" fill="none" stroke="${glowColor}" stroke-width="4.5" opacity="0.8" filter="url(#glow_${number})"/>
  <circle cx="64" cy="64" r="57" fill="none" stroke="url(#ring_grad_${number})" stroke-width="3"/>

  <!-- Inner Artwork -->
  <g transform="translate(64, 64)">
    ${innerSvgContent}
  </g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // 1. Robot - The Builder
  {
    id: 'preset_1_robot',
    number: 1,
    name: 'Robot',
    nameAr: 'الروبوت',
    subtitle: 'The Builder',
    subtitleAr: 'البنّاء',
    ringColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(6,182,212,0.85)]',
    iconType: 'robot',
    svgDataUri: createPresetSvg(1, '#06b6d4', 'rgba(6, 182, 212, 0.9)', `
      <!-- Robot Head -->
      <rect x="-24" y="-20" width="48" height="42" rx="14" fill="#334155" stroke="#06b6d4" stroke-width="2.5"/>
      <!-- Ears / Bolts -->
      <rect x="-30" y="-8" width="6" height="18" rx="2" fill="#06b6d4"/>
      <rect x="24" y="-8" width="6" height="18" rx="2" fill="#06b6d4"/>
      <!-- Antenna -->
      <line x1="0" y1="-20" x2="0" y2="-32" stroke="#06b6d4" stroke-width="3"/>
      <circle cx="0" cy="-34" r="4.5" fill="#22d3ee"/>
      <!-- Visor -->
      <rect x="-18" y="-12" width="36" height="16" rx="8" fill="#0f172a" stroke="#06b6d4" stroke-width="1.5"/>
      <!-- Glowing Eyes -->
      <circle cx="-9" cy="-4" r="4" fill="#06b6d4"/>
      <circle cx="9" cy="-4" r="4" fill="#06b6d4"/>
      <!-- Smile / Grille -->
      <path d="M -12 12 Q 0 18 12 12" stroke="#22d3ee" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    `),
  },

  // 2. Wizard - The Prompt Wizard
  {
    id: 'preset_2_wizard',
    number: 2,
    name: 'Wizard',
    nameAr: 'الساحر',
    subtitle: 'The Prompt Wizard',
    subtitleAr: 'ساحر الأوامر',
    ringColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(168,85,247,0.85)]',
    iconType: 'wizard',
    svgDataUri: createPresetSvg(2, '#a855f7', 'rgba(168, 85, 247, 0.9)', `
      <!-- Wizard Hat -->
      <path d="M 0 -38 L -24 6 L 24 6 Z" fill="#581c87" stroke="#c084fc" stroke-width="2"/>
      <!-- Hat Brim -->
      <ellipse cx="0" cy="6" rx="30" ry="7" fill="#6b21a8" stroke="#d8b4fe" stroke-width="1.5"/>
      <!-- Stars on Hat -->
      <circle cx="-4" cy="-18" r="2.5" fill="#facc15"/>
      <circle cx="6" cy="-8" r="2" fill="#facc15"/>
      <!-- Wizard Face -->
      <circle cx="0" cy="16" r="14" fill="#fed7aa"/>
      <!-- Beard -->
      <path d="M -14 18 Q 0 40 14 18 Q 6 36 0 38 Q -6 36 -14 18 Z" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/>
      <!-- Eyes -->
      <circle cx="-5" cy="14" r="2" fill="#3b0764"/>
      <circle cx="5" cy="14" r="2" fill="#3b0764"/>
      <!-- Magic Sparkles -->
      <path d="M 22 -14 L 25 -22 L 28 -14 L 36 -11 L 28 -8 L 25 0 L 22 -8 L 14 -11 Z" fill="#facc15"/>
    `),
  },

  // 3. Mad Scientist - The Experimenter
  {
    id: 'preset_3_scientist',
    number: 3,
    name: 'Mad Scientist',
    nameAr: 'العالم العبقري',
    subtitle: 'The Experimenter',
    subtitleAr: 'المجرّب المبتكر',
    ringColor: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(34,197,94,0.85)]',
    iconType: 'scientist',
    svgDataUri: createPresetSvg(3, '#22c55e', 'rgba(34, 197, 94, 0.9)', `
      <!-- Wild Hair -->
      <path d="M -26 -2 Q -32 -26 -14 -32 Q 0 -38 14 -32 Q 32 -26 26 -2 Z" fill="#f1f5f9"/>
      <!-- Face -->
      <circle cx="0" cy="4" r="18" fill="#ffedd5"/>
      <!-- Big Goggles -->
      <circle cx="-10" cy="0" r="9" fill="#0f172a" stroke="#22c55e" stroke-width="2.5"/>
      <circle cx="10" cy="0" r="9" fill="#0f172a" stroke="#22c55e" stroke-width="2.5"/>
      <circle cx="-10" cy="0" r="4.5" fill="#4ade80"/>
      <circle cx="10" cy="0" r="4.5" fill="#4ade80"/>
      <line x1="-1" y1="0" x2="1" y2="0" stroke="#22c55e" stroke-width="3"/>
      <!-- Mustache & Grin -->
      <path d="M -12 12 Q 0 16 12 12" stroke="#475569" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- Flask -->
      <path d="M 16 16 L 22 26 L 32 26 L 26 16 Z" fill="#16a34a" opacity="0.9"/>
      <rect x="22" y="12" width="4" height="6" fill="#64748b"/>
    `),
  },

  // 4. DNA - The Architect
  {
    id: 'preset_4_dna',
    number: 4,
    name: 'DNA',
    nameAr: 'الحمض النووي',
    subtitle: 'The Architect',
    subtitleAr: 'المهندس المعماري',
    ringColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(236,72,153,0.85)]',
    iconType: 'dna',
    svgDataUri: createPresetSvg(4, '#ec4899', 'rgba(236, 72, 153, 0.9)', `
      <!-- Double Helix -->
      <path d="M -18 -32 Q 0 -16 18 0 Q 0 16 -18 32" fill="none" stroke="#ec4899" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M 18 -32 Q 0 -16 -18 0 Q 0 16 18 32" fill="none" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
      <!-- Base Pairs / Rungs -->
      <line x1="-15" y1="-24" x2="15" y2="-24" stroke="#f472b6" stroke-width="3"/>
      <line x1="-6" y1="-12" x2="6" y2="-12" stroke="#38bdf8" stroke-width="3"/>
      <line x1="-15" y1="12" x2="15" y2="12" stroke="#f472b6" stroke-width="3"/>
      <line x1="-6" y1="24" x2="6" y2="24" stroke="#38bdf8" stroke-width="3"/>
      <!-- Atoms Nodes -->
      <circle cx="-15" cy="-24" r="4" fill="#ec4899"/>
      <circle cx="15" cy="-24" r="4" fill="#38bdf8"/>
      <circle cx="-15" cy="12" r="4" fill="#ec4899"/>
      <circle cx="15" cy="12" r="4" fill="#38bdf8"/>
    `),
  },

  // 5. Brain - The Thinker
  {
    id: 'preset_5_brain',
    number: 5,
    name: 'Brain',
    nameAr: 'الدماغ المفكر',
    subtitle: 'The Thinker',
    subtitleAr: 'المفكّر',
    ringColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.85)]',
    iconType: 'brain',
    svgDataUri: createPresetSvg(5, '#f59e0b', 'rgba(245, 158, 11, 0.9)', `
      <!-- Glowing Brain Cortex Left -->
      <path d="M -4 -24 C -22 -24 -28 -6 -24 6 C -28 16 -18 26 -4 28 Z" fill="#fbbf24" opacity="0.9" stroke="#d97706" stroke-width="2"/>
      <!-- Glowing Brain Cortex Right -->
      <path d="M 4 -24 C 22 -24 28 -6 24 6 C 28 16 18 26 4 28 Z" fill="#f59e0b" opacity="0.9" stroke="#b45309" stroke-width="2"/>
      <!-- Neural Synapse Lines -->
      <path d="M -16 -12 Q -8 -6 -14 4 Q -6 14 -12 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <path d="M 16 -12 Q 8 -6 14 4 Q 6 14 12 20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <!-- Central Light -->
      <line x1="0" y1="-22" x2="0" y2="26" stroke="#fef3c7" stroke-width="3" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="5" fill="#ffffff"/>
    `),
  },

  // 6. Owl - The Researcher
  {
    id: 'preset_6_owl',
    number: 6,
    name: 'Owl',
    nameAr: 'البومة',
    subtitle: 'The Researcher',
    subtitleAr: 'الباحث الدقيق',
    ringColor: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(14,165,233,0.85)]',
    iconType: 'owl',
    svgDataUri: createPresetSvg(6, '#0ea5e9', 'rgba(14, 165, 233, 0.9)', `
      <!-- Owl Body -->
      <ellipse cx="0" cy="4" rx="24" ry="28" fill="#334155" stroke="#0ea5e9" stroke-width="2"/>
      <!-- Ear Tufts -->
      <polygon points="-20,-24 -14,-6 -6,-16" fill="#1e293b" stroke="#0ea5e9" stroke-width="1.5"/>
      <polygon points="20,-24 14,-6 6,-16" fill="#1e293b" stroke="#0ea5e9" stroke-width="1.5"/>
      <!-- Face Disc -->
      <circle cx="-10" cy="-4" r="11" fill="#0f172a" stroke="#0ea5e9" stroke-width="2"/>
      <circle cx="10" cy="-4" r="11" fill="#0f172a" stroke="#0ea5e9" stroke-width="2"/>
      <!-- Golden Glowing Eyes -->
      <circle cx="-10" cy="-4" r="6" fill="#facc15"/>
      <circle cx="10" cy="-4" r="6" fill="#facc15"/>
      <circle cx="-10" cy="-4" r="3" fill="#020617"/>
      <circle cx="10" cy="-4" r="3" fill="#020617"/>
      <!-- Beak -->
      <polygon points="0,0 -4,8 4,8" fill="#f59e0b"/>
      <!-- Chest Feathers -->
      <path d="M -8 16 Q 0 20 8 16" stroke="#38bdf8" stroke-width="2" fill="none"/>
      <path d="M -6 22 Q 0 26 6 22" stroke="#38bdf8" stroke-width="2" fill="none"/>
    `),
  },

  // 7. Fox - The Hacker
  {
    id: 'preset_7_fox',
    number: 7,
    name: 'Fox',
    nameAr: 'الثعلب',
    subtitle: 'The Hacker',
    subtitleAr: 'المخترق الذكي',
    ringColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(249,115,22,0.85)]',
    iconType: 'fox',
    svgDataUri: createPresetSvg(7, '#f97316', 'rgba(249, 115, 22, 0.9)', `
      <!-- Ears -->
      <polygon points="-24,-28 -8,-2 -26,2" fill="#ea580c" stroke="#fed7aa" stroke-width="1.5"/>
      <polygon points="24,-28 8,-2 26,2" fill="#ea580c" stroke="#fed7aa" stroke-width="1.5"/>
      <polygon points="-18,-20 -9,-4 -20,-2" fill="#431407"/>
      <polygon points="18,-20 9,-4 20,-2" fill="#431407"/>
      <!-- Face -->
      <polygon points="0,26 -26,-2 26,-2" fill="#f97316"/>
      <!-- White Cheeks -->
      <polygon points="0,26 -26,-2 -8,10" fill="#fff7ed"/>
      <polygon points="0,26 26,-2 8,10" fill="#fff7ed"/>
      <!-- Snout Nose -->
      <circle cx="0" cy="24" r="3.5" fill="#0f172a"/>
      <!-- Sly Eyes -->
      <ellipse cx="-10" cy="2" rx="4" ry="2" fill="#0f172a" transform="rotate(-15 -10 2)"/>
      <ellipse cx="10" cy="2" rx="4" ry="2" fill="#0f172a" transform="rotate(15 10 2)"/>
    `),
  },

  // 8. Octopus - The Multitasker
  {
    id: 'preset_8_octopus',
    number: 8,
    name: 'Octopus',
    nameAr: 'الأخطبوط',
    subtitle: 'The Multitasker',
    subtitleAr: 'متعدد المهام',
    ringColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(6,182,212,0.85)]',
    iconType: 'octopus',
    svgDataUri: createPresetSvg(8, '#06b6d4', 'rgba(6, 182, 212, 0.9)', `
      <!-- Head Dome -->
      <ellipse cx="0" cy="-10" rx="22" ry="22" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
      <!-- Eyes -->
      <circle cx="-9" cy="-8" r="5" fill="#ffffff"/>
      <circle cx="9" cy="-8" r="5" fill="#ffffff"/>
      <circle cx="-8" cy="-8" r="2.5" fill="#0369a1"/>
      <circle cx="8" cy="-8" r="2.5" fill="#0369a1"/>
      <!-- Tentacles Swirls -->
      <path d="M -18 8 Q -28 20 -16 28 Q -8 22 -12 10" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M -8 12 Q -8 26 0 28 Q 0 20 -4 12" fill="#0369a1"/>
      <path d="M 8 12 Q 8 26 0 28 Q 0 20 4 12" fill="#0369a1"/>
      <path d="M 18 8 Q 28 20 16 28 Q 8 22 12 10" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
    `),
  },

  // 9. Bee - The Optimizer
  {
    id: 'preset_9_bee',
    number: 9,
    name: 'Bee',
    nameAr: 'النحلة',
    subtitle: 'The Optimizer',
    subtitleAr: 'المحسّن الدؤوب',
    ringColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(234,179,8,0.85)]',
    iconType: 'bee',
    svgDataUri: createPresetSvg(9, '#eab308', 'rgba(234, 179, 8, 0.9)', `
      <!-- Wings -->
      <ellipse cx="-12" cy="-16" rx="10" ry="16" fill="#e0f2fe" opacity="0.8" stroke="#38bdf8" stroke-width="1.5" transform="rotate(-30 -12 -16)"/>
      <ellipse cx="12" cy="-16" rx="10" ry="16" fill="#e0f2fe" opacity="0.8" stroke="#38bdf8" stroke-width="1.5" transform="rotate(30 12 -16)"/>
      <!-- Body -->
      <ellipse cx="0" cy="4" rx="18" ry="24" fill="#eab308" stroke="#ca8a04" stroke-width="2"/>
      <!-- Stripes -->
      <path d="M -16 -2 Q 0 4 16 -2 L 17 4 Q 0 10 -17 4 Z" fill="#1e293b"/>
      <path d="M -15 10 Q 0 16 15 10 L 14 16 Q 0 22 -14 16 Z" fill="#1e293b"/>
      <!-- Stinger -->
      <polygon points="0,28 -3,34 3,34" fill="#1e293b"/>
      <!-- Eyes & Antennae -->
      <circle cx="-7" cy="-6" r="3" fill="#0f172a"/>
      <circle cx="7" cy="-6" r="3" fill="#0f172a"/>
      <path d="M -4 -16 Q -8 -26 -14 -24" stroke="#1e293b" stroke-width="2" fill="none"/>
      <path d="M 4 -16 Q 8 -26 14 -24" stroke="#1e293b" stroke-width="2" fill="none"/>
    `),
  },

  // 10. Ant - The System Builder
  {
    id: 'preset_10_ant',
    number: 10,
    name: 'Ant',
    nameAr: 'النملة',
    subtitle: 'The System Builder',
    subtitleAr: 'منشئ الأنظمة',
    ringColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(239,68,68,0.85)]',
    iconType: 'ant',
    svgDataUri: createPresetSvg(10, '#ef4444', 'rgba(239, 68, 68, 0.9)', `
      <!-- Legs -->
      <path d="M -8 0 L -24 -12 M -8 6 L -26 6 M -8 12 L -22 22" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M 8 0 L 24 -12 M 8 6 L 26 6 M 8 12 L 22 22" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Head -->
      <circle cx="0" cy="-16" r="10" fill="#991b1b" stroke="#ef4444" stroke-width="2"/>
      <!-- Thorax -->
      <ellipse cx="0" cy="0" rx="8" ry="10" fill="#b91c1c"/>
      <!-- Abdomen -->
      <ellipse cx="0" cy="18" rx="12" ry="15" fill="#7f1d1d" stroke="#ef4444" stroke-width="1.5"/>
      <!-- Eyes & Antennae -->
      <circle cx="-4" cy="-18" r="2" fill="#fee2e2"/>
      <circle cx="4" cy="-18" r="2" fill="#fee2e2"/>
      <path d="M -4 -24 Q -12 -34 -18 -30" stroke="#f87171" stroke-width="2" fill="none"/>
      <path d="M 4 -24 Q 12 -34 18 -30" stroke="#f87171" stroke-width="2" fill="none"/>
    `),
  },

  // 11. Chameleon - The Adapter
  {
    id: 'preset_11_chameleon',
    number: 11,
    name: 'Chameleon',
    nameAr: 'الحرباء',
    subtitle: 'The Adapter',
    subtitleAr: 'المتكيّف',
    ringColor: '#84cc16',
    glowColor: 'rgba(132, 204, 22, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(132,204,22,0.85)]',
    iconType: 'chameleon',
    svgDataUri: createPresetSvg(11, '#84cc16', 'rgba(132, 204, 22, 0.9)', `
      <!-- Body Curved -->
      <path d="M -14 -6 C -8 -22 14 -20 22 -6 C 28 6 18 20 0 20 C -18 20 -28 10 -24 -2" fill="#65a30d" stroke="#a3e635" stroke-width="2"/>
      <!-- Coiled Tail -->
      <path d="M -22 8 Q -32 18 -26 26 Q -18 30 -14 24 Q -12 18 -18 18" fill="none" stroke="#a3e635" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Chameleon Eye Turret -->
      <circle cx="12" cy="-8" r="8" fill="#4d7c0f" stroke="#bef264" stroke-width="2"/>
      <circle cx="12" cy="-8" r="3.5" fill="#facc15"/>
      <circle cx="13" cy="-8" r="1.5" fill="#020617"/>
      <!-- Crest -->
      <path d="M 2 -18 Q 8 -24 16 -16" fill="none" stroke="#bef264" stroke-width="2"/>
    `),
  },

  // 12. Eagle - The Strategist
  {
    id: 'preset_12_eagle',
    number: 12,
    name: 'Eagle',
    nameAr: 'النسر',
    subtitle: 'The Strategist',
    subtitleAr: 'المخطط الاستراتيجي',
    ringColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(59,130,246,0.85)]',
    iconType: 'eagle',
    svgDataUri: createPresetSvg(12, '#3b82f6', 'rgba(59, 130, 246, 0.9)', `
      <!-- Eagle Head (White feathers) -->
      <path d="M -16 18 L -20 -10 Q -10 -28 12 -24 Q 24 -14 20 6 L 10 18 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <!-- Fierce Eye -->
      <polygon points="4,-6 12,-4 8,-2" fill="#0f172a"/>
      <circle cx="8" cy="-4" r="2.5" fill="#eab308"/>
      <!-- Hooked Beak -->
      <path d="M 18 -4 Q 34 -2 30 12 Q 22 10 18 6 Z" fill="#eab308" stroke="#ca8a04" stroke-width="1.5"/>
    `),
  },

  // 13. Wolf - The Lone Creator
  {
    id: 'preset_13_wolf',
    number: 13,
    name: 'Wolf',
    nameAr: 'الذئب',
    subtitle: 'The Lone Creator',
    subtitleAr: 'المبتكر المنفرد',
    ringColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(139,92,246,0.85)]',
    iconType: 'wolf',
    svgDataUri: createPresetSvg(13, '#8b5cf6', 'rgba(139, 92, 246, 0.9)', `
      <!-- Pointy Ears -->
      <polygon points="-22,-28 -8,-4 -24,4" fill="#475569" stroke="#a78bfa" stroke-width="1.5"/>
      <polygon points="22,-28 8,-4 24,4" fill="#475569" stroke="#a78bfa" stroke-width="1.5"/>
      <!-- Wolf Head / Fur -->
      <polygon points="0,26 -24,0 -16,-18 0,-10 16,-18 24,0" fill="#334155" stroke="#a78bfa" stroke-width="2"/>
      <!-- Eyes Glowing Purple/Yellow -->
      <ellipse cx="-8" cy="-2" rx="3.5" ry="2" fill="#c084fc" transform="rotate(-15 -8 -2)"/>
      <ellipse cx="8" cy="-2" rx="3.5" ry="2" fill="#c084fc" transform="rotate(15 8 -2)"/>
      <!-- Nose -->
      <polygon points="0,18 -4,14 4,14" fill="#020617"/>
    `),
  },

  // 14. Cat - The Curious One
  {
    id: 'preset_14_cat',
    number: 14,
    name: 'Cat',
    nameAr: 'القط',
    subtitle: 'The Curious One',
    subtitleAr: 'الفضولي',
    ringColor: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(244,63,94,0.85)]',
    iconType: 'cat',
    svgDataUri: createPresetSvg(14, '#f43f5e', 'rgba(244, 63, 94, 0.9)', `
      <!-- Ears -->
      <polygon points="-22,-24 -6,-8 -24,-2" fill="#e11d48"/>
      <polygon points="22,-24 6,-8 24,-2" fill="#e11d48"/>
      <polygon points="-18,-18 -8,-8 -18,-4" fill="#fecdd3"/>
      <polygon points="18,-18 8,-8 18,-4" fill="#fecdd3"/>
      <!-- Face -->
      <circle cx="0" cy="4" r="22" fill="#f43f5e"/>
      <!-- Big Curious Eyes -->
      <ellipse cx="-9" cy="0" rx="6" ry="7" fill="#fef08a"/>
      <ellipse cx="9" cy="0" rx="6" ry="7" fill="#fef08a"/>
      <ellipse cx="-9" cy="0" rx="2" ry="6" fill="#020617"/>
      <ellipse cx="9" cy="0" rx="2" ry="6" fill="#020617"/>
      <!-- Nose & Mouth -->
      <polygon points="0,10 -3,7 3,7" fill="#fecdd3"/>
      <path d="M -6 14 Q 0 18 6 14" stroke="#ffffff" stroke-width="2" fill="none"/>
      <!-- Whiskers -->
      <line x1="-14" y1="12" x2="-26" y2="8" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="-14" y1="15" x2="-26" y2="18" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="14" y1="12" x2="26" y2="8" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="14" y1="15" x2="26" y2="18" stroke="#ffffff" stroke-width="1.5"/>
    `),
  },

  // 15. Monkey - The Tinkerer
  {
    id: 'preset_15_monkey',
    number: 15,
    name: 'Monkey',
    nameAr: 'القرد',
    subtitle: 'The Tinkerer',
    subtitleAr: 'المعدّل',
    ringColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.85)]',
    iconType: 'monkey',
    svgDataUri: createPresetSvg(15, '#f59e0b', 'rgba(245, 158, 11, 0.9)', `
      <!-- Ears -->
      <circle cx="-24" cy="2" r="10" fill="#78350f"/>
      <circle cx="-24" cy="2" r="6" fill="#fde68a"/>
      <circle cx="24" cy="2" r="10" fill="#78350f"/>
      <circle cx="24" cy="2" r="6" fill="#fde68a"/>
      <!-- Head -->
      <circle cx="0" cy="0" r="22" fill="#92400e"/>
      <!-- Face Mask -->
      <path d="M -14 -8 C -14 -16 0 -16 0 -8 C 0 -16 14 -16 14 -8 C 18 10 -18 10 -14 -8 Z" fill="#fde68a"/>
      <ellipse cx="0" cy="8" rx="14" ry="10" fill="#fde68a"/>
      <!-- Eyes & Smile -->
      <circle cx="-6" cy="-4" r="2.5" fill="#1e293b"/>
      <circle cx="6" cy="-4" r="2.5" fill="#1e293b"/>
      <path d="M -8 10 Q 0 16 8 10" stroke="#78350f" stroke-width="2" fill="none" stroke-linecap="round"/>
    `),
  },

  // 16. Butterfly - The Creative
  {
    id: 'preset_16_butterfly',
    number: 16,
    name: 'Butterfly',
    nameAr: 'الفراشة',
    subtitle: 'The Creative',
    subtitleAr: 'المبدع',
    ringColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(6,182,212,0.85)]',
    iconType: 'butterfly',
    svgDataUri: createPresetSvg(16, '#06b6d4', 'rgba(6, 182, 212, 0.9)', `
      <!-- Top Wings (Vibrant Cyan & Orange) -->
      <path d="M 0 -6 C -18 -34 -36 -12 -12 4 Z" fill="#06b6d4" stroke="#67e8f9" stroke-width="2"/>
      <path d="M 0 -6 C 18 -34 36 -12 12 4 Z" fill="#06b6d4" stroke="#67e8f9" stroke-width="2"/>
      <!-- Bottom Wings -->
      <path d="M 0 4 C -22 10 -26 28 -8 24 Z" fill="#f97316" stroke="#fed7aa" stroke-width="1.5"/>
      <path d="M 0 4 C 22 10 26 28 8 24 Z" fill="#f97316" stroke="#fed7aa" stroke-width="1.5"/>
      <!-- Body & Antennae -->
      <ellipse cx="0" cy="4" rx="3.5" ry="18" fill="#0f172a"/>
      <path d="M -2 -14 Q -10 -26 -14 -22" stroke="#67e8f9" stroke-width="1.5" fill="none"/>
      <path d="M 2 -14 Q 10 -26 14 -22" stroke="#67e8f9" stroke-width="1.5" fill="none"/>
    `),
  },

  // 17. Dragon - The Power User
  {
    id: 'preset_17_dragon',
    number: 17,
    name: 'Dragon',
    nameAr: 'التنين',
    subtitle: 'The Power User',
    subtitleAr: 'المستخدم الخارق',
    ringColor: '#dc2626',
    glowColor: 'rgba(220, 38, 38, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(220,38,38,0.85)]',
    iconType: 'dragon',
    svgDataUri: createPresetSvg(17, '#dc2626', 'rgba(220, 38, 38, 0.9)', `
      <!-- Horns -->
      <path d="M -12 -12 Q -26 -30 -32 -26 Q -28 -18 -18 -4" fill="#991b1b" stroke="#f87171" stroke-width="1.5"/>
      <path d="M 12 -12 Q 26 -30 32 -26 Q 28 -18 18 -4" fill="#991b1b" stroke="#f87171" stroke-width="1.5"/>
      <!-- Dragon Head -->
      <path d="M 0 28 L -18 6 L -16 -16 L 0 -10 L 16 -16 L 18 6 Z" fill="#dc2626" stroke="#fca5a5" stroke-width="2"/>
      <!-- Fiery Eyes -->
      <polygon points="-10,-2 -4,-4 -6,0" fill="#facc15"/>
      <polygon points="10,-2 4,-4 6,0" fill="#facc15"/>
      <!-- Snout & Smoke/Fire -->
      <circle cx="-4" cy="20" r="2" fill="#450a0a"/>
      <circle cx="4" cy="20" r="2" fill="#450a0a"/>
      <path d="M 0 26 Q 8 36 0 40 Q -8 36 0 26" fill="#f97316"/>
    `),
  },

  // 18. Robotic Arm - The Engineer
  {
    id: 'preset_18_robotic_arm',
    number: 18,
    name: 'Robotic Arm',
    nameAr: 'الذراع الآلية',
    subtitle: 'The Engineer',
    subtitleAr: 'المهندس الميكانيكي',
    ringColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(99,102,241,0.85)]',
    iconType: 'robotic_arm',
    svgDataUri: createPresetSvg(18, '#6366f1', 'rgba(99, 102, 241, 0.9)', `
      <!-- Arm Base -->
      <rect x="-20" y="20" width="40" height="10" rx="3" fill="#334155"/>
      <!-- Hydraulic Joints -->
      <line x1="-12" y1="20" x2="-6" y2="-2" stroke="#6366f1" stroke-width="6" stroke-linecap="round"/>
      <circle cx="-6" cy="-2" r="6" fill="#818cf8"/>
      <line x1="-6" y1="-2" x2="14" y2="-18" stroke="#6366f1" stroke-width="5" stroke-linecap="round"/>
      <circle cx="14" cy="-18" r="5" fill="#818cf8"/>
      <!-- Gripper / Claw -->
      <path d="M 14 -18 L 22 -28 M 14 -18 L 26 -14" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
    `),
  },

  // 19. Alien - The Explorer
  {
    id: 'preset_19_alien',
    number: 19,
    name: 'Alien',
    nameAr: 'الفضائي',
    subtitle: 'The Explorer',
    subtitleAr: 'المستكشف الفضائي',
    ringColor: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(34,197,94,0.85)]',
    iconType: 'alien',
    svgDataUri: createPresetSvg(19, '#22c55e', 'rgba(34, 197, 94, 0.9)', `
      <!-- Alien Inverted Pear Head -->
      <path d="M -26 -12 C -26 -32 26 -32 26 -12 C 26 8 8 28 0 28 C -8 28 -26 8 -26 -12 Z" fill="#22c55e" stroke="#86efac" stroke-width="2"/>
      <!-- Giant Glossy Black Eyes -->
      <ellipse cx="-11" cy="-4" rx="7" ry="11" fill="#020617" transform="rotate(-20 -11 -4)"/>
      <ellipse cx="11" cy="-4" rx="7" ry="11" fill="#020617" transform="rotate(20 11 -4)"/>
      <circle cx="-9" cy="-8" r="2.5" fill="#ffffff"/>
      <circle cx="9" cy="-8" r="2.5" fill="#ffffff"/>
      <!-- Small Mouth / Nostrils -->
      <line x1="-3" y1="18" x2="3" y2="18" stroke="#14532d" stroke-width="2" stroke-linecap="round"/>
    `),
  },

  // 20. UFO - The Unconventional
  {
    id: 'preset_20_ufo',
    number: 20,
    name: 'UFO',
    nameAr: 'الصحن الطائر',
    subtitle: 'The Unconventional',
    subtitleAr: 'غير التقليدي',
    ringColor: '#d946ef',
    glowColor: 'rgba(217, 70, 239, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(217,70,239,0.85)]',
    iconType: 'ufo',
    svgDataUri: createPresetSvg(20, '#d946ef', 'rgba(217, 70, 239, 0.9)', `
      <!-- Tractor Beam -->
      <polygon points="-8,4 8,4 20,32 -20,32" fill="#38bdf8" opacity="0.35"/>
      <!-- Glass Cockpit Dome -->
      <ellipse cx="0" cy="-6" rx="14" ry="12" fill="#a5f3fc" stroke="#38bdf8" stroke-width="1.5" opacity="0.85"/>
      <!-- Disc Hull -->
      <ellipse cx="0" cy="4" rx="30" ry="8" fill="#475569" stroke="#d946ef" stroke-width="2.5"/>
      <!-- Glowing Hull Lights -->
      <circle cx="-20" cy="4" r="2.5" fill="#facc15"/>
      <circle cx="-10" cy="6" r="2.5" fill="#22c55e"/>
      <circle cx="0" cy="7" r="2.5" fill="#facc15"/>
      <circle cx="10" cy="6" r="2.5" fill="#22c55e"/>
      <circle cx="20" cy="4" r="2.5" fill="#facc15"/>
    `),
  },

  // 21. Prompt Bubble - The Prompt Communicator
  {
    id: 'preset_21_prompt_bubble',
    number: 21,
    name: 'Prompt Bubble',
    nameAr: 'فقاعة الأوامر',
    subtitle: 'The Prompt Communicator',
    subtitleAr: 'متقن صياغة الأوامر',
    ringColor: '#0ea5e9',
    glowColor: 'rgba(14, 165, 233, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(14,165,233,0.85)]',
    iconType: 'prompt_bubble',
    svgDataUri: createPresetSvg(21, '#0ea5e9', 'rgba(14, 165, 233, 0.9)', `
      <!-- Speech Bubble -->
      <path d="M -26 -18 C -26 -26 26 -26 26 -18 C 26 10 10 16 -8 16 L -16 26 L -14 16 C -24 16 -26 6 -26 -18 Z" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
      <!-- Code Prompt Terminal /prompt Text -->
      <text x="0" y="2" fill="#ffffff" font-size="11" font-weight="bold" font-family="monospace" text-anchor="middle">/prompt</text>
    `),
  },

  // 22. Keyboard Key - The Shortcut Seeker
  {
    id: 'preset_22_keyboard_key',
    number: 22,
    name: 'Keyboard Key',
    nameAr: 'زر الكيبورد',
    subtitle: 'The Shortcut Seeker',
    subtitleAr: 'باحث الاختصارات',
    ringColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(168,85,247,0.85)]',
    iconType: 'keyboard_key',
    svgDataUri: createPresetSvg(22, '#a855f7', 'rgba(168, 85, 247, 0.9)', `
      <!-- Keycap Base 3D bevel -->
      <rect x="-24" y="-18" width="48" height="42" rx="8" fill="#1e1b4b" stroke="#a855f7" stroke-width="2.5"/>
      <rect x="-20" y="-14" width="40" height="30" rx="6" fill="#312e81"/>
      <!-- Keycap Text -->
      <text x="0" y="6" fill="#c084fc" font-size="10" font-weight="900" font-family="sans-serif" text-anchor="middle" letter-spacing="1">PROMPT</text>
    `),
  },

  // 23. Puzzle Piece - The Problem Solver
  {
    id: 'preset_23_puzzle_piece',
    number: 23,
    name: 'Puzzle Piece',
    nameAr: 'قطعة الأحجية',
    subtitle: 'The Problem Solver',
    subtitleAr: 'حلاّل المشاكل',
    ringColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(16,185,129,0.85)]',
    iconType: 'puzzle_piece',
    svgDataUri: createPresetSvg(23, '#10b981', 'rgba(16, 185, 129, 0.9)', `
      <!-- Jigsaw Piece -->
      <path d="M -18 -18 H -4 C -4 -24 4 -24 4 -18 H 18 V -4 C 24 -4 24 4 18 4 V 18 H 4 C 4 24 -4 24 -4 18 H -18 V 4 C -24 4 -24 -4 -18 -4 Z" fill="#059669" stroke="#6ee7b7" stroke-width="2.5"/>
    `),
  },

  // 24. Crystal Ball - The AI Oracle
  {
    id: 'preset_24_crystal_ball',
    number: 24,
    name: 'Crystal Ball',
    nameAr: 'الكرة الكريستالية',
    subtitle: 'The AI Oracle',
    subtitleAr: 'عرّاف الذكاء الاصطناعي',
    ringColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(245,158,11,0.85)]',
    iconType: 'crystal_ball',
    svgDataUri: createPresetSvg(24, '#f59e0b', 'rgba(245, 158, 11, 0.9)', `
      <!-- Golden Pedestal -->
      <ellipse cx="0" cy="24" rx="18" ry="6" fill="#b45309" stroke="#f59e0b" stroke-width="1.5"/>
      <rect x="-8" y="14" width="16" height="10" fill="#78350f"/>
      <!-- Glowing Crystal Sphere -->
      <circle cx="0" cy="-2" r="22" fill="#701a75" stroke="#f59e0b" stroke-width="2"/>
      <circle cx="0" cy="-2" r="16" fill="#c026d3" opacity="0.6"/>
      <!-- Swirl of Mystical Energy -->
      <path d="M -10 -6 Q 0 -12 10 -2 Q 0 8 -8 2" fill="none" stroke="#fde047" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="2" cy="-4" r="3" fill="#ffffff"/>
    `),
  },

  // 25. Scroll - The Prompt Librarian
  {
    id: 'preset_25_scroll',
    number: 25,
    name: 'Scroll',
    nameAr: 'المخطوطة',
    subtitle: 'The Prompt Librarian',
    subtitleAr: 'أمين مكتبة الأوامر',
    ringColor: '#d97706',
    glowColor: 'rgba(217, 119, 6, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(217,119,6,0.85)]',
    iconType: 'scroll',
    svgDataUri: createPresetSvg(25, '#d97706', 'rgba(217, 119, 6, 0.9)', `
      <!-- Parchment Paper Body -->
      <rect x="-18" y="-18" width="36" height="36" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
      <!-- Wooden Rolls Top & Bottom -->
      <ellipse cx="0" cy="-20" rx="22" ry="5" fill="#92400e" stroke="#d97706" stroke-width="1.5"/>
      <ellipse cx="0" cy="20" rx="22" ry="5" fill="#92400e" stroke="#d97706" stroke-width="1.5"/>
      <!-- Ancient Text Lines -->
      <line x1="-12" y1="-10" x2="12" y2="-10" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
      <line x1="-12" y1="-2" x2="8" y2="-2" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
      <line x1="-12" y1="6" x2="12" y2="6" stroke="#b45309" stroke-width="2" stroke-linecap="round"/>
    `),
  },

  // 26. Lightning - The Prompt Master
  {
    id: 'preset_26_lightning',
    number: 26,
    name: 'Lightning',
    nameAr: 'الصاعقة',
    subtitle: 'The Prompt Master',
    subtitleAr: 'سيد الأوامر',
    ringColor: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(250,204,21,0.85)]',
    iconType: 'lightning',
    svgDataUri: createPresetSvg(26, '#facc15', 'rgba(250, 204, 21, 0.9)', `
      <!-- Intense Electric Lightning Bolt -->
      <polygon points="4,-32 -16,2 0,2 -6,32 18,-2 2,-2" fill="#facc15" stroke="#ca8a04" stroke-width="2"/>
      <polygon points="3,-26 -10,0 0,0 -4,22 12,-2 2,-2" fill="#ffffff" opacity="0.8"/>
    `),
  },

  // 27. Magnet - The Attractor
  {
    id: 'preset_27_magnet',
    number: 27,
    name: 'Magnet',
    nameAr: 'المغناطيس',
    subtitle: 'The Attractor',
    subtitleAr: 'الجذّاب',
    ringColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(236,72,153,0.85)]',
    iconType: 'magnet',
    svgDataUri: createPresetSvg(27, '#ec4899', 'rgba(236, 72, 153, 0.9)', `
      <!-- Horseshoe Magnet Curve -->
      <path d="M -18 -8 C -18 16 18 16 18 -8 L 8 -8 C 8 8 -8 8 -8 -8 Z" fill="#e11d48" stroke="#ec4899" stroke-width="2"/>
      <!-- Silver Poles -->
      <rect x="-18" y="-22" width="10" height="14" fill="#cbd5e1" stroke="#ec4899" stroke-width="1.5"/>
      <rect x="8" y="-22" width="10" height="14" fill="#cbd5e1" stroke="#ec4899" stroke-width="1.5"/>
      <!-- Magnetic Field Sparkles -->
      <path d="M -13 -26 L -13 -30 M 13 -26 L 13 -30" stroke="#facc15" stroke-width="2" stroke-linecap="round"/>
    `),
  },

  // 28. Black Hole - The Rabbit Hole Explorer
  {
    id: 'preset_28_black_hole',
    number: 28,
    name: 'Black Hole',
    nameAr: 'الثقب الأسود',
    subtitle: 'The Rabbit Hole Explorer',
    subtitleAr: 'مستكشف الأعماق',
    ringColor: '#9333ea',
    glowColor: 'rgba(147, 51, 234, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(147,51,234,0.85)]',
    iconType: 'black_hole',
    svgDataUri: createPresetSvg(28, '#9333ea', 'rgba(147, 51, 234, 0.9)', `
      <!-- Accretion Disc Spiral -->
      <ellipse cx="0" cy="0" rx="26" ry="10" fill="none" stroke="#c084fc" stroke-width="4" transform="rotate(-25)"/>
      <ellipse cx="0" cy="0" rx="20" ry="7" fill="none" stroke="#ec4899" stroke-width="3" transform="rotate(-25)"/>
      <!-- Event Horizon Black Void -->
      <circle cx="0" cy="0" r="12" fill="#000000" stroke="#f472b6" stroke-width="2"/>
    `),
  },

  // 29. Digital Eye - The Visionary
  {
    id: 'preset_29_digital_eye',
    number: 29,
    name: 'Digital Eye',
    nameAr: 'العين الرقمية',
    subtitle: 'The Visionary',
    subtitleAr: 'صاحب الرؤية',
    ringColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(6,182,212,0.85)]',
    iconType: 'digital_eye',
    svgDataUri: createPresetSvg(29, '#06b6d4', 'rgba(6, 182, 212, 0.9)', `
      <!-- Eye Outline Outer -->
      <path d="M -28 0 Q 0 -22 28 0 Q 0 22 -28 0 Z" fill="#0f172a" stroke="#06b6d4" stroke-width="2.5"/>
      <!-- Iris Circuit Grid -->
      <circle cx="0" cy="0" r="14" fill="#0284c7" stroke="#22d3ee" stroke-width="2"/>
      <circle cx="0" cy="0" r="6" fill="#082f49"/>
      <circle cx="0" cy="0" r="3" fill="#67e8f9"/>
      <!-- Concentric Tech Reticle Lines -->
      <line x1="-8" y1="0" x2="-2" y2="0" stroke="#67e8f9" stroke-width="1.5"/>
      <line x1="2" y1="0" x2="8" y2="0" stroke="#67e8f9" stroke-width="1.5"/>
      <line x1="0" y1="-8" x2="0" y2="-2" stroke="#67e8f9" stroke-width="1.5"/>
      <line x1="0" y1="2" x2="0" y2="8" stroke="#67e8f9" stroke-width="1.5"/>
    `),
  },

  // 30. Microscope - The Analyzer
  {
    id: 'preset_30_microscope',
    number: 30,
    name: 'Microscope',
    nameAr: 'المجهر',
    subtitle: 'The Analyzer',
    subtitleAr: 'المحلّل العميق',
    ringColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.85)',
    shadowClass: 'shadow-[0_0_14px_rgba(52,211,153,0.85)]',
    iconType: 'microscope',
    svgDataUri: createPresetSvg(30, '#34d399', 'rgba(52, 211, 153, 0.9)', `
      <!-- Microscope Arm and Eyepiece -->
      <line x1="-10" y1="-26" x2="6" y2="-8" stroke="#34d399" stroke-width="6" stroke-linecap="round"/>
      <circle cx="-10" cy="-26" r="4.5" fill="#a7f3d0"/>
      <!-- Stage & Base -->
      <rect x="-14" y="6" width="28" height="4" fill="#059669"/>
      <path d="M 12 -4 Q 18 12 8 22 L -12 22 L -12 26 L 14 26 Q 24 14 14 -4 Z" fill="#047857"/>
      <rect x="-18" y="24" width="36" height="6" rx="2" fill="#064e3b" stroke="#34d399" stroke-width="1.5"/>
    `),
  },
];

export function getPresetAvatarById(id: string): PresetAvatar | undefined {
  return PRESET_AVATARS.find((a) => a.id === id);
}
