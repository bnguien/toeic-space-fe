import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const IconPearlOrb = ({ size = 26, className, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} {...props}>
    <defs>
      <radialGradient id="orbGrad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="45%" stopColor="#FDF2F8" />
        <stop offset="70%" stopColor="#E0F2FE" />
        <stop offset="100%" stopColor="#DDD6FE" />
      </radialGradient>
    </defs>
    <circle
      cx="14"
      cy="14"
      r="12"
      fill="url(#orbGrad)"
      stroke="rgba(255,255,255,0.9)"
      strokeWidth="1.2"
    />
    <circle cx="10" cy="9.5" r="3.2" fill="#FFFFFF" opacity="0.85" />
    <circle cx="17" cy="16" r="6" fill="#F472B6" opacity="0.12" />
  </svg>
);

// Official Lucide React Icons (https://lucide.dev/icons)
export {
  Headphones as IconHeadphones,
  BookOpen as IconBook,
  Route as IconRoadmap,
  Sparkles as IconSparkles,
  Settings as IconSettings,
  History as IconHistory,
  ChevronLeft as IconChevronLeft,
  ChevronRight as IconChevronRight,
  LogOut as IconLogout,
} from "lucide-react";
