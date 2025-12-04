import { GoogleGenAI, Type } from "@google/genai";

// Helper to get safe API key
const getApiKey = (): string | undefined => {
  return process.env.API_KEY;
};

export const suggestHabits = async (goal: string): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("No API Key found");
    return ["Drink 2L water", "Read 10 pages", "10 min meditation"]; // Fallback
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Suggest 5 short, actionable daily habits for someone who wants to: ${goal}. Keep them under 5 words each.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("AI Habit Generation Error:", error);
    return [];
  }
};

export const suggestTasks = async (project: string): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return ["Plan project", "Execute phase 1", "Review"];

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Break down this project into 3-5 high-level tasks: ${project}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("AI Task Generation Error:", error);
    return [];
  }
};