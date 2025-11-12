import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const extractionModel = "gemini-2.5-pro";

export const extractExpressionFromImage = async (base64Image, mimeType) => {
  try {
    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    };

    const prompt = `
You are a highly advanced OCR system specialized in transcribing handwritten mathematical expressions.
Your goal is to output a clean, single-line math expression ready for a calculator.

RULES:
1. Read left to right, top to bottom.
2. Join multi-line math into one string.
3. If no operator between numbers on different lines, assume '+'.
4. Ignore non-math marks.
5. Output only the expression, no extra words or explanations.
6. Output must contain only digits and + - * / ( ) .
IMPORTANT: Output exactly like this example: 25+30+40+60
`;

    const response = await ai.models.generateContent({
      model: extractionModel,
      contents: { parts: [{ text: prompt }, imagePart] }, // ✅ prompt first
    });

    let text = response.text.trim();

    // ✅ Clean output
    text = text.replace(/(expression|result|answer)[:\-]?\s*/gi, '');
    text = text.replace(/\s+/g, '');

    if (text && /[0-9]/.test(text) && /[+\-*/]/.test(text)) {
      return text.replace(/[^0-9.+\-*/()]/g, '');
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

export const calculateExpression = async (expression) => {
  try {
    const sanitizedExpression = expression.replace(/[^0-9.+\-*/()\s]/g, '');
    if (sanitizedExpression !== expression) {
      return "ERROR: Expression contains invalid characters.";
    }

    // ✅ Prevent bad operator sequences
    if (/[*\/+\-]{2,}/.test(sanitizedExpression)) {
      return "ERROR: Invalid operator sequence.";
    }

    const result = new Function(`return ${sanitizedExpression}`)();
    if (typeof result === 'number' && isFinite(result)) {
      return result.toString();
    } else {
      return "ERROR: Calculation resulted in an invalid number.";
    }
  } catch (error) {
    console.error("Error calculating expression locally:", error);
    return "ERROR: Invalid or unrecognized mathematical expression.";
  }
};
