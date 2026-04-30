import { Component, ErrorInfo, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Render error:", error, info);
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-reset cuando cambia la ruta para no dejar la app bloqueada
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const msg = this.state.error?.message || "";
      const isDomMutationError = /removeChild|insertBefore|appendChild|not a child of this node/i.test(msg);

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
            {isDomMutationError && (
              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                Si tienes activado el traductor del navegador (Google Translate / "Traducir esta
                página"), desactívalo para este sitio. Suele causar este error.
              </p>
            )}
            {msg && !isDomMutationError && (
              <p className="text-xs text-muted-foreground bg-muted p-3 rounded-md break-words">
                {msg}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleRetry}>Reintentar</Button>
              <Button onClick={this.handleReload}>Recargar página</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => {
  const location = useLocation();
  return (
    <ErrorBoundaryInner resetKey={location.pathname} fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  );
};
