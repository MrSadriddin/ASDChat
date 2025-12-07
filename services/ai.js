import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const generateResponse = async (history, newMessage) => {
  try {
    const historyForAI = history.slice(0, -1).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({
      history: historyForAI,
  });

  const result = await chat.sendMessage(newMessage);
  const response = await result.response;
  return response.text();
  } catch (error) {
    console.error("AI Error:", error);
    return "Kechirasiz, tizimda xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
  }
};