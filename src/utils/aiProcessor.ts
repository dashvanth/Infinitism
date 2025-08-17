import { GoogleGenerativeAI } from "@google/generative-ai";
import { MindmapData, MindmapNode } from "../types/mindmap";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const generateMindmapData = async (
  content: string
): Promise<MindmapData> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const prompt = `
    Create a concise mindmap from this content. Extract 4-6 main topics with 2-4 subtopics each.

    JSON format:
    {
      "title": "Brief title",
      "mainTopics": [
        {
          "topic": "Topic name",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "color": "#3B82F6"
        }
      ]
    }

    Colors: #3B82F6, #10B981, #F59E0B, #EF4444, #8B5CF6, #06B6D4

    Content:
    ${content}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format from AI");
    }

    const aiResponse = JSON.parse(jsonMatch[0]);
    return processMindmapResponse(aiResponse);
  } catch (error) {
    console.error("Error generating mindmap with Gemini:", error);

    // Fallback to enhanced mock response if API fails
    return generateFastMockResponse(content);
  }
};

const processMindmapResponse = (response: any): MindmapData => {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#EC4899",
    "#84CC16",
  ];

  // Calculate positions for a tree-like structure
  const totalTopics = response.mainTopics.length;
  const verticalSpacing = 120;
  const horizontalOffset = 300;

  const nodes: MindmapNode[] = response.mainTopics.map(
    (topic: any, index: number) => {
      // Position main nodes vertically on the right side
      const mainY = (index - (totalTopics - 1) / 2) * verticalSpacing;
      const mainX = horizontalOffset;

      const mainNode: MindmapNode = {
        id: `main-${index}`,
        text: topic.topic,
        description: `Key concept: ${topic.topic}`,
        children: topic.subtopics.map((subtopic: string, subIndex: number) => {
          // Position subtopics to the right of main nodes
          const subY =
            mainY + (subIndex - (topic.subtopics.length - 1) / 2) * 60;
          const subX = mainX + 250;

          return {
            id: `sub-${index}-${subIndex}`,
            text:
              subtopic.length > 40
                ? subtopic.substring(0, 37) + "..."
                : subtopic,
            description: subtopic,
            children: [],
            x: subX,
            y: subY,
            color: topic.color || colors[index % colors.length],
            level: 2,
          };
        }),
        x: mainX,
        y: mainY,
        color: topic.color || colors[index % colors.length],
        level: 1,
      };

      return mainNode;
    }
  );

  return {
    title: response.title || "Study Guide Mindmap",
    nodes,
  };
};

const generateFastMockResponse = (content: string): MindmapData => {
  // Fast fallback response
  const words = content.toLowerCase().split(/\s+/);
  const commonWords = [
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
  ];
  const keywords = words
    .filter((word) => word.length > 3 && !commonWords.includes(word))
    .reduce((acc: Record<string, number>, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

  const topKeywords = Object.entries(keywords)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word);

  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
  ];

  const mockResponse = {
    title: "Content Overview",
    mainTopics: topKeywords.map((keyword, index) => ({
      topic: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      subtopics: [
        `Key concept: ${keyword}`,
        `Related to: ${topKeywords[(index + 1) % topKeywords.length]}`,
        `Important for understanding`,
      ],
      color: colors[index % colors.length],
    })),
  };

  return processMindmapResponse(mockResponse);
};
