import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, Rocket, Coins, DollarSign, Search, Edit, Ban } from "lucide-react";
import { User } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: stats } = useQuery<{
    totalUsers: number;
    activeDeployments: number;
    totalCoinsDistributed: number;
  }>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  if (!user?.isAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center" data-testid="text-admin-title">
            <Crown className="w-6 h-6 text-yellow-500 mr-2" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Platform management and analytics</p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg">
          <span className="text-sm font-medium" data-testid="text-unlimited-credits">Unlimited Credits</span>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-total-users">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-primary" data-testid="text-total-users">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="text-primary text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-deployments">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Deployments</p>
                <p className="text-2xl font-bold text-emerald-500" data-testid="text-active-deployments">
                  {stats?.activeDeployments || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <Rocket className="text-emerald-500 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-coins-distributed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Coins Distributed</p>
                <p className="text-2xl font-bold text-accent" data-testid="text-coins-distributed">
                  {stats?.totalCoinsDistributed || 0}
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <Coins className="text-accent text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-revenue">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold text-green-500" data-testid="text-revenue">
                  $0
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="text-green-500 text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card data-testid="card-user-management">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search users..."
                className="w-64"
                data-testid="input-search-users"
              />
              <Button size="sm" data-testid="button-search">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-users">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3">User</th>
                  <th className="text-left py-3">Email</th>
                  <th className="text-left py-3">Coins</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Joined</th>
                  <th className="text-left py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border hover:bg-muted/50"
                    data-testid={`user-row-${user.id}`}
                  >
                    <td className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-foreground">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {user.name}
                          </span>
                          {user.isAdmin && (
                            <Crown className="w-4 h-4 text-yellow-500 inline ml-1" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                      {user.email}
                    </td>
                    <td className="py-3" data-testid={`text-user-coins-${user.id}`}>
                      {user.coins}
                    </td>
                    <td className="py-3">
                      <Badge
                        className={user.isVerified ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"}
                        data-testid={`badge-user-status-${user.id}`}
                      >
                        {user.isVerified ? "Verified" : "Unverified"}
                      </Badge>
                    </td>
                    <td className="py-3 text-muted-foreground" data-testid={`text-user-joined-${user.id}`}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          data-testid={`button-ban-user-${user.id}`}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
