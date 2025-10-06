import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const mockModules = [
  {
    id: 1,
    title: "Fundamentos de Emprendimiento",
    description: "Aprende los conceptos básicos para iniciar tu startup",
    progress: 75,
    duration: "4 semanas",
    students: 45,
    status: "En curso",
  },
  {
    id: 2,
    title: "Estrategias de Marketing Digital",
    description: "Domina las herramientas de marketing para hacer crecer tu negocio",
    progress: 30,
    duration: "6 semanas",
    students: 38,
    status: "En curso",
  },
  {
    id: 3,
    title: "Finanzas para Startups",
    description: "Gestión financiera y búsqueda de inversión",
    progress: 0,
    duration: "5 semanas",
    students: 52,
    status: "Próximamente",
  },
];

const Lab = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">YSA Lab</h1>
          <p className="text-muted-foreground">Accede a módulos y clases del programa de incubación</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {mockModules.map((module) => (
            <Card key={module.id} className="shadow-medium border-border hover:shadow-strong transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Badge 
                      variant={module.status === "En curso" ? "default" : "secondary"}
                      className={module.status === "En curso" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}
                    >
                      {module.status}
                    </Badge>
                    <CardTitle className="text-xl text-foreground hover:text-primary transition-colors">
                      {module.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {module.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium text-foreground">{module.progress}%</span>
                  </div>
                  <Progress value={module.progress} className="h-2" />
                </div>
                
                <div className="flex items-center gap-6 pt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {module.duration}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {module.students} estudiantes
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Lab;
