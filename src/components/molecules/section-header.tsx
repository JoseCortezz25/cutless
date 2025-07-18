interface SectionHeaderProps {
  title: string;
  description: string;
  step: number;
}

export const SectionHeader = ({
  title,
  description,
  step
}: SectionHeaderProps) => {
  return (
    <header className="mx-auto mb-10 flex items-center gap-3 rounded-xl bg-blue-200/30 p-4">
      <div className="flex size-[36px] items-center justify-center rounded-full bg-blue-500 font-bold text-white">
        {step}
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-gray-500">{description}</p>
      </div>
    </header>
  );
};
