
import { GoogleGenAI } from "@google/genai";
import { ClientReport } from "../types";

export const generateReportSummary = async (report: ClientReport): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const statsJson = JSON.stringify(report.property.stats);
  const marketJson = JSON.stringify(report.property.market);
  
  const prompt = `
    Sen Türkwest Gayrimenkul'ün profesyonel yatırım danışmanısın. 
    Müşterimiz ${report.clientName} için ${report.period} dönemine ait mülk performans raporunu analiz et.
    
    Mülk: ${report.property.title}
    Konum: ${report.property.location}
    Fiyat: ₺${report.property.currentPrice.toLocaleString()}
    
    Aylık Performans Verileri (Görüntülenme, Favori, Mesaj, Arama, Gezme):
    ${statsJson}
    
    Piyasa Koşulları (Emsal fiyat, binadaki rakip ilanlar, mahalledeki rakip ilanlar, ortalama satış süresi):
    ${marketJson}
    
    Lütfen bu verileri analiz ederek profesyonel bir özet hazırla:
    1. İlanın genel ilgisini (view/favorite/visit oranları) yorumla.
    2. Piyasadaki rekabet durumunu (binadaki ve mahalledeki diğer ilanlar) değerlendir.
    3. Emsal fiyata göre mülkün konumunu analiz et.
    4. Satış sürecini hızlandırmak için somut stratejik tavsiyeler ver.
    
    Dili profesyonel, sonuç odaklı ve Türkwest kurumsal kimliğine uygun olsun. Cevap doğrudan rapor metni olsun.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Özet oluşturulamadı.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Analiz şu an için gerçekleştirilemiyor.";
  }
};
