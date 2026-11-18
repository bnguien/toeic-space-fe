import { mediaUrls } from "../RichText";
import { useState } from "react";
import styles from "./QuestionContent.module.css";

/** Deduplication is scoped to the caller's current passage group. */
export function QuestionMedia({
  image,
  audio,
  shown = [],
  imageClassName,
  audioClassName,
  firstAudioOnly = false,
  imageAlt = "Hình ảnh của câu hỏi",
}: {
  image?: string | null;
  audio?: string | null;
  shown?: readonly string[];
  imageClassName?: string;
  audioClassName?: string;
  firstAudioOnly?: boolean;
  imageAlt?: string;
}) {
  const images = [...new Set(mediaUrls(image))].filter((url) => !shown.includes(url));
  const tracks = [...new Set(mediaUrls(audio))].filter((url) => !shown.includes(url));
  const [failed, setFailed] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const fail = (url: string) => setFailed((urls) => (urls.includes(url) ? urls : [...urls, url]));
  const hasError = [...images, ...tracks].some((url) => failed.includes(url));
  return (
    <>
      {images.map((src, index) => (
        <img
          key={`${src}:${retry}`}
          className={imageClassName}
          src={src}
          alt={images.length > 1 ? `${imageAlt} (${index + 1}/${images.length})` : imageAlt}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => fail(src)}
        />
      ))}
      {(firstAudioOnly ? tracks.slice(0, 1) : tracks).map((src) => (
        <audio
          key={`${src}:${retry}`}
          className={audioClassName}
          controls
          preload="none"
          src={src}
          onError={() => fail(src)}
        >
          Trình duyệt không hỗ trợ âm thanh.
        </audio>
      ))}
      {hasError && (
        <p role="alert">
          Không tải được hình ảnh hoặc âm thanh.{" "}
          <button
            className={styles.mediaRetry}
            type="button"
            onClick={() => {
              setFailed([]);
              setRetry((v) => v + 1);
            }}
          >
            Thử tải lại media
          </button>
        </p>
      )}
    </>
  );
}
