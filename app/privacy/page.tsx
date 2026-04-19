export default function PrivacyPage() {
  return (
    <main style={{ width: "100%", maxWidth: 800, marginLeft: "auto", marginRight: "auto", paddingTop: 48, paddingBottom: 64, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>

      {/* ── Vietnamese ── */}
      <section style={{ marginBottom: 64 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1B3A5C", marginBottom: 8 }}>
          Chính Sách Bảo Mật
        </h1>
        <p style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 32 }}>
          Cập nhật lần cuối: 14 tháng 4, 2026
        </p>

        <div style={{ fontSize: 15, color: "#444441", lineHeight: 1.8 }}>
          <p>
            Giấy Tờ AI (&quot;chúng tôi&quot;) được vận hành bởi RedMapleLotus LLC (Hoa Kỳ)
            và Howard Hurst, Chủ doanh nghiệp cá nhân (Hoa Kỳ). Chính sách này giải thích cách
            chúng tôi thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn.
          </p>

          <h2 style={h2Style}>1. Dữ liệu chúng tôi thu thập</h2>
          <ul style={ulStyle}>
            <li><strong>Thông tin tài khoản:</strong> tên, email, ảnh đại diện (qua Google/Facebook khi đăng nhập)</li>
            <li><strong>Thông tin hồ sơ:</strong> câu trả lời phỏng vấn, CV tải lên, thông tin học vấn và nghề nghiệp bạn cung cấp</li>
            <li><strong>Tài liệu tạo ra:</strong> bản nháp, bản xuất, bản dịch, phản hồi chất lượng</li>
            <li><strong>Dữ liệu thanh toán:</strong> loại gói mua, mã đơn hàng, trạng thái thanh toán (thông tin thẻ được xử lý trực tiếp bởi Stripe/PayOS — chúng tôi không lưu trữ)</li>
            <li><strong>Dữ liệu kỹ thuật:</strong> địa chỉ IP, loại trình duyệt, hành vi sử dụng (qua PostHog), báo cáo lỗi (qua Sentry)</li>
          </ul>

          <h2 style={h2Style}>2. Mục đích sử dụng dữ liệu</h2>
          <ul style={ulStyle}>
            <li>Tạo tài liệu theo yêu cầu của bạn</li>
            <li>Cải thiện chất lượng prompt và tài liệu dựa trên phản hồi</li>
            <li>Xử lý thanh toán và quản lý tài khoản</li>
            <li>Gửi email phản hồi kết quả hồ sơ (56 ngày sau khi xuất tài liệu)</li>
            <li>Phát hiện và ngăn chặn gian lận (kiểm tra an toàn nội dung)</li>
            <li>Phân tích sản phẩm và cải thiện trải nghiệm người dùng</li>
          </ul>

          <h2 style={h2Style}>3. Bên thứ ba xử lý dữ liệu</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nhà cung cấp</th>
                <th style={thStyle}>Dữ liệu xử lý</th>
                <th style={thStyle}>Vị trí</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>Anthropic (Claude AI)</td><td style={tdStyle}>Câu trả lời phỏng vấn, nội dung CV</td><td style={tdStyle}>Hoa Kỳ</td></tr>
              <tr><td style={tdStyle}>Supabase</td><td style={tdStyle}>Toàn bộ cơ sở dữ liệu ứng dụng</td><td style={tdStyle}>Singapore</td></tr>
              <tr><td style={tdStyle}>Clerk</td><td style={tdStyle}>Xác thực, thông tin đăng nhập</td><td style={tdStyle}>Hoa Kỳ</td></tr>
              <tr><td style={tdStyle}>Stripe</td><td style={tdStyle}>Thanh toán thẻ quốc tế (USD)</td><td style={tdStyle}>Hoa Kỳ</td></tr>
              <tr><td style={tdStyle}>PayOS (VPBank)</td><td style={tdStyle}>Thanh toán QR ngân hàng (VND)</td><td style={tdStyle}>Việt Nam</td></tr>
              <tr><td style={tdStyle}>Cloudflare R2</td><td style={tdStyle}>Lưu trữ file xuất (Word, PDF)</td><td style={tdStyle}>Tự động (gần nhất)</td></tr>
              <tr><td style={tdStyle}>Vercel</td><td style={tdStyle}>Hosting ứng dụng web</td><td style={tdStyle}>Singapore</td></tr>
              <tr><td style={tdStyle}>PostHog</td><td style={tdStyle}>Phân tích hành vi người dùng</td><td style={tdStyle}>EU / Hoa Kỳ</td></tr>
              <tr><td style={tdStyle}>Sentry</td><td style={tdStyle}>Theo dõi lỗi kỹ thuật</td><td style={tdStyle}>Hoa Kỳ</td></tr>
              <tr><td style={tdStyle}>Resend</td><td style={tdStyle}>Gửi email</td><td style={tdStyle}>Hoa Kỳ</td></tr>
            </tbody>
          </table>

          <h2 style={h2Style}>4. Chuyển dữ liệu xuyên biên giới</h2>
          <p>
            Dữ liệu của bạn được xử lý tại <strong>Singapore</strong> (cơ sở dữ liệu, hosting) và
            <strong> Hoa Kỳ</strong> (AI, xác thực, thanh toán quốc tế). Chúng tôi đảm bảo các nhà cung cấp
            tuân thủ tiêu chuẩn bảo mật quốc tế và chỉ xử lý dữ liệu theo hướng dẫn của chúng tôi.
          </p>
          <p>
            Thanh toán VND qua PayOS được xử lý hoàn toàn tại Việt Nam.
          </p>

          <h2 style={h2Style}>5. Thời gian lưu trữ dữ liệu</h2>
          <ul style={ulStyle}>
            <li>Tài liệu và bản nháp: lưu trữ trong suốt thời gian tài khoản hoạt động</li>
            <li>File xuất trên R2: tự động xóa sau 7 ngày</li>
            <li>Sự kiện Stripe: tự động xóa sau 30 ngày</li>
            <li>Phiên bỏ dở (không có bản nháp): đánh dấu thất bại sau 7 ngày</li>
          </ul>

          <h2 style={h2Style}>6. Quyền của bạn</h2>
          <p>Bạn có quyền:</p>
          <ul style={ulStyle}>
            <li><strong>Truy cập:</strong> yêu cầu bản sao dữ liệu cá nhân của bạn</li>
            <li><strong>Chỉnh sửa:</strong> yêu cầu sửa thông tin không chính xác</li>
            <li><strong>Xóa:</strong> yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan</li>
            <li><strong>Phản đối:</strong> từ chối xử lý dữ liệu cho mục đích tiếp thị</li>
            <li><strong>Xuất dữ liệu:</strong> yêu cầu dữ liệu của bạn ở định dạng có thể đọc được</li>
          </ul>
          <p>
            Để thực hiện các quyền trên, liên hệ chúng tôi qua email bên dưới.
          </p>

          <h2 style={h2Style}>7. Bảo mật</h2>
          <p>
            Chúng tôi sử dụng mã hóa HTTPS cho toàn bộ kết nối, xác thực qua Clerk với OAuth 2.0,
            và Row Level Security (RLS) trên cơ sở dữ liệu để đảm bảo mỗi người dùng chỉ truy cập
            được dữ liệu của mình.
          </p>

          <h2 style={h2Style}>8. Liên hệ</h2>
          <p>
            Nếu bạn có câu hỏi về chính sách bảo mật hoặc muốn thực hiện quyền của mình:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:privacy@giaytoai.com" style={linkStyle}>privacy@giaytoai.com</a><br />
            <strong>Công ty:</strong> RedMapleLotus LLC<br />
            <strong>Địa chỉ:</strong> TP. Hồ Chí Minh, Việt Nam
          </p>
        </div>
      </section>

      {/* ── Divider ── */}
      <hr style={{ border: "none", borderTop: "2px solid #E8E8E4", marginBottom: 64 }} />

      {/* ── English ── */}
      <section>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1B3A5C", marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 32 }}>
          Last updated: April 14, 2026
        </p>

        <div style={{ fontSize: 15, color: "#444441", lineHeight: 1.8 }}>
          <p>
            Giấy Tờ AI (&quot;we&quot;, &quot;us&quot;) is operated by RedMapleLotus LLC (United States)
            and Howard Hurst, Sole Proprietor (United States). This policy explains how we collect,
            use, and protect your personal data.
          </p>

          <h2 style={h2Style}>1. Data We Collect</h2>
          <ul style={ulStyle}>
            <li><strong>Account information:</strong> name, email, profile picture (via Google/Facebook sign-in)</li>
            <li><strong>Application data:</strong> interview answers, uploaded CVs, educational and professional information you provide</li>
            <li><strong>Generated documents:</strong> drafts, exports, translations, quality feedback</li>
            <li><strong>Payment data:</strong> pack type, order codes, payment status (card details are processed directly by Stripe/PayOS — we never store them)</li>
            <li><strong>Technical data:</strong> IP address, browser type, usage analytics (via PostHog), error reports (via Sentry)</li>
          </ul>

          <h2 style={h2Style}>2. Why We Process Your Data</h2>
          <ul style={ulStyle}>
            <li>Generate documents as requested by you</li>
            <li>Improve prompt and document quality based on feedback</li>
            <li>Process payments and manage your account</li>
            <li>Send outcome feedback emails (56 days after document export)</li>
            <li>Detect and prevent fraud (content safety checks)</li>
            <li>Product analytics and user experience improvement</li>
          </ul>

          <h2 style={h2Style}>3. Third-Party Data Processors</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>Data Processed</th>
                <th style={thStyle}>Location</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={tdStyle}>Anthropic (Claude AI)</td><td style={tdStyle}>Interview answers, CV content</td><td style={tdStyle}>United States</td></tr>
              <tr><td style={tdStyle}>Supabase</td><td style={tdStyle}>Full application database</td><td style={tdStyle}>Singapore</td></tr>
              <tr><td style={tdStyle}>Clerk</td><td style={tdStyle}>Authentication, login information</td><td style={tdStyle}>United States</td></tr>
              <tr><td style={tdStyle}>Stripe</td><td style={tdStyle}>International card payments (USD)</td><td style={tdStyle}>United States</td></tr>
              <tr><td style={tdStyle}>PayOS (VPBank)</td><td style={tdStyle}>QR bank transfers (VND)</td><td style={tdStyle}>Vietnam</td></tr>
              <tr><td style={tdStyle}>Cloudflare R2</td><td style={tdStyle}>Exported file storage (Word, PDF)</td><td style={tdStyle}>Automatic (nearest)</td></tr>
              <tr><td style={tdStyle}>Vercel</td><td style={tdStyle}>Web application hosting</td><td style={tdStyle}>Singapore</td></tr>
              <tr><td style={tdStyle}>PostHog</td><td style={tdStyle}>User behaviour analytics</td><td style={tdStyle}>EU / United States</td></tr>
              <tr><td style={tdStyle}>Sentry</td><td style={tdStyle}>Technical error tracking</td><td style={tdStyle}>United States</td></tr>
              <tr><td style={tdStyle}>Resend</td><td style={tdStyle}>Email delivery</td><td style={tdStyle}>United States</td></tr>
            </tbody>
          </table>

          <h2 style={h2Style}>4. Cross-Border Data Transfers</h2>
          <p>
            Your data is processed in <strong>Singapore</strong> (database, hosting) and the
            <strong> United States</strong> (AI, authentication, international payments). We ensure
            all providers comply with international security standards and process data only
            under our instructions.
          </p>
          <p>
            VND payments via PayOS are processed entirely within Vietnam.
          </p>

          <h2 style={h2Style}>5. Data Retention</h2>
          <ul style={ulStyle}>
            <li>Documents and drafts: retained for the lifetime of your account</li>
            <li>Exported files on R2: automatically deleted after 7 days</li>
            <li>Stripe events: automatically purged after 30 days</li>
            <li>Abandoned sessions (no drafts): marked as failed after 7 days</li>
          </ul>

          <h2 style={h2Style}>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul style={ulStyle}>
            <li><strong>Access:</strong> request a copy of your personal data</li>
            <li><strong>Rectification:</strong> request correction of inaccurate information</li>
            <li><strong>Erasure:</strong> request deletion of your account and all associated data</li>
            <li><strong>Objection:</strong> object to data processing for marketing purposes</li>
            <li><strong>Portability:</strong> request your data in a machine-readable format</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at the email below.
          </p>

          <h2 style={h2Style}>7. Security</h2>
          <p>
            We use HTTPS encryption for all connections, Clerk OAuth 2.0 authentication,
            and Row Level Security (RLS) on our database to ensure each user can only
            access their own data.
          </p>

          <h2 style={h2Style}>8. Contact</h2>
          <p>
            If you have questions about this privacy policy or wish to exercise your rights:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:privacy@giaytoai.com" style={linkStyle}>privacy@giaytoai.com</a><br />
            <strong>Company:</strong> RedMapleLotus LLC<br />
            <strong>Address:</strong> Ho Chi Minh City, Vietnam
          </p>
        </div>
      </section>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const h2Style: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#1B3A5C",
  marginTop: 32,
  marginBottom: 12,
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 20,
  marginBottom: 16,
};

const linkStyle: React.CSSProperties = {
  color: "#185FA5",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #E8E8E4",
  borderRadius: 8,
  marginBottom: 16,
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "2px solid #E8E8E4",
  textAlign: "left",
  fontWeight: 600,
  color: "#1B3A5C",
  background: "#F7F7F5",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #E8E8E4",
  color: "#444441",
};
