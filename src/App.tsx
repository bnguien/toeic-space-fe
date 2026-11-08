import { LandingPage } from "@/modules/landing";
import { useCurrentUser, useSessionStatus } from "@/modules/auth";
import { Navigate } from "react-router-dom";
import "@/styles/globals.css";

function App() {
  const user = useCurrentUser();
  const status = useSessionStatus();

  if (status === "authenticated" && user?.role === "Teacher") {
    return <Navigate to="/teacher" replace />;
  }

  // Admins keep the public website; the CMS is reached from the account menu or /admin.
  return <LandingPage />;
}

export default App;
