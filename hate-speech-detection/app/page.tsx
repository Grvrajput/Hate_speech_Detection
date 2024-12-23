'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dropzone } from './components/dropzone';

export default function HateSpeechDetection() {
  const [isClient, setIsClient] = useState(false);
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);
  if (!isClient) {
    return null;
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await fetch('/api/analyse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      console.log(data);
      const parsedData = typeof data.text === 'string' ? data.text : JSON.stringify(data.text, null, 2);
      setResult(parsedData);
    } catch (error) {
      console.error(error);
      setResult(`Error analyzing the text. Please try again. ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  const handleFileUpload = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("files[]", uploadedFile);
      console.log(uploadedFile);

      const response = await fetch("/api/uploadFile", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setText(data.text);
      setResult(data);
      console.log(data);
      // await handleAnalyze();
    } catch (error) {
      console.error(error);
      setResult(`Error uploading file: ${error}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-zinc-50 to-white text-zinc-900 antialiased">
      <div className="container mx-auto px-6 py-16 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight mb-6 text-zinc-900">
            Multilingual Hate Speech Detection
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-zinc-600 font-light leading-relaxed">
            An advanced natural language processing tool designed to detect and analyze hate speech with precision and sensitivity across multiple languages.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="bg-white shadow-2xl rounded-2xl border border-zinc-200 overflow-hidden"
        >
          <Tabs defaultValue="text" className="w-full p-2">
            <TabsList className="grid grid-cols-2 bg-zinc-100 border-b border-zinc-200 m-3">
              <TabsTrigger value="text" className="flex items-center justify-center gap-3">
                <FileText className="w-5 h-5 opacity-60" />
                Text Input
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center justify-center gap-3">
                <Upload className="w-5 h-5 opacity-60" />
                File Upload
              </TabsTrigger>
            </TabsList>

            <div className="p-10">
              <TabsContent value="text">
                <div className="space-y-8">
                  <div>
                    <label className="block text-lg font-medium mb-4 text-zinc-700">
                      Enter text to analyze
                    </label>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Type or paste your text here..."
                      className="min-h-[250px] bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-500 rounded-xl focus:ring-2 focus:ring-zinc-400 focus:border-transparent transition-all"
                    />
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    disabled={isAnalyzing || !text}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Analyzing Text
                      </>
                    ) : (
                      'Analyze Text'
                    )}
                  </Button>
                </div>

              </TabsContent>

              <TabsContent value="upload">
                <Dropzone
                  onFileDrop={setUploadedFile}
                  accept={{
                    'text/plain': ['.txt'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'application/pdf': ['.pdf'],
                  }}
                  maxSize={15 * 1024 * 1024} // 15MB
                />
                {uploadedFile && (
                  <Button
                    onClick={handleFileUpload}
                    className="w-full mt-8 bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Analyzing File
                      </>
                    ) : (
                      'Analyze File'
                    )}
                  </Button>
                )}
              </TabsContent>
              {result && (
                <div className="mt-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <h3 className="text-lg font-medium text-zinc-700 mb-2">Result:</h3>
                  {typeof result === 'string' ? (
                    <pre
                      className="text-sm text-zinc-600 bg-green-100 p-2 rounded-lg"
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                      }}
                    >
                      {result}
                    </pre>
                  ) : (
                    <pre
                      className="text-sm text-zinc-600 bg-red-100 p-2 rounded-lg"
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        overflow: 'hidden',
                      }}
                    >
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="flex items-center justify-center gap-3 text-sm text-zinc-500 font-light">
            <AlertTriangle className="w-4 h-4 opacity-70" />
            This tool is for demonstration purposes only. Please use responsibly.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
