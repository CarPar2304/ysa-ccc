import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, FileCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CandidatosKPIsProps {
  totalCandidatos: number;
  totalBeneficiarios: number;
  totalEvaluaciones: number;
  loading: boolean;
}

export const CandidatosKPIs = ({
  totalCandidatos,
  totalBeneficiarios,
  totalEvaluaciones,
  loading,
}: CandidatosKPIsProps) => {
  const kpis = [
    {
      title: "Total Candidatos",
      value: totalCandidatos,
      icon: Users,
      description: "Sin cupo aprobado",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Beneficiarios",
      value: totalBeneficiarios,
      icon: UserCheck,
      description: "Con cupo aprobado",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Total Evaluaciones",
      value: totalEvaluaciones,
      icon: FileCheck,
      description: "Evaluaciones realizadas",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${kpi.bgColor}`}>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
