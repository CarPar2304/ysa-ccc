import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { normalizeMarkdown } from "@/lib/markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const components: Components = {
    h2({ node, ...props }) {
      return <h2 className="text-4xl font-bold mt-8 first:mt-0 mb-10 leading-tight text-foreground" {...props} />;
    },
    h3({ node, ...props }) {
      return <h3 className="text-xl font-semibold mt-10 mb-4 text-foreground" {...props} />;
    },
    hr() {
      return <hr className="my-12 border-t-2 border-border" />;
    },
    p({ node, ...props }) {
      return <p className="my-6 leading-relaxed text-foreground/90" {...props} />;
    },
    ul({ node, ...props }) {
      return <ul className="my-8 list-disc pl-6 space-y-2 text-foreground/90" {...props} />;
    },
    ol({ node, ...props }) {
      return <ol className="my-8 list-decimal pl-6 space-y-2 text-foreground/90" {...props} />;
    },
    li({ node, ...props }) {
      return <li className="my-2 leading-relaxed" {...props} />;
    },
    strong({ node, ...props }) {
      return <strong className="font-bold text-foreground" {...props} />;
    },
    table({ node, ...props }) {
      return <table className="my-10 w-full border border-border border-collapse" {...props} />;
    },
    th({ node, ...props }) {
      return <th className="border border-border bg-muted px-4 py-3 text-left font-semibold" {...props} />;
    },
    td({ node, ...props }) {
      return <td className="border border-border px-4 py-3 text-foreground/90" {...props} />;
    },
    br() {
      // Extra spacing for legacy <br> usage
      return <span className="block h-4" aria-hidden="true" />;
    },
  };

  const normalized = normalizeMarkdown(content || "");

  return (
    <div className={["prose prose-sm max-w-none dark:prose-invert", className].filter(Boolean).join(" ")}> 
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {normalized}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
