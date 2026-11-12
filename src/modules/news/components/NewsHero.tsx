import { ArrowRight, Newspaper } from "lucide-react";

import mascot from "@/assets/mascot/oy2-reading.png";

import styles from "./NewsHero.module.css";

interface NewsHeroProps {
  articleCount: number | null;
  topicCount: number;
  stageCount: number;
  onStart: () => void;
}

/** Navy hero of the list page: title, call to action, three stats and the reading mascot. */
export function NewsHero({ articleCount, topicCount, stageCount, onStart }: NewsHeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="news-title">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>
          <Newspaper size={14} /> Luyện đọc · Song ngữ
        </span>
        <h1 id="news-title">
          Đọc báo <em>song ngữ</em>
        </h1>
        <p>
          Bài báo tiếng Anh thật theo chủ đề và cấp độ. Bấm một từ để tra nghĩa, bật bản dịch từng
          câu, lưu từ hay vào sổ tay.
        </p>
        <button type="button" className={styles.cta} onClick={onStart}>
          Chọn bài để đọc <ArrowRight size={17} />
        </button>
      </div>
      <div className={styles.side}>
        <ul className={styles.stats}>
          <li>
            <b>{articleCount ?? "…"}</b>
            <span>bài báo</span>
          </li>
          <li>
            <b>{topicCount}</b>
            <span>chủ đề</span>
          </li>
          <li>
            <b>{stageCount}</b>
            <span>chặng TOEIC</span>
          </li>
        </ul>
        <img src={mascot} alt="" width="150" height="150" />
      </div>
    </section>
  );
}
