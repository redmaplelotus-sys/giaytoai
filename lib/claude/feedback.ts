import { anthropic } from "@/lib/anthropic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackInsight {
  id: string;
  type: "strength" | "improve" | "warning" | "culture" | "note";
  title: string;
  body: string;
  quote?: string;
  actionable: boolean;
}

interface RawInsight {
  type: string;
  title: string;
  body: string;
  quote?: string;
  actionable: boolean;
}

function isValidInsight(x: unknown): x is RawInsight {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    ["strength", "improve", "warning", "culture"].includes(o.type as string) &&
    typeof o.title === "string" &&
    o.title.trim().length > 0 &&
    typeof o.body === "string" &&
    o.body.trim().length > 0 &&
    typeof o.actionable === "boolean"
  );
}

// ---------------------------------------------------------------------------
// generateFeedback()
// ---------------------------------------------------------------------------

export async function generateFeedback(input: {
  documentContent: string;
  docTypeSlug: string;
  destination: string;
  answersVi: Record<string, string>;
  cvData?: object;
}): Promise<FeedbackInsight[]> {
  const { documentContent, docTypeSlug, destination, answersVi } = input;

  const answersBlock = Object.entries(answersVi)
    .filter(([, v]) => v?.trim())
    .slice(0, 12) // cap context length
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const prompt = `Bạn là chuyên gia tư vấn hồ sơ du học với 10 năm kinh nghiệm giúp sinh viên Việt Nam nộp đơn thành công vào các trường đại học và công ty quốc tế. Hãy phân tích tài liệu dưới đây và đưa ra nhận xét cụ thể, hữu ích bằng tiếng Việt.

LOẠI TÀI LIỆU: ${docTypeSlug}
ĐIỂM ĐẾN/MỤC TIÊU: ${destination || "Chưa xác định"}

THÔNG TIN NGƯỜI DÙNG ĐÃ CUNG CẤP:
${answersBlock || "(không có)"}

TÀI LIỆU CẦN PHÂN TÍCH:
${documentContent}

---

Hãy trả về MỘT MẢNG JSON duy nhất với 4–7 nhận xét. Không có văn bản nào trước hoặc sau mảng JSON.

Mỗi phần tử trong mảng có cấu trúc:
{
  "type": "strength" | "improve" | "warning" | "culture",
  "title": "Tiêu đề ngắn gọn tối đa 10 từ",
  "body": "Nhận xét cụ thể 2-3 câu, ấm áp và mang tính xây dựng.",
  "quote": "Câu trích dẫn thực tế từ tài liệu (để trống nếu không cần)",
  "actionable": true hoặc false
}

LOẠI NHẬN XÉT:
- "strength": điểm mạnh thực sự, trích dẫn nội dung cụ thể, không khen chung chung
- "improve": cải thiện cụ thể, PHẢI bao gồm ví dụ viết lại trong body (ví dụ: 'Thay "tôi đam mê..." thành "Trong 3 năm làm..., tôi đã..."')
- "warning": rủi ro thực sự như thiếu thông tin quan trọng, có thể gây hiểu nhầm cho hội đồng tuyển sinh
- "culture": giải thích cụ thể cách AI đã điều chỉnh phong cách văn hóa từ khiêm tốn/tập thể sang tự tin/cá nhân, và tại sao điều đó quan trọng với điểm đến này

QUY TẮC BẮT BUỘC:
- Ít nhất 1 nhận xét type "strength"
- Ít nhất 1 nhận xét type "culture"
- actionable: true chỉ khi có thể áp dụng trực tiếp, cụ thể vào tài liệu
- Tham chiếu nội dung THỰC TẾ của tài liệu, không đưa ra lời khuyên chung chung
- Tông giọng ấm áp như người cố vấn, không phán xét`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

    // Claude may wrap output in ```json fences
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    return (parsed as unknown[]).filter(isValidInsight).map((insight) => ({
      ...insight,
      type: insight.type as FeedbackInsight["type"],
      quote: insight.quote?.trim() || undefined,
      id: crypto.randomUUID(),
    }));
  } catch {
    return [];
  }
}
