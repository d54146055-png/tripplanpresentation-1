import { GoogleGenAI, Type } from "@google/genai";
import { PlaceResult, ItineraryItem, RouteResult } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const calculateTransportRoute = async (start: string, end: string): Promise<RouteResult | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Calculate the best public transport route in Seoul from "${start}" to "${end}".
      Provide the estimated time, summary (e.g., Subway Line 2), and brief details.
      
      Response Format (JSON):
      {
        "estimatedTime": "25 mins",
        "summary": "Subway Line 2",
        "details": "Walk to Station A -> Take Line 2 to Station B -> Walk to destination"
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedTime: { type: Type.STRING },
            summary: { type: Type.STRING },
            details: { type: Type.STRING }
          },
          required: ["estimatedTime", "summary", "details"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as RouteResult;
  } catch (error) {
    console.error("Route calculation failed:", error);
    return null;
  }
};

export const generateDailyItinerary = async (day: number, areas: string): Promise<Omit<ItineraryItem, 'id' | 'day'>[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a one-day travel itinerary for Seoul.
      The user wants to visit these areas: "${areas}".
      Start from 10:00 AM to 8:00 PM.
      Return a JSON array of itinerary items.
      Each item should be logically spaced by 2-3 hours.
      Types should vary between 'food', 'activity', 'shopping', 'transport'.
      
      Output format strictly JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING, description: "Time in HH:MM format (24h)" },
              title: { type: Type.STRING },
              location: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["food", "activity", "shopping", "transport", "other"] },
              notes: { type: Type.STRING, description: "Short tip or description" }
            },
            required: ["time", "title", "location", "type"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Auto-schedule failed:", error);
    return [];
  }
};

export const parseItineraryFile = async (text: string): Promise<PlaceResult[]> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract all physical location names from the following travel itinerary text. 
      Itinerary Text: ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              rating: { type: Type.NUMBER },
            },
            required: ["name", "address"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    return JSON.parse(jsonText) as PlaceResult[];
  } catch (error) {
    console.error("Failed to parse itinerary:", error);
    return [];
  }
};

export const searchPlacesInSeoul = async (query: string): Promise<PlaceResult[]> => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Recommend 5 top-rated places in Seoul for: "${query}".`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  googleMapsUri: { type: Type.STRING },
                },
                required: ["name", "address"]
              }
            }
        }
    });
    
    const text = response.text;
    if(!text) return [];
    
    return JSON.parse(text) as PlaceResult[];

  } catch (error) {
    console.error("Search failed:", error);
    return [];
  }
};