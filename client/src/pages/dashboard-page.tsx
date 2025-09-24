import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Bot, Rocket, Clock, Gift, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Deployment } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: deployments = [] } = useQuery<Deployment[]>({
    queryKey: ["/api/deployments"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const collectCoinsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/collect-coins");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Coins collected!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Collection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "deploying":
      case "pairing":
        return "bg-orange-500/10 text-orange-500";
      case "failed":
      case "stopped":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const activeDeployments = deployments.filter(d => d.status === "active").length;

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-welcome">
            Welcome back, {user.name}!
          </h1>
          <p className="opacity-90">Ready to deploy some amazing WhatsApp bots?</p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-coins">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Coins</p>
                <p className="text-2xl font-bold text-accent" data-testid="text-coin-balance">
                  {user.coins}
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Coins className="text-accent text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-bots">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Bots</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-active-bots">
                  {activeDeployments}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Bot className="text-primary text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-deployments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deployments</p>
                <p className="text-2xl font-bold text-emerald-500" data-testid="text-total-deployments">
                  {deployments.length}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Rocket className="text-emerald-500 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-next-collection">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next Coin Collection</p>
                <p className="text-lg font-bold text-orange-500" data-testid="text-next-collection">
                  {user.lastCoinCollection ? "Available" : "Ready"}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Clock className="text-orange-500 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Coin Collection */}
      <Card data-testid="card-coin-collection">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Daily Coin Collection</h2>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Collect 20 coins every 24 hours</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                  <Coins className="text-2xl text-accent" />
                </div>
                <div>
                  <p className="font-medium">Ready to collect!</p>
                  <p className="text-sm text-muted-foreground">+20 coins available</p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => collectCoinsMutation.mutate()}
              disabled={collectCoinsMutation.isPending}
              className="px-6 py-3"
              data-testid="button-collect-coins"
            >
              <Gift className="w-4 h-4 mr-2" />
              {collectCoinsMutation.isPending ? "Collecting..." : "Collect Coins"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Deployments */}
      <Card data-testid="card-recent-deployments">
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No deployments yet</p>
              <p className="text-sm text-muted-foreground">Deploy your first WhatsApp bot to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deployments.slice(0, 5).map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  data-testid={`deployment-${deployment.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Bot className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-deployment-name-${deployment.id}`}>
                        {deployment.name}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-deployment-date-${deployment.id}`}>
                        {new Date(deployment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(deployment.status)} data-testid={`badge-status-${deployment.id}`}>
                      {deployment.status}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      data-testid={`button-view-deployment-${deployment.id}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
