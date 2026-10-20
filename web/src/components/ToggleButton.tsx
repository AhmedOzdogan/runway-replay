import type { ComponentProps } from "react";

interface ToggleButtonProps extends ComponentProps<"button"> {
  pressed: boolean;
}

/** Round button that stays highlighted while `pressed` (airports, speeds). */
export function ToggleButton({
  pressed,
  className = "",
  ...props
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`cursor-pointer rounded-full border border-line px-3.5 py-1 hover:border-muted aria-pressed:border-neon aria-pressed:bg-neon aria-pressed:text-night aria-pressed:shadow-neon ${className}`}
      {...props}
    />
  );
}
