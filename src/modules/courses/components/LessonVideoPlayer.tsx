import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type MouseEvent,
} from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  AlertCircle,
  ListOrdered,
} from "lucide-react";
import styles from "./LessonVideoPlayer.module.css";

export interface VideoChapter {
  time: number;
  label: string;
}

export interface LessonVideoPlayerHandle {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

interface LessonVideoPlayerProps {
  src: string;
  title?: string;
  chapters?: VideoChapter[];
  onReload?: () => void;
  initialTime?: number;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export const LessonVideoPlayer = forwardRef<LessonVideoPlayerHandle, LessonVideoPlayerProps>(
  function LessonVideoPlayer(
    { src, title = "Bài giảng video", chapters = [], onReload, initialTime = 0 },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrubTrackRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [isError, setIsError] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [showChaptersMenu, setShowChaptersMenu] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPos, setHoverPos] = useState(0);

    // Imperative handle for parent to seek/play (e.g. from textbook timestamp clicks)
    useImperativeHandle(
      ref,
      () => ({
        seekTo: (seconds: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
            void videoRef.current.play();
            setIsPlaying(true);
          }
        },
        play: () => {
          void videoRef.current?.play();
          setIsPlaying(true);
        },
        pause: () => {
          videoRef.current?.pause();
          setIsPlaying(false);
        },
      }),
      [duration],
    );

    // Initial seek if initialTime provided
    useEffect(() => {
      if (initialTime > 0 && videoRef.current) {
        videoRef.current.currentTime = initialTime;
      }
    }, [initialTime]);

    // Reset error state on src change
    useEffect(() => {
      setIsError(false);
      setIsBuffering(false);
      setCurrentTime(0);
      setIsPlaying(false);
    }, [src]);

    // Auto-hide controls timer
    const resetHideTimer = useCallback(() => {
      setShowControls(true);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (isPlaying) {
        hideTimeoutRef.current = window.setTimeout(() => {
          setShowControls(false);
          setShowSpeedMenu(false);
          setShowChaptersMenu(false);
        }, 2500);
      }
    }, [isPlaying]);

    useEffect(() => {
      resetHideTimer();
      return () => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      };
    }, [resetHideTimer]);

    // Fullscreen change listener
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(Boolean(document.fullscreenElement));
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // Toggle Play/Pause
    const togglePlay = useCallback(() => {
      if (!videoRef.current) return;
      if (videoRef.current.paused || videoRef.current.ended) {
        void videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      resetHideTimer();
    }, [resetHideTimer]);

    // Skip forward / backward
    const skip = useCallback(
      (seconds: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(
          0,
          Math.min(videoRef.current.currentTime + seconds, duration),
        );
        resetHideTimer();
      },
      [duration, resetHideTimer],
    );

    // Volume change
    const handleVolumeChange = (newVolume: number) => {
      if (!videoRef.current) return;
      const val = Math.max(0, Math.min(newVolume, 1));
      videoRef.current.volume = val;
      setVolume(val);
      if (val === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    };

    const toggleMute = () => {
      if (!videoRef.current) return;
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      videoRef.current.muted = nextMuted;
      if (!nextMuted && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    };

    // Playback rate
    const handleSpeedChange = (rate: number) => {
      if (!videoRef.current) return;
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    };

    // Toggle Fullscreen
    const toggleFullscreen = async () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen().catch(() => {});
      } else {
        await document.exitFullscreen().catch(() => {});
      }
    };

    // Scrubber click/drag
    const handleScrub = (event: MouseEvent<HTMLDivElement>) => {
      if (!scrubTrackRef.current || !videoRef.current || !duration) return;
      const rect = scrubTrackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
      const targetTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    };

    const handleScrubMouseMove = (event: MouseEvent<HTMLDivElement>) => {
      if (!scrubTrackRef.current || !duration) return;
      const rect = scrubTrackRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
      setHoverPos(clickX);
      setHoverTime((clickX / rect.width) * duration);
    };

    // Keyboard navigation within player
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft" || e.key === "j") {
        e.preventDefault();
        skip(-5);
      } else if (e.key === "ArrowRight" || e.key === "l") {
        e.preventDefault();
        skip(5);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleVolumeChange(volume + 0.1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleVolumeChange(volume - 0.1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
      }
    };

    // Progress updates
    const handleTimeUpdate = () => {
      if (!videoRef.current) return;
      setCurrentTime(videoRef.current.currentTime);
      // Update buffer
      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBuffered(bufferedEnd);
      }
    };

    // Active chapter calculation
    const activeChapter = chapters.length
      ? [...chapters].reverse().find((ch) => currentTime >= ch.time) || chapters[0]
      : null;

    const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
      <div
        ref={containerRef}
        className={styles.playerContainer}
        tabIndex={0}
        onMouseMove={resetHideTimer}
        onKeyDown={handleKeyDown}
        aria-label={title}
      >
        <video
          ref={videoRef}
          className={styles.videoElement}
          src={src}
          preload="metadata"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => {
            setIsBuffering(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setIsError(true);
            setIsBuffering(false);
          }}
          onClick={togglePlay}
        />

        {/* Big Center Play Overlay (when paused and not buffering or error) */}
        {!isPlaying && !isBuffering && !isError && (
          <div className={styles.centerPlayOverlay} onClick={togglePlay} aria-label="Phát video">
            <button type="button" className={styles.centerPlayBtn}>
              <Play size={30} fill="currentColor" />
            </button>
          </div>
        )}

        {/* Buffering Spinner */}
        {isBuffering && !isError && (
          <div className={styles.bufferingOverlay} aria-label="Đang đệm video...">
            <Loader2 className={styles.spinner} size={44} />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className={styles.errorOverlay} role="alert">
            <AlertCircle size={36} color="#f43f5e" />
            <h3 className={styles.errorTitle}>Không thể phát video bài học</h3>
            <p className={styles.errorDesc}>
              Đường dẫn video có thể đã hết hạn hoặc thiết bị của bạn không hỗ trợ định dạng này.
            </p>
            {onReload && (
              <button type="button" className={styles.errorBtn} onClick={onReload}>
                Lấy liên kết mới
              </button>
            )}
          </div>
        )}

        {/* Bottom Controls Bar */}
        <div className={styles.controlsOverlay} data-hidden={!showControls && isPlaying}>
          {/* Progress / Scrub track */}
          <div
            ref={scrubTrackRef}
            className={styles.scrubContainer}
            onClick={handleScrub}
            onMouseMove={handleScrubMouseMove}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className={styles.scrubTrack}>
              <div className={styles.scrubBuffer} style={{ width: `${bufferPercent}%` }} />
              <div className={styles.scrubPlayed} style={{ width: `${playedPercent}%` }} />
              <div className={styles.scrubThumb} style={{ left: `${playedPercent}%` }} />

              {/* Chapter markers */}
              {duration > 0 &&
                chapters.map((ch, idx) => (
                  <span
                    key={idx}
                    className={styles.chapterMarker}
                    style={{ left: `${(ch.time / duration) * 100}%` }}
                    title={`${ch.label} (${formatTime(ch.time)})`}
                  />
                ))}
            </div>

            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div className={styles.timeTooltip} style={{ left: `${hoverPos}px` }}>
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className={styles.controlsRow}>
            <div className={styles.leftControls}>
              {/* Play / Pause */}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={togglePlay}
                title={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}
                aria-label={isPlaying ? "Tạm dừng" : "Phát"}
              >
                {isPlaying ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
              </button>

              {/* Rewind 10s */}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => skip(-10)}
                title="Lùi 10 giây (←)"
                aria-label="Lùi 10 giây"
              >
                <RotateCcw size={17} />
              </button>

              {/* Forward 10s */}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={() => skip(10)}
                title="Tua 10 giây (→)"
                aria-label="Tua 10 giây"
              >
                <RotateCw size={17} />
              </button>

              {/* Volume */}
              <div className={styles.volumeGroup}>
                <button
                  type="button"
                  className={styles.controlBtn}
                  onClick={toggleMute}
                  title={isMuted ? "Bật âm thanh (M)" : "Tắt âm thanh (M)"}
                  aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={19} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={19} />
                  ) : (
                    <Volume2 size={19} />
                  )}
                </button>
                <input
                  type="range"
                  className={styles.volumeSlider}
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  aria-label="Âm lượng"
                />
              </div>

              {/* Time display */}
              <span className={styles.timeDisplay}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className={styles.rightControls}>
              {/* Chapters Button (if chapters exist) */}
              {chapters.length > 0 && (
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className={styles.controlBtn}
                    onClick={() => {
                      setShowChaptersMenu((p) => !p);
                      setShowSpeedMenu(false);
                    }}
                    title="Mục lục bài giảng"
                    aria-label="Mục lục bài giảng"
                  >
                    <ListOrdered size={19} />
                  </button>

                  {showChaptersMenu && (
                    <div className={styles.chaptersMenu}>
                      <h4 className={styles.chapterTitle}>Mục lục video</h4>
                      {chapters.map((ch, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={styles.chapterItem}
                          data-active={activeChapter?.time === ch.time}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = ch.time;
                              void videoRef.current.play();
                              setIsPlaying(true);
                            }
                            setShowChaptersMenu(false);
                          }}
                        >
                          <span>{ch.label}</span>
                          <span className={styles.chapterTime}>{formatTime(ch.time)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Speed Selector */}
              <div className={styles.speedDropdown}>
                <button
                  type="button"
                  className={styles.speedBtn}
                  onClick={() => {
                    setShowSpeedMenu((p) => !p);
                    setShowChaptersMenu(false);
                  }}
                  title="Tốc độ phát"
                  aria-label="Tốc độ phát"
                >
                  {playbackRate}x
                </button>

                {showSpeedMenu && (
                  <div className={styles.speedMenu}>
                    {SPEED_OPTIONS.map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        className={styles.speedOption}
                        data-active={playbackRate === rate}
                        onClick={() => handleSpeedChange(rate)}
                      >
                        {rate}x {rate === 1 && "(Chuẩn)"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen */}
              <button
                type="button"
                className={styles.controlBtn}
                onClick={toggleFullscreen}
                title={isFullscreen ? "Thu nhỏ (F)" : "Toàn màn hình (F)"}
                aria-label={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
              >
                {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
