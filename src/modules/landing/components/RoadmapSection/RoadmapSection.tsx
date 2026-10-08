import { useState } from "react";
import { Link } from "react-router-dom";
import mascotDetermined from "@/assets/mascot/oy2-determined.png";
import { IconCalendar, IconHeadphones, IconTarget, IconTrophy } from "../icons/LandingIcons";
import { ROADMAP_MILESTONES } from "../../constants";
import styles from "./RoadmapSection.module.css";

const GOAL_OPTIONS = ["Mục tiêu 650+", "Mục tiêu 750+", "Mục tiêu 850+", "Mục tiêu 900+"];
const DURATION_OPTIONS = ["Thi sau 6 tuần", "Thi sau 8 tuần", "Thi sau 10 tuần", "Thi sau 12 tuần"];

export const RoadmapSection = () => {
  const [goalIndex, setGoalIndex] = useState(1); // Default "Mục tiêu 750+"
  const [durationIndex, setDurationIndex] = useState(2); // Default "Thi sau 10 tuần"

  const handleCycleGoal = () => {
    setGoalIndex((prev) => (prev + 1) % GOAL_OPTIONS.length);
  };

  const handleCycleDuration = () => {
    setDurationIndex((prev) => (prev + 1) % DURATION_OPTIONS.length);
  };

  const getMilestoneIcon = (iconName: string) => {
    switch (iconName) {
      case "target":
        return <IconTarget size={18} />;
      case "calendar":
        return <IconCalendar size={18} />;
      case "headphones":
        return <IconHeadphones size={18} />;
      case "trophy":
        return <IconTrophy size={18} />;
      default:
        return <IconTarget size={18} />;
    }
  };

  return (
    <section id="roadmap" className={styles.section}>
      <div className={styles.inner}>
        {/* Section Header */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <div className={styles.badgePill}>
              <span className={styles.badgeNumber}>03</span>
              <span className={styles.badgeLabel}>CÁ NHÂN HOÁ</span>
            </div>
            <h2 className={styles.title}>Lộ trình của riêng bạn</h2>
            <p className={styles.subtitle}>
              Đặt mục tiêu điểm số và ngày thi, ToeicSpace vẽ lại hành trình theo đúng năng lực hiện
              tại của bạn — như một tuyến hải trình có từng điểm dừng.
            </p>

            {/* Two interactive goal pills */}
            <div className={styles.goalBadgesRow}>
              <button
                type="button"
                className={styles.goalPill}
                onClick={handleCycleGoal}
                title="Nhấn để đổi mục tiêu điểm số"
              >
                <IconTarget size={18} />
                <span>{GOAL_OPTIONS[goalIndex]}</span>
              </button>

              <button
                type="button"
                className={styles.goalPill}
                onClick={handleCycleDuration}
                title="Nhấn để đổi thời gian thi"
              >
                <IconCalendar size={18} />
                <span>{DURATION_OPTIONS[durationIndex]}</span>
              </button>
            </div>
          </div>

          {/* Right Mascot: Cute pearl with headband and 990 shield */}
          <div className={styles.mascotWrap}>
            <img
              src={mascotDetermined}
              alt="Oysteic Mascot — Lộ trình cá nhân hoá mục tiêu 990"
              className={styles.mascotImg}
            />
          </div>
        </div>

        {/* Timeline Milestones with Dotted Line & 4 Cards */}
        <div className={styles.timelineContainer}>
          <div className={styles.milestonesRow}>
            <div className={styles.connectorLine} aria-hidden="true" />
            {ROADMAP_MILESTONES.map((item) => (
              <div key={item.weekLabel} className={styles.milestoneIconWrap}>
                <div className={styles.milestoneCircle} title={item.title}>
                  {getMilestoneIcon(item.icon)}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.cardsGrid}>
            {ROADMAP_MILESTONES.map((item) => (
              <div key={item.weekLabel} className={styles.card}>
                <span className={styles.cardWeek}>{item.weekLabel}</span>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDesc}>{item.description}</p>
                <div className={styles.progressTrack} aria-hidden="true">
                  <div
                    className={styles.progressFill}
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* View More / Detail Link */}
          <div className={styles.viewMoreRow}>
            <Link to="/roadmap" className={styles.viewMoreBtn}>
              <span>Xây dựng lộ trình của bạn ngay</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
