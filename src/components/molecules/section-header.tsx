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
    <header className="flex items-center mb-10 mx-auto bg-blue-200/30 rounded-xl p-4 gap-3">
      <div className="size-[36px] rounded-full bg-blue-500 text-white font-bold flex items-center justify-center">
        {step}
      </div>
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-gray-500">{description}</p>
      </div>
    </header>
  );
};