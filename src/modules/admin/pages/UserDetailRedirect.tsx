import { Navigate, useParams } from "react-router-dom";

/** Old /admin/users/:id links: details now open in a drawer over the account list. */
export function UserDetailRedirect() {
  const { userId = "" } = useParams();
  return <Navigate to={`/admin/system/users?user=${encodeURIComponent(userId)}`} replace />;
}
