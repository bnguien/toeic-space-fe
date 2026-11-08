import type { DictationMapCourse, DictationStarsMap } from "./maps.types";

/**
 * 1-based order of the course being played: the first course without stars, or `courses.length + 1`
 * when every course is done (then no node is "active").
 */
export function activeCourseIndex(courses: DictationMapCourse[], progress: DictationStarsMap) {
  const firstOpen = courses.findIndex((c) => !progress[c.id]);
  return firstOpen === -1 ? courses.length + 1 : firstOpen + 1;
}

/** Drops the "Chuyên đề:" / "Củng cố & Luyện tập chuyên sâu:" prefix of a course title. */
export function stripCoursePrefix(title: string) {
  return title.replace(/^(Chuyên đề|Củng cố & Luyện tập chuyên sâu):\s*/i, "");
}

/** Vietnamese thousands formatting for the roadmap counters. */
export function formatCount(n: number | undefined) {
  return new Intl.NumberFormat("vi-VN").format(n || 0);
}
