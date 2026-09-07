// src/services/ocr_service.ts
import { readAsStringAsync } from 'expo-file-system/legacy';

const OCR_SPACE_KEY = "K81446698188957"; 
export const getRawTextFromOCR = async (uri: string) => {
  try {
    const base64Image = await readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const formData = new FormData();
    formData.append("base64Image", `data:image/jpeg;base64,${base64Image}`);
    
    formData.append("OCREngine", "2"); 
    
    formData.append("isTable", "true");
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { "apikey": OCR_SPACE_KEY },
      body: formData,
    });

    const data = await response.json();

    if (data.OCRExitCode === 1) {
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