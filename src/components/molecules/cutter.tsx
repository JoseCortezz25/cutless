"use client";

import { ImageCutter } from "./image-cutter";
import { Button } from "../ui/button";
import { useEmail } from "@/stores/use-email";
import { useEffect, useState } from "react";
import { Steps } from "@/lib/types";
import { systemPrompt } from "@/lib/prompts";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { Loader2 } from "lucide-react";
import { Fragment } from "@/stores/use-email";

const google = createGoogleGenerativeAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY
});


interface CutterProps {
  onNext: (step: Steps) => void;
}

export const Cutter = ({ onNext }: CutterProps) => {
  const { image, setFragments, fragments, setGeneratedHtml } = useEmail();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateEmail = async () => {
    try {
      setIsGenerating(true);

      const fragmentFileNames = fragments.map(f => f.id);

      const messagesWithFragments = fragments.map((fragment: Fragment): { type: string, image: URL } => {
        return {
          type: "image",
          image: new URL(fragment.base64)
        };
      });

      const response = await generateText({
        model: google('gemini-2.5-pro'),
        system: systemPrompt,
        temperature: 0.7,
        // prompt: `For these fragments, you must generate the HTML code for the email. ,
        messages: [
          {
            role: "user",
            content: "For these fragments, you must generate the HTML code for the email. For that task you have to look the images for set amount of columns for each column, but you have to set name of fragment or image in src attribute. The images are in the following order: " + fragmentFileNames.join(', ')
          },
          {
            role: "user",
            content: messagesWithFragments
          }
        ]
      });

      console.log(response);

      setGeneratedHtml(response.text);
      onNext(Steps.PREVIEW);

    } catch (error) {
      console.error("error en la AI", error);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (image instanceof Blob) {
      console.log(image);

      setImageUrl(URL.createObjectURL(image));
      setImageName(image.name);
    }
  }, [image]);

  function dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      throw new Error("Invalid data URL");
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  const handleFragmentsGenerated = (base64Fragments: string[]) => {
    const newFragments: Fragment[] = base64Fragments.map((b64, index) => {
      const fileName = `fragment-${index + 1}.png`;
      return {
        id: fileName,
        file: dataURLtoFile(b64, fileName),
        base64: b64
      };
    });
    setFragments(newFragments);
  };

  return (
    <div className="w-full mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#0d141c] tracking-light text-[32px] font-bold leading-tight min-w-72">Image Cropping and Selection</p>
        <p className="text-[#0d141c] text-base font-normal leading-normal pb-3 pt-1">
          Use the tools below to crop your uploaded image into sections. Select the specific fragments you want to include in your email generation.
        </p>
      </div>

      <div className="mb-8">
        <ImageCutter
          initialImageUrl={imageUrl || ""}
          initialImageName={imageName || "imagen.jpg"}
          onFragmentsGenerated={handleFragmentsGenerated}
        />
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-blue-700 hover:bg-blue-800 rounded-full"
          onClick={generateEmail}
          disabled={fragments.length === 0 || isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate code"}
          {isGenerating && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
        </Button>
      </div>
    </div>
  );
};
