/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import type React from 'react';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Plus, ZoomIn, ZoomOut, Undo, Scissors, Download } from 'lucide-react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

type Line = {
  id: string;
  position: number; // Ahora será un valor normalizado entre 0-1
  type: 'horizontal' | 'vertical';
};

interface ImageCutterProps {
  initialImageUrl: string;
  initialImageName: string;
  onFragmentsGenerated: (fragments: string[]) => void;
}

export const ImageCutter = ({
  initialImageUrl,
  initialImageName,
  onFragmentsGenerated
}: ImageCutterProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [fragments, setFragments] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [selectedFragments, setSelectedFragments] = useState<Set<number>>(
    new Set()
  );
  const [lastLinePosition, setLastLinePosition] = useState<{
    horizontal: number | null;
    vertical: number | null;
  }>({
    horizontal: null,
    vertical: null
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load the initial image
  useEffect(() => {
    if (!initialImageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      console.log('Image loaded successfully:', img.width, 'x', img.height);
      setImage(img);

      // Calculate scale to fit the image in the container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const scale = Math.min(1, containerWidth / img.width);
        console.log(
          'Scale calculated:',
          scale,
          'Container width:',
          containerWidth
        );
        setScale(scale);
        setCanvasSize({
          width: img.width * scale,
          height: img.height * scale
        });
      }
    };

    img.onerror = error => {
      console.error('Error loading image:', error);
    };

    img.src = initialImageUrl;
  }, [initialImageUrl]);

  // Add a new line
  const addLine = (type: 'horizontal' | 'vertical') => {
    if (!image) return;

    // Default offset from the last line (normalizado)
    const offset = 0.05; // 5% de la dimensión

    let position: number;

    if (type === 'horizontal') {
      // Si hay una posición anterior, coloca la nueva línea debajo
      if (lastLinePosition.horizontal !== null) {
        // Calcula la nueva posición basada en la última posición más el offset
        position = Math.min(
          Math.max(lastLinePosition.horizontal + offset, 0),
          0.95
        );
      } else {
        // Comienza desde arriba (con un pequeño margen)
        position = 0.1; // 10% desde arriba
      }

      // Actualiza la última posición horizontal
      setLastLinePosition(prev => ({ ...prev, horizontal: position }));
    } else {
      // Línea vertical
      if (lastLinePosition.vertical !== null) {
        position = Math.min(
          Math.max(lastLinePosition.vertical + offset, 0),
          0.95
        );
      } else {
        // Comienza desde la izquierda (con un pequeño margen)
        position = 0.1; // 10% desde la izquierda
      }

      // Actualiza la última posición vertical
      setLastLinePosition(prev => ({ ...prev, vertical: position }));
    }

    const newLine: Line = {
      id: `line-${Date.now()}`,
      position,
      type
    };

    setLines([...lines, newLine]);
    setSelectedLineId(newLine.id);
  };

  // Handle keyboard events for line movement and shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Atajos para añadir líneas
    if (e.key.toLowerCase() === 'h') {
      e.preventDefault();
      addLine('horizontal');
      return;
    }

    if (e.key.toLowerCase() === 'v') {
      e.preventDefault();
      addLine('vertical');
      return;
    }

    // Movimiento de líneas con teclas de flecha
    if (!selectedLineId) return;

    const line = lines.find(l => l.id === selectedLineId);
    if (!line) return;

    const step = e.shiftKey ? 0.02 : 0.005; // Paso normalizado (2% o 0.5%)
    let newPosition = line.position;

    if (line.type === 'horizontal') {
      if (e.key === 'ArrowUp') newPosition = Math.max(0, line.position - step);
      if (e.key === 'ArrowDown')
        newPosition = Math.min(1, line.position + step);
    } else {
      if (e.key === 'ArrowLeft')
        newPosition = Math.max(0, line.position - step);
      if (e.key === 'ArrowRight')
        newPosition = Math.min(1, line.position + step);
    }

    if (newPosition !== line.position) {
      const updatedLines = lines.map(l =>
        l.id === selectedLineId ? { ...l, position: newPosition } : l
      );
      setLines(updatedLines);

      // Actualiza la última posición de línea al mover una línea
      if (line.type === 'horizontal') {
        setLastLinePosition(prev => ({ ...prev, horizontal: newPosition }));
      } else {
        setLastLinePosition(prev => ({ ...prev, vertical: newPosition }));
      }

      e.preventDefault();
    }
  };

  // Mouse event handlers for line dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedLineId) return;

    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLineId || !canvasRef.current || !image) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const line = lines.find(l => l.id === selectedLineId);
    if (!line) return;

    let newPosition: number;

    if (line.type === 'horizontal') {
      // Convertir la posición del ratón a un valor normalizado (0-1)
      newPosition = Math.max(
        0,
        Math.min((e.clientY - rect.top) / (canvasSize.height * zoom), 1)
      );
    } else {
      // Convertir la posición del ratón a un valor normalizado (0-1)
      newPosition = Math.max(
        0,
        Math.min((e.clientX - rect.left) / (canvasSize.width * zoom), 1)
      );
    }

    const updatedLines = lines.map(l =>
      l.id === selectedLineId ? { ...l, position: newPosition } : l
    );
    setLines(updatedLines);

    // Actualiza la última posición de línea al arrastrar
    if (line.type === 'horizontal') {
      setLastLinePosition(prev => ({ ...prev, horizontal: newPosition }));
    } else {
      setLastLinePosition(prev => ({ ...prev, vertical: newPosition }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom in/out
  const handleZoomIn = () => {
    if (zoom < 3) {
      setZoom(prevZoom => Math.min(prevZoom + 0.25, 3));
    }
  };

  const handleZoomOut = () => {
    if (zoom > 0.5) {
      setZoom(prevZoom => Math.max(prevZoom - 0.25, 0.5));
    }
  };

  // Reset zoom
  const handleResetZoom = () => {
    setZoom(1);
  };

  // Draw the image and lines on the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx || !image) {
      console.log('Canvas, context, or image not available');
      return;
    }

    // Calculate zoomed dimensions
    const zoomedWidth = canvasSize.width * zoom;
    const zoomedHeight = canvasSize.height * zoom;

    // Update canvas size for zoom
    if (canvas.width !== zoomedWidth || canvas.height !== zoomedHeight) {
      canvas.width = zoomedWidth;
      canvas.height = zoomedHeight;
      console.log(
        'Updated canvas dimensions with zoom:',
        canvas.width,
        'x',
        canvas.height
      );
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image with zoom
    try {
      ctx.drawImage(image, 0, 0, zoomedWidth, zoomedHeight);
      console.log('Image drawn on canvas with zoom:', zoom);
    } catch (error) {
      console.error('Error drawing image:', error);
    }

    // Draw lines with enhanced visibility
    lines.forEach(line => {
      ctx.beginPath();

      // Establece el estilo de línea
      ctx.lineWidth = 2;
      ctx.strokeStyle = line.id === selectedLineId ? '#ff3e00' : '#3b82f6';

      // Añade una sombra sutil para mejor visibilidad
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (line.type === 'horizontal') {
        // Convierte la posición normalizada a coordenadas de pantalla
        const yPos = line.position * zoomedHeight;
        // Dibuja la línea horizontal a lo largo de todo el ancho
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvas.width, yPos);
      } else {
        // Convierte la posición normalizada a coordenadas de pantalla
        const xPos = line.position * zoomedWidth;
        // Dibuja la línea vertical a lo largo de toda la altura
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, canvas.height);
      }

      ctx.stroke();

      // Restablece la sombra para las siguientes operaciones
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    });
  }, [image, lines, selectedLineId, canvasSize, zoom]);

  // Add event listeners for mouse events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    // Add global mouse up event to handle cases where mouse is released outside the canvas
    document.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Generate image fragments with high quality
  const generateFragments = () => {
    if (!image || !canvasRef.current) return;

    // Convierte las posiciones normalizadas a coordenadas de la imagen original
    const horizontalLines = lines
      .filter(line => line.type === 'horizontal')
      .map(line => Math.floor(line.position * image.height))
      .sort((a, b) => a - b);

    const verticalLines = lines
      .filter(line => line.type === 'vertical')
      .map(line => Math.floor(line.position * image.width))
      .sort((a, b) => a - b);

    // Añade los límites de la imagen
    const hLines = [0, ...horizontalLines, image.height];
    const vLines = [0, ...verticalLines, image.width];

    // Create temporary canvas for cutting at ORIGINAL resolution
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { alpha: false });
    if (!tempCtx) return;

    const newFragments: string[] = [];

    // Cut image into fragments at ORIGINAL resolution
    for (let i = 0; i < hLines.length - 1; i++) {
      for (let j = 0; j < vLines.length - 1; j++) {
        const x = vLines[j];
        const y = hLines[i];
        const width = vLines[j + 1] - vLines[j];
        const height = hLines[i + 1] - hLines[i];

        // Skip fragments with zero dimensions
        if (width <= 0 || height <= 0) continue;

        // Set canvas to the EXACT size of the fragment at ORIGINAL resolution
        tempCanvas.width = width;
        tempCanvas.height = height;

        // Clear the canvas with white background to avoid transparency issues
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, width, height);

        // Draw the fragment at full resolution
        tempCtx.drawImage(
          image,
          x,
          y,
          width,
          height, // Source rectangle (from original image)
          0,
          0,
          width,
          height // Destination rectangle (on canvas)
        );

        // Get the image data at maximum quality
        const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
        newFragments.push(dataUrl);
      }
    }

    setFragments(newFragments);

    // Initialize all fragments as selected
    const allIndices = new Set(newFragments.map((_, index) => index));
    setSelectedFragments(allIndices);

    // Call the callback with the generated fragments
    onFragmentsGenerated(newFragments);
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

    // Update the fragments in the callback
    const selectedFragmentsArray = Array.from(fragments).filter((_, i) =>
      newSelection.has(i)
    );
    onFragmentsGenerated(selectedFragmentsArray);
  };

  // Download selected fragments
  const downloadFragments = async () => {
    if (fragments.length === 0 || selectedFragments.size === 0) return;

    setIsGenerating(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('image-fragments');

      let exportCount = 0;

      fragments.forEach((dataUrl, index) => {
        // Only include selected fragments
        if (selectedFragments.has(index)) {
          const base64Data = dataUrl.split(',')[1];
          folder?.file(`fragment-${exportCount + 1}.png`, base64Data, {
            base64: true
          });
          exportCount++;
        }
      });

      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE' // No compression to maintain quality
      });

      FileSaver.saveAs(
        content,
        `${initialImageName.split('.')[0]}-fragments.zip`
      );
    } catch (error) {
      console.error('Error generating zip:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="mb-6">
        <div className="mb-4 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => addLine('horizontal')}
            className="flex items-center gap-2 rounded-full px-4 py-2"
          >
            <Plus size={16} />
            Añadir Línea Horizontal
          </Button>
          <Button
            variant="secondary"
            onClick={() => addLine('vertical')}
            className="flex items-center gap-2 rounded-full px-4 py-2"
          >
            <Plus size={16} />
            Añadir Línea Vertical
          </Button>
        </div>

        <div
          className="flex items-center justify-center rounded-lg bg-gray-100 p-4 shadow-lg"
          ref={containerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div
            className="relative overflow-auto bg-white"
            style={{
              maxHeight: '70vh',
              width: '100%'
            }}
            ref={editorRef}
          >
            <div className="flex min-h-[200px] items-center justify-center">
              {image && (
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width * zoom}
                  height={canvasSize.height * zoom}
                  onClick={e => {
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect || !image) return;

                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    // Convierte las coordenadas del clic a valores normalizados
                    const normalizedX = x / (canvasSize.width * zoom);
                    const normalizedY = y / (canvasSize.height * zoom);

                    // Encuentra la línea más cercana al clic
                    let closestLine: Line | null = null;
                    let minDistance = 0.02; // Umbral para selección (2% de la dimensión)

                    lines.forEach(line => {
                      let distance;
                      if (line.type === 'horizontal') {
                        distance = Math.abs(normalizedY - line.position);
                      } else {
                        distance = Math.abs(normalizedX - line.position);
                      }

                      if (distance < minDistance) {
                        minDistance = distance;
                        closestLine = line;
                      }
                    });

                    setSelectedLineId(
                      closestLine ? (closestLine as Line).id : null
                    );
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    cursor: selectedLineId
                      ? isDragging
                        ? 'grabbing'
                        : 'grab'
                      : 'default'
                  }}
                  className="max-w-full"
                />
              )}
              {!image && (
                <div className="py-10 text-center text-gray-500">
                  Cargando imagen...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button onClick={generateFragments} disabled={lines.length === 0}>
            <Scissors size={16} />
            Generar Fragmentos
          </Button>
        </div>
      </div>

      <section>
        {fragments.length > 0 && (
          <div className="mt-8 border-t border-t-gray-200 pt-10">
            <div className="mb-4 flex items-center justify-between">
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Fragments</h2>
                <p className="text-sm text-gray-600">
                  {selectedFragments.size} of {fragments.length} fragments
                  selected
                </p>
              </div>
              <Button
                onClick={downloadFragments}
                disabled={isGenerating || selectedFragments.size === 0}
                className="flex items-center gap-2"
              >
                <Download size={16} />
                {isGenerating ? 'Generating...' : 'Download Selected'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {fragments.map((fragment, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex cursor-pointer items-center gap-4 rounded-md border p-3 transition-colors',
                    selectedFragments.has(index)
                      ? 'border-gray-500 bg-gray-50'
                      : 'hover:bg-gray-50'
                  )}
                  onClick={() => toggleFragmentSelection(index)}
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    <img
                      src={fragment || '/placeholder.svg'}
                      alt={`Fragment ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="line-clamp-1 font-medium">
                      Fragment {index + 1}
                    </p>
                    <p className="line-clamp-1 text-sm text-gray-500">
                      Fragment {index + 1}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedFragments.has(index)}
                    onChange={() => {}}
                    className="pointer-events-none h-5 w-5 accent-gray-800"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
