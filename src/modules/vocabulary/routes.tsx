import type { RouteObject } from "react-router-dom";

import { RequireAuth } from "@/modules/auth";

import { StudySessionPage } from "./pages/StudySessionPage";
import { VocabularyHomePage } from "./pages/VocabularyHomePage";
import { VocabularySetPage } from "./pages/VocabularySetPage";

export const vocabularyRoutes: RouteObject[] = [
  {
    path: "/vocabulary",
    element: <VocabularyHomePage />,
  },
  {
    path: "/vocabulary/sets/:setId",
    element: <VocabularySetPage />,
  },
  {
    path: "/vocabulary/learn/:mode",
    element: (
      <RequireAuth>
        <StudySessionPage />
      </RequireAuth>
    ),
  },
];
