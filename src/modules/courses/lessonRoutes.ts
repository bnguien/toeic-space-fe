import type { PublicModule } from "./courseCatalog";

/** Where a learner lands inside a course: the first lesson in curriculum order. */
export function firstLessonPath(courseId: string, modules: PublicModule[]): string | null {
  const orderedModules = modules.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  for (const module of orderedModules) {
    const firstLesson = module.lessons.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
    if (firstLesson) return `/my-courses/${courseId}/lessons/${firstLesson.id}`;
  }
  return null;
}

/**
 * The curriculum back link goes to the learner's own course list when they own
 * the course, and to the public course page while it is only a preview.
 */
export function curriculumBackPath(
  isEnrolled: boolean,
  courseId: string,
  previewQuery = "",
): string {
  return isEnrolled ? "/my-courses" : `/courses/${courseId}${previewQuery}`;
}
