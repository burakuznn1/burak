
import { GoogleGenAI } from "@google/genai";
import { ClientReport } from "../types.ts";

export const generateReportSummary = async (report: ClientReport): Promise<string> => {
  // Safe environment variable access
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  
  if (!apiKey) {
    console.error("API Key is missing. Check your environment settings.");
    return "Yapay zeka analiz servisi şu an yapılandırılamadı. Lütfen teknik ekiple iletişime geçiniz.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const statsJson = JSON.stringify(report.property.stats);
  const marketJson = JSON.stringify(report.property.market);
  const priceHistoryJson = JSON.stringify(report.property.priceHistory);
  
  const prompt = `
    Sen Türkwest Gayrimenkul'ün profesyonel yatırım danışmanısın. 
    Müşterimiz ${report.clientName} için ${report.period} dönemine ait mülk performans raporunu analiz et.
    
    Mülk: ${report.property.title}
    Konum: ${report.property.location}
    Güncel Fiyat: ₺${report.property.currentPrice.toLocaleString()}
    
    Fiyat Geçmişi: ${priceHistoryJson}
    Aylık Performans: ${statsJson}
    Piyasa Koşulları: ${marketJson}
    
    Lütfen bu verileri analiz ederek profesyonel bir stratejik özet hazırla:
    1. İlanın genel ilgisini yorumla.
    2. Piyasadaki rekabet durumunu değerlendir.
    3. Fiyat konumlandırmasını analiz et.
    4. Satışı hızlandıracak somut tavsiyeler ver.
    
    Dili profesyonel, sonuç odaklı ve Türkwest kurumsal kimliğine uygun olsun. Yanıt doğrudan Markdown formatında olsun.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Veri analizi şu an için yapılamadı.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Analiz servisi şu an meşgul. Lütfen manuel verileri inceleyiniz.";
  }
};
