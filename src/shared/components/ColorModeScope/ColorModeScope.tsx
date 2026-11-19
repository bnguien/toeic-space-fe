import type { ReactNode } from "react";

import { useColorModeScope } from "@/shared/hooks/useColorMode";

interface ColorModeScopeProps {
  children: ReactNode;
}

/** Route wrapper: the page follows the light/dark colour mode while it is mounted. */
export function ColorModeScope({ children }: ColorModeScopeProps) {
  useColorModeScope();
  return children;
}
