import { GoogleGenAI, Type } from "@google/genai";
import { BackgroundCategory, ListingContent } from "../types";

// Helper to clean base64 string
const cleanBase64 = (data: string) => data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

// 1. Edit Image Background
export const editCandleBackground = async (
  imageBase64: string,
  category: BackgroundCategory
): Promise<string> => {
  const ai = new GoogleGenAI({
    apiKey: process.env.API_KEY,
  });
  
  const prompt = `
    Generate a professional product photo of this specific candle placed in a ${category} setting.
    The candle object (jar, wax, wick, label) must be preserved exactly as is. 
    Replace the background completely with a high-quality ${category} environment.
    Ensure natural lighting and shadows that match the new environment.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: cleanBase64(imageBase64),
          },
        },
        { text: prompt },
      ],
    },
  });

  // Extract image
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
};

// 2. Generate Listing Text (Polish)
export const generateListingText = async (
  imagesBase64: string[]
): Promise<ListingContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare parts (up to 4 images)
  const imageParts = imagesBase64.map(img => ({
    inlineData: {
      mimeType: 'image/png',
      data: cleanBase64(img),
    }
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        ...imageParts,
        { 
          text: `
            Act as a professional copywriter for OLX and Vinted in Poland.
            Analyze these candle photos.
            Write a sales listing in Polish (Polski).
            
            Return JSON with:
            - title: Catchy, SEO-optimized title (max 70 chars).
            - description: Persuasive description emphasizing atmosphere, scent (guess if visible), and quality.
            - tags: Array of 5-10 hashtags.
          ` 
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "description", "tags"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate text");
  return JSON.parse(text) as ListingContent;
};
