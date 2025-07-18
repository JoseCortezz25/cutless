import { Steps } from '@/lib/types';
import { Button } from '../ui/button';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useEmail } from '@/stores/use-email';

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
      <div className="my-6 space-y-2">
        <h1 className="text-left text-3xl font-bold tracking-tight">
          Upload Image
        </h1>
        <p className="text-muted-foreground text-sm">
          Upload an image to get started.
        </p>
      </div>
      <div
        className={cn(
          'bg-card text-card-foreground flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed shadow-sm',
          isDragging ? 'border-primary bg-accent' : 'border-input'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
          <p className="text-foreground mb-2 text-lg font-bold">
            {file ? file.name : 'Drag and drop an image here, or'}
          </p>
          <p className="text-muted-foreground mb-4 text-sm">
            We recommend using a high-quality image for the best results.
            <br />
            Supported formats: JPG, PNG. Maximum file size: 5MB.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={e => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
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
        <Button
          onClick={handleSubmit}
          disabled={!file}
          className="rounded-full bg-blue-700 hover:bg-blue-800"
        >
          Generate Email
        </Button>
      </div>
    </div>
  );
};
