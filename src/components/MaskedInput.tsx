import * as React from "react";
import { IMaskInput } from "react-imask";
import { cn } from "@/lib/utils";

export interface MaskedInputProps {
  mask: any;
  value: string;
  onAccept: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, mask, value, onAccept, ...props }, ref) => {
    return (
      <IMaskInput
        mask={mask}
        value={value}
        onAccept={(val: any) => onAccept(String(val ?? ""))}
        inputRef={ref as any}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);
MaskedInput.displayName = "MaskedInput";
