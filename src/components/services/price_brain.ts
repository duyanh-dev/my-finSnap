// src/services/price_brain.ts

const MERCHANTS = [
  { name: "Phúc Long", keywords: ["phuc long", "phúc long"], tag: "Ăn uống" },
  { name: "Highlands Coffee", keywords: ["highlands"], tag: "Ăn uống" },
  { name: "WinMart", keywords: ["winmart", "masan"], tag: "Siêu thị" },
  { name: "Grab", keywords: ["grab", "moca"], tag: "Di chuyển" },
  { name: "7-Eleven", keywords: ["7-eleven", "7 eleven"], tag: "Cửa hàng" },
  { name: "GO!", keywords: ["go!", "big c"], tag: "Siêu thị" },
  { name: "Co.op Mart", keywords: ["co.op", "saigon co.op"], tag: "Siêu thị" }
];

export const deepAnalyzeReceipt = (rawText: string) => {
  const lines = rawText.toLowerCase().split("\n").map(l => l.trim()).filter(l => l !== "");
  
  // Regex cho các loại Metadata
  const dateRegex = /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g;
  const phoneRegex = /\b(0|\+84)\s?(\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{3,4})\b/g;
  const taxRegex = /\b\d{10}(?:-\d{3})?\b/g; // Định dạng MST Việt Nam (10 hoặc 13 số)

  // Regex tiền tệ (Giữ nguyên logic đúng)
  const priceRegex = /\b\d{1,3}(?:[.,\s]\s?\d{3})+(?!\d)\b|\b\d{4,10}\b/g;
  
  const goldKeywords = ["tổng cộng", "thành tiền", "total", "tổng tiền", "thanh toán", "cần trả", "phải trả", "grand total", "vietqr", "vnpay"];
  const silverKeywords = ["tiền mặt", "cash", "tien mat", "đã nhận", "khách đưa"];
  const trashKeywords = ["thối lại", "trả lại", "tiền thừa", "change", "bal", "tiền thối", "vouchers", "giảm giá", "discount"];
  const noiseKeywords = ["đt", "tel", "phone", "stk", "mã", "id", "ngày", "giờ", "qty", "số lượng", "x", "đơn giá", "mst", "tax"];

  let metadata = {
    date: "Không tìm thấy",
    phone: "Không tìm thấy",
    tax: "Không tìm thấy"
  };

  let merchant = "Cửa hàng lạ";
  let autoTag = "Chưa phân loại";
  let candidates: { val: number; score: number; reason: string; index: number; isConcise: boolean }[] = [];
  let itemPrices: number[] = []; 
  let maxValOverall = 0;

  // 1. QUÉT METADATA (Ngày, SDT, MST)
  const allDates = rawText.match(dateRegex);
  if (allDates) metadata.date = allDates[0];

  const allPhones = rawText.match(phoneRegex);
  if (allPhones) metadata.phone = allPhones[0];

  const allTax = rawText.match(taxRegex);
  if (allTax) metadata.tax = allTax[0];

  // 2. NHẬN DIỆN CỬA HÀNG
  for (const m of MERCHANTS) {
    if (rawText.toLowerCase().includes(m.keywords[0])) {
      merchant = m.name;
      autoTag = m.tag;
      break;
    }
  }

  // 3. VÒNG LẶP PHÂN TÍCH CHI TIẾT
  lines.forEach((line, index) => {
    const matches = line.match(priceRegex);
    if (!matches) return;

    matches.forEach((m) => {
      const cleanVal = parseInt(m.replace(/[.,\s]/g, ""));
      if (cleanVal < 1000 || cleanVal > 50000000) return;

      // LOẠI TRỪ TRỰC TIẾP: Nếu số này trùng khớp với SDT hoặc MST vừa tìm được
      if (metadata.phone.includes(m) || metadata.tax.includes(m)) return;

      if (cleanVal > maxValOverall) maxValOverall = cleanVal;

      let score = 0;
      let reasons = [];

      // A. LOGIC JACKPOT (Cùng dòng)
      const matchIndex = line.indexOf(m);
      const textBefore = line.substring(0, matchIndex);
      let isJackpot = false;
      goldKeywords.forEach(k => {
          if (textBefore.includes(k)) {
              score += 200;
              isJackpot = true;
              reasons.push(`JACKPOT: Sau từ khóa "${k.toUpperCase()}" (+200)`);
          }
      });

      // B. NGỮ CẢNH RỘNG (3 dòng)
      const prevLine = lines[index - 1] || "";
      const prevPrevLine = lines[index - 2] || "";
      const context = prevPrevLine + " " + prevLine + " " + line;

      if (!isJackpot && goldKeywords.some(k => context.includes(k))) {
          score += 120;
          reasons.push("Gần từ khóa Tổng cộng (+120)");
      }

      if (silverKeywords.some(k => context.includes(k))) {
        score += 40;
        reasons.push("Gần từ khóa thanh toán (+40)");
      }

      // C. HÌNH PHẠT (Né rác cực mạnh)
      if (trashKeywords.some(k => context.includes(k))) {
        score -= 250;
        reasons.push("Nghi là tiền thối/giảm giá (-250)");
      }
      
      // Nếu dòng chứa Ngày, SDT hoặc Mã số thuế -> Trừ điểm nặng nếu lỡ quét trúng
      if (dateRegex.test(line) || phoneRegex.test(line) || taxRegex.test(line)) {
        score -= 300;
        reasons.push("Dòng chứa thông tin Metadata (Ngày/SDT/MST) (-300)");
      }

      if ((line.includes("x") || line.includes("qty") || noiseKeywords.some(k => line.includes(k))) 
          && !goldKeywords.some(k => line.includes(k))) {
        score -= 100;
        reasons.push("Dính từ rác/đơn giá (-100)");
      }

      // D. VỊ TRÍ & ĐỊNH DẠNG
      const posRatio = index / lines.length;
      if (line.length < 30 && goldKeywords.some(k => context.includes(k))) {
        score += 50;
        reasons.push("Dòng ngắn/Font to (+50)");
      }
      if (posRatio > 0.6 && posRatio < 0.98) {
        score += 30;
        reasons.push("Vị trí cuối bill (+30)");
      }

      // E. TRÍCH XUẤT MÓN LẺ
      if ((line.includes("x") || line.includes("*") || line.includes("qty")) && posRatio < 0.8) {
          itemPrices.push(cleanVal);
      }

      candidates.push({ val: cleanVal, score, reason: reasons.join(", "), index, isConcise: line.length < 30 });
    });
  });

  // 4. ĐỐI CHIẾU TOÁN HỌC (Cross-check)
  const sumOfItems = itemPrices.reduce((a, b) => a + b, 0);

  candidates = candidates.map(c => {
    let extra = 0;
    if (sumOfItems > 5000 && c.val === sumOfItems) {
      extra += 300;
      c.reason += `, KHỚP TOÁN HỌC (+300)`;
    }
    if (c.val === maxValOverall && (c.index / lines.length) > 0.6) {
      extra += 50;
      c.reason += ", Giá trị lớn nhất bill (+50)";
    }
    return { ...c, score: c.score + extra };
  });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.val - b.val;
  });

  return {
    finalAmount: candidates.length > 0 ? candidates[0].val : 0,
    merchant,
    autoTag,
    metadata, 
    calculatedSum: sumOfItems,
    allCandidates: candidates,
    rawText: rawText 
  };
};