type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  inverted?: boolean;
  centered?: boolean;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  inverted = false,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <span className={`eyebrow ${inverted ? '!text-beige' : ''}`}>{eyebrow}</span>
      <h2 className={`heading-serif ${inverted ? '!text-warm' : ''}`}>{title}</h2>
      {description && (
        <p className={`mt-5 text-base leading-relaxed ${inverted ? 'text-warm/75' : 'text-ink/70'}`}>
          {description}
        </p>
      )}
    </div>
  );
}
