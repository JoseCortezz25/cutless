import { Steps } from "@/lib/types";
import { Button } from "../ui/button";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useEmail } from "@/stores/use-email";

interface UploadImageProps {
  onNext: (step: Steps) => void;
}

export const UploadImage = ({ onNext }: UploadImageProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setImage } = useEmail();

  const handleSubmit = () => {
    if (file) {
      setImage(file);
    }
    onNext(Steps.CUT_IMAGE);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImage(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setImage(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-left">Upload Image</h1>
      <div
        className={cn(
          "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-card text-card-foreground shadow-sm",
          isDragging ? "border-primary bg-accent" : "border-input"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <p className="mb-2 text-lg font-bold text-foreground">
            {file ? file.name : "Drag and drop an image here, or"}
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            We recommend using a high-quality image for the best results.
            <br />
            Supported formats: JPG, PNG. Maximum file size: 5MB.
          </p>
          <Button type="button" variant="ghost" onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}>
            Browse Files
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept="image/jpeg,image/png"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!file} className="bg-blue-700 hover:bg-blue-800 rounded-full">
          Generate Email
        </Button>
      </div>
    </div>
  );
};
