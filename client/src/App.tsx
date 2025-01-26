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
import { CorbadoProvider, useCorbado } from "@corbado/react";
import { useLocation } from "wouter";
import { useEffect } from "react";

const VITE_CORBADO_PROJECT_ID = "pro-6653263483389419887";
console.log("Corbado Project ID:", VITE_CORBADO_PROJECT_ID);

// Define protected routes that require authentication
const PROTECTED_ROUTES = ['/create', '/first-time-setup', '/'];

function Router() {
  const { user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading: corbadoLoading } = useCorbado();

  // Handle navigation based on user and Corbado state
  useEffect(() => {
    console.log('Router effect:', { user, isLoading, location, isAuthenticated, corbadoLoading });

    // Wait for both auth states to be determined
    if (isLoading || corbadoLoading) {
      return;
    }

    // Check if current route needs authentication
    const needsAuth = PROTECTED_ROUTES.some(route => location === route || location.startsWith(route));
    const isPublicAlbumRoute = location.startsWith('/album/');

    // Don't redirect if viewing a public album
    if (isPublicAlbumRoute) {
      return;
    }

    // If authenticated with Corbado but no user profile, go to first-time setup
    if (isAuthenticated && !user && location !== "/first-time-setup") {
      console.log("Authenticated but no user profile, redirecting to first-time setup");
      setLocation("/first-time-setup");
      return;
    }

    // If not authenticated and trying to access protected route, redirect to auth
    if (needsAuth && !isAuthenticated) {
      console.log('Protected route accessed without auth, redirecting to auth page');
      setLocation("/auth");
      return;
    }

    // If on auth page but already authenticated, redirect to appropriate page
    if (isAuthenticated && location === "/auth") {
      if (user?.username) {
        setLocation(`/profile/${user.username}`);
      } else {
        setLocation("/first-time-setup");
      }
      return;
    }

    // Redirect to profile only if we're on the root path and have a username
    if (user?.username && location === "/") {
      console.log("Valid username found:", user.username);
      setLocation(`/profile/${user.username}`);
    }
  }, [user, location, isLoading, setLocation, isAuthenticated, corbadoLoading]);

  // Only show loading screen when we're waiting for initial auth
  if (isLoading || corbadoLoading) {
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

      {/* Protected routes - require authentication */}
      {isAuthenticated ? (
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/create" component={CreateAlbum} />
          <Route path="/profile/:username" component={Profile} />
          {!user?.username && (
            <Route path="/first-time-setup" component={FirstTimeSetup} />
          )}
        </Switch>
      ) : (
        // Redirect to auth for protected routes when not authenticated
        <Route path="/" component={AuthPage} />
      )}

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