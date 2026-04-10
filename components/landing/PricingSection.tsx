"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/app/LandingPage.module.css";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const PACKS = [
  { name: "Khởi đầu",       price: "49.000₫",  credits: "5 lượt",      featured: false },
  { name: "Tiêu chuẩn",     price: "99.000₫",  credits: "15 lượt",     featured: true  },
  { name: "Chuyên nghiệp",  price: "199.000₫", credits: "40 lượt",     featured: false },
  { name: "Không giới hạn", price: "299.000₫", credits: "mỗi tháng",   featured: false },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PricingSection() {
  const router = useRouter();

  return (
    <section className={styles.pricingSection}>
      <div className={styles.pricingInner}>
        <p className={styles.sectionLabel}>Bảng giá</p>
        <h2 className={styles.sectionH2}>Giá phù hợp với người Việt Nam</h2>
        <p className={styles.pricingSubtitle}>
          Mỗi lượt = 1 tài liệu hoàn chỉnh. Không cần đăng ký hàng tháng.
        </p>

        <div className={styles.packsGrid}>
          {PACKS.map((pack) => (
            <div
              key={pack.name}
              className={`${styles.packCard}${pack.featured ? ` ${styles.packCardFeatured}` : ""}`}
            >
              {pack.featured && (
                <span className={styles.packBadge}>Phổ biến nhất</span>
              )}
              <p className={styles.packName}>{pack.name}</p>
              <p className={styles.packPrice}>{pack.price}</p>
              <p className={styles.packCredits}>{pack.credits}</p>
              <button
                type="button"
                onClick={() => router.push("/sign-up")}
                className={`${styles.packBtn}${pack.featured ? ` ${styles.packBtnFeatured}` : ""}`}
              >
                Mua ngay
              </button>
            </div>
          ))}
        </div>

        <p className={styles.pricingNote}>
          Thanh toán bằng thẻ quốc tế?{" "}
          <Link href="/pricing" className={styles.pricingNoteLink}>
            Xem giá USD →
          </Link>
        </p>
      </div>
    </section>
  );
}
