import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";

const mockNews = [
  {
    id: 1,
    title: "Nuevo programa de mentoría 2025",
    description: "Estamos emocionados de anunciar el lanzamiento de nuestro programa de mentoría renovado para el próximo año.",
    date: "15 de Diciembre, 2024",
    category: "Programa",
  },
  {
    id: 2,
    title: "Workshop de innovación tecnológica",
    description: "Únete a nuestro próximo workshop sobre las últimas tendencias en tecnología y emprendimiento digital.",
    date: "10 de Diciembre, 2024",
    category: "Evento",
  },
  {
    id: 3,
    title: "Historias de éxito: Startups YSA",
    description: "Conoce las inspiradoras historias de nuestras startups más exitosas y su camino al crecimiento.",
    date: "5 de Diciembre, 2024",
    category: "Historias",
  },
];

const News = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">YSA Now</h1>
          <p className="text-muted-foreground">Mantente al día con las últimas noticias del programa</p>
        </div>

        <div className="grid gap-6">
          {mockNews.map((news) => (
            <Card key={news.id} className="shadow-medium border-border hover:shadow-strong transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-accent text-accent-foreground">
                        {news.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl text-foreground hover:text-primary transition-colors">
                      {news.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {news.date}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{news.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default News;
