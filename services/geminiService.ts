
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = "gemini-2.5-flash";

/**
 * Extracts a mathematical expression from an image using Gemini.
 * @param base64Image The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the extracted expression string.
 */
export const extractExpressionFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    };

    const prompt = `You are an expert OCR system. Your task is to analyze the provided image and extract any visible mathematical expression.
    - Only return the mathematical expression.
    - Do not include any explanatory text, greetings, or apologies.
    - Do not attempt to solve the expression.
    - Ensure the operators (+, -, *, /) are correctly identified.
    - If no valid mathematical expression is found, return the string "ERROR: No expression found".
    
    Example input: An image of "34+54+67+87".
    Example output: 34+54+67+87`;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [imagePart, { text: prompt }] },
    });

    const text = response.text.trim();
    // A simple validation to ensure it looks like a math expression
    if (text && /[0-9]/.test(text) && /[+\-*/]/.test(text)) {
      return text.replace(/[^0-9.+\-*/\s()]/g, ''); // Sanitize the output
    } else if (text.startsWith("ERROR:")) {
      return text;
    } else {
      return "ERROR: Could not recognize a valid expression in the image.";
    }
  } catch (error) {
    console.error("Error extracting expression:", error);
    return "ERROR: Failed to communicate with the AI model for extraction.";
  }
};

/**
 * Calculates a mathematical expression using Gemini.
 * @param expression The mathematical expression string to calculate.
 * @returns A promise that resolves to the calculated result string.
 */
export const calculateExpression = async (expression: string): Promise<string> => {
  try {
    const prompt = `You are a powerful calculator. Your task is to evaluate the given mathematical expression and provide only the final numerical result.
    - Only return the number.
    - Do not include any explanations, steps, or units.
    - If the expression is invalid or cannot be calculated, return the string "ERROR: Invalid expression".
    
    Example input: 34+54+67+87
    Example output: 242
    
    Expression to solve: ${expression}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = response.text.trim();
    if (!isNaN(parseFloat(text)) && isFinite(Number(text))) {
        return text;
    } else if(text.startsWith("ERROR:")) {
        return text;
    } else {
        return "ERROR: AI returned an invalid numerical format.";
    }
  } catch (error) {
    console.error("Error calculating expression:", error);
    return "ERROR: Failed to communicate with the AI model for calculation.";
  }
};
