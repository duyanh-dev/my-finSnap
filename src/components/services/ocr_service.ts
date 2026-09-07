// src/services/ocr_service.ts
import { readAsStringAsync } from 'expo-file-system/legacy';

const OCR_SPACE_KEY = "K81446698188957"; // Key của ông Anh

export const getRawTextFromOCR = async (uri: string) => {
  try {
    const base64Image = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const formData = new FormData();
    formData.append("base64Image", `data:image/jpeg;base64,${base64Image}`);
    
    // 💡 GIẢI PHÁP ĐÂY: 
    // Engine 2 tự nhận diện nên KHÔNG cần dòng 'language'
    // Nếu ông để 'vie' nó sẽ báo lỗi E201 ngay.
    formData.append("OCREngine", "2"); 
    
    formData.append("isTable", "true"); // Giúp giữ định dạng cột để dễ lọc tiền

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "apikey": OCR_SPACE_KEY },
      body: formData,
    });

    const data = await response.json();

    if (data.OCRExitCode === 1) {
      // Trả về text đã được Engine 2 tự động nhận diện tiếng Việt
      return data.ParsedResults?.[0]?.ParsedText || "";
    } else {
      console.error("OCR Error:", data.ErrorMessage);
      return "";
    }
  } catch (error) {
    console.error("Network Error:", error);
    return "";
  }
};