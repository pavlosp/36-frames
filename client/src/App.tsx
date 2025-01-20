import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import CreateAlbum from "@/pages/create-album";
import ViewAlbum from "@/pages/view-album";
import Profile from "@/pages/profile";
import FirstTimeSetup from "@/pages/first-time-setup";
import { CorbadoProvider } from "@corbado/react";
import { useLocation } from "wouter";
import { useEffect } from "react";

// Log the project ID for debugging
const VITE_CORBADO_PROJECT_ID = "pro-6653263483389419887";
console.log("Corbado Project ID:", VITE_CORBADO_PROJECT_ID);

function Router() {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  // Redirect authenticated users based on profile completion
  useEffect(() => {
    if (user) {
      if (!user.username || user.username === user.email.split('@')[0]) {
        // If no custom username is set, redirect to setup
        setLocation('/first-time-setup');
      } else if (window.location.pathname === '/') {
        // If user has completed setup and is on home, redirect to profile
        setLocation(`/profile/${user.username}`);
      }
    }
  }, [user, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/first-time-setup" component={FirstTimeSetup} />
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateAlbum} />
      <Route path="/album/:slug" component={ViewAlbum} />
      <Route path="/profile/:username" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const projectId = VITE_CORBADO_PROJECT_ID;
  if (!projectId) {
    console.error("Missing VITE_CORBADO_PROJECT_ID environment variable");
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Error: Corbado Project ID not configured
      </div>
    );
  }

  return (
    <CorbadoProvider projectId={projectId} darkMode="off">
      <QueryClientProvider client={queryClient}>
        <Router />
        <Toaster />
      </QueryClientProvider>
    </CorbadoProvider>
  );
}

export default App;