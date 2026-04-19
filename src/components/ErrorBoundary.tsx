import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Render error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
            <p className="text-muted-foreground text-sm">
              Ocurrió un error inesperado al mostrar esta sección. Puedes recargar la página para
              intentar de nuevo.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md break-words">
                {this.state.error.message}
              </p>
            )}
            <Button onClick={this.handleReload}>Recargar página</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
