export default function TermsPage() {
  return (
    <main style={{ width: "100%", maxWidth: 800, marginLeft: "auto", marginRight: "auto", paddingTop: 48, paddingBottom: 64, paddingLeft: "clamp(20px, 4vw, 48px)", paddingRight: "clamp(20px, 4vw, 48px)" }}>

      {/* ── Vietnamese ── */}
      <section style={{ marginBottom: 64 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1B3A5C", marginBottom: 8 }}>
          Điều Khoản Sử Dụng
        </h1>
        <p style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 12 }}>
          Cập nhật lần cuối: 14 tháng 4, 2026
        </p>
        <p style={warningStyle}>
          ⚠ Tài liệu này cần được luật sư thương mại Việt Nam rà soát trước khi áp dụng chính thức.
        </p>

        <div style={{ fontSize: 15, color: "#444441", lineHeight: 1.8 }}>
          <p>
            Bằng việc sử dụng Giấy Tờ AI (&quot;Dịch vụ&quot;), bạn đồng ý tuân thủ các điều khoản dưới đây.
            Dịch vụ được vận hành bởi RedMapleLotus LLC (&quot;chúng tôi&quot;).
          </p>

          <h2 style={h2Style}>1. Mô tả Dịch vụ</h2>
          <p>
            Giấy Tờ AI là nền tảng sử dụng trí tuệ nhân tạo (AI) để hỗ trợ người dùng soạn thảo
            tài liệu tiếng Anh, tiếng Hàn và tiếng Trung cho mục đích du học, xin việc, di trú
            và kinh doanh quốc tế. Người dùng trả lời phỏng vấn bằng tiếng Việt và nhận tài liệu
            được tạo bởi AI.
          </p>

          <h2 style={h2Style}>2. Tuyên bố miễn trừ về tài liệu AI</h2>
          <div style={importantStyle}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>QUAN TRỌNG — VUI LÒNG ĐỌC KỸ:</p>
            <ul style={ulStyle}>
              <li>
                Tài liệu do Giấy Tờ AI tạo ra là <strong>bản nháp do AI soạn thảo</strong>, không phải
                tài liệu được chứng nhận, công chứng hay xác thực bởi bất kỳ cơ quan nào.
              </li>
              <li>
                Bản dịch tài liệu (hộ khẩu, bảng điểm, giấy khai sinh, v.v.) là <strong>bản dịch nháp
                tham khảo</strong>, <strong>KHÔNG</strong> phải bản dịch công chứng. Bạn phải thuê dịch thuật
                viên có chứng chỉ để dịch thuật chính thức nếu cơ quan tiếp nhận yêu cầu.
              </li>
              <li>
                Chúng tôi <strong>không đảm bảo</strong> rằng tài liệu được tạo sẽ giúp bạn được chấp nhận
                vào trường đại học, nhận học bổng, được cấp visa, hoặc đạt được bất kỳ kết quả cụ thể nào.
              </li>
              <li>
                AI có thể mắc lỗi. Bạn <strong>phải xem xét và chỉnh sửa</strong> mọi tài liệu trước khi nộp.
              </li>
            </ul>
          </div>

          <h2 style={h2Style}>3. Trách nhiệm của người dùng về tính chính xác</h2>
          <ul style={ulStyle}>
            <li>
              Bạn chịu hoàn toàn trách nhiệm về <strong>tính chính xác của thông tin</strong> cung cấp
              trong phỏng vấn, CV tải lên, và mọi dữ liệu đầu vào khác.
            </li>
            <li>
              Bạn cam kết không cung cấp thông tin giả mạo, bịa đặt thành tích, hoặc yêu cầu AI
              tạo ra nội dung gian lận.
            </li>
            <li>
              Bạn phải xem xét kỹ lưỡng mọi tài liệu trước khi nộp cho bất kỳ cơ quan, tổ chức,
              hoặc nhà tuyển dụng nào. Chúng tôi không chịu trách nhiệm cho hậu quả phát sinh từ
              việc nộp tài liệu chưa được xem xét.
            </li>
            <li>
              Tên trường, tên tổ chức, số liệu GPA, ngày tháng, và các thông tin thực tế khác trong
              tài liệu phải được bạn xác nhận là đúng trước khi sử dụng.
            </li>
          </ul>

          <h2 style={h2Style}>4. Tài khoản và Thanh toán</h2>
          <ul style={ulStyle}>
            <li>Bạn được tặng 2 tài liệu miễn phí khi đăng ký. Không cần thẻ ngân hàng.</li>
            <li>Gói lượt (credit pack) là thanh toán một lần, không hoàn tiền sau khi mua.</li>
            <li>Gói Unlimited là đăng ký hàng tháng, có thể hủy bất kỳ lúc nào. Sau khi hủy,
              bạn vẫn có quyền sử dụng đến hết chu kỳ thanh toán.</li>
            <li>Nếu tạo tài liệu thất bại do lỗi hệ thống, lượt sử dụng sẽ được hoàn trả tự động.</li>
          </ul>

          <h2 style={h2Style}>5. Sở hữu trí tuệ</h2>
          <ul style={ulStyle}>
            <li>
              Nội dung bạn cung cấp (câu trả lời, CV, thông tin cá nhân) vẫn thuộc quyền sở hữu của bạn.
            </li>
            <li>
              Tài liệu do AI tạo ra được cấp phép cho bạn sử dụng không giới hạn cho mục đích cá nhân
              (nộp hồ sơ, xin việc, v.v.).
            </li>
            <li>
              Chúng tôi có quyền sử dụng dữ liệu ẩn danh và tổng hợp để cải thiện chất lượng dịch vụ
              (cải thiện prompt, đào tạo mô hình đánh giá chất lượng).
            </li>
          </ul>

          <h2 style={h2Style}>6. Sử dụng bị cấm</h2>
          <ul style={ulStyle}>
            <li>Tạo tài liệu giả mạo hoặc gian lận</li>
            <li>Mạo danh người khác</li>
            <li>Sử dụng dịch vụ để vi phạm pháp luật Việt Nam hoặc luật pháp quốc tế</li>
            <li>Bán lại hoặc phân phối lại dịch vụ mà không có sự đồng ý bằng văn bản</li>
            <li>Cố ý khai thác lỗ hổng hệ thống hoặc vượt qua giới hạn sử dụng</li>
          </ul>

          <h2 style={h2Style}>7. Giới hạn trách nhiệm</h2>
          <p>
            Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại
            gián tiếp, đặc biệt, hoặc mang tính hậu quả nào phát sinh từ việc sử dụng dịch vụ,
            bao gồm nhưng không giới hạn: hồ sơ bị từ chối, visa bị từ chối, mất cơ hội học bổng,
            hoặc bất kỳ tổn thất tài chính nào khác.
          </p>
          <p>
            Tổng trách nhiệm tối đa của chúng tôi trong mọi trường hợp được giới hạn ở số tiền
            bạn đã thanh toán cho dịch vụ trong 12 tháng trước đó.
          </p>

          <h2 style={h2Style}>8. Luật áp dụng và Giải quyết tranh chấp</h2>
          <p>
            Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp phát sinh từ
            hoặc liên quan đến điều khoản này sẽ được giải quyết trước tiên thông qua thương lượng
            thiện chí. Nếu không đạt được thỏa thuận trong 30 ngày, tranh chấp sẽ được đưa ra
            Trung tâm Trọng tài Quốc tế Việt Nam (VIAC) tại TP. Hồ Chí Minh.
          </p>

          <h2 style={h2Style}>9. Thay đổi Điều khoản</h2>
          <p>
            Chúng tôi có quyền cập nhật điều khoản này. Thay đổi quan trọng sẽ được thông báo
            qua email hoặc thông báo trong ứng dụng ít nhất 14 ngày trước khi có hiệu lực.
            Việc tiếp tục sử dụng dịch vụ sau khi thay đổi có hiệu lực đồng nghĩa với việc
            bạn chấp nhận điều khoản mới.
          </p>

          <h2 style={h2Style}>10. Liên hệ</h2>
          <p>
            <strong>Email:</strong> <a href="mailto:legal@giaytoai.com" style={linkStyle}>legal@giaytoai.com</a><br />
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
          Terms of Service
        </h1>
        <p style={{ fontSize: 13, color: "#5F5E5A", marginBottom: 12 }}>
          Last updated: April 14, 2026
        </p>
        <p style={warningStyle}>
          ⚠ This document should be reviewed by a qualified Vietnamese commercial lawyer before formal adoption.
        </p>

        <div style={{ fontSize: 15, color: "#444441", lineHeight: 1.8 }}>
          <p>
            By using Giấy Tờ AI (&quot;the Service&quot;), you agree to the following terms.
            The Service is operated by RedMapleLotus LLC (&quot;we&quot;, &quot;us&quot;).
          </p>

          <h2 style={h2Style}>1. Service Description</h2>
          <p>
            Giấy Tờ AI is an AI-powered platform that helps users draft English, Korean, and
            Chinese documents for study abroad, job applications, immigration, and international
            business purposes. Users answer an interview in Vietnamese and receive AI-generated documents.
          </p>

          <h2 style={h2Style}>2. AI Document Disclaimer</h2>
          <div style={importantStyle}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>IMPORTANT — PLEASE READ CAREFULLY:</p>
            <ul style={ulStyle}>
              <li>
                Documents generated by Giấy Tờ AI are <strong>AI-drafted drafts</strong>, not certified,
                notarised, or authenticated documents by any authority.
              </li>
              <li>
                Document translations (household registration, transcripts, birth certificates, etc.)
                are <strong>reference drafts only</strong> and are <strong>NOT</strong> certified translations.
                You must engage a certified translator for official translations where required by
                the receiving institution.
              </li>
              <li>
                We <strong>do not guarantee</strong> that any generated document will result in university
                admission, scholarship award, visa approval, or any other specific outcome.
              </li>
              <li>
                AI can make errors. You <strong>must review and edit</strong> all documents before submission.
              </li>
            </ul>
          </div>

          <h2 style={h2Style}>3. User Responsibility for Accuracy</h2>
          <ul style={ulStyle}>
            <li>
              You are solely responsible for the <strong>accuracy of all information</strong> provided
              in interviews, uploaded CVs, and all other input data.
            </li>
            <li>
              You agree not to provide fabricated information, invent achievements, or request
              the AI to generate fraudulent content.
            </li>
            <li>
              You must carefully review all documents before submitting them to any institution,
              organisation, or employer. We are not liable for consequences arising from submitting
              unreviewed documents.
            </li>
            <li>
              Institution names, organisation names, GPA figures, dates, and other factual claims
              in documents must be confirmed by you as accurate before use.
            </li>
          </ul>

          <h2 style={h2Style}>4. Account and Payment</h2>
          <ul style={ulStyle}>
            <li>You receive 2 free documents upon registration. No credit card required.</li>
            <li>Credit packs are one-time purchases and are non-refundable once purchased.</li>
            <li>The Unlimited plan is a monthly subscription that can be cancelled at any time.
              After cancellation, you retain access until the end of the billing cycle.</li>
            <li>If document generation fails due to a system error, your credit is automatically refunded.</li>
          </ul>

          <h2 style={h2Style}>5. Intellectual Property</h2>
          <ul style={ulStyle}>
            <li>
              Content you provide (interview answers, CVs, personal information) remains your property.
            </li>
            <li>
              AI-generated documents are licensed to you for unlimited personal use
              (applications, job seeking, etc.).
            </li>
            <li>
              We reserve the right to use anonymised and aggregated data to improve service quality
              (prompt improvement, quality model training).
            </li>
          </ul>

          <h2 style={h2Style}>6. Prohibited Use</h2>
          <ul style={ulStyle}>
            <li>Creating forged or fraudulent documents</li>
            <li>Impersonating another person</li>
            <li>Using the service to violate Vietnamese law or international law</li>
            <li>Reselling or redistributing the service without written consent</li>
            <li>Intentionally exploiting system vulnerabilities or bypassing usage limits</li>
          </ul>

          <h2 style={h2Style}>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, we are not liable for any indirect, special,
            or consequential damages arising from use of the service, including but not limited to:
            rejected applications, denied visas, lost scholarship opportunities, or any other
            financial loss.
          </p>
          <p>
            Our maximum aggregate liability in all circumstances is limited to the amount you
            paid for the service in the preceding 12 months.
          </p>

          <h2 style={h2Style}>8. Governing Law and Dispute Resolution</h2>
          <p>
            These terms are governed by the laws of Vietnam. Any disputes arising from or relating
            to these terms shall first be resolved through good-faith negotiation. If no agreement
            is reached within 30 days, the dispute shall be submitted to the Vietnam International
            Arbitration Centre (VIAC) in Ho Chi Minh City.
          </p>

          <h2 style={h2Style}>9. Changes to Terms</h2>
          <p>
            We may update these terms. Material changes will be notified via email or in-app
            notification at least 14 days before taking effect. Continued use of the service
            after changes take effect constitutes acceptance of the new terms.
          </p>

          <h2 style={h2Style}>10. Contact</h2>
          <p>
            <strong>Email:</strong> <a href="mailto:legal@giaytoai.com" style={linkStyle}>legal@giaytoai.com</a><br />
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

const importantStyle: React.CSSProperties = {
  padding: "16px 20px",
  borderRadius: 10,
  background: "#FEF8EE",
  border: "1px solid #FAC775",
  marginBottom: 16,
};

const warningStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  background: "#FEF2F2",
  border: "1px solid #F0B8B8",
  fontSize: 13,
  color: "#B91C1C",
  marginBottom: 32,
};
