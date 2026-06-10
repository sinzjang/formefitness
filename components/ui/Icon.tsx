// Formé 공통 플랫 아이콘 — Lucide (MIT)
import {
  ArrowUp,
  BarChart2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Dumbbell,
  Home,
  Image as ImageIcon,
  Info,
  Pause,
  PersonStanding,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Square,
  Timer,
  Trash2,
  User,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react-native';

export type IconName =
  | 'home'
  | 'barbell'
  | 'stats-chart'
  | 'person'
  | 'close'
  | 'chevron-forward'
  | 'chevron-back'
  | 'chevron-up'
  | 'chevron-down'
  | 'trash'
  | 'add'
  | 'timer'
  | 'image'
  | 'check'
  | 'info'
  | 'arrow-up'
  | 'close-circle'
  | 'play'
  | 'pause'
  | 'stop'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'body'
  | 'check-circle'
  | 'circle';

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  barbell: Dumbbell,
  'stats-chart': BarChart2,
  person: User,
  close: X,
  'chevron-forward': ChevronRight,
  'chevron-back': ChevronLeft,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  trash: Trash2,
  add: Plus,
  timer: Timer,
  image: ImageIcon,
  check: Check,
  info: Info,
  'arrow-up': ArrowUp,
  'close-circle': XCircle,
  play: Play,
  pause: Pause,
  stop: Square,
  refresh: RotateCcw,
  search: Search,
  settings: Settings,
  body: PersonStanding,
  'check-circle': CheckCircle2,
  circle: Circle,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** 탭·토글 활성 — stroke 두께 강조 */
  active?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = '#111111', active, strokeWidth }: IconProps) {
  const LucideIcon = ICONS[name];
  const weight = strokeWidth ?? (active ? 2.25 : 1.75);
  return <LucideIcon size={size} color={color} strokeWidth={weight} />;
}
