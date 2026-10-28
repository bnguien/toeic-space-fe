import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import mascotListening from "@/assets/mascot/oy2-listening.png";
import { IconHeadphones, IconPause, IconPlay } from "../icons/LandingIcons";
import { LISTENING_PARTS } from "../../constants";
import styles from "./ListeningSection.module.css";

export const ListeningSection = () => {
  const [selectedPartIndex, setSelectedPartIndex] = useState(2); // Default to Part 3 as shown in screenshot
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("0.75x");
  const [showTranscript, setShowTranscript] = useState(false);
  const [progressSec, setProgressSec] = useState(42); // 00:42 in screenshot
  const totalDurationSec = 108; // 01:48 in screenshot

  const currentPart = LISTENING_PARTS[selectedPartIndex];

  // Simulated audio playback progress when playing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgressSec((prev) => {
          if (prev >= totalDurationSec) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDurationSec]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleCycleSpeed = () => {
    if (playbackSpeed === "0.75x") setPlaybackSpeed("1.0x");
    else if (playbackSpeed === "1.0x") setPlaybackSpeed("1.25x");
    else setPlaybackSpeed("0.75x");
  };

  const handleSelectPart = (idx: number) => {
    setSelectedPartIndex(idx);
    setProgressSec(12);
  };

  const progressPercent = (progressSec / totalDurationSec) * 100;

  return (
    <section id="listening" className={styles.section}>
      <div className={styles.inner}>
        {/* Section Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <div className={styles.badgePill}>
              <span className={styles.badgeNumber}>01</span>
              <span className={styles.badgeLabel}>PHÒNG LUYỆN TẬP</span>
            </div>
            <h2 className={styles.title}>Nghe trong tĩnh lặng</h2>
            <p className={styles.subtitle}>
              Mỗi Part là một căn phòng nhỏ trong vỏ sò: chọn phòng, đóng cửa lại, và chỉ còn tiếng
              audio với bạn.
            </p>
          </div>

          {/* Right Mascot: Cute Pearl with headphones in oyster shell */}
          <div className={styles.mascotWrap}>
            <img
              src={mascotListening}
              alt="Oysteic Mascot — Luyện nghe tĩnh lặng"
              className={styles.mascotImg}
            />
          </div>
        </div>

        {/* 4 Note Cards for Part 1 to 4 */}
        <div className={styles.cardsGrid}>
          {LISTENING_PARTS.map((item, idx) => {
            const isSelected = idx === selectedPartIndex;
            return (
              <div
                key={item.partName}
                className={`${styles.noteCard} ${isSelected ? styles.noteCardActive : ""}`}
                onClick={() => handleSelectPart(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectPart(idx);
                  }
                }}
              >
                {/* Blue washi tape on top matching screenshot */}
                <div className={styles.washiTape} aria-hidden="true" />

                <div className={styles.cardTop}>
                  <span className={styles.partTag}>{item.partName}</span>
                  <span className={styles.partIcon}>
                    <IconHeadphones size={18} />
                  </span>
                </div>

                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDesc}>{item.description}</p>

                <div className={styles.cardBottom}>
                  <span className={styles.countPill}>{item.questionCount} câu</span>
                  <div className={styles.playCircle}>
                    {isSelected && isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Audio Player Bar matching screenshot 2 */}
        <div className={styles.playerCard}>
          <button
            type="button"
            className={styles.playerPlayBtn}
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Tạm dừng audio" : "Phát audio"}
          >
            {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} />}
          </button>

          <div className={styles.trackInfoWrap}>
            <div className={styles.trackTitle}>
              {currentPart.partName} · {currentPart.title}
            </div>
            <div className={styles.trackTimeline}>
              <span className={styles.timeText}>{formatTime(progressSec)}</span>
              <div
                className={styles.progressBarTrack}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  setProgressSec(Math.round(ratio * totalDurationSec));
                }}
              >
                <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
              </div>
              <span className={styles.timeText}>{formatTime(totalDurationSec)}</span>
            </div>
          </div>

          <div className={styles.playerRightGroup}>
            <button
              type="button"
              className={styles.speedBtn}
              onClick={handleCycleSpeed}
              title="Tốc độ phát"
            >
              {playbackSpeed}
            </button>
            <button
              type="button"
              className={styles.transcriptBtn}
              onClick={() => setShowTranscript((prev) => !prev)}
            >
              {showTranscript ? "Ẩn transcript" : "Xem transcript"}
            </button>
          </div>
        </div>

        {/* Transcript Drawer */}
        {showTranscript && (
          <div className={styles.transcriptDrawer}>
            <div className={styles.transcriptDrawerTitle}>
              Transcript {currentPart.partName} — {currentPart.title}
            </div>
            <div className={styles.transcriptText}>{currentPart.sampleTranscript}</div>
          </div>
        )}

        {/* View More / Detail Link */}
        <div className={styles.viewMoreRow}>
          <Link to="/practice" className={styles.viewMoreBtn}>
            <span>Xem chi tiết phòng luyện Listening (Part 1–4)</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
