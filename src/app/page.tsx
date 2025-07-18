'use client';

import { useState } from 'react';
import { UploadImage } from '@/components/molecules/upload-image';
import { Steps } from '@/lib/types';
import { Cutter } from '@/components/molecules/cutter';
import { Preview } from '@/components/organisms/preview';
import { ProgressBar } from '@/components/molecules/progress-bar';

export default function Home() {
  const [step, setStep] = useState<Steps>(Steps.UPLOAD_IMAGE);

  const handleNextStep = (step: Steps) => {
    setStep(step);
  };

  return (
    <main className="container mx-auto min-h-screen max-w-2xl py-12">
      <div className="flex items-center justify-between">
        <ProgressBar
          step={
            step === Steps.UPLOAD_IMAGE ? 1 : step === Steps.CUT_IMAGE ? 2 : 3
          }
          totalSteps={3}
        />
      </div>

      <div className="w-full space-y-8">
        {step === Steps.UPLOAD_IMAGE && <UploadImage onNext={handleNextStep} />}

        {step === Steps.CUT_IMAGE && <Cutter onNext={handleNextStep} />}

        {step === Steps.PREVIEW && <Preview onNext={handleNextStep} />}
      </div>
    </main>
  );
}
