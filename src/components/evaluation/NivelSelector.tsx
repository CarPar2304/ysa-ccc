import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NivelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const NivelSelector = ({ value, onChange, disabled = false }: NivelSelectorProps) => {
  return (
    <FormItem>
      <FormLabel>Nivel de Evaluación *</FormLabel>
      <FormControl>
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un nivel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alto">Alto</SelectItem>
            <SelectItem value="medio">Medio</SelectItem>
            <SelectItem value="bajo">Bajo</SelectItem>
          </SelectContent>
        </Select>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};
