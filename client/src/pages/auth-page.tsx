import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Bot, Shield } from "lucide-react";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm your password"),
  acceptTerms: z.boolean().refine((val) => val === true, "You must accept the terms of service"),
  captcha: z.boolean().refine((val) => val === true, "Please complete the captcha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const verificationSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;
type VerificationForm = z.infer<typeof verificationSchema>;

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, verifyEmailMutation } = useAuth();
  const [currentView, setCurrentView] = useState<"login" | "signup" | "verification">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  // Redirect if already authenticated
  if (user) {
    setLocation("/");
    return null;
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      captcha: false,
    },
  });

  const verificationForm = useForm<VerificationForm>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: verificationEmail,
      code: "",
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onSignup = (data: SignupForm) => {
    const { confirmPassword, acceptTerms, captcha, ...userData } = data;
    registerMutation.mutate(userData, {
      onSuccess: () => {
        setVerificationEmail(data.email);
        verificationForm.setValue("email", data.email);
        setCurrentView("verification");
      },
    });
  };

  const onVerifyEmail = (data: VerificationForm) => {
    verifyEmailMutation.mutate(data);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const getStrengthColor = (strength: number) => {
    const colors = ["bg-red-500", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
    return colors[strength] || "bg-muted";
  };

  const passwordStrength = getPasswordStrength(signupForm.watch("password") || "");

  if (currentView === "verification") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <p className="text-muted-foreground">
              We've sent a 6-digit verification code to{" "}
              <span className="font-medium text-foreground">{verificationEmail}</span>
            </p>
          </CardHeader>
          <CardContent>
            <Form {...verificationForm}>
              <form onSubmit={verificationForm.handleSubmit(onVerifyEmail)} className="space-y-6">
                <FormField
                  control={verificationForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter 6-digit code"
                          className="text-center text-lg tracking-widest"
                          maxLength={6}
                          data-testid="input-verification-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyEmailMutation.isPending}
                  data-testid="button-verify-email"
                >
                  {verifyEmailMutation.isPending ? "Verifying..." : "Verify Email"}
                </Button>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      // TODO: Implement resend code
                    }}
                    data-testid="button-resend-code"
                  >
                    Resend verification code
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary mb-2">
              {currentView === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <p className="text-muted-foreground">
              {currentView === "login" 
                ? "Sign in to your MR AFRIX MD account" 
                : "Join the MR AFRIX MD platform"}
            </p>
          </CardHeader>
          <CardContent>
            {currentView === "login" ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Username</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter email or username"
                            data-testid="input-login-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter password"
                              data-testid="input-login-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember">Remember me</Label>
                    </div>
                    <Button variant="link" className="px-0 font-normal" data-testid="button-forgot-password">
                      Forgot password?
                    </Button>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                  
                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">Don't have an account? </span>
                    <Button
                      variant="link"
                      className="px-0 font-normal"
                      onClick={() => setCurrentView("signup")}
                      data-testid="button-show-signup"
                    >
                      Sign up
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter full name"
                            data-testid="input-signup-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Choose username"
                            data-testid="input-signup-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="Enter email address"
                            data-testid="input-signup-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Create password"
                              data-testid="input-signup-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                              data-testid="button-toggle-signup-password"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <div className="space-y-1">
                          <div className="flex space-x-1">
                            {[...Array(4)].map((_, i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded ${
                                  i < passwordStrength ? getStrengthColor(passwordStrength) : "bg-muted"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Use 8+ characters with mix of letters, numbers & symbols
                          </p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm password"
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              data-testid="button-toggle-confirm-password"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-accept-terms"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm">
                            I agree to the{" "}
                            <Button variant="link" className="p-0 h-auto text-sm" data-testid="link-terms">
                              Terms of Service
                            </Button>{" "}
                            and{" "}
                            <Button variant="link" className="p-0 h-auto text-sm" data-testid="link-privacy">
                              Privacy Policy
                            </Button>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="captcha"
                    render={({ field }) => (
                      <FormItem>
                        <div className="bg-muted p-4 rounded-lg border border-border">
                          <div className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="checkbox-captcha"
                              />
                            </FormControl>
                            <FormLabel className="text-sm">I'm not a robot</FormLabel>
                            <Shield className="w-4 h-4 text-muted-foreground ml-auto" />
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                    data-testid="button-signup"
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                  
                  <div className="text-center text-sm">
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Button
                      variant="link"
                      className="px-0 font-normal"
                      onClick={() => setCurrentView("login")}
                      data-testid="button-show-login"
                    >
                      Sign in
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-accent items-center justify-center text-primary-foreground p-8">
        <div className="max-w-md text-center">
          <Bot className="w-24 h-24 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">MR AFRIX MD</h1>
          <p className="text-xl mb-6">WhatsApp Bot Deployment Platform</p>
          <p className="text-lg opacity-90">
            Deploy, manage, and scale your WhatsApp bots with ease. Join thousands of developers 
            already using our platform to build amazing automation experiences.
          </p>
        </div>
      </div>
    </div>
  );
}
