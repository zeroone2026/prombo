import { Category, Prompt } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'vibe-coding',
    name: 'Vibe Coding & Web Dev',
    slug: 'vibe-coding',
    description: 'Next-gen full-stack prompts for Cursor, Claude 3.7 Sonnet, Windsurf, Copilot, and React/Next.js/Tailwind developers.',
    icon: 'Code2',
    color: '#ea580c',
    badgeBg: 'bg-orange-500/10 text-orange-400',
    badgeBorder: 'border-orange-500/30',
    order: 1,
  },
  {
    id: 'ai-images',
    name: 'AI Image Generation',
    slug: 'ai-images',
    description: 'Precision hyper-realistic, photorealistic, 3D, vector, and studio photography prompts for Midjourney v6, Flux.1, and DALL-E 3.',
    icon: 'Image',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    order: 2,
  },
  {
    id: 'commercial-video',
    name: 'Commercial Video & Motion',
    slug: 'commercial-video',
    description: 'Cinematic B-roll, camera movement direction, and high-impact promo scripts for Sora, Runway Gen-3, Kling, and Luma Dream Machine.',
    icon: 'Video',
    color: '#f59e0b',
    badgeBg: 'bg-amber-500/10 text-amber-400',
    badgeBorder: 'border-amber-500/30',
    order: 3,
  },
  {
    id: 'copywriting',
    name: 'Copywriting & Content',
    slug: 'copywriting',
    description: 'High-converting landing pages, punchy headlines, email funnels, and viral social hooks tested for maximum engagement.',
    icon: 'PenTool',
    color: '#14b8a6',
    badgeBg: 'bg-teal-500/10 text-teal-400',
    badgeBorder: 'border-teal-500/30',
    order: 4,
  },
  {
    id: 'marketing-growth',
    name: 'Marketing & Growth',
    slug: 'marketing-growth',
    description: 'SaaS GTM strategies, Meta & Google ad scripts, Product Hunt launches, and SEO cluster blueprints.',
    icon: 'TrendingUp',
    color: '#f97316',
    badgeBg: 'bg-orange-500/10 text-orange-400',
    badgeBorder: 'border-orange-500/30',
    order: 5,
  },
  {
    id: 'mobile-apps',
    name: 'Mobile Apps & UI/UX',
    slug: 'mobile-apps',
    description: 'React Native, Flutter, Swift, and Mobile Design system prompts crafted for modern iOS & Android interfaces.',
    icon: 'Smartphone',
    color: '#10b981',
    badgeBg: 'bg-emerald-500/10 text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    order: 6,
  }
];

export const INITIAL_PROMPTS: Prompt[] = [
  {
    id: 'prompt-1',
    title: 'Senior Full-Stack Architect: Production Next.js & Tailwind Scaffold',
    description: 'Instructs AI to build clean, modular, scalable Next.js 15 / React 19 web applications with TypeScript, Tailwind CSS, and zero technical debt.',
    prompt: `You are an elite Senior Principal Software Architect and UI/UX Designer.
Build a production-ready, accessible, and performant web application for {app_concept}.

Technical Requirements:
1. Framework: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS
2. Architecture: Modular structure with /components, /lib, /hooks, and typed /types
3. State & Reactivity: Use clean React state, customized hooks, and avoid redundant re-renders
4. Design System: Modern dark mode aesthetic (slate/zinc palette #0F172A), smooth motion transitions, responsive grid layouts, and pristine typography
5. Error Handling: Safe fallbacks, empty states, loading skeletons, and interactive feedback toasts

Target Feature List:
{feature_requirements}

Please output the complete, production-ready code with no mock stubs or incomplete placeholders.`,
    categoryId: 'vibe-coding',
    subcategory: 'Architecture & Next.js',
    tags: ['Next.js', 'React', 'Tailwind CSS', 'Full-Stack', 'Cursor'],
    targetModel: 'Claude 3.7 Sonnet / Cursor',
    isFeatured: true,
    copyCount: 1420,
    variables: [
      {
        name: 'app_concept',
        label: 'Application Concept',
        placeholder: 'e.g. AI-powered Invoice Generator with Real-time PDF Export',
        defaultValue: 'AI-powered Analytics Dashboard for SaaS Subscriptions'
      },
      {
        name: 'feature_requirements',
        label: 'Key Features & Constraints',
        placeholder: 'e.g. Multi-currency support, chart analytics, CSV download',
        defaultValue: 'Interactive metrics cards, time-series revenue chart, recent transactions filter table, and dark/light theme switch'
      }
    ],
    tips: [
      'Best used in Cursor Composer mode or Claude 3.7 with Thinking enabled.',
      'Specify strict API routes or client-only constraint if required.'
    ],
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-15T12:00:00Z'
  },
  {
    id: 'prompt-2',
    title: 'Photorealistic Cinematic 35mm Portrait (Midjourney v6.1)',
    description: 'Generates breathtaking photographic portraits with authentic analog skin texture, natural depth of field, and volumetric lighting.',
    imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
    prompt: `Cinematic 35mm film photography portrait of {subject}, shot on Leica M11 with 50mm f/1.2 Summilux lens. {lighting_setting}, natural skin texture, subtle freckles, genuine candid facial expression, soft diffused volumetric light, shallow depth of field with creamy bokeh, subtle chromatic aberration, Kodak Portra 400 color science, authentic film grain, photorealistic 8k --ar 16:9 --style raw --v 6.1 --q 2`,
    categoryId: 'ai-images',
    subcategory: 'Portraits & Film',
    tags: ['Midjourney v6', 'Photorealistic', 'Leica 35mm', 'Portrait', 'Cinematic'],
    targetModel: 'Midjourney v6.1 / Flux.1 Schnell',
    isFeatured: true,
    copyCount: 2890,
    variables: [
      {
        name: 'subject',
        label: 'Subject Description',
        placeholder: 'e.g. a confident 28-year-old female architect in a minimalist studio',
        defaultValue: 'a thoughtful 32-year-old creative director wearing minimalist black turtleneck in a sunlit industrial loft studio'
      },
      {
        name: 'lighting_setting',
        label: 'Lighting & Atmosphere',
        placeholder: 'e.g. Golden hour morning sunlight streaming through tall windows',
        defaultValue: 'Warm golden hour sunlight streaming through floor-to-ceiling loft windows with gentle dust motes'
      }
    ],
    parameters: {
      'Aspect Ratio': '--ar 16:9',
      'Version': '--v 6.1',
      'Style': '--style raw'
    },
    tips: [
      'Keep subject descriptions natural rather than using generic buzzwords like "hyper-detailed".',
      'The --style raw parameter prevents Midjourney from over-stylizing skin.'
    ],
    createdAt: '2026-08-05T14:30:00Z',
    updatedAt: '2026-08-20T09:15:00Z'
  },
  {
    id: 'prompt-3',
    title: 'High-Converting SaaS Hero Section Copywriter',
    description: 'Writes captivating value propositions, punchy H1 headers, subheadlines, and dual CTA buttons using battle-tested psychology.',
    prompt: `Act as a world-class Conversion Rate Optimization (CRO) Copywriter.
Write 4 distinct high-converting Hero Section variations for a SaaS product named "{product_name}".

Target Audience: {target_audience}
Core Value Proposition: {core_value}
Primary Competitor / Old Way of Doing It: {old_way}

For each variation, provide:
1. Eyebrow Tag (Punchy social proof or category claim)
2. Main H1 Headline (Clear, benefit-driven, max 8 words)
3. Subheadline (Clear explanation of how it works + primary objection handler, max 2 sentences)
4. Primary CTA Button text (Action-oriented, e.g. "Start Free 14-Day Trial")
5. Secondary CTA text (Low commitment, e.g. "Watch 2-Min Interactive Demo")
6. Micro-copy trust banner (e.g. "No credit card required • SOC-2 Certified • Setup in 3 minutes")

Use frameworks:
- Variant 1: Direct Outcome & Speed
- Variant 2: Pain-Point Agitation & Relief
- Variant 3: Social Proof & Status Elevating
- Variant 4: Bold Contrarian / Paradigm Shift`,
    categoryId: 'copywriting',
    subcategory: 'Landing Pages & CRO',
    tags: ['Copywriting', 'SaaS Landing Page', 'CRO', 'Conversion', 'Headlines'],
    targetModel: 'GPT-4o / Claude 3.7 / Gemini 2.5 Flash',
    isFeatured: true,
    copyCount: 1950,
    variables: [
      {
        name: 'product_name',
        label: 'Product Name',
        placeholder: 'e.g. DocuSync AI',
        defaultValue: 'PromptVault'
      },
      {
        name: 'target_audience',
        label: 'Target Audience',
        placeholder: 'e.g. Software engineers and prompt engineers',
        defaultValue: 'Tech founders, software developers, and AI content creators'
      },
      {
        name: 'core_value',
        label: 'Core Value Proposition',
        placeholder: 'e.g. Organize and test 1000+ AI prompts with one-click clipboard copying',
        defaultValue: 'A zero-cost, lightning-fast prompt repository to browse, customize with dynamic variables, and copy production prompts in seconds'
      },
      {
        name: 'old_way',
        label: 'The Old Way',
        placeholder: 'e.g. Cluttered Notion pages and lost Apple Notes',
        defaultValue: 'Scattered bookmarks, messy Slack messages, and unorganized text files'
      }
    ],
    tips: [
      'Focus on tangible business outcomes (save hours, boost conversions) rather than generic adjectives.'
    ],
    createdAt: '2026-08-08T11:00:00Z',
    updatedAt: '2026-08-22T16:00:00Z'
  },
  {
    id: 'prompt-4',
    title: 'Cinematic Commercial Product Reveal (Runway Gen-3 / Sora)',
    description: 'Generates Hollywood-grade commercial camera movements, lighting transitions, and 4K macro reveal shots for luxury brand visuals.',
    prompt: `Cinematic 4K 60fps luxury commercial video shot for {product_category}.
Camera movement: Dynamic continuous FPV macro orbit around {product_details}, starting with an extreme close-up of premium textures and materials.
Lighting: Moody studio lighting, dramatic rim light accentuating the sleek silhouette, subtle volumetric smoke and laser refraction in background.
Environment: Minimalist dark obsidian pedestal with gentle water ripples and floating gold particle reflections.
Pacing: Smooth seamless acceleration into a slow-motion hero freeze frame at 120fps with immaculate clarity. Ultra photorealistic, anamorphic lens flare, award-winning cinematography.`,
    categoryId: 'commercial-video',
    subcategory: 'Product Ads & 3D Motion',
    tags: ['Runway Gen-3', 'Sora', 'Kling AI', 'Commercial Video', 'Product Reveal'],
    targetModel: 'Runway Gen-3 Alpha / Sora / Kling',
    isFeatured: false,
    copyCount: 1780,
    variables: [
      {
        name: 'product_category',
        label: 'Product Category',
        placeholder: 'e.g. luxury mechanical wristwatch / wireless noise-canceling headphones',
        defaultValue: 'matte black wireless ergonomic mechanical keyboard with brushed aluminum chassis'
      },
      {
        name: 'product_details',
        label: 'Key Product Textures & Accents',
        placeholder: 'e.g. sapphire glass, titanium bevel, RGB underglow',
        defaultValue: 'custom brass weights, frosted PBT keycaps with subtle warm amber underglow, and precision CNC chamfered edges'
      }
    ],
    tips: [
      'Use camera movement verbs like "macro orbit", "push-in", and "dolly zoom" to guide AI video physics.'
    ],
    createdAt: '2026-08-10T15:20:00Z',
    updatedAt: '2026-08-24T18:45:00Z'
  },
  {
    id: 'prompt-5',
    title: 'Viral TikTok & Instagram Reels Script Engine',
    description: 'Generates high-retention 30-60 second short-form video scripts with 3-second visual hooks, pacing cues, and B-roll directions.',
    prompt: `You are an expert Short-Form Video Producer with 100M+ views on TikTok & YouTube Shorts.
Generate a high-retention 45-second video script for the following topic:

Topic: {video_topic}
Target Audience: {target_niche}
Goal / CTA: {video_goal}

Provide a table with 3 columns:
1. Timestamp (e.g. 0:00 - 0:03)
2. Visual & B-Roll / Text-On-Screen (Explicit on-screen action, props, camera angle, and animated text captions)
3. Spoken Audio / Voiceover (Conversational, fast-paced, punchy, no corporate filler)

Include:
- 3 Alternative High-Retention Hooks for the first 3 seconds (Pattern interrupt, curiosity gap, controversial truth)
- Loop Ending that transitions seamlessly back to the beginning of the video
- Pinned comment recommendation to drive comment section debates`,
    categoryId: 'marketing-growth',
    subcategory: 'Social Media & Viral Hooks',
    tags: ['TikTok', 'Instagram Reels', 'Short-Form Video', 'Viral Script', 'Growth'],
    targetModel: 'GPT-4o / Claude 3.7 Sonnet',
    isFeatured: false,
    copyCount: 2130,
    variables: [
      {
        name: 'video_topic',
        label: 'Video Topic',
        placeholder: 'e.g. 3 AI tools that will replace junior developers in 2026',
        defaultValue: 'How to build full-stack web apps in 15 minutes using Vibe Coding and curated prompts'
      },
      {
        name: 'target_niche',
        label: 'Target Niche / Audience',
        placeholder: 'e.g. Solo entrepreneurs and indie hackers',
        defaultValue: 'Indie hackers, designers, and students wanting to build apps without complex setups'
      },
      {
        name: 'video_goal',
        label: 'Primary Call To Action',
        placeholder: 'e.g. Comment "PROMPT" for the full library link',
        defaultValue: 'Save this video and comment "VAULT" to get instant free access to the prompt library'
      }
    ],
    tips: [
      'The first 3 seconds must break the user scroll with unexpected motion or bold visual framing.'
    ],
    createdAt: '2026-08-12T08:00:00Z',
    updatedAt: '2026-08-25T14:10:00Z'
  },
  {
    id: 'prompt-6',
    title: 'React Native & Flutter Mobile App UI/UX Generator',
    description: 'Generates mobile-optimized, buttery smooth component code with gesture handlers, haptic feedback, and fluid layout sheets.',
    prompt: `You are an elite Senior Mobile UI/UX Engineer specialized in {mobile_stack}.
Create a polished, highly responsive mobile screen component for:

Screen Name: {screen_name}
Platform Focus: iOS & Android (with safe area insets, native navigation bars, and dynamic status bars)

Design & Interaction Spec:
- Aesthetic: Modern Glassmorphism/Dark Slate (#0F172A), rounded corners (16-24px), subtle border stroke (#1E293B)
- Touch Feedback: Spring press animations, subtle active state opacity, and haptic triggers
- Scroll Performance: Virtualized FlatList / ScrollView with pull-to-refresh and sticky header behavior
- Modular Architecture: Clean separation of UI sub-components, custom theme tokens, and TypeScript interfaces

Provide the full single-file implementation with zero external icon/library missing dependencies.`,
    categoryId: 'mobile-apps',
    subcategory: 'React Native & Flutter',
    tags: ['React Native', 'Flutter', 'Mobile UI', 'Expo', 'iOS/Android'],
    targetModel: 'Claude 3.7 Sonnet / Cursor',
    isFeatured: false,
    copyCount: 1210,
    variables: [
      {
        name: 'mobile_stack',
        label: 'Mobile Framework',
        placeholder: 'React Native (Expo + NativeWind) or Flutter',
        defaultValue: 'React Native with Expo & Tailwind (NativeWind v4)'
      },
      {
        name: 'screen_name',
        label: 'Screen Type / Purpose',
        placeholder: 'e.g. Crypto Wallet Balance & Transaction History Screen',
        defaultValue: 'AI Prompt Vault Card Swiper & Quick Copy Sheet with bottom action bar'
      }
    ],
    tips: [
      'Specify gesture libraries (react-native-gesture-handler or react-native-reanimated) if complex swipe interactions are needed.'
    ],
    createdAt: '2026-08-14T09:40:00Z',
    updatedAt: '2026-08-26T11:20:00Z'
  },
  {
    id: 'prompt-7',
    title: 'Hyper-Detailed Isometric 3D Cityscape (Flux.1 & Midjourney)',
    description: 'Generates charming, highly detailed miniature 3D isometric dioramas with soft claymorphism and ray-traced lighting.',
    prompt: `Isometric 3D diorama render of {city_theme}, miniature voxel and claymorphism aesthetic, rendered in Blender Cycles and Octane Render. Soft pastel color palette, volumetric ambient occlusion, glowing neon signage, tiny detailed trees, miniature vehicles with motion trails, tilt-shift lens effect, clean dark slate background, high resolution 8k wallpaper --ar 1:1 --v 6.1`,
    categoryId: 'ai-images',
    subcategory: '3D & Isometric',
    tags: ['Flux.1', 'Midjourney', '3D Render', 'Isometric', 'Blender'],
    targetModel: 'Flux.1 Dev / Midjourney v6.1',
    isFeatured: false,
    copyCount: 1640,
    variables: [
      {
        name: 'city_theme',
        label: 'Diorama Theme',
        placeholder: 'e.g. Cyberpunk Tokyo street corner with ramen bar and flying cars',
        defaultValue: 'Cyberpunk Neo-Tokyo street corner featuring a glowing ramen shop, holographic cat billboards, and rainy neon asphalt'
      }
    ],
    parameters: {
      'Render Engine': 'Octane / Blender Cycles',
      'Aspect Ratio': '--ar 1:1'
    },
    tips: [
      'Tilt-shift lens phrasing creates that signature delightful miniature diorama depth.'
    ],
    createdAt: '2026-08-16T13:00:00Z',
    updatedAt: '2026-08-27T10:00:00Z'
  },
  {
    id: 'prompt-8',
    title: 'B2B Cold Email Sequence with 40%+ Open Rates',
    description: 'Writes 3-step personalized B2B cold email sequences that avoid spam triggers, create instant rapport, and book qualified discovery calls.',
    prompt: `Act as a Top 1% B2B Sales Development Expert.
Write a 3-touch personalized cold outreach sequence for our company:

Our Solution: {our_solution}
Prospect Persona: {prospect_persona}
Biggest Industry Pain Point: {industry_pain}

Requirements:
- Email 1 (Day 1 - The Observation & Low-Friction Offer): Under 75 words. Personalized observation hook, clear problem statement, soft call-to-interest (not a 30-minute demo request).
- Email 2 (Day 4 - The 1-Line Case Study): Share a 1-sentence metric proof from a similar company, frictionless question.
- Email 3 (Day 9 - The Permission Breakup): Polite closure that often triggers 20%+ delayed responses.
- Subject lines: Provide 3 short, curiosity-driven subject lines (2-4 words, all lowercase like internal emails).`,
    categoryId: 'copywriting',
    subcategory: 'Sales & Outreach',
    tags: ['B2B Sales', 'Cold Email', 'Lead Gen', 'Copywriting', 'Email Funnel'],
    targetModel: 'GPT-4o / Claude 3.7',
    isFeatured: false,
    copyCount: 1490,
    variables: [
      {
        name: 'our_solution',
        label: 'Your Company / Solution',
        placeholder: 'e.g. AI-assisted automated code review bot that catches 90% of PR bugs',
        defaultValue: 'PromptVault Enterprise: Curated company-wide AI prompt hub that standardizes AI output across engineering and marketing teams'
      },
      {
        name: 'prospect_persona',
        label: 'Prospect Title & Company Type',
        placeholder: 'e.g. VP of Engineering at Series B SaaS',
        defaultValue: 'Head of Growth / Marketing at 50-200 person tech companies'
      },
      {
        name: 'industry_pain',
        label: 'Primary Pain Point',
        placeholder: 'e.g. Inconsistent AI output and lost time rewriting prompts',
        defaultValue: 'Team members wasting 5+ hours a week re-inventing AI prompts with inconsistent, low-quality results'
      }
    ],
    tips: [
      'Never ask for a 30-minute meeting in Email 1; ask for permission to send a 2-minute video or share a free resource.'
    ],
    createdAt: '2026-08-18T10:15:00Z',
    updatedAt: '2026-08-28T15:30:00Z'
  }
];
