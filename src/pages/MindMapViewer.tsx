import React, { useRef, useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { motion } from "framer-motion";
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Pencil,
  Sigma,
  Share2,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import { MindmapData, MindmapNode } from "../types/mindmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as d3 from "d3";
import { toast } from "sonner";

interface MindmapViewerProps {
  data: MindmapData;
  onClose: () => void;
}

interface D3Node {
  name: string;
  children?: D3Node[];
  color?: string;
  description?: string;
  id?: string;
}

// This is the actual component that renders the mind map.
// It is now separate from the page logic.
const MindmapView: React.FC<MindmapViewerProps> = ({ data, onClose }) => {
  const [mindmapData, setMindmapData] = useState(data);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mindmapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const stats = useMemo(() => {
    let nodeCount = 0;
    let maxDepth = 0;
    const countNodes = (nodes: MindmapNode[], depth: number) => {
      nodes.forEach((node) => {
        nodeCount++;
        if (depth > maxDepth) maxDepth = depth;
        if (node.children) {
          countNodes(node.children, depth + 1);
        }
      });
    };
    nodeCount++; // for the root node
    countNodes(mindmapData.nodes, 1);
    return { nodeCount, maxDepth };
  }, [mindmapData]);

  const handleNodeUpdate = (nodeId: string, newText: string) => {
    const update = (nodes: MindmapNode[]): MindmapNode[] => {
      return nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, text: newText };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    };
    setMindmapData((prevData) => ({
      ...prevData,
      nodes: update(prevData.nodes),
    }));
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleNodeUpdate(editingNode.id, e.currentTarget.value);
      setEditingNode(null);
    }
    if (e.key === "Escape") {
      setEditingNode(null);
    }
  };

  useEffect(() => {
    if (!svgRef.current || !mindmapData) return;

    const convertToD3Format = (mindmapData: MindmapData): D3Node => {
      return {
        name: mindmapData.title,
        id: "root",
        children: mindmapData.nodes.map((node) => ({
          id: node.id,
          name: node.text,
          color: node.color,
          description: node.description,
          children: node.children?.map((child) => ({
            id: child.id,
            name: child.text,
            color: child.color,
            description: child.description,
          })),
        })),
      };
    };

    const d3Data = convertToD3Format(mindmapData);
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 1200;
    const root = d3.hierarchy(d3Data);
    const dx = 40;
    const dy = 200;

    const tree = d3.tree().nodeSize([dx, dy]);
    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
    tree(root);

    let x0 = Infinity,
      x1 = -x0;
    root.each((d) => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
    });

    const height = x1 - x0 + dx * 2;
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + dy)
      .attr("height", height)
      .attr("viewBox", [-dy, x0 - dx, width + dy, height])
      .style("font", "14px Inter, sans-serif");

    const g = svg.append("g");

    g.append("g")
      .attr("fill", "none")
      .attr("stroke", "#475569")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any
      );

    const node = g
      .append("g")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .style("cursor", "pointer")
      .on("dblclick", (event, d) => {
        if (d.depth > 0 && d.data.id) {
          setEditingNode(d.data);
        }
      });

    node
      .append("rect")
      .attr("width", (d) => d.data.name.length * 8 + 24)
      .attr("height", 30)
      .attr("x", (d) => (d.children ? -(d.data.name.length * 8 + 24) - 10 : 10))
      .attr("y", -15)
      .attr("rx", 8)
      .attr(
        "fill",
        (d) => (d.data as any).color || (d.depth === 0 ? "#1e293b" : "#334155")
      )
      .attr("stroke", (d) => (d.depth === 0 ? "#38bdf8" : "#64748b"))
      .attr("stroke-width", 1);

    node
      .append("text")
      .attr("dy", "0.31em")
      .attr("x", (d) => (d.children ? -15 : 15))
      .attr("text-anchor", (d) => (d.children ? "end" : "start"))
      .text((d) => d.data.name)
      .attr("fill", "white")
      .attr("font-weight", "500");
  }, [mindmapData]);

  const exportToPDF = async () => {
    if (!mindmapRef.current || !mindmapData) {
      toast.error("Error: Could not find mind map to export.");
      return;
    }
    toast.info("Preparing PDF export...");
    const canvas = await html2canvas(mindmapRef.current, {
      backgroundColor: "#0D1117",
      scale: 3,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth * ratio, imgHeight * ratio);
    pdf.save(`${mindmapData.title.replace(/\s+/g, "_")}_mindmap.pdf`);
    toast.success("PDF downloaded successfully!");
  };

  return (
    <div className="w-screen h-screen bg-background text-foreground flex">
      <motion.div
        animate={{
          width: sidebarOpen ? 350 : 0,
          padding: sidebarOpen ? "1rem" : 0,
        }}
        className="glass-card flex-shrink-0 overflow-hidden"
      >
        <Card className="bg-transparent border-0 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="gradient-text text-2xl">Infinitism</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow space-y-6 overflow-y-auto">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <Sigma className="h-5 w-5 mr-2 text-primary" />
                Statistics
              </h3>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>
                  Total Nodes:{" "}
                  <span className="font-bold text-foreground">
                    {stats.nodeCount}
                  </span>
                </p>
                <p>
                  Map Depth:{" "}
                  <span className="font-bold text-foreground">
                    {stats.maxDepth}
                  </span>
                </p>
              </div>
            </div>
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <Pencil className="h-5 w-5 mr-2 text-primary" />
                How to Edit
              </h3>
              <p className="text-sm text-muted-foreground">
                Double-click on any node to edit its content.
              </p>
            </div>
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-primary" />
                Export
              </h3>
              <Button
                variant="outline"
                className="w-full"
                onClick={exportToPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex-1 relative flex flex-col bg-muted/20">
        <div className="absolute top-4 left-4 z-10 flex gap-4">
          <Button
            variant="glass"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeft /> : <PanelRight />}
          </Button>
          <Button variant="glass" onClick={onClose}>
            Close Mindmap
          </Button>
        </div>

        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={8}
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-4 right-4 z-10 flex flex-col space-y-2">
                <Button variant="glass" size="icon" onClick={() => zoomIn(0.2)}>
                  <ZoomIn />
                </Button>
                <Button
                  variant="glass"
                  size="icon"
                  onClick={() => zoomOut(0.2)}
                >
                  <ZoomOut />
                </Button>
                <Button
                  variant="glass"
                  size="icon"
                  onClick={() => resetTransform()}
                >
                  <RotateCcw />
                </Button>
              </div>
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="w-full h-full flex items-center justify-center"
              >
                <div ref={mindmapRef} className="p-12">
                  <svg ref={svgRef}></svg>
                </div>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>

        {editingNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
          >
            <Card className="glass-card-hero p-4 flex items-center gap-4">
              <input
                type="text"
                defaultValue={editingNode.name}
                onKeyDown={handleEditKeyDown}
                className="bg-transparent text-foreground focus:outline-none"
                autoFocus
                onBlur={() => setEditingNode(null)}
              />
              <Button
                onClick={() => setEditingNode(null)}
                variant="ghost"
                size="sm"
              >
                Done
              </Button>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// This is a new wrapper component that handles the page-level logic.
const MindMapViewerPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mindmapData = location.state?.mindmapData;

  useEffect(() => {
    if (!mindmapData) {
      toast.error("No mind map data found. Please generate a new one.");
      navigate("/generator");
    }
  }, [mindmapData, navigate]);

  if (!mindmapData) {
    // This will be shown briefly before the redirect happens.
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <p>Loading or redirecting...</p>
      </div>
    );
  }

  return (
    <MindmapView data={mindmapData} onClose={() => navigate("/generator")} />
  );
};

export default MindMapViewerPage;
