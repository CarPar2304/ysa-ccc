import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ScoreInputProps {
  label: string;
  description: string;
  maxScore: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const ScoreInput = ({ 
  label, 
  description, 
  maxScore, 
  value, 
  onChange,
  disabled = false 
}: ScoreInputProps) => {
  const isOverLimit = value > maxScore;
  
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Label className="text-base font-semibold">{label}</Label>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2 min-w-[120px]">
          <Input
            type="number"
            min={0}
            max={maxScore}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className={cn(
              "w-16 text-center font-semibold",
              isOverLimit && "border-destructive text-destructive"
            )}
          />
          <span className="text-sm text-muted-foreground font-medium">/ {maxScore}</span>
        </div>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={maxScore}
        step={1}
        disabled={disabled}
        className={cn(isOverLimit && "opacity-50")}
      />
      {isOverLimit && (
        <p className="text-xs text-destructive font-medium">
          El puntaje no puede exceder {maxScore} puntos
        </p>
      )}
    </div>
  );
};
