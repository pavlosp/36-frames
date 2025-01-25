import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { CorbadoAuth } from '@corbado/react';
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { toast } = useToast();

  useEffect(() => {
    document.title = "36 Frames: Share your photo stories";
  }, []);

  const onLoggedIn = (session: any) => {
    // Store the Corbado token
    if (session?.token) {
      localStorage.setItem('cbdToken', session.token);
    }

    toast({
      title: "Welcome to 36 Frames!",
      description: "Successfully logged in",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Camera className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">36 Frames</h1>
          </div>
          <p className="text-muted-foreground">
            Curate your own photo stories in 36 frames. Tell your stories and share beautifully-crafted albums with friends and family in one click
          </p>
        </div>

        <CorbadoAuth onLoggedIn={onLoggedIn} />
      </Card>
    </div>
  );
}