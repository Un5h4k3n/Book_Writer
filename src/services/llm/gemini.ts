/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useSettingsStore } from "../../stores/settingsStore";

export const GeminiService = {
  generate: async (prompt: string, modelOverride?: string) => {
    const {
      geminiKey,
      selectedGeminiModel,
      geminiTemperature,
      geminiTopP,
      geminiTopK,
      geminiMaxOutputTokens,
    } = useSettingsStore.getState();
    const modelName =
      modelOverride || selectedGeminiModel || "gemini-1.5-flash";
    const finalModelName = modelName.includes("models/")
      ? modelName
      : modelName;

    if (!geminiKey)
      throw new Error(
        "Gemini API Key is missing. Please configure it in Settings.",
      );

    try {
      const genAI = new GoogleGenerativeAI(geminiKey);

      // Wrap model initialization to catch localization errors
      let model;
      try {
        model = genAI.getGenerativeModel({
          model: finalModelName,
          generationConfig: {
            temperature: geminiTemperature,
            topP: geminiTopP,
            topK: geminiTopK,
            maxOutputTokens: geminiMaxOutputTokens,
          },
        });
      } catch (localizationError: any) {
        // Handle RegisterClientLocalizationsError
        if (localizationError.name === "RegisterClientLocalizationsError") {
          console.warn(
            "Localization error caught, retrying with minimal config...",
            localizationError,
          );
          // Retry with minimal configuration
          model = genAI.getGenerativeModel({ model: finalModelName });
        } else {
          throw localizationError;
        }
      }

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      // Also catch it at the outer level just in case
      if (error.name === "RegisterClientLocalizationsError") {
        console.error(
          "Gemini SDK localization error. This is a known issue with @google/generative-ai package. Trying fallback...",
        );
        throw new Error(
          "Gemini initialization failed due to SDK issue. Please check console for details.",
        );
      }
      console.error("Gemini generation failed:", error);
      throw error;
    }
  },
  listModels: async (apiKey: string): Promise<string[]> => {
    if (!apiKey) throw new Error("API Key is required");
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = await response.json();
      return data.models
        .filter((m: any) =>
          m.supportedGenerationMethods.includes("generateContent"),
        )
        .map((m: any) => m.name.replace("models/", ""));
    } catch (error) {
      console.error("Failed to list Gemini models:", error);
      return []; // Fallback empty or let component handle fallback
    }
  },
};
