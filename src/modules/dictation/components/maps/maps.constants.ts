/**
 * Attribute the mode modal sets on its overlay. The topic map checks for it before handling the
 * `M` / `Escape` shortcuts, so the shortcuts stay quiet while the modal is open (Studychill looked
 * for the modal's class name; CSS Modules hash class names, hence the attribute).
 */
export const DICTATION_MODAL_ATTRIBUTE = "data-dictation-modal";

/** Courses per region on the topic map; a milestone gate is drawn after every region. */
export const TOPIC_MILESTONE = 10;
