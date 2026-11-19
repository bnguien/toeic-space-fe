import { useParams } from "react-router-dom";

import { useCurrentUser } from "@/modules/auth";

import { LearnerSetup } from "../components/setup/LearnerSetup";
import { PracticeSetDetailPage } from "./PracticeSetDetailPage";

/**
 * "Góc luyện tập" of a practice set (`/practice/parts/:id`). Content managers keep the existing
 * preview page; learners (and guests, who are asked to sign in) get the setup screen.
 */
export function PracticeSetupPage() {
  const { id = "" } = useParams();
  const user = useCurrentUser();
  if (user && user.role !== "User") return <PracticeSetDetailPage />;
  return <LearnerSetup key={id} setId={id} />;
}
