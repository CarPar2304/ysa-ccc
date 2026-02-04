import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { marked } from "marked";
import html2pdf from "html2pdf.js";

interface Emprendimiento {
  id: string;
  nombre: string;
}

interface Diagnostico {
  id: string;
  emprendimiento_id: string;
  contenido: string;
  visible_para_usuario: boolean;
  created_at: string;
}

interface DiagnosticExportModalProps {
  diagnosticos: Diagnostico[];
  emprendimientos: Emprendimiento[];
}

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true
});

// Helper function to strip markdown for preview display
const stripMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s?/g, '')           // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1')     // Remove bold
    .replace(/\*(.+?)\*/g, '$1')         // Remove italic
    .replace(/\|/g, ' ')                 // Replace table pipes
    .replace(/[-:]+\|[-:|\s]+/g, '')     // Remove table separators
    .replace(/\n+/g, ' ')                // Collapse newlines
    .trim();
};

export function DiagnosticExportModal({ diagnosticos, emprendimientos }: DiagnosticExportModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const getEmprendimientoNombre = (empId: string) => {
    return emprendimientos.find(e => e.id === empId)?.nombre || "Sin nombre";
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === diagnosticos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(diagnosticos.map(d => d.id));
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Selecciona diagnósticos",
        description: "Debes seleccionar al menos un diagnóstico para exportar",
        variant: "destructive",
      });
      return;
    }

    setExporting(true);

    try {
      const selectedDiagnosticos = diagnosticos.filter(d => selectedIds.includes(d.id));
      
      // Create hidden container for PDF generation
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "210mm";
      container.style.background = "#ffffff";
      document.body.appendChild(container);

      // Build HTML content with proper styling
      let htmlContent = `
        <style>
          * {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1f2937;
          }
          .diagnostic-page {
            page-break-after: always;
            padding: 20px;
            background: #ffffff;
          }
          .diagnostic-page:last-child {
            page-break-after: avoid;
          }
          .diagnostic-header {
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .diagnostic-title {
            font-size: 22px;
            font-weight: bold;
            color: #1e40af;
            margin: 0 0 8px 0;
          }
          .diagnostic-meta {
            font-size: 12px;
            color: #6b7280;
          }
          .diagnostic-content {
            font-size: 12px;
            color: #374151;
          }
          .diagnostic-content h1 {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
            margin: 16px 0 8px 0;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 4px;
          }
          .diagnostic-content h2 {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin: 14px 0 6px 0;
          }
          .diagnostic-content h3 {
            font-size: 14px;
            font-weight: 600;
            color: #4b5563;
            margin: 12px 0 4px 0;
          }
          .diagnostic-content p {
            margin: 8px 0;
          }
          .diagnostic-content ul, .diagnostic-content ol {
            margin: 8px 0;
            padding-left: 20px;
          }
          .diagnostic-content li {
            margin: 4px 0;
          }
          .diagnostic-content strong {
            font-weight: 600;
          }
          .diagnostic-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 10px;
            table-layout: fixed;
          }
          .diagnostic-content th, .diagnostic-content td {
            border: 1px solid #d1d5db;
            padding: 6px 8px;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          .diagnostic-content th {
            background-color: #f3f4f6;
            font-weight: 600;
            color: #374151;
          }
          .diagnostic-content tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .diagnostic-content blockquote {
            border-left: 3px solid #3b82f6;
            padding-left: 12px;
            margin: 12px 0;
            color: #6b7280;
            font-style: italic;
          }
          .diagnostic-content code {
            background-color: #f3f4f6;
            padding: 2px 4px;
            border-radius: 3px;
            font-size: 11px;
          }
          .diagnostic-content pre {
            background-color: #1f2937;
            color: #f9fafb;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 11px;
          }
          .diagnostic-content pre code {
            background: none;
            color: inherit;
          }
        </style>
      `;

      // Build content for each diagnostic using marked
      for (const diag of selectedDiagnosticos) {
        const empNombre = getEmprendimientoNombre(diag.emprendimiento_id);
        const fechaCreacion = new Date(diag.created_at).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });

        // Use marked to convert markdown to HTML
        const renderedContent = diag.contenido 
          ? marked.parse(diag.contenido) 
          : "<p>Sin contenido</p>";

        htmlContent += `
          <div class="diagnostic-page">
            <div class="diagnostic-header">
              <h1 class="diagnostic-title">Diagnóstico: ${empNombre}</h1>
              <p class="diagnostic-meta">Fecha de creación: ${fechaCreacion}</p>
            </div>
            <div class="diagnostic-content">
              ${renderedContent}
            </div>
          </div>
        `;
      }

      container.innerHTML = htmlContent;

      // Generate PDF
      const opt = {
        margin: [15, 15, 15, 15],
        filename: selectedDiagnosticos.length === 1 
          ? `diagnostico-${getEmprendimientoNombre(selectedDiagnosticos[0].emprendimiento_id).replace(/\s+/g, "-").toLowerCase()}.pdf`
          : `diagnosticos-${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: "#ffffff"
        },
        jsPDF: { 
          unit: "mm", 
          format: "a4", 
          orientation: "portrait" 
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] }
      };

      await html2pdf().set(opt).from(container).save();

      // Cleanup
      document.body.removeChild(container);

      toast({
        title: "PDF exportado",
        description: `Se exportaron ${selectedDiagnosticos.length} diagnóstico(s) correctamente`,
      });

      setOpen(false);
      setSelectedIds([]);
    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error al exportar",
        description: error.message || "No se pudo generar el PDF",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Diagnósticos a PDF</DialogTitle>
          <DialogDescription>
            Selecciona los diagnósticos que deseas exportar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedIds.length === diagnosticos.length && diagnosticos.length > 0}
                onCheckedChange={selectAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer text-sm">
                Seleccionar todos ({diagnosticos.length})
              </Label>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedIds.length} seleccionados
            </span>
          </div>

          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {diagnosticos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  No hay diagnósticos disponibles
                </p>
              ) : (
                diagnosticos.map((diag) => {
                  const empNombre = getEmprendimientoNombre(diag.emprendimiento_id);
                  return (
                    <div
                      key={diag.id}
                      className={`flex items-start space-x-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        selectedIds.includes(diag.id) 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => toggleSelection(diag.id)}
                    >
                      <Checkbox
                        id={diag.id}
                        checked={selectedIds.includes(diag.id)}
                        onCheckedChange={() => toggleSelection(diag.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label 
                          htmlFor={diag.id} 
                          className="font-medium cursor-pointer block truncate text-sm"
                        >
                          {empNombre}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {stripMarkdown(diag.contenido?.substring(0, 150) || "")}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(diag.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              size="sm"
              onClick={handleExport} 
              disabled={exporting || selectedIds.length === 0}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
