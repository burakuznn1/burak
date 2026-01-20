
import { GoogleGenAI } from "@google/genai";
import { ClientReport } from "../types.ts";

export const generateReportSummary = async (report: ClientReport): Promise<string> => {
  // Always initialize right before use to ensure the latest API state
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const statsJson = JSON.stringify(report.property.stats);
  const marketJson = JSON.stringify(report.property.market);
  const priceHistoryJson = JSON.stringify(report.property.priceHistory);
  
  const prompt = `
    Sen Türkwest Gayrimenkul'ün profesyonel yatırım danışmanısın. 
    Müşterimiz ${report.clientName} için ${report.period} dönemine ait mülk performans raporunu analiz et.
    
    Mülk: ${report.property.title}
    Konum: ${report.property.location}
    Güncel Fiyat: ₺${report.property.currentPrice.toLocaleString()}
    
    Fiyat Geçmişi (Zaman içindeki değişimler):
    ${priceHistoryJson}
    
    Aylık Performans Verileri (Görüntülenme, Favori, Mesaj, Arama, Gezme):
    ${statsJson}
    
    Piyasa Koşulları (Emsal fiyat, binadaki rakip ilanlar, mahalledeki rakip ilanlar, ortalama satış süresi):
    ${marketJson}
    
    Lütfen bu verileri analiz ederek profesyonel bir stratejik özet hazırla:
    1. İlanın genel ilgisini yorumla. Özellikle fiyat değişimlerinin (varsa) görüntülenme ve favori sayıları üzerindeki etkisini belirt.
    2. Piyasadaki rekabet durumunu (binadaki ve mahalledeki rakip yoğunluğu) değerlendir.
    3. Emsal fiyata ve fiyat geçmişine göre mülkün mevcut fiyat konumlandırmasını analiz et.
    4. Satış sürecini hızlandırmak için veriye dayalı somut stratejik tavsiyeler ver.
    
    Dili profesyonel, sonuç odaklı ve Türkwest kurumsal kimliğine uygun olsun. Yanıt doğrudan rapor metni (Markdown formatında) olsun. Başlık kullanma, direkt analize gir.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Veri analizi şu an için yapılamadı. Lütfen daha sonra tekrar deneyiniz.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Analiz servisi şu an meşgul. Lütfen manuel verileri inceleyiniz.";
  }
};
