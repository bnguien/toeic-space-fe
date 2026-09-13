import { Link } from "react-router-dom";

import mascotHero from "@/assets/mascot/oy2-hello.png";
import { IconRocket } from "@/shared/components/icons";
import "@/styles/globals.css";

function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top, #e0f2fe 0%, #f4f7fb 100%)",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <img
        src={mascotHero}
        alt="Oysteic Mascot"
        className="animate-bob"
        style={{
          width: "160px",
          height: "160px",
          objectFit: "contain",
          marginBottom: "1.5rem",
          filter: "drop-shadow(0 15px 25px rgba(56, 189, 248, 0.35))",
        }}
      />

      <div
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
          borderRadius: "24px",
          padding: "2.5rem 3rem",
          maxWidth: "600px",
          boxShadow: "0 20px 40px -15px rgba(14, 165, 233, 0.15)",
        }}
      >
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#0284c7",
            background: "#e0f2fe",
            padding: "4px 12px",
            borderRadius: "999px",
            display: "inline-block",
            marginBottom: "1rem",
          }}
        >
          PBL6: HỆ THỐNG TOEIC SPACE
        </span>

        <h1
          style={{
            fontSize: "2.5rem",
            color: "#0f172a",
            marginBottom: "0.5rem",
          }}
        >
          TOEIC SPACE
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "#64748b",
            fontWeight: 500,
            marginBottom: "2rem",
          }}
        >
          Hệ thống Ôn luyện & Khảo thí TOEIC tích hợp LMS Quản lý Trung tâm
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <Link
            to="/admin"
            style={{
              background: "linear-gradient(135deg, #2563eb, #0284c7)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "1rem",
              padding: "0.85rem 2rem",
              borderRadius: "999px",
              boxShadow: "0 8px 20px rgba(37, 99, 235, 0.35)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "transform 0.2s ease",
            }}
          >
            <IconRocket size={18} />
            <span>Truy cập CMS Admin</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

export default App;
