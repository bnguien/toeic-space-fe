import determined from "@/assets/mascot/oy2-determined.png";
import listening from "@/assets/mascot/oy2-listening.png";
import playful from "@/assets/mascot/oy2-playful.png";
import reading from "@/assets/mascot/oy2-reading.png";
import search from "@/assets/mascot/oy2-search.png";

import type { HomeMapArt } from "../../utils/homeMap";

/** Mascot of each home-map tile (also the art of its popup). */
export const HOME_MAP_ART: Record<HomeMapArt, string> = {
  exam: determined,
  listening,
  reading,
  vocabulary: search,
  game: playful,
};
