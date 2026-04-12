"use client";

import { useState } from "react";
import styles from "@/app/LandingPage.module.css";
import { Button } from "@/components/ui/Button";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Lang = "en" | "zh" | "ko";
type DocType = "blue" | "teal" | "amber";

interface Doc { name: string; desc: string; dest: string; type: DocType; }

const TYPE_COLORS: Record<DocType, { bg: string; stroke: string }> = {
  blue:  { bg: "#E6F1FB", stroke: "#185FA5" },
  teal:  { bg: "#E1F5EE", stroke: "#0F6E56" },
  amber: { bg: "#FAEEDA", stroke: "#854F0B" },
};

const DOCS: Record<Lang, Doc[]> = {
  en: [
    { name: "Personal Statement", desc: "Bài luận cá nhân", dest: "AU · US · UK · CA", type: "blue" },
    { name: "Cover Letter", desc: "Thư xin việc", dest: "AU · US · UK · SG", type: "blue" },
    { name: "Scholarship Essay", desc: "Bài luận học bổng", dest: "AU · US · JP · DE", type: "teal" },
    { name: "Motivation Letter", desc: "Thư động lực", dest: "DE · NL · FR · BE", type: "teal" },
    { name: "Bản dịch giấy tờ", desc: "Hộ khẩu, bằng cấp, sổ hộ khẩu", dest: "", type: "amber" },
    { name: "Reference Letter", desc: "Thư giới thiệu", dest: "Mọi điểm đến", type: "amber" },
  ],
  zh: [
    { name: "邀请函", desc: "Thư mời visa", dest: "Visa Trung Quốc", type: "blue" },
    { name: "在职证明", desc: "Xác nhận việc làm", dest: "", type: "blue" },
    { name: "商业合作函", desc: "Thư hợp tác kinh doanh", dest: "B2B", type: "teal" },
    { name: "中文简历", desc: "CV tiếng Trung", dest: "Xin việc", type: "teal" },
    { name: "资金证明", desc: "Chứng minh tài chính", dest: "", type: "amber" },
    { name: "工作汇报", desc: "Báo cáo công việc", dest: "", type: "amber" },
  ],
  ko: [
    { name: "자기소개서", desc: "Thư xin việc Hàn Quốc", dest: "Samsung · LG · Hyundai · Lotte", type: "blue" },
    { name: "이력서", desc: "CV Hàn Quốc", dest: "", type: "blue" },
    { name: "비즈니스 서신", desc: "Thư kinh doanh", dest: "", type: "teal" },
    { name: "구직 커버레터", desc: "Cover letter tìm việc", dest: "", type: "teal" },
  ],
};

const TABS: { key: Lang; label: string }[] = [
  { key: "en", label: "Tiếng Anh" },
  { key: "zh", label: "Tiếng Trung" },
  { key: "ko", label: "Tiếng Hàn" },
];

// ---------------------------------------------------------------------------
// Doc icon
// ---------------------------------------------------------------------------

function DocIcon({ type }: { type: DocType }) {
  const { bg, stroke } = TYPE_COLORS[type];
  return (
    <div className={styles.docIconBox} style={{ background: bg }}>
      <svg width="16" height="19" viewBox="0 0 16 19" fill="none" aria-hidden="true">
        <rect x="2" y="1" width="11" height="17" rx="1.5" stroke={stroke} strokeWidth="1.4" />
        <line x1="5" y1="6.5" x2="11" y2="6.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5" y1="9.5" x2="9.5" y2="9.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5" y1="12.5" x2="10.5" y2="12.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentsSection() {
  const [active, setActive] = useState<Lang>("en");
  const docs = DOCS[active];

  return (
    <section id="documents" className={styles.docsSection}>
      <div className={styles.docsInner}>
        <p className={styles.sectionLabel}>Loại tài liệu</p>
        <h2 className={styles.sectionH2}>Mọi loại tài liệu bạn cần</h2>
        <p className={styles.sectionSubtitle}>Chọn ngôn ngữ đầu ra để xem các loại tài liệu.</p>

        {/* Language tabs */}
        <div className={styles.langTabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`${styles.langTab}${active === tab.key ? ` ${styles.langTabActive}` : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Doc grid */}
        <div className={styles.docsGrid}>
          {docs.map((doc, i) => (
            <div key={`${active}-${i}`} className={styles.docCard}>
              <DocIcon type={doc.type} />
              <div className={styles.docMeta}>
                <p className={styles.docName}>{doc.name}</p>
                <p className={styles.docDesc}>{doc.desc}</p>
                {doc.dest && <p className={styles.docDest}>{doc.dest}</p>}
                <Button variant="primary" size="sm" arrow href="/dashboard/new">
                  Tạo
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
