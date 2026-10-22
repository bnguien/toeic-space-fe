import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const IconPearlShell = ({ size = 36, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <defs>
      {/* Top shell inner gradient */}
      <linearGradient
        id="shellTopGrad"
        x1="22"
        y1="5"
        x2="22"
        y2="28"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#FFF0F8" />
        <stop offset="70%" stopColor="#F5D0FE" />
        <stop offset="100%" stopColor="#E0E7FF" />
      </linearGradient>

      {/* Top shell outer rim gradient */}
      <linearGradient
        id="shellRimGrad"
        x1="6"
        y1="6"
        x2="38"
        y2="28"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="50%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>

      {/* Bottom shell lip gradient */}
      <linearGradient
        id="shellLipGrad"
        x1="8"
        y1="24"
        x2="36"
        y2="36"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0%" stopColor="#FBCFE8" />
        <stop offset="40%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#C084FC" />
      </linearGradient>

      {/* Pearl 3D luster */}
      <radialGradient id="shellPearl" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="35%" stopColor="#FDF4FF" />
        <stop offset="70%" stopColor="#FED7AA" stopOpacity="0.75" />
        <stop offset="85%" stopColor="#F472B6" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#A855F7" />
      </radialGradient>

      {/* Pearl drop glow */}
      <filter id="pearlDropShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#db2777" floodOpacity="0.4" />
      </filter>
    </defs>

    {/* Top Shell Fan Base */}
    <path
      d="M22 6C15 6 9.5 10.5 8.5 17.5C8 21 10 24.5 12.5 26.5C15 28.5 29 28.5 31.5 26.5C34 24.5 36 21 35.5 17.5C34.5 10.5 29 6 22 6Z"
      fill="url(#shellTopGrad)"
      stroke="url(#shellRimGrad)"
      strokeWidth="1.3"
    />

    {/* Top Shell Scalloped Crest */}
    <path
      d="M9 18C9.2 14.5 11 10 14.5 7.8C16.8 6.5 19.5 6 22 6C24.5 6 27.2 6.5 29.5 7.8C33 10 34.8 14.5 35 18"
      stroke="#F472B6"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.85"
    />

    {/* Radiating Shell Ribs */}
    <path d="M22 6V26" stroke="#D8B4FE" strokeWidth="1" strokeLinecap="round" />
    <path d="M17.5 7.5C18.5 13 20 20 21 26" stroke="#E9D5FF" strokeWidth="1" />
    <path d="M26.5 7.5C25.5 13 24 20 23 26" stroke="#E9D5FF" strokeWidth="1" />
    <path d="M13.5 10.5C15.5 15.5 18.5 21.5 20.2 26" stroke="#D8B4FE" strokeWidth="0.9" />
    <path d="M30.5 10.5C28.5 15.5 25.5 21.5 23.8 26" stroke="#D8B4FE" strokeWidth="0.9" />
    <path d="M10.5 15C13 19 16.5 23 19.5 26" stroke="#C084FC" strokeWidth="0.8" opacity="0.75" />
    <path d="M33.5 15C31 19 27.5 23 24.5 26" stroke="#C084FC" strokeWidth="0.8" opacity="0.75" />

    {/* White Sheen Highlight on Top Fan */}
    <path
      d="M13.5 13C16 8.5 20 7.5 22 7.5C24 7.5 28 8.5 30.5 13"
      stroke="#FFFFFF"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.9"
    />

    {/* Bottom Shell Open Dish */}
    <path
      d="M9.5 24C10.5 30.5 15.5 34 22 34C28.5 34 33.5 30.5 34.5 24C32.5 26.8 28 28.5 22 28.5C16 28.5 11.5 26.8 9.5 24Z"
      fill="url(#shellLipGrad)"
      stroke="#E879F9"
      strokeWidth="1.2"
    />

    {/* Lower Shell Scalloped / Ruffled Lip */}
    <path
      d="M10 24.5Q13 27.5 16 25.5Q19 28.5 22 26.5Q25 28.5 28 25.5Q31 27.5 34 24.5"
      fill="none"
      stroke="#F472B6"
      strokeWidth="1.4"
      strokeLinecap="round"
    />

    {/* Glowing Centered Pearl */}
    <ellipse
      cx="22"
      cy="25.5"
      rx="6.5"
      ry="6.2"
      fill="url(#shellPearl)"
      filter="url(#pearlDropShadow)"
    />
    <ellipse cx="20.2" cy="23.5" rx="1.8" ry="1.4" fill="#FFFFFF" opacity="0.95" />
    <circle cx="23.5" cy="27" r="0.7" fill="#FFFFFF" opacity="0.7" />
  </svg>
);

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
  Target as IconTarget,
  CalendarCheck as IconCalendar,
  Trophy as IconTrophy,
  Play as IconPlay,
  Pause as IconPause,
  Check as IconCheck,
  Volume2 as IconSpeaker,
  User as IconUser,
  Settings as IconSettings,
  History as IconHistory,
  ChevronDown as IconChevronDown,
  ChevronLeft as IconChevronLeft,
  ChevronRight as IconChevronRight,
  LogOut as IconLogout,
  Zap as IconZap,
} from "lucide-react";
