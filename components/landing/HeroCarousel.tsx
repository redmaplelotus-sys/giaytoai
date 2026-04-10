"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/LandingPage.module.css";

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------

interface Slide {
  src: string;
  alt: string;
  placeholderBg: string;
  iconBg: string;
  iconColor: string;
  captionTitle: string;
  captionSub: string;
  wireframe?: boolean;
}

const SLIDES: Slide[] = [
  {
    src: "/images/hero-study.jpg",
    alt: "Sinh viên Việt Nam thảo luận về du học",
    placeholderBg: "#E6F1FB",
    iconBg: "#E6F1FB",
    iconColor: "#185FA5",
    captionTitle: "Du học & học bổng",
    captionSub: "Personal statement · Scholarship essay",
  },
  {
    src: "/images/hero-screenshot.jpg",
    alt: "Giao diện tạo tài liệu Giấy Tờ AI",
    placeholderBg: "#FFFFFF",
    iconBg: "#E6F1FB",
    iconColor: "#185FA5",
    captionTitle: "Tạo tài liệu trong 5 phút",
    captionSub: "Phỏng vấn tiếng Việt → tài liệu chuyên nghiệp",
    wireframe: true,
  },
  {
    src: "/images/hero-business.jpg",
    alt: "Chuyên gia Việt Nam làm việc với đối tác quốc tế",
    placeholderBg: "#E1F5EE",
    iconBg: "#E1F5EE",
    iconColor: "#0F6E56",
    captionTitle: "Kinh doanh quốc tế",
    captionSub: "Tiếng Trung · Tiếng Hàn · Tiếng Anh",
  },
];

// ---------------------------------------------------------------------------
// Caption icon
// ---------------------------------------------------------------------------

function CaptionDocIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="17" viewBox="0 0 14 17" fill="none" aria-hidden="true">
      <rect x="1.5" y="1" width="10" height="15" rx="1.5" stroke={color} strokeWidth="1.4" />
      <line x1="4" y1="5.5" x2="10" y2="5.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4" y1="8.5" x2="8.5" y2="8.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <line x1="4" y1="11.5" x2="9.5" y2="11.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// HeroCarousel
// ---------------------------------------------------------------------------

export function HeroCarousel() {
  const [current, setCurrent]       = useState(0);
  const [imgErrors, setImgErrors]   = useState([false, false, false]);
  const hoverRef                    = useRef(false);

  const goTo = useCallback((index: number) => {
    setCurrent(((index % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  // Auto-advance every 4 s, paused on hover
  useEffect(() => {
    const id = setInterval(() => {
      if (!hoverRef.current) {
        setCurrent((c) => (c + 1) % SLIDES.length);
      }
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // Keyboard left / right
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  setCurrent((c) => ((c - 1 + SLIDES.length) % SLIDES.length));
      if (e.key === "ArrowRight") setCurrent((c) => (c + 1) % SLIDES.length);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function markError(i: number) {
    setImgErrors((prev) => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }

  return (
    <div
      className={styles.carousel}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => { hoverRef.current = false; }}
    >
      {/* Slide track */}
      <div
        className={styles.carouselTrack}
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {SLIDES.map((slide, i) => (
          <div key={i} className={styles.carouselSlide}>

            {/* Placeholder (always visible beneath image) */}
            <div
              className={styles.slidePlaceholder}
              style={{ background: slide.placeholderBg }}
            >
              {slide.wireframe && (
                <div className={styles.wireframe}>
                  <div className={styles.wireframeHeader} />
                  <div className={styles.wireframeLine} />
                  <div className={`${styles.wireframeLine} ${styles.wireframeLineShort}`} />
                  <div className={styles.wireframeBlock} />
                  <div className={styles.wireframeLine} />
                  <div className={`${styles.wireframeLine} ${styles.wireframeLineShort}`} />
                  <div className={styles.wireframeLine} />
                </div>
              )}
            </div>

            {/* Photo (hidden if missing) */}
            {!imgErrors[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.src}
                alt={slide.alt}
                className={styles.slideImg}
                onError={() => markError(i)}
              />
            )}

            {/* Caption overlay */}
            <div className={styles.slideCaption}>
              <div
                className={styles.captionIconBox}
                style={{ background: slide.iconBg }}
              >
                <CaptionDocIcon color={slide.iconColor} />
              </div>
              <div>
                <p className={styles.captionTitle}>{slide.captionTitle}</p>
                <p className={styles.captionSub}>{slide.captionSub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prev arrow */}
      <button
        type="button"
        aria-label="Slide trước"
        onClick={() => setCurrent((c) => ((c - 1 + SLIDES.length) % SLIDES.length))}
        className={`${styles.carouselArrow} ${styles.carouselArrowPrev}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M8.5 2.5L4 7L8.5 11.5" stroke="#1B3A5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Next arrow */}
      <button
        type="button"
        aria-label="Slide tiếp theo"
        onClick={() => setCurrent((c) => (c + 1) % SLIDES.length)}
        className={`${styles.carouselArrow} ${styles.carouselArrowNext}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M5.5 2.5L10 7L5.5 11.5" stroke="#1B3A5C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dot indicators */}
      <div className={styles.carouselDots} role="tablist" aria-label="Chọn slide">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === current}
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
