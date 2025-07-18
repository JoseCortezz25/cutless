"use client";

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar = ({ step, totalSteps }: ProgressBarProps) => {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="space-y-4 w-full">
      <div className="text-left">
        <p className="text-sm font-medium text-primary">Step {step} of {totalSteps}</p>
        <div className="w-full bg-muted rounded-full h-2.5 mt-1">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}; 