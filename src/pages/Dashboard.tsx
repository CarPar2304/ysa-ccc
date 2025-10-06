import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Share2 } from "lucide-react";

const mockPosts = [
  {
    id: 1,
    author: "María García",
    initials: "MG",
    time: "Hace 2 horas",
    content: "¡Excelente sesión de mentoría hoy! Aprendimos sobre estrategias de crecimiento sostenible. 🚀",
    likes: 12,
    comments: 3,
  },
  {
    id: 2,
    author: "Carlos Ruiz",
    initials: "CR",
    time: "Hace 5 horas",
    content: "Compartiendo mi experiencia en el último workshop de innovación. ¿Alguien más participó?",
    likes: 8,
    comments: 5,
  },
];

const Dashboard = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">YSA Conecta</h1>
          <p className="text-muted-foreground">Comparte ideas y conecta con tu comunidad</p>
        </div>

        <Card className="shadow-medium border-border">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">TU</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="¿Qué estás pensando?"
                  className="min-h-[100px] resize-none bg-background"
                />
                <div className="flex justify-end">
                  <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    Publicar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {mockPosts.map((post) => (
            <Card key={post.id} className="shadow-soft border-border hover:shadow-medium transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {post.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{post.author}</h3>
                    <p className="text-sm text-muted-foreground">{post.time}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{post.content}</p>
                <div className="flex items-center gap-6 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                    <Heart className="h-4 w-4" />
                    {post.likes}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                    <MessageCircle className="h-4 w-4" />
                    {post.comments}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
