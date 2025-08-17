import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// --- Logic Integration ---
// These are the correct functions from your original MindMap/utils files
import { extractTextFromFile } from "../utils/fileProcessor";
import { generateMindmapData } from "../utils/aiProcessor";
import { MindmapData } from "../types/mindmap";

export default function Generator() {
  // --- Using your original, working state management ---
  const [textContent, setTextContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploadedFile(file);
    setIsLoading(true);
    toast.info(`Processing ${file.name}...`);

    try {
      // --- Calling your real file processor ---
      const extractedText = await extractTextFromFile(file);
      setTextContent(extractedText);
      toast.success("File processed successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process file"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isLoading,
  });

  const handleGenerateMindmap = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!textContent.trim()) {
      toast.error("Please provide some text to generate a mind map.");
      return;
    }

    setIsLoading(true);
    toast.info("Generating your mind map... The AI is thinking.");

    try {
      // --- Calling your real AI processor ---
      const mindmapData = await generateMindmapData(textContent);

      // Navigate to mind map viewer with the real data
      navigate("/mindmap", {
        state: { mindmapData },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unexpected error occurred."
      );
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="min-h-screen py-32">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <div className="inline-flex items-center space-x-2 glass-card px-4 py-2 mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Generator</span>
            </div>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl font-bold mb-6"
          >
            Create Your <span className="gradient-text block">Mind Map</span>
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Upload a document or paste your text below, and watch as our AI
            transforms it into a beautiful, interactive mind map.
          </motion.p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* File Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Card className="glass-card-hero h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-6 w-6 text-primary" />
                  <span>Upload Document</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? "border-primary bg-primary/5 scale-105"
                      : "border-white/20 hover:border-primary/50 hover:bg-white/5"
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      ) : (
                        <FileText className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {isDragActive
                          ? "Drop your file here"
                          : "Drag & drop your document"}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        or click to browse files
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports PDF, DOCX, and TXT files
                      </p>
                    </div>
                  </div>
                </div>
                {uploadedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 flex items-center space-x-3"
                  >
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{uploadedFile.name}</p>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Text Input Section */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Card className="glass-card-hero h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <span>Text Content</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateMindmap} className="space-y-6">
                  <div>
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Paste your text here or upload a document. The AI will analyze the content and create a structured mind map."
                      className="glass-card border-white/20 bg-white/5 min-h-64 resize-none"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      {textContent.length} characters
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !textContent.trim()}
                    className="w-full btn-animated bg-gradient-primary hover:shadow-glow py-6 text-lg group"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />{" "}
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Mind Map{" "}
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
