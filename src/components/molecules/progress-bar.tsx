'use client';

interface ProgressBarProps {
  step: number;
  totalSteps: number;
}

export const ProgressBar = ({ step, totalSteps }: ProgressBarProps) => {
  const progress = (step / totalSteps) * 100;

  return (
    <div className="w-full space-y-4">
      <div className="text-left">
        <p className="text-primary text-sm font-medium">
          Step {step} of {totalSteps}
        </p>
        <div className="bg-muted mt-1 h-2.5 w-full rounded-full">
          <div
            className="h-2.5 rounded-full bg-blue-600"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};
