/**
 * Oysteic stickers standing in for Studychill's Chillo stickers in the dictation screens, by emotion:
 * wave (chillo-01), reading (03), headphones (05), celebrate (08), thinking (09), idea (10),
 * peeking (11), cheer (12), the plain smile fallback and the reel "well done".
 */
import base from "@/assets/mascot/oy2-base.png";
import cheer from "@/assets/mascot/oy2-cheer.png";
import confused from "@/assets/mascot/oy2-confused.png";
import hello from "@/assets/mascot/oy2-hello.png";
import joy from "@/assets/mascot/oy2-joy.png";
import listening from "@/assets/mascot/oy2-listening.png";
import playful from "@/assets/mascot/oy2-playful.png";
import reading from "@/assets/mascot/oy2-reading.png";
import success from "@/assets/mascot/oy2-success.png";
import surprised from "@/assets/mascot/oy2-surprised.png";

export const MASCOT = {
  wave: hello,
  reading,
  headphones: listening,
  celebrate: joy,
  thinking: confused,
  idea: surprised,
  peeking: playful,
  cheer,
  smile: base,
  success,
} as const;

export type MascotMood = keyof typeof MASCOT;
