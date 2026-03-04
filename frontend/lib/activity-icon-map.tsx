import {
  Phone,
  Video,
  Users,
  MessageCircle,
  Mail,
  Globe,
  Coffee,
  FileText,
  Star,
} from 'lucide-react';
import type { ElementType } from 'react';

/** Map of icon name strings (stored in DB metadata) → Lucide icon components */
export const ACTIVITY_ICON_MAP: Record<string, ElementType> = {
  Phone,
  Video,
  Users,
  MessageCircle,
  Mail,
  Globe,
  Coffee,
  FileText,
  Star,
};

// Fallback icon
export const DEFAULT_ACTIVITY_ICON = Phone;

export function getActivityIcon(iconName?: string): ElementType {
  if (!iconName) return DEFAULT_ACTIVITY_ICON;
  return ACTIVITY_ICON_MAP[iconName] ?? DEFAULT_ACTIVITY_ICON;
}

/** All available icon options for the admin UI */
export const ACTIVITY_ICON_OPTIONS = [
  { value: 'Phone', label: 'Phone', icon: Phone },
  { value: 'Video', label: 'Video Call', icon: Video },
  { value: 'Users', label: 'Meeting', icon: Users },
  { value: 'MessageCircle', label: 'Message', icon: MessageCircle },
  { value: 'Mail', label: 'Email', icon: Mail },
  { value: 'Globe', label: 'Site Visit', icon: Globe },
  { value: 'Coffee', label: 'Coffee Chat', icon: Coffee },
  { value: 'FileText', label: 'Document', icon: FileText },
  { value: 'Star', label: 'Star', icon: Star },
];

/** Color presets for activity types and urgency */
export const COLOR_PRESETS: Record<
  string,
  { chipClasses: string; nodeClass: string; badgeClasses: string; dot: string }
> = {
  blue: {
    chipClasses: 'text-blue-700 bg-blue-50 border-blue-200',
    nodeClass: 'bg-blue-400',
    badgeClasses: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  purple: {
    chipClasses: 'text-purple-700 bg-purple-50 border-purple-200',
    nodeClass: 'bg-purple-400',
    badgeClasses: 'bg-purple-100 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  green: {
    chipClasses: 'text-green-700 bg-green-50 border-green-200',
    nodeClass: 'bg-green-400',
    badgeClasses: 'bg-green-100 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
  orange: {
    chipClasses: 'text-orange-700 bg-orange-50 border-orange-200',
    nodeClass: 'bg-orange-400',
    badgeClasses: 'bg-orange-100 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  red: {
    chipClasses: 'text-red-700 bg-red-50 border-red-200',
    nodeClass: 'bg-red-400',
    badgeClasses: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  yellow: {
    chipClasses: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    nodeClass: 'bg-yellow-400',
    badgeClasses: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  teal: {
    chipClasses: 'text-teal-700 bg-teal-50 border-teal-200',
    nodeClass: 'bg-teal-400',
    badgeClasses: 'bg-teal-100 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
  },
  pink: {
    chipClasses: 'text-pink-700 bg-pink-50 border-pink-200',
    nodeClass: 'bg-pink-400',
    badgeClasses: 'bg-pink-100 text-pink-700 border-pink-200',
    dot: 'bg-pink-500',
  },
  indigo: {
    chipClasses: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    nodeClass: 'bg-indigo-400',
    badgeClasses: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  gray: {
    chipClasses: 'text-gray-700 bg-gray-50 border-gray-200',
    nodeClass: 'bg-gray-400',
    badgeClasses: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-500',
  },
};

export const COLOR_PRESET_NAMES = Object.keys(COLOR_PRESETS) as Array<keyof typeof COLOR_PRESETS>;
