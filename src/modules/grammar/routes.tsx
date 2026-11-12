import type { RouteObject } from "react-router-dom";

import { GrammarPage } from "./pages/GrammarPage";

/** Lộ trình ngữ pháp: one page; the view lives in the query / hash (see utils/grammar-view.ts). */
export const grammarRoutes: RouteObject[] = [
  {
    path: "/games/grammar",
    element: <GrammarPage />,
  },
];
