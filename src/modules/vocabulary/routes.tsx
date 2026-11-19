import type { RouteObject } from "react-router-dom";

import { RequireAuth } from "@/modules/auth";
import { ColorModeScope } from "@/shared/components/ColorModeScope/ColorModeScope";

import { StudySessionPage } from "./pages/StudySessionPage";
import { VocabularyHomePage } from "./pages/VocabularyHomePage";
import { VocabularySetPage } from "./pages/VocabularySetPage";

/* Every vocabulary page follows the light/dark mode (the home page through WorkspaceLayout). */
export const vocabularyRoutes: RouteObject[] = [
  {
    path: "/vocabulary",
    element: <VocabularyHomePage />,
  },
  {
    path: "/vocabulary/sets/:setId",
    element: (
      <ColorModeScope>
        <VocabularySetPage />
      </ColorModeScope>
    ),
  },
  {
    path: "/vocabulary/learn/:mode",
    element: (
      <ColorModeScope>
        <RequireAuth>
          <StudySessionPage />
        </RequireAuth>
      </ColorModeScope>
    ),
  },
];
