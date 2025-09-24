import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCoinTransferSchema, InsertCoinTransfer, CoinTransfer } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send, ArrowUp, ArrowDown, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TransferFormData = InsertCoinTransfer & { recipientEmail: string };

export default function TransferPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: transfers = [] } = useQuery<CoinTransfer[]>({
    queryKey: ["/api/transfers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const form = useForm<TransferFormData>({
    resolver: zodResolver(insertCoinTransferSchema.extend({
      recipientEmail: insertCoinTransferSchema.shape.message.email(),
    })),
    defaultValues: {
      recipientEmail: "",
      amount: 0,
      message: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      const res = await apiRequest("POST", "/api/transfer-coins", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
      form.reset();
      toast({
        title: "Transfer successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferFormData) => {
    transferMutation.mutate(data);
  };

  const handleMaxAmount = () => {
    if (user) {
      form.setValue("amount", user.coins);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Transfer Coins</h1>
        <p className="text-muted-foreground">Send coins to other users on the platform</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <Card data-testid="card-transfer-form">
          <CardHeader>
            <CardTitle>Send Coins</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="recipientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter recipient's email"
                          data-testid="input-recipient-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max={user.coins}
                            placeholder="0"
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-transfer-amount"
                          />
                          <div className="absolute right-3 top-3 flex items-center space-x-1 text-sm text-muted-foreground">
                            <Coins className="w-4 h-4 text-accent" />
                            <span>coins</span>
                          </div>
                        </div>
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span data-testid="text-available-coins">Available: {user.coins} coins</span>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-xs"
                          onClick={handleMaxAmount}
                          data-testid="button-max-amount"
                        >
                          Send all
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add a message..."
                          className="h-20"
                          data-testid="textarea-transfer-message"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={transferMutation.isPending}
                  data-testid="button-send-coins"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {transferMutation.isPending ? "Sending..." : "Send Coins"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Transfer History */}
        <Card data-testid="card-transfer-history">
          <CardHeader>
            <CardTitle>Recent Transfers</CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <div className="text-center py-8">
                <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transfers yet</p>
                <p className="text-sm text-muted-foreground">Your transfer history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    data-testid={`transfer-${transfer.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center">
                        <ArrowUp className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm" data-testid={`text-transfer-recipient-${transfer.id}`}>
                          {transfer.toUserId} {/* In real app, you'd resolve this to email/name */}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-transfer-date-${transfer.id}`}>
                          {new Date(transfer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-500" data-testid={`text-transfer-amount-${transfer.id}`}>
                        -{transfer.amount} coins
                      </p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
