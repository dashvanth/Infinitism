export interface MindmapNode {
  id: string;
  text: string;
  description?: string;
  children: MindmapNode[];
  x: number;
  y: number;
  color: string;
  level: number;
}

export interface MindmapData {
  title: string;
  nodes: MindmapNode[];
}

export interface ProcessingStatus {
  status: "idle" | "processing" | "success" | "error";
  message?: string;
  progress?: number;
}
