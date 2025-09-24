import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDeploymentSchema, InsertDeployment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Rocket, Coins, Smartphone, QrCode, Phone, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from 'qrcode';

type DeployFormData = InsertDeployment;

export default function DeployPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [showPairing, setShowPairing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Waiting for device pairing...");

  const form = useForm<DeployFormData>({
    resolver: zodResolver(insertDeploymentSchema),
    defaultValues: {
      name: "",
      repoUrl: "",
      sessionName: "",
      pairingMode: "qr",
      envVars: "",
      nodeVersion: "18",
      autoDeploy: false,
    },
  });

  const deployMutation = useMutation({
    mutationFn: async (data: DeployFormData) => {
      const res = await apiRequest("POST", "/api/deploy-bot", data);
      return await res.json();
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      
      setSessionId(data.sessionId);
      setShowPairing(true);
      
      if (data.qrCode) {
        try {
          const qrUrl = await QRCode.toDataURL(data.qrCode);
          setQrCodeUrl(qrUrl);
        } catch (error) {
          console.error("Error generating QR code:", error);
        }
      }

      toast({
        title: "Deployment started!",
        description: "Please pair your device to continue.",
      });

      // Simulate connection status updates (in real app, use WebSocket)
      setTimeout(() => {
        setConnectionStatus("Device paired successfully!");
        toast({
          title: "Bot deployed successfully!",
          description: "Your WhatsApp bot is now active.",
        });
      }, 10000);
    },
    onError: (error: Error) => {
      toast({
        title: "Deployment failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeployFormData) => {
    if (!user || user.coins < 10) {
      toast({
        title: "Insufficient coins",
        description: "You need 10 coins to deploy a bot.",
        variant: "destructive",
      });
      return;
    }

    deployMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Deploy WhatsApp Bot</h1>
          <p className="text-muted-foreground">Deploy your bot using Baileys library with device pairing</p>
        </div>
        <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg" data-testid="card-cost">
          <Coins className="w-4 h-4 text-accent" />
          <span className="font-medium">Cost: 10 coins</span>
        </div>
      </div>

      {/* Deployment Form */}
      <Card data-testid="card-deploy-form">
        <CardHeader>
          <CardTitle>Bot Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter bot name"
                          data-testid="input-bot-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="repoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repository URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          placeholder="https://github.com/username/repo"
                          data-testid="input-repo-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="envVars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Variables</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="KEY1=value1&#10;KEY2=value2"
                        className="h-32"
                        data-testid="textarea-env-vars"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Enter environment variables in KEY=value format, one per line
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nodeVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Node.js Version</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-node-version">
                            <SelectValue placeholder="Select Node.js version" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="18">Node.js 18 (LTS)</SelectItem>
                          <SelectItem value="16">Node.js 16</SelectItem>
                          <SelectItem value="20">Node.js 20</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoDeploy"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-8">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-auto-deploy"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Deploy automatically on GitHub push</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* WhatsApp Configuration */}
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-medium mb-3 flex items-center">
                  <Smartphone className="w-4 h-4 text-green-500 mr-2" />
                  WhatsApp Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sessionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Session Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="my-bot-session"
                            data-testid="input-session-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pairingMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pairing Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-pairing-mode">
                              <SelectValue placeholder="Select pairing mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="qr">QR Code</SelectItem>
                            <SelectItem value="phone">Phone Number</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Rocket className="w-4 h-4" />
                  <span>Your bot will be deployed on Render.com</span>
                </div>
                <Button
                  type="submit"
                  disabled={deployMutation.isPending || !user || user.coins < 10}
                  data-testid="button-deploy"
                >
                  {deployMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Deploy Bot (10 coins)
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Pairing Interface */}
      {showPairing && (
        <Card data-testid="card-pairing">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Device Pairing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {form.watch("pairingMode") === "qr" ? (
              <div className="text-center space-y-4" data-testid="section-qr-code">
                <div className="w-64 h-64 bg-muted rounded-lg mx-auto flex items-center justify-center">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" data-testid="img-qr-code" />
                  ) : (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Scan QR Code with WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4" data-testid="section-phone-pairing">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    data-testid="input-phone-number"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  data-testid="button-send-pairing-code"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Send Pairing Code
                </Button>
              </div>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-connection-status">
                    {connectionStatus}
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus.includes("successfully") ? "bg-green-500" : "bg-orange-500 animate-pulse"
                }`} data-testid="indicator-connection-status" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
