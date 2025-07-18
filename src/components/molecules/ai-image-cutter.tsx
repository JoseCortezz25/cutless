/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect } from "react";
import { useCropWithLines } from "@/hooks/useCrop";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Scissors, Download, Sparkles, Undo, ZoomIn, ZoomOut } from "lucide-react";
import JSZip from "jszip";
import FileSaver from "file-saver";

interface CutPositions {
  horizontal: number[]
  vertical: number[]
  rationale: string
}

export default function AIImageCutter({
  initialImageUrl,
  initialImageName
}: { initialImageUrl: string; initialImageName: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [instruction, setInstruction] = useState("");
  const [cutPositions, setCutPositions] = useState<CutPositions>({
    horizontal: [],
    vertical: [],
    rationale: ""
  });
  const [fragments, setFragments] = useState<string[]>([]);
  const [selectedFragments, setSelectedFragments] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const { cropByLines } = useCropWithLines(imageUrl);

  // Cargar la imagen
  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      imageRef.current = img;
      setImageSize({ width: img.width, height: img.height });
      drawImageAndLines();
    };

    img.src = imageUrl;
  }, [imageUrl]);

  // Dibujar la imagen y las líneas en el canvas
  const drawImageAndLines = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Ajustar el tamaño del canvas
    const containerWidth = 800; // Ajustar según necesidad
    const scale = Math.min(1, containerWidth / img.width);
    const width = img.width * scale * zoom;
    const height = img.height * scale * zoom;

    canvas.width = width;
    canvas.height = height;

    // Dibujar la imagen
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Dibujar líneas
    ctx.lineWidth = 2;

    // Líneas horizontales
    ctx.strokeStyle = "#ff3e00";
    cutPositions.horizontal.forEach((pos) => {
      const y = pos * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });

    // Líneas verticales
    ctx.strokeStyle = "#3b82f6";
    cutPositions.vertical.forEach((pos) => {
      const x = pos * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
  };

  // Actualizar el canvas cuando cambian las posiciones o el zoom
  useEffect(() => {
    drawImageAndLines();
  }, [cutPositions, zoom]);

  // Analizar la imagen con IA
  const analyzeWithAI = async () => {
    if (!imageUrl) return;

    setIsAnalyzing(true);

    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: `Analiza esta imagen y sigue esta instrucción: "${instruction || "Identifica las secciones lógicas para dividir esta imagen"}".
                 
                 IMPORTANTE: Devuelve tu respuesta en este formato JSON exacto:
                 {
                   "horizontal": [0.25, 0.75], // Ejemplo: cortes al 25% y 75% de la altura
                   "vertical": [0.33, 0.66],   // Ejemplo: cortes al 33% y 66% del ancho
                   "rationale": "Explicación detallada de por qué elegiste estas posiciones"
                 }
                 
                 Las posiciones deben ser valores normalizados entre 0 y 1.
                 No incluyas los bordes (0 y 1) en tus arrays.`,
        images: [imageUrl]
      });

      try {
        const positions = JSON.parse(text) as CutPositions;
        setCutPositions(positions);
      } catch (e) {
        console.error("Error parsing LLM response", e);
        alert("Error al analizar la respuesta de la IA. Intenta con instrucciones más claras.");
      }
    } catch (e) {
      console.error("Error calling AI", e);
      alert("Error al comunicarse con la IA. Verifica tu conexión e intenta nuevamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generar fragmentos
  const generateFragments = async () => {
    if (!imageUrl || !imageRef.current) return;

    setIsGenerating(true);

    try {
      const results = await cropByLines(
        cutPositions.horizontal,
        cutPositions.vertical,
        imageRef.current.width,
        imageRef.current.height,
        { format: "png", quality: 1.0 }
      );

      setFragments(results);

      // Inicializar todos los fragmentos como seleccionados
      const allIndices = new Set(results.map((_, index) => index));
      setSelectedFragments(allIndices);
    } catch (e) {
      console.error("Error generating fragments", e);
      alert("Error al generar fragmentos. Intenta con diferentes líneas de corte.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Descargar fragmentos
  const downloadFragments = async () => {
    if (fragments.length === 0 || selectedFragments.size === 0) return;

    try {
      const zip = new JSZip();
      const folder = zip.folder("image-fragments");

      let exportCount = 0;

      fragments.forEach((dataUrl, index) => {
        if (selectedFragments.has(index)) {
          const base64Data = dataUrl.split(",")[1];
          folder?.file(`fragment-${exportCount + 1}.png`, base64Data, { base64: true });
          exportCount++;
        }
      });

      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE"
      });

      FileSaver.saveAs(content, `${initialImageName.split(".")[0]}-ai-fragments.zip`);
    } catch (error) {
      console.error("Error generating zip:", error);
      alert("Error al generar el archivo ZIP.");
    }
  };

  // Toggle fragment selection
  const toggleFragmentSelection = (index: number) => {
    const newSelection = new Set(selectedFragments);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedFragments(newSelection);
  };

  return (
    <div className="grid gap-6">
      <div className="mb-6">
        <div className="flex flex-col gap-4 mb-6">

          {cutPositions.rationale && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="font-medium mb-2">Análisis de la IA:</h3>
              <p className="text-sm text-gray-700">{cutPositions.rationale}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-100 rounded-lg shadow-lg p-4 flex justify-center items-center">
          <div className="relative overflow-auto bg-white max-h-[70vh]">
            <canvas ref={canvasRef} className="max-w-full" />
          </div>
        </div>

        <div className="flex justify-between mt-4">
          <div className="flex gap-2">
            <button onClick={() => setZoom(Math.min(zoom + 0.25, 3))} className="btn-outline py-1 px-3 text-sm">
              <ZoomIn size={16} />
            </button>
            <button onClick={() => setZoom(Math.max(zoom - 0.25, 0.5))} className="btn-outline py-1 px-3 text-sm">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => setZoom(1)} className="btn-outline py-1 px-3 text-sm">
              <Undo size={16} />
            </button>
            <div className="flex items-center text-sm text-gray-500 ml-2">Zoom: {Math.round(zoom * 100)}%</div>
          </div>

          <button
            onClick={generateFragments}
            disabled={isGenerating || (cutPositions.horizontal.length === 0 && cutPositions.vertical.length === 0)}
            className="btn-secondary flex items-center gap-2 rounded-full py-2 px-4"
          >
            <Scissors size={16} />
            {isGenerating ? "Generando..." : "Generar Fragmentos"}
          </button>
        </div>
      </div>

      {fragments.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">Fragmentos Generados por IA</h2>
              <p className="text-sm text-gray-600">
                {selectedFragments.size} de {fragments.length} fragmentos seleccionados
              </p>
            </div>
            <button
              onClick={downloadFragments}
              disabled={selectedFragments.size === 0}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} />
              Descargar Seleccionados
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {fragments.map((fragment, index) => (
              <div
                key={index}
                className={`border rounded-md overflow-hidden cursor-pointer transition-colors ${selectedFragments.has(index) ? "border-blue-500 ring-2 ring-blue-200" : "hover:border-gray-400"
                  }`}
                onClick={() => toggleFragmentSelection(index)}
              >
                <div className="aspect-square relative">
                  <img
                    src={fragment || "/placeholder.svg"}
                    alt={`Fragmento ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                    <input
                      type="checkbox"
                      checked={selectedFragments.has(index)}
                      onChange={() => { }}
                      className="w-4 h-4 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="p-2 bg-white">
                  <p className="text-sm font-medium truncate">Fragmento {index + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
