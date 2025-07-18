/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect } from "react";
import { useCropWithLines } from "@/hooks/useCrop";
import { Download, Sparkles, Undo, ZoomIn, ZoomOut, Loader2, AlertTriangle, Key, Info } from "lucide-react";
import JSZip from "jszip";
import FileSaver from "file-saver";

interface ImageInfo {
  width: number
  height: number
  url: string
  name: string
}

interface CutPositions {
  horizontal: number[] // Valores normalizados (0-1)
  vertical: number[] // Valores normalizados (0-1)
  rationale: string // Explicación de las decisiones
}

interface AutoImageCutterProps {
  initialImageUrl: string
  initialImageName: string
}

export default function AutoImageCutter({ initialImageUrl, initialImageName }: AutoImageCutterProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [instruction, setInstruction] = useState("");
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
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
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [useSimulation, setUseSimulation] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [wasSimulated, setWasSimulated] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const { cropByLines } = useCropWithLines(imageUrl);

  // Cargar la imagen y obtener dimensiones
  useEffect(() => {
    if (!imageUrl) return;

    const loadImage = async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = async () => {
          imageRef.current = img;

          // Guardar información de la imagen
          setImageInfo({
            width: img.width,
            height: img.height,
            url: imageUrl,
            name: initialImageName
          });

          drawImageAndLines();
        };

        img.onerror = () => {
          setError("Error al cargar la imagen");
        };

        img.src = imageUrl;
      } catch (err) {
        setError("Error al procesar la imagen");
        console.error(err);
      }
    };

    loadImage();
  }, [imageUrl, initialImageName]);

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

  // Guardar API key en localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem("openai_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("openai_api_key", apiKey.trim());
      setShowApiKeyInput(false);
      setError(null);
      setWarning(null);
    }
  };

  // Analizar la imagen con IA y realizar el corte
  const analyzeAndCut = async () => {
    if (!imageInfo) {
      setError("No hay información de imagen disponible");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setWarning(null);
    setWasSimulated(false);

    try {
      // Llamar a nuestra API route
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageInfo,
          instruction:
            instruction || "Identifica y separa las secciones lógicas o elementos visuales distintos en esta imagen",
          useSimulation: true, // Forzar simulación para evitar errores de API key
          apiKey: apiKey.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al analizar la imagen");
      }

      // Manejar advertencias
      if (data.warning) {
        setWarning(data.warning);
      }

      // Indicar si fue simulado
      if (data.isSimulated) {
        setWasSimulated(true);
      }

      // Actualizar posiciones de corte
      if (data.cutPositions) {
        setCutPositions(data.cutPositions);

        // Generar fragmentos con las posiciones recibidas
        if (data.cutPositions.horizontal || data.cutPositions.vertical) {
          const results = await cropByLines(
            data.cutPositions.horizontal || [],
            data.cutPositions.vertical || [],
            imageInfo.width,
            imageInfo.height,
            { format: "png", quality: 1.0 }
          );

          setFragments(results);

          // Inicializar todos los fragmentos como seleccionados
          const allIndices = new Set(results.map((_, index) => index));
          setSelectedFragments(allIndices);
        }
      }
    } catch (e) {
      console.error("Error en analyzeAndCut:", e);
      setError("Error al procesar la imagen. Usando modo de simulación.");

      // Si hay un error, intentar usar simulación directamente
      if (imageInfo) {
        try {
          // Generar posiciones simuladas localmente
          const simulatedPositions = {
            horizontal: [0.33, 0.66],
            vertical: [0.5],
            rationale: "Análisis simulado debido a un error con la API. Se utilizaron posiciones predeterminadas."
          };

          setCutPositions(simulatedPositions);
          setWasSimulated(true);

          // Generar fragmentos con las posiciones simuladas
          const results = await cropByLines(
            simulatedPositions.horizontal,
            simulatedPositions.vertical,
            imageInfo.width,
            imageInfo.height,
            { format: "png", quality: 1.0 }
          );

          setFragments(results);

          // Inicializar todos los fragmentos como seleccionados
          const allIndices = new Set(results.map((_, index) => index));
          setSelectedFragments(allIndices);
        } catch (simError) {
          console.error("Error en simulación local:", simError);
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Descargar fragmentos
  const downloadFragments = async () => {
    if (fragments.length === 0 || selectedFragments.size === 0) return;

    setIsGenerating(true);

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
      setError("Error al generar el archivo ZIP");
    } finally {
      setIsGenerating(false);
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
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Corte Automático con IA</h2>

            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useSimulation"
                  checked={useSimulation}
                  onChange={(e) => setUseSimulation(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="useSimulation" className="text-sm">
                  Forzar simulación
                </label>
              </div>

              <button
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
              >
                <Key size={14} />
                {showApiKeyInput ? "Ocultar API Key" : "Configurar API Key"}
              </button>
            </div>
          </div>

          {showApiKeyInput && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="font-medium mb-2 text-sm">Configurar OpenAI API Key (Opcional):</h3>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 p-2 border rounded-md text-sm"
                />
                <button onClick={saveApiKey} className="btn-primary text-sm py-1">
                  Guardar
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Si no tienes una API key, la aplicación usará automáticamente el modo de simulación.
              </p>
            </div>
          )}

          {warning && (
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 flex items-start gap-3">
              <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h3 className="font-medium text-sm text-yellow-800">Aviso</h3>
                <p className="text-xs text-yellow-700 mt-1">{warning}</p>
              </div>
            </div>
          )}

          {wasSimulated && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 flex items-start gap-3">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <h3 className="font-medium text-sm text-blue-800">Análisis Simulado</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Este análisis fue generado usando un algoritmo de simulación. Para obtener resultados más precisos con
                  IA real, configura una API key válida de OpenAI.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 items-start">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Describe cómo quieres que la IA corte la imagen. Ejemplo: 'Divide la imagen en secciones lógicas' o 'Separa cada persona en la foto'"
              className="flex-1 p-3 border rounded-md min-h-[80px]"
            />
            <button
              onClick={analyzeAndCut}
              disabled={isAnalyzing || !imageInfo}
              className="btn-primary flex items-center gap-2 h-10"
            >
              {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {isAnalyzing ? "Analizando..." : "Analizar y Cortar"}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
              <h3 className="font-medium mb-1">Error:</h3>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {cutPositions.rationale && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="font-medium mb-2">Análisis:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-line">{cutPositions.rationale}</p>
            </div>
          )}

          {imageInfo && (
            <div className="text-sm text-gray-500">
              Dimensiones de la imagen: {imageInfo.width}px × {imageInfo.height}px
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
        </div>
      </div>

      {fragments.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">Fragmentos Generados</h2>
              <p className="text-sm text-gray-600">
                {selectedFragments.size} de {fragments.length} fragmentos seleccionados
              </p>
            </div>
            <button
              onClick={downloadFragments}
              disabled={selectedFragments.size === 0 || isGenerating}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={16} />
              {isGenerating ? "Generando..." : "Descargar Seleccionados"}
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
