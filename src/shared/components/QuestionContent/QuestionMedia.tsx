import { mediaUrls } from "../RichText";

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
  return (
    <>
      {images.map((src, index) => (
        <img
          key={src}
          className={imageClassName}
          src={src}
          alt={images.length > 1 ? `${imageAlt} (${index + 1}/${images.length})` : imageAlt}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ))}
      {(firstAudioOnly ? tracks.slice(0, 1) : tracks).map((src) => (
        <audio key={src} className={audioClassName} controls preload="none" src={src}>
          Trình duyệt không hỗ trợ âm thanh.
        </audio>
      ))}
    </>
  );
}
