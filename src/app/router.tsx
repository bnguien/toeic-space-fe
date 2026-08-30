import { createBrowserRouter } from "react-router-dom";

import App from "@/App";
import { authRoutes } from "@/modules/auth";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  ...authRoutes,
]);
