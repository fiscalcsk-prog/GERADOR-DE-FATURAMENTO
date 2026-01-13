
import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResponse } from "../types";

export const extractBillingData = async (base64Image: string): Promise<ExtractionResponse | null> => {
  try {
    // Creating a fresh GoogleGenAI instance right before the call to ensure it uses the latest process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
          {
            text: `Extract all relevant data from this Billing Declaration image into a JSON format.
            The JSON should strictly follow this structure:
            {
              "companyName": "Full name of the company",
              "address": "Full address including street, number, neighborhood, zip",
              "cnpj": "CNPJ number",
              "city": "City name",
              "state": "State abbreviation (e.g., SP)",
              "date": "Declaration date mentioned",
              "billingMonths": [
                { "year": "2025", "month": "Maio", "amount": 220702.10 }
              ],
              "partner": { "name": "Name", "role": "SÓCIA ADMINISTRADORA", "identifier": "CPF: 000.000.000-00" },
              "accountant": { "name": "Name", "role": "CONTADOR", "identifier": "CRC: 1SP 000.000/O-0" }
            }
            Return only valid JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            address: { type: Type.STRING },
            cnpj: { type: Type.STRING },
            city: { type: Type.STRING },
            state: { type: Type.STRING },
            date: { type: Type.STRING },
            billingMonths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  year: { type: Type.STRING },
                  month: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                }
              }
            },
            partner: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                identifier: { type: Type.STRING },
              }
            },
            accountant: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                role: { type: Type.STRING },
                identifier: { type: Type.STRING },
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return null;
  } catch (error) {
    console.error("Error extracting billing data:", error);
    return null;
  }
};
