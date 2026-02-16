import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Minus, Quote } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

const tools = [
  { icon: Heading1, label: "Título", prefix: "# ", suffix: "", block: true },
  { icon: Heading2, label: "Subtítulo", prefix: "## ", suffix: "", block: true },
  { icon: Heading3, label: "Encabezado", prefix: "### ", suffix: "", block: true },
  { icon: Bold, label: "Negrita", prefix: "**", suffix: "**", block: false },
  { icon: Italic, label: "Itálica", prefix: "_", suffix: "_", block: false },
  { icon: List, label: "Lista", prefix: "- ", suffix: "", block: true },
  { icon: ListOrdered, label: "Lista numerada", prefix: "1. ", suffix: "", block: true },
  { icon: Quote, label: "Cita", prefix: "> ", suffix: "", block: true },
  { icon: Minus, label: "Separador", prefix: "\n---\n", suffix: "", block: true },
];

export const MarkdownToolbar = ({ textareaRef, value, onChange }: MarkdownToolbarProps) => {
  const applyFormat = (prefix: string, suffix: string, block: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    let newValue: string;
    let cursorPos: number;

    if (block && !selected) {
      const beforeCursor = value.substring(0, start);
      const needsNewline = beforeCursor.length > 0 && !beforeCursor.endsWith("\n");
      const insert = (needsNewline ? "\n" : "") + prefix;
      newValue = beforeCursor + insert + value.substring(end);
      cursorPos = start + insert.length;
    } else if (selected) {
      newValue = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
      cursorPos = start + prefix.length + selected.length + suffix.length;
    } else {
      newValue = value.substring(0, start) + prefix + suffix + value.substring(end);
      cursorPos = start + prefix.length;
    }

    onChange(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-0.5 p-1.5 border border-border rounded-t-md bg-muted/50 flex-wrap">
        {tools.map((tool, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => applyFormat(tool.prefix, tool.suffix, tool.block)}
              >
                <tool.icon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {tool.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};
