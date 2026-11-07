/**
 * Mascot images of the grammar page: Studychill "Chillo" stickers → Oysteic (same emotion).
 * chillo-03-reading → oy2-reading · chillo-08-celebrate → oy2-cheer · chillo-09-thinking → oy2-focus ·
 * chillo-10-idea → oysteic-curious. The Lĩnh hội lecturer (Studychill 3D model / poster) → oysteic-warm.
 */
import cheer from "@/assets/mascot/oy2-cheer.png";
import focus from "@/assets/mascot/oy2-focus.png";
import reading from "@/assets/mascot/oy2-reading.png";
import curious from "@/assets/mascot/oysteic-curious.png";
import warm from "@/assets/mascot/oysteic-warm.png";

export const STICKERS = {
  reading,
  celebrate: cheer,
  thinking: focus,
  idea: curious,
  lecturer: warm,
} as const;

export type StickerName = keyof typeof STICKERS;

export const sticker = (name: StickerName): string => STICKERS[name];
