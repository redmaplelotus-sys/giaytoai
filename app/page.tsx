import Link from "next/link";
import Image from "next/image";
import { HeroCarousel } from "@/components/landing/HeroCarousel";
import { DocumentsSection } from "@/components/landing/DocumentsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { Button } from "@/components/ui/Button";
import styles from "./LandingPage.module.css";

// ─────────────────────────────────────────────────────────────────────────────
// Tiny icon helpers (inline SVG, server-rendered)
// ─────────────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, borderRadius: "50%", background: "#FCEBEB", flexShrink: 0, marginTop: 1,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M2 2L6 6M6 2L2 6" stroke="#A32D2D" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function CheckIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, borderRadius: "50%", background: "#EAF3DE", flexShrink: 0, marginTop: 1,
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1.5 4L3.5 6L6.5 2" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Trust Bar
// ─────────────────────────────────────────────────────────────────────────────

function TrustBar() {
  return (
    <div className={styles.trustBar}>
      <div className={styles.trustBarInner}>

        {/* Star */}
        <div className={styles.trustItem}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2L9.54 6.26H14.09L10.47 8.82L12.01 13.09L8 10.52L3.99 13.09L5.53 8.82L1.91 6.26H6.46L8 2Z" fill="#B97508" />
          </svg>
          <span>150,000+ sinh viên Việt Nam du học mỗi năm</span>
        </div>

        {/* Circle check */}
        <div className={styles.trustItem}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="#3B6D11" fillOpacity="0.15" stroke="#3B6D11" strokeWidth="1.2" />
            <path d="M5 8L7 10L11 6" stroke="#3B6D11" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Tạo tài liệu trong 5 phút</span>
        </div>

        {/* Document */}
        <div className={styles.trustItem}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke="#185FA5" strokeWidth="1.2" />
            <line x1="5.5" y1="6" x2="10.5" y2="6" stroke="#185FA5" strokeWidth="1" strokeLinecap="round" />
            <line x1="5.5" y1="8.5" x2="9" y2="8.5" stroke="#185FA5" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span>Tiếng Anh · Trung · Hàn</span>
        </div>

        {/* Diamond */}
        <div className={styles.trustItem}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2L14 8L8 14L2 8L8 2Z" stroke="#1B3A5C" strokeWidth="1.2" />
          </svg>
          <span>Hoàn toàn miễn phí để thử</span>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Why Not ChatGPT
// ─────────────────────────────────────────────────────────────────────────────

const CHATGPT_ITEMS = [
  "Giao diện tiếng Anh — phải tự viết prompt tiếng Anh",
  "Không biết yêu cầu cụ thể của từng học bổng, từng nước",
  "Không sửa thói quen khiêm tốn — văn bản nghe yếu",
  "Trả về text thô — tự format, tự tải xuống Word",
  "Không học từ kết quả thực tế của người dùng",
];

const GIAYTOAI_ITEMS = [
  "Phỏng vấn hoàn toàn bằng tiếng Việt",
  "Biết yêu cầu của Australia Awards, Fulbright, MEXT và hơn 20 học bổng",
  "Tự động làm nổi bật thành tích đúng chuẩn quốc tế",
  "Xuất file Word hoặc PDF đúng format — sẵn sàng nộp",
  "Học từ hàng nghìn kết quả thực tế — chất lượng tăng liên tục",
];

function WhyNotChatGpt() {
  return (
    <section className={styles.whySection}>
      <div className={styles.whyInner}>
        <p className={styles.sectionLabel}>Tại sao không dùng ChatGPT?</p>
        <h2 className={styles.sectionH2}>ChatGPT không hiểu người Việt nộp hồ sơ</h2>
        <p className={styles.sectionSubtitle}>
          Các công cụ AI thông thường yêu cầu bạn giải thích bản thân bằng tiếng Anh — chính là điểm yếu cần khắc phục.
        </p>

        <div className={styles.compGrid}>
          {/* ChatGPT card */}
          <div className={styles.compCard}>
            <p className={styles.compLabel}>ChatGPT / Claude.ai</p>
            <ul className={styles.compItems}>
              {CHATGPT_ITEMS.map((text) => (
                <li key={text} className={styles.compItem}>
                  <XIcon />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Giấy Tờ AI card */}
          <div className={`${styles.compCard} ${styles.compCardFeatured}`}>
            <p className={`${styles.compLabel} ${styles.compLabelFeatured}`}>Giấy Tờ AI</p>
            <ul className={styles.compItems}>
              {GIAYTOAI_ITEMS.map((text) => (
                <li key={text} className={`${styles.compItem} ${styles.compItemFeatured}`}>
                  <CheckIcon />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: How It Works
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: 1,
    title: "Chọn loại tài liệu",
    body: "Chọn mục tiêu, nước đến và ngôn ngữ đầu ra — tiếng Anh, Trung hoặc Hàn. Tải lên CV nếu có.",
    time: "30 giây",
  },
  {
    n: 2,
    title: "Trả lời phỏng vấn tiếng Việt",
    body: "5–7 câu hỏi về background và mục tiêu của bạn. Hệ thống tự điền từ CV nếu bạn tải lên.",
    time: "2–3 phút",
  },
  {
    n: 3,
    title: "Tải xuống tài liệu",
    body: "AI viết văn bản ngay trước mắt bạn. Chỉnh sửa nếu muốn, rồi tải về file Word hoặc PDF.",
    time: "1 phút",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.howSection}>
      <div className={styles.howInner}>
        <p className={styles.sectionLabel}>Cách hoạt động</p>
        <h2 className={styles.sectionH2}>3 bước — tài liệu chuyên nghiệp</h2>
        <p className={styles.sectionSubtitle}>Không cần biết tiếng Anh để bắt đầu.</p>

        <div className={styles.stepsGrid}>
          {STEPS.map((step) => (
            <div key={step.n} className={styles.stepCard}>
              <div className={styles.stepNum}>{step.n}</div>
              <h3 className={styles.stepH3}>{step.title}</h3>
              <p className={styles.stepP}>{step.body}</p>
              <span className={styles.timeBadge}>{step.time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Social Proof
// ─────────────────────────────────────────────────────────────────────────────

function SocialProof() {
  return (
    <section className={styles.socialSection}>
      <div className={styles.socialInner}>
        <p className={styles.sectionLabel}>Cộng đồng người dùng</p>
        <h2 className={styles.sectionH2} style={{ marginBottom: 32 }}>
          Người dùng nói gì
        </h2>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statNumber}>150,000+</p>
            <p className={styles.statLabel}>
              Sinh viên Việt Nam du học mỗi năm — mỗi người cần 3–6 tài liệu tiếng Anh
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statNumber}>5 phút</p>
            <p className={styles.statLabel}>
              Thời gian trung bình từ lúc bắt đầu đến khi tải xuống tài liệu hoàn chỉnh
            </p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statNumber}>90%</p>
            <p className={styles.statLabel}>
              Sinh viên Việt Nam du học tự túc — không có học bổng chính phủ hỗ trợ
            </p>
          </div>
        </div>

        {/* Testimonials */}
        <div className={styles.testimonialsGrid}>
          <div className={styles.testimonialCard}>
            <p className={styles.testimonialQuote}>
              &ldquo;Tôi đã thử ChatGPT nhưng không biết viết prompt tiếng Anh như thế nào để mô tả hoàn cảnh của mình.
              Giấy Tờ AI hỏi tôi bằng tiếng Việt và tạo ra một personal statement mà tôi không nghĩ mình có thể tự viết được.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div
                className={styles.testimonialAvatar}
                style={{ background: "#E6F1FB", color: "#0C447C" }}
              >
                LT
              </div>
              <div>
                <p className={styles.testimonialName}>Linh Trần</p>
                <p className={styles.testimonialMeta}>Nộp học bổng Australia Awards 2026</p>
              </div>
            </div>
          </div>

          <div className={styles.testimonialCard}>
            <p className={styles.testimonialQuote}>
              &ldquo;Sếp tôi người Trung Quốc yêu cầu báo cáo hàng tuần bằng tiếng Trung. Trước đây mất 2 tiếng mỗi tuần
              dùng Google Dịch. Giờ mất 5 phút và chất lượng tốt hơn nhiều.&rdquo;
            </p>
            <div className={styles.testimonialAuthor}>
              <div
                className={styles.testimonialAvatar}
                style={{ background: "#E1F5EE", color: "#085041" }}
              >
                MN
              </div>
              <div>
                <p className={styles.testimonialName}>Minh Nguyễn</p>
                <p className={styles.testimonialMeta}>Quản lý tại công ty FDI Trung Quốc, Bình Dương</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 8: Final CTA
// ─────────────────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className={styles.finalCtaSection}>
      <div className={styles.finalCtaCard}>
        <h2 className={styles.finalCtaH2}>Bắt đầu miễn phí ngay hôm nay</h2>
        <p className={styles.finalCtaP}>
          2 tài liệu đầu tiên hoàn toàn miễn phí. Không cần thẻ ngân hàng.
        </p>
        <Button variant="primary-dark" arrow href="/sign-up">
          Thử miễn phí ngay
        </Button>
        <p className={styles.finalCtaNote}>
          Thanh toán bằng chuyển khoản ngân hàng Việt Nam · Hỗ trợ tiếng Việt
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 9: Footer
// ─────────────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>

        {/* Logo */}
        <Link href="/" className={styles.footerLogo}>
          <Image
            src="/logo.svg"
            alt="Giấy Tờ AI"
            width={100}
            height={28}
            style={{ height: 24, width: "auto" }}
          />
        </Link>

        {/* Nav links */}
        <nav className={styles.footerLinks} aria-label="Footer navigation">
          <Link href="/privacy" className={styles.footerLink}>Chính sách bảo mật</Link>
          <Link href="/terms" className={styles.footerLink}>Điều khoản sử dụng</Link>
          <Link href="/#how-it-works" className={styles.footerLink}>Hướng dẫn</Link>
          <a href="mailto:support@giaytoai.com" className={styles.footerLink}>Liên hệ</a>
        </nav>

        {/* Copyright */}
        <p className={styles.footerCopy}>© 2026 Giấy Tờ AI</p>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main>

      {/* ── Section 1: Hero ── */}
      <section className={styles.heroSection}>
        <div className={styles.heroInner}>

          {/* Left: copy */}
          <div className={styles.heroLeft}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Dành riêng cho người Việt Nam
            </div>

            <h1 className={styles.heroH1}>
              Tài liệu quốc tế chuyên nghiệp —<br />
              bằng <span className={styles.heroH1Accent}>tiếng Việt</span>
            </h1>

            <p className={styles.heroParagraph}>
              Trả lời phỏng vấn bằng tiếng Việt. Nhận personal statement, cover letter,
              thư visa và tài liệu kinh doanh bằng tiếng Anh, Trung hoặc Hàn — trong 5 phút.
            </p>

            <div className={styles.ctaRow}>
              <Button variant="primary" arrow href="/sign-up">
                Thử miễn phí
              </Button>
              <Button variant="ghost" href="#documents">
                Xem ví dụ
              </Button>
            </div>

            <p className={styles.ctaNote}>
              2 tài liệu đầu tiên miễn phí · Không cần thẻ ngân hàng
            </p>
          </div>

          {/* Right: carousel */}
          <div className={styles.heroRight}>
            <HeroCarousel />
          </div>
        </div>
      </section>

      {/* ── Section 2: Trust Bar ── */}
      <TrustBar />

      {/* ── Section 3: Why Not ChatGPT ── */}
      <WhyNotChatGpt />

      {/* ── Section 4: How It Works ── */}
      <HowItWorks />

      {/* ── Section 5: Documents ── */}
      <DocumentsSection />

      {/* ── Section 6: Social Proof ── */}
      <SocialProof />

      {/* ── Section 7: Pricing ── */}
      <PricingSection />

      {/* ── Section 8: Final CTA ── */}
      <FinalCta />

      {/* ── Section 9: Footer ── */}
      <Footer />

    </main>
  );
}
