/**
 * CyberShield Pro — AI Chat API (Vercel Serverless Function)
 *
 * POST /api/ai-chat
 * Body: { message: string, mode: "beginner"|"expert", context?: string }
 *
 * Uses Groq API (LLaMA 3.3 70B) — NO API keys exposed to frontend.
 */
import axios from "axios";
import { sanitizeInput } from "./_lib/validate.js";

const SYSTEM_INSTRUCTION = `You are CyberShield AI, a world-class cybersecurity expert and network troubleshooter. 
Your goal is to help users identify threats, analyze network data, and provide actionable security recommendations.
- Provide root cause analysis for security issues.
- Suggest specific fix steps and CLI commands (e.g., nmap, iptables, openssl).
- Offer two modes of explanation: Beginner (simple terms) and Expert (technical details).
- Be concise, professional, and security-focused.
- If the user provides scan results or network data, analyze them for vulnerabilities.
- Format responses with clear headers and bullet points for readability.`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { message, mode, context } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ success: false, error: "Message is required" });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return res.status(500).json({
      success: false,
      error: "AI service not configured. Please set GROQ_API_KEY.",
    });
  }

  const sanitizedMessage = sanitizeInput(message).substring(0, 4000);
  const modeStr = mode === "expert" ? "EXPERT" : "BEGINNER";
  const contextStr = context ? `\n[CONTEXT_DATA: ${sanitizeInput(context).substring(0, 2000)}]` : "";

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          {
            role: "user",
            content: `[Mode: ${modeStr}]${contextStr}\n\n${sanitizedMessage}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const aiMessage =
      response.data?.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process that request. Please try again.";

    return res.status(200).json({
      success: true,
      message: aiMessage,
    });
  } catch (err: any) {
    console.error("[ai-chat] Groq API error:", err.response?.data || err.message);

    // Provide fallback response
    return res.status(200).json({
      success: true,
      message:
        "⚠️ AI service is temporarily unavailable. Here are some general security tips:\n\n" +
        "1. **Keep your software updated** — Patch vulnerabilities regularly\n" +
        "2. **Use strong passwords** — Minimum 12 characters with mixed types\n" +
        "3. **Enable 2FA** — Add an extra layer of authentication\n" +
        "4. **Monitor network traffic** — Watch for unusual patterns\n" +
        "5. **Regular backups** — Protect against ransomware\n\n" +
        "_Please try your question again in a few moments._",
    });
  }
}
