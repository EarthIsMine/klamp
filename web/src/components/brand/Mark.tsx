import Image from "next/image";

type MarkProps = {
  size?: number;
  className?: string;
  label?: string;
  priority?: boolean;
};

export function Mark({ size = 28, className, label, priority = false }: MarkProps) {
  return (
    <Image
      src="/klamp.svg"
      width={size}
      height={size}
      className={className}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      priority={priority}
    />
  );
}
