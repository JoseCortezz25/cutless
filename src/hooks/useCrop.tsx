'use client';

import { useState, useCallback, useEffect } from 'react';

// Tipos para las opciones de recorte
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  backgroundColor?: string;
}

export interface UseCropResult {
  crop: (area: CropArea, options?: CropOptions) => Promise<string | null>;
  cropMultiple: (areas: CropArea[], options?: CropOptions) => Promise<string[]>;
  isProcessing: boolean;
  error: string | null;
}

export function useCrop(
  imageSource: string | HTMLImageElement | null
): UseCropResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Cargar la imagen si se proporciona como string (URL)
  useEffect(() => {
    if (!imageSource) {
      setImage(null);
      return;
    }

    // Si ya es un HTMLImageElement, usarlo directamente
    if (imageSource instanceof HTMLImageElement) {
      setImage(imageSource);
      return;
    }

    // Si es una URL, cargar la imagen
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setImage(img);
      setError(null);
    };

    img.onerror = () => {
      setError('Error al cargar la imagen');
      setImage(null);
    };

    img.src = imageSource;
  }, [imageSource]);

  // Función principal de recorte
  const crop = useCallback(
    async (
      area: CropArea,
      options: CropOptions = {}
    ): Promise<string | null> => {
      if (!image) {
        setError('No hay imagen cargada');
        return null;
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Valores por defecto
        const {
          format = 'png',
          quality = 1.0,
          backgroundColor = '#FFFFFF'
        } = options;

        // Validar el área de recorte
        if (
          area.x < 0 ||
          area.y < 0 ||
          area.x + area.width > image.width ||
          area.y + area.height > image.height
        ) {
          throw new Error('El área de recorte excede los límites de la imagen');
        }

        // Crear canvas temporal
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: format === 'png' });

        if (!ctx) {
          throw new Error('No se pudo crear el contexto del canvas');
        }

        // Establecer dimensiones del canvas
        canvas.width = area.width;
        canvas.height = area.height;

        // Si no es PNG, llenar con color de fondo
        if (format !== 'png') {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, area.width, area.height);
        }

        // Dibujar la porción de la imagen
        ctx.drawImage(
          image,
          area.x,
          area.y,
          area.width,
          area.height, // Área fuente
          0,
          0,
          area.width,
          area.height // Área destino
        );

        // Convertir a data URL
        const mimeType = `image/${format}`;
        const dataUrl = canvas.toDataURL(mimeType, quality);

        setIsProcessing(false);
        return dataUrl;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error al recortar la imagen';
        setError(errorMessage);
        setIsProcessing(false);
        return null;
      }
    },
    [image]
  );

  // Función para recortar múltiples áreas
  const cropMultiple = useCallback(
    async (areas: CropArea[], options: CropOptions = {}): Promise<string[]> => {
      const results: string[] = [];

      for (const area of areas) {
        const result = await crop(area, options);
        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [crop]
  );

  return {
    crop,
    cropMultiple,
    isProcessing,
    error
  };
}

// Hook auxiliar para trabajar con líneas de corte (como en tu aplicación)
export interface CutLine {
  position: number; // Posición normalizada (0-1)
  type: 'horizontal' | 'vertical';
}

export function useCropWithLines(
  imageSource: string | HTMLImageElement | null
) {
  const cropHook = useCrop(imageSource);

  const cropByLines = useCallback(
    async (
      horizontalLines: number[],
      verticalLines: number[],
      imageWidth: number,
      imageHeight: number,
      options?: CropOptions
    ): Promise<string[]> => {
      // Convertir posiciones normalizadas a píxeles y ordenar
      const hLines = [
        0,
        ...horizontalLines
          .map(pos => Math.floor(pos * imageHeight))
          .sort((a, b) => a - b),
        imageHeight
      ];
      const vLines = [
        0,
        ...verticalLines
          .map(pos => Math.floor(pos * imageWidth))
          .sort((a, b) => a - b),
        imageWidth
      ];

      const areas: CropArea[] = [];

      // Generar áreas de recorte
      for (let i = 0; i < hLines.length - 1; i++) {
        for (let j = 0; j < vLines.length - 1; j++) {
          const area: CropArea = {
            x: vLines[j],
            y: hLines[i],
            width: vLines[j + 1] - vLines[j],
            height: hLines[i + 1] - hLines[i]
          };

          // Solo añadir áreas con dimensiones válidas
          if (area.width > 0 && area.height > 0) {
            areas.push(area);
          }
        }
      }

      return cropHook.cropMultiple(areas, options);
    },
    [cropHook]
  );

  return {
    ...cropHook,
    cropByLines
  };
}
