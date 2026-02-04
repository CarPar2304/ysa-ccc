
# Plan: Fix Diagnostic Export Modal and Empty PDF Issue

## Issues Identified

### Issue 1: Modal Shows Raw Markdown
The preview text in the modal shows raw markdown syntax (##, **, etc.) which looks confusing. We need to display a cleaner preview without the markdown formatting.

### Issue 2: Empty PDF Generation
The PDF comes out blank because the manual markdown-to-HTML conversion has critical bugs:
- Line break replacements (`\n` to `<br>`) happen BEFORE table processing
- This corrupts the markdown structure so the table regex never matches
- The content ends up malformed or empty after processing

---

## Solution

### Part 1: Fix Modal Preview Display

**File: `src/components/admin/DiagnosticExportModal.tsx`**

- Clean the preview text by stripping markdown syntax for display purposes only
- Remove `#`, `*`, `|`, and other markdown characters from the preview
- Keep the actual content intact for PDF generation

### Part 2: Fix PDF Generation with Proper Markdown Parser

**File: `src/components/admin/DiagnosticExportModal.tsx`**

Replace the fragile manual markdown parsing with the `marked` library:

1. **Install `marked` package** - A robust, well-tested markdown parser
2. **Use `marked.parse()` to convert markdown to HTML** - This properly handles:
   - Headers (h1, h2, h3)
   - Bold and italic text
   - Tables with proper structure
   - Lists (ordered and unordered)
   - Blockquotes and code blocks

3. **Fix the order of operations:**
   - First convert markdown to HTML using `marked`
   - Then inject the HTML into the container
   - Then generate the PDF

### Part 3: Improve PDF Styling

**File: `src/components/admin/DiagnosticExportModal.tsx`**

- Ensure tables render within margins with proper overflow handling
- Add explicit background colors for light-mode PDF rendering
- Ensure page breaks work correctly between diagnostics

---

## Technical Implementation Details

### Step 1: Add `marked` dependency
```bash
npm install marked @types/marked
```

### Step 2: Refactor `handleExport` function

```typescript
import { marked } from "marked";

// Configure marked for GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: true
});

const handleExport = async () => {
  // ... validation code ...
  
  const selectedDiagnosticos = diagnosticos.filter(d => selectedIds.includes(d.id));
  
  // Create hidden container
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "210mm";
  container.style.background = "#ffffff"; // Force white background
  document.body.appendChild(container);
  
  // Build content with proper markdown conversion
  let htmlContent = `<style>/* ... styles ... */</style>`;
  
  for (const diag of selectedDiagnosticos) {
    const empNombre = getEmprendimientoNombre(diag.emprendimiento_id);
    const fechaCreacion = new Date(diag.created_at).toLocaleDateString("es-CO", {...});
    
    // Use marked to convert markdown to HTML
    const renderedContent = diag.contenido 
      ? marked.parse(diag.contenido) 
      : "<p>Sin contenido</p>";
    
    htmlContent += `
      <div class="diagnostic-page">
        <div class="diagnostic-header">
          <h1 class="diagnostic-title">Diagnóstico: ${empNombre}</h1>
          <p class="diagnostic-meta">Fecha: ${fechaCreacion}</p>
        </div>
        <div class="diagnostic-content">
          ${renderedContent}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = htmlContent;
  
  // Generate PDF
  await html2pdf().set(options).from(container).save();
  
  // Cleanup
  document.body.removeChild(container);
};
```

### Step 3: Fix Modal Preview

```typescript
// Helper function to strip markdown for preview
const stripMarkdown = (text: string): string => {
  return text
    .replace(/#{1,6}\s?/g, '')      // Remove headers
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1')     // Remove italic
    .replace(/\|/g, ' ')             // Replace table pipes
    .replace(/[-:]+\|[-:|\s]+/g, '') // Remove table separators
    .replace(/\n+/g, ' ')            // Collapse newlines
    .trim();
};

// In the render:
<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
  {stripMarkdown(diag.contenido?.substring(0, 150) || "")}...
</p>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Add `marked` and `@types/marked` dependencies |
| `src/components/admin/DiagnosticExportModal.tsx` | Refactor export logic with marked, add preview cleaning |

---

## Expected Results

1. **Modal appearance**: Clean preview text without raw markdown syntax
2. **PDF generation**: Properly rendered content with:
   - Formatted headers, bold, and italic text
   - Correctly structured tables that fit within margins
   - Proper page breaks between multiple diagnostics
   - White background for print-friendly output
