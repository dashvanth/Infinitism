import mammoth from "mammoth";

export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileType = file.type;

    if (fileType === "application/pdf") {
      // For PDF files, we'll use a simpler approach since pdf-parse requires Node.js
      // In a real implementation, you'd want to use a server-side solution or a different PDF library
      const reader = new FileReader();
      reader.onload = () => {
        // This is a simplified approach - in production you'd want proper PDF parsing
        const text = reader.result as string;
        resolve(
          text ||
            "PDF content could not be extracted. Please try copying and pasting the text manually."
        );
      };
      reader.onerror = () => reject(new Error("Failed to read PDF file"));
      reader.readAsText(file);
    } else if (
      fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Handle DOCX files
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject(new Error("Failed to extract text from DOCX file"));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read DOCX file"));
      reader.readAsArrayBuffer(file);
    } else if (fileType === "text/plain") {
      // Handle text files
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => reject(new Error("Failed to read text file"));
      reader.readAsText(file);
    } else {
      reject(
        new Error(
          "Unsupported file type. Please upload PDF, DOCX, or TXT files."
        )
      );
    }
  });
};
