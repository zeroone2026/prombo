import React from 'react';
import {
  Code2,
  Image,
  Video,
  PenTool,
  TrendingUp,
  Smartphone,
  Bookmark,
  Zap,
  Cpu,
  Layers,
  Terminal,
  Database,
  LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Code2,
  Image,
  Video,
  PenTool,
  TrendingUp,
  Smartphone,
  Bookmark,
  Zap,
  Sparkles: Bookmark,
  Cpu,
  Layers,
  Terminal,
  Database,
};

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4' }) => {
  const IconComponent = ICON_MAP[name] || Bookmark;
  return <IconComponent className={className} />;
};
