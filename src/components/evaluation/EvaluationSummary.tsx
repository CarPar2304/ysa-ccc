import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface EvaluationSummaryProps {
  puntajeImpacto: number;
  puntajeEquipo: number;
  puntajeInnovacion: number;
  puntajeVentas: number;
  puntajeProyeccionFinanciacion: number;
  puntajeReferido: number;
}

export const EvaluationSummary = ({
  puntajeImpacto,
  puntajeEquipo,
  puntajeInnovacion,
  puntajeVentas,
  puntajeProyeccionFinanciacion,
  puntajeReferido,
}: EvaluationSummaryProps) => {
  const puntajeTotal = puntajeImpacto + puntajeEquipo + puntajeInnovacion + puntajeVentas + puntajeProyeccionFinanciacion + puntajeReferido;
  const maxTotal = 105;
  const porcentaje = (puntajeTotal / maxTotal) * 100;

  const data = [
    { name: "Impacto", puntaje: puntajeImpacto, max: 30 },
    { name: "Equipo", puntaje: puntajeEquipo, max: 25 },
    { name: "Innovación", puntaje: puntajeInnovacion, max: 25 },
    { name: "Ventas", puntaje: puntajeVentas, max: 15 },
    { name: "Proyección", puntaje: puntajeProyeccionFinanciacion, max: 5 },
    { name: "Referido", puntaje: puntajeReferido, max: 5 },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de Evaluación</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">
              {puntajeTotal} / {maxTotal}
            </span>
            <span className="text-sm text-muted-foreground">
              {porcentaje.toFixed(1)}%
            </span>
          </div>
          <Progress value={porcentaje} className="h-3" />
        </div>

        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="puntaje" radius={[8, 8, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-semibold">
                {item.puntaje} / {item.max}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
