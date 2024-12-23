import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  text: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ text: "Method Not Allowed" });
  }

  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ text: "No text provided" });
  }

  try {
    console.log("Calling API with text:", text);
    const response = await fetch("http://localhost:5000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    
    return res.status(200).json({ text: JSON.stringify(data) });
  } catch (error) {
    console.error("Error in API call:", error);
    return res.status(500).json({ text: `Error in calling the API: ${error}` });
  }
}
