export interface FeatureCardItem {
  id: string;
  icon: "listening" | "reading" | "roadmap" | "ai";
  title: string;
  subtitle: string;
  /** Page opened by the card. */
  route?: string;
  /** Home section scrolled to when there is no `route`. */
  targetId?: string;
}
