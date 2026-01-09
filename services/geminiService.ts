
import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { decode, decodeAudioData, audioBufferToWav } from "../utils/audioConverter";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface VoiceAnalysisResult {
  persona: string;
  signature: string;
}

/**
 * Analyzes a voice sample and returns a structured persona and a visual CSS signature.
 */
export const analyzeVoiceSample = async (base64Data: string, mimeType: string): Promise<VoiceAnalysisResult> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          {
            text: `Analyze this voice sample. Extract its unique acoustic fingerprint (tone, resonance, emotional weight, and cadence).
            
            Return a JSON object with:
            1. "persona": A single-sentence TTS instruction starting with "Speak in a..." and ending with a colon. 
               Example: "Speak in a velvet-smooth, mid-range male voice with a slight hint of mystery and a slow, rhythmic pace:"
            2. "signature": A CSS linear-gradient string (e.g., "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)") that visually represents the 'feeling' of the voice. Darker/deeper voices should have darker/richer colors, brighter/higher voices should have vibrant/lighter colors.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            persona: { type: Type.STRING },
            signature: { type: Type.STRING }
          },
          required: ["persona", "signature"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      persona: result.persona || "Speak in a natural voice:",
      signature: result.signature || "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
    };
  } catch (error) {
    console.error("Voice Analysis Error:", error);
    throw new Error("Failed to capture voice signature. Ensure your sample is clear and at least 5 seconds long.");
  }
};

export interface GenerateSpeechParams {
  text: string;
  voiceName: string;
  customPersona?: string;
}

export const generateSpeech = async (params: GenerateSpeechParams): Promise<{ audioUrl: string; blob: Blob }> => {
  const { text, voiceName, customPersona } = params;
  const ai = getClient();

  const prompt = customPersona ? `${customPersona} "${text}"` : text;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from model");
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const rawBytes = decode(base64Audio);
    const audioBuffer = await decodeAudioData(rawBytes, audioContext, 24000, 1);
    
    const wavBlob = audioBufferToWav(audioBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);

    return { audioUrl, blob: wavBlob };
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};
