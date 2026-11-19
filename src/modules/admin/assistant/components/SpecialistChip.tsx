import { Badge } from "../../components/ui";
import type { AssistantSpecialist } from "../types/assistant.types";
import { DEPARTMENT_LABELS, departmentOf } from "../utils/departments";
import styles from "./assistant.module.css";

/** Who answered: the specialist's name and department, above the answer. */
export function SpecialistChip({ specialist }: { specialist: AssistantSpecialist }) {
  return (
    <div className={styles.specialist}>
      <strong>{specialist.name || specialist.code}</strong>
      <Badge>{DEPARTMENT_LABELS[departmentOf(specialist.capability)]}</Badge>
    </div>
  );
}
