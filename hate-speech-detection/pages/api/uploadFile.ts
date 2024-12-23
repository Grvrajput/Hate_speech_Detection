import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import { Readable } from "stream";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = formidable({
      maxFiles: 1,
      maxFileSize: 15 * 1024 * 1024, // 15MB
      allowEmptyFiles: false,
      filter: ({ mimetype }) => {
        return mimetype && ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimetype);
      }
    });

    form.parse(req, async (err, _, files) => {
      if (err) {
        console.error("Form parse error:", err);
        return res.status(500).json({ error: "Failed to parse form" });
      }

      const uploadedFile = files['files[]']?.[0] || files.file?.[0];
      if (!uploadedFile) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      try {
        const formData = new FormData();
        const fileBuffer = await streamToBuffer(fs.createReadStream(uploadedFile.filepath));
        
        // Create a File object from the buffer
        const file = new File([fileBuffer], uploadedFile.originalFilename || 'file', {
          type: uploadedFile.mimetype || 'application/octet-stream',
        });
        
        formData.append("files[]", file);
        
        const response = await fetch("http://localhost:5000/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Flask server error:", errorText);
          return res.status(response.status).json({ error: "Server error" });
        }

        const data = await response.json();
        return res.status(200).json(data);
      } finally {
        // Clean up temp file
        fs.unlink(uploadedFile.filepath, (err) => {
          if (err) console.error("Failed to delete temp file:", err);
        });
      }
    });
  } catch (error) {
    console.error("Upload handler error:", error);
    return res.status(500).json({ error: "Failed to process upload" });
  }
}