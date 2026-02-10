
import { GoogleGenAI, Type } from "@google/genai";
import { ChangelogInput, GeneratedChangelog } from "../types";

export const generateChangelogAI = async (input: ChangelogInput): Promise<GeneratedChangelog> => {
  // Use process.env.API_KEY directly as required by the guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error("LogSpark: process.env.API_KEY is undefined. Ensure it is set in your environment variables.");
    throw new Error("Missing API Key");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const templateInstructions = {
    standard: "A balanced mix of technical detail and user benefits. Professional and clear.",
    marketing: "High-level and exciting. Focus heavily on 'What's in it for the user'. Use emojis and benefit-driven language.",
    technical: "Precise and detailed. Keep technical terms, mention specific modules or endpoints if provided. No fluff.",
    minimal: "Extreme brevity. Bullet points only. No introductory text or flowery descriptions."
  };

  const prompt = `
    Act as a professional technical writer and SaaS founder. 
    Transform the following raw release notes into a clean, human-readable changelog.
    
    Style Guidelines for "${input.template}" template:
    ${templateInstructions[input.template]}
    
    General Rules:
    - Group items by category (Features, Fixes, Improvements, Breaking Changes).
    - If a category is empty, do not include it.
    - Clean up raw commit-style messages into coherent sentences.
    - Format output in Markdown, HTML, and Plain Text.
    
    Metadata:
    Version: ${input.version}
    Date: ${input.date}
    
    Raw Notes to Process:
    ${input.entries.filter(e => e.content.trim()).map(e => `[${e.category.toUpperCase()}]: ${e.content}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdown: { type: Type.STRING },
            html: { type: Type.STRING },
            plainText: { type: Type.STRING }
          },
          required: ["markdown", "html", "plainText"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    // Robust cleanup: sometimes the model returns markdown code blocks even with JSON mode
    let jsonStr = text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```[a-z]*\n/i, '').replace(/\n```$/i, '').trim();
    }
    
    const result = JSON.parse(jsonStr);
    return {
      markdown: result.markdown || "Error generating markdown",
      html: result.html || "<p>Error generating HTML</p>",
      plainText: result.plainText || "Error generating plain text"
    };
  } catch (err) {
    console.error("LogSpark: Gemini API Error:", err);
    throw err;
  }
};
