import { createBrowserRouter } from "react-router-dom";

import App from "@/App";
import { adminRoutes } from "@/modules/admin";
import { authRoutes } from "@/modules/auth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  ...authRoutes,
  ...adminRoutes,
]);
