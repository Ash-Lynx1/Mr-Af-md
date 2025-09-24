import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ProtectedRoute } from "@/lib/protected-route";
import DashboardPage from "@/pages/dashboard-page";
import AuthPage from "@/pages/auth-page";
import DeployPage from "@/pages/deploy-page";
import TransferPage from "@/pages/transfer-page";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={() => <Layout><DashboardPage /></Layout>} />
      <ProtectedRoute path="/deploy" component={() => <Layout><DeployPage /></Layout>} />
      <ProtectedRoute path="/transfer" component={() => <Layout><TransferPage /></Layout>} />
      <ProtectedRoute path="/profile" component={() => <Layout><ProfilePage /></Layout>} />
      <ProtectedRoute path="/admin" component={() => <Layout><AdminPage /></Layout>} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
