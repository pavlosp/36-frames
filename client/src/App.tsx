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

const VITE_CORBADO_PROJECT_ID = "pro-6653263483389419887";
console.log("Corbado Project ID:", VITE_CORBADO_PROJECT_ID);

// Define protected routes that require authentication
const PROTECTED_ROUTES = ['/create', '/first-time-setup', '/'];

function Router() {
  const { user, isLoading, createUser } = useUser();
  const [location, setLocation] = useLocation();

  // Handle navigation based on user state
  useEffect(() => {
    console.log('Router effect:', { user, isLoading, location });

    const handleInitialSetup = async () => {
      if (!isLoading) {
        try {
          // If we have no user in our database, try to create one
          if (!user) {
            console.log('No user found, attempting to create...');
            await createUser();
            // After creating user, force a redirect to first-time setup
            setLocation('/first-time-setup');
            return;
          }

          // Check if current route needs authentication
          const needsAuth = PROTECTED_ROUTES.some(route => location === route || location.startsWith(route));
          const isPublicAlbumRoute = location.startsWith('/album/');

          // Don't redirect if viewing a public album
          if (isPublicAlbumRoute) {
            return;
          }

          if (needsAuth && !user) {
            console.log('Protected route accessed without auth, redirecting to auth page');
            setLocation("/auth");
            return;
          }

          if (!user && location === "/auth") {
            // Already on auth page, no redirect needed
            return;
          }

          if (user && !user.username && location !== "/first-time-setup") {
            console.log("Username is null, redirecting to first-time setup");
            setLocation("/first-time-setup");
            return;
          }

          // Redirect to profile only if we're on the root path
          if (user?.username && location === "/") {
            console.log("Valid username found:", user.username);
            setLocation(`/profile/${user.username}`);
          }
        } catch (error) {
          console.error('Error in router effect:', error);
        }
      }
    };

    handleInitialSetup();
  }, [user, location, isLoading, setLocation, createUser]);

  // Only show loading screen when we're waiting for initial auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/album/:slug" component={ViewAlbum} />
      <Route path="/first-time-setup" component={FirstTimeSetup} />

      {/* Protected routes - require authentication */}
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateAlbum} />
      <Route path="/profile/:username" component={Profile} />

      {/* Fallback */}
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