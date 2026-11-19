import { RichText } from "../RichText";
import { uniqueListeningScripts } from "./content";
import { TranscriptDisclosure } from "./TranscriptDisclosure";

export function ListeningTranscript({
  part,
  scripts,
}: {
  part: number;
  scripts: (string | null | undefined)[];
}) {
  if (part < 1 || part > 4) return null;
  const available = uniqueListeningScripts(scripts);
  return (
    <TranscriptDisclosure>
      {available.length > 0 ? (
        available.map((value, index) => (
          <RichText key={index} value={value} variant="transcript" lang="en" />
        ))
      ) : (
        <p>Chưa có bản chép lời cho bài nghe này.</p>
      )}
    </TranscriptDisclosure>
  );
}
