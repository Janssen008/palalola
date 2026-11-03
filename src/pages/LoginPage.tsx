import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/SearchableSelect";

const isValidEmail = (emailStr: string): boolean => {
  const email = emailStr.trim().toLowerCase();
  if (!email || !email.includes('@')) return false;
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  const exactDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'gov.com'];
  return exactDomains.includes(domain) || domain.endsWith('.gov.ph');
};

export default function LoginPage() {
  const {
    user,
    profile,
    signIn,
    signUp,
    loading,
    authEvent,
    clearAuthEvent,
    signOut,
  } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupOfficeId, setSignupOfficeId] = useState("");
  const [signupRole, setSignupRole] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [view, setView] = useState<"main" | "forgot" | "verify">("main");
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: offices, isLoading: loadingOffices } = useQuery({
    queryKey: ['offices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as any[];
    }
  });

  const isForcedReset = profile?.force_password_reset === true;
  const currentView = isForcedReset ? "update_forced" : authEvent === "PASSWORD_RECOVERY" ? "update" : view;

  const [containerHeight, setContainerHeight] = useState<number | "auto">(250);
  const loginRef = React.useRef<HTMLFormElement>(null);
  const signupRef = React.useRef<HTMLFormElement>(null);
  const forgotRef = React.useRef<HTMLFormElement>(null);
  const verifyRef = React.useRef<HTMLFormElement>(null);
  const updateRef = React.useRef<HTMLFormElement>(null);

  // Update container height whenever tab changes or error appears
  React.useEffect(() => {
    const timer = setTimeout(() => {
      let activeForm;
      if (currentView === "update" || currentView === "update_forced") activeForm = updateRef.current;
      else if (currentView === "verify") activeForm = verifyRef.current;
      else if (currentView === "forgot") activeForm = forgotRef.current;
      else
        activeForm =
          activeTab === "login" ? loginRef.current : signupRef.current;

      if (activeForm && activeForm.offsetHeight > 0) {
        setContainerHeight(activeForm.offsetHeight);
      }
    }, 50); // Small delay to ensure forms are fully rendered before measuring
    return () => clearTimeout(timer);
  }, [activeTab, error, currentView]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && profile && authEvent !== "PASSWORD_RECOVERY" && !isForcedReset) {
    let target = "/user";
    if (profile.role === "admin") target = "/admin";
    if (profile.role === "department_head" || profile.role === "oic") target = "/dept-head";
    return <Navigate to={target} replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(loginEmail)) {
      setError("Invalid email address. Only @gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @gov.com, and .gov.ph domains are allowed.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Check if user exists using the database RPC
      // @ts-expect-error - Custom RPC check_email_exists is not in generated types
      const { data: exists, error: checkError } = await supabase.rpc('check_email_exists', {
        p_email: loginEmail.trim()
      });

      if (checkError) {
        // Fallback: if RPC does not exist or fails, proceed with normal login
        console.warn("check_email_exists RPC failed or doesn't exist, falling back to standard login:", checkError.message);
        const { error } = await signIn(loginEmail, loginPassword);
        if (error) {
          setError(error.message);
        }
      } else if (!exists) {
        setError("Invalid Credentials, please double check your credentials!");
      } else {
        // 2. Perform sign in since user exists
        const { error } = await signIn(loginEmail, loginPassword);
        if (error) {
          setError("Invalid Credentials, please double check your credentials!");
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during login";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!signupOfficeId) {
      setError("Please select an office.");
      return;
    }

    if (!isValidEmail(signupEmail)) {
      setError("Invalid email address. Only @gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @gov.com, and .gov.ph domains are allowed.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Check if email is already registered using the RPC
      // @ts-expect-error - Custom RPC check_email_exists is not in generated types
      const { data: exists, error: checkError } = await supabase.rpc('check_email_exists', {
        p_email: signupEmail.trim()
      });

      if (!checkError && exists) {
        setError("This email address is already in use.");
        setSubmitting(false);
        return;
      }

      // 2. Perform sign up since email is not registered
      const { error } = await signUp(signupEmail, signupPassword, signupName, signupOfficeId, signupRole || undefined);
      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("already exists") ||
          error.message.toLowerCase().includes("already in use")
        ) {
          setError("This email address is already in use.");
        } else {
          setError(error.message);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during sign up";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(resetEmail)) {
      setError("Invalid email address. Only @gmail.com, @yahoo.com, @outlook.com, @hotmail.com, @gov.com, and .gov.ph domains are allowed.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    if (error) {
      setError(error.message);
    } else {
      toast.success("Recovery code sent", {
        description: "Please check your email for the code.",
      });
      setView("verify");
    }
    setSubmitting(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: otp,
      type: "recovery",
    });

    if (error) {
      setError(error.message);
    } else {
      toast.success("Code verified successfully!");
    }
    setSubmitting(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      if (isForcedReset && user) {
        // @ts-ignore
        await supabase.from("profiles").update({ force_password_reset: false }).eq("user_id", user.id);
        // Force reload profile by signing out and telling user to login again, or rely on profile refetch
        window.location.reload();
      }
      toast.success("Password updated successfully");
      clearAuthEvent();
      setNewPassword("");
    } else {
      setError(error.message);
    }
    setSubmitting(false);
  };

  const handleCancelUpdate = async () => {
    setSubmitting(true);
    await signOut();
    clearAuthEvent();
    setSubmitting(false);
    toast.info("Password reset cancelled.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-background to-blue-100 dark:from-blue-950/20 dark:via-background dark:to-blue-900/20 px-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/3 to-blue-500/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img
              src="/palagawalogo.png"
              alt="Logo"
              className="h-28 w-auto object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            PalaGawa
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Sparkles className="h-4 w-4" />
            Organize your day, one task at a time
          </p>
        </div>

        <div className="rounded-xl border-0 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-xl text-card-foreground overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-center">
              {currentView === "main"
                ? "Welcome"
                : (currentView === "update" || currentView === "update_forced")
                  ? "Update Password"
                  : currentView === "verify"
                    ? "Verify Code"
                    : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-center">
              {currentView === "main"
                ? "Sign in to your account or create a new one"
                : (currentView === "update" || currentView === "update_forced")
                  ? "Please enter your new password below"
                  : currentView === "verify"
                    ? "Enter the code sent to your email"
                    : "Enter your email to receive a recovery code"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={currentView === "main" ? activeTab : currentView}
              onValueChange={handleTabChange}
              className="w-full"
            >
              {currentView === "main" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TabsList className="grid w-full grid-cols-2 mb-6 relative">
                    {/* Sliding Pill Animation */}
                    <div
                      className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-background rounded-md shadow-sm transition-transform duration-300 ease-out z-0"
                      style={{
                        transform:
                          activeTab === "signup"
                            ? "translateX(100%)"
                            : "translateX(0)",
                      }}
                    />
                    <TabsTrigger
                      value="login"
                      className="relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-colors"
                    >
                      Sign Up
                    </TabsTrigger>
                  </TabsList>
                </motion.div>
              )}

              <motion.div
                className="relative overflow-hidden"
                animate={{ height: containerHeight as any }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <AnimatePresence initial={false}>
                  {currentView === "main" && activeTab === "login" && (
                    <motion.div
                      key="login"
                      className="absolute top-0 left-0 w-full"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.1, duration: 0.2 },
                      }}
                      exit={{
                        opacity: 0,
                        y: -15,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <form
                        ref={loginRef}
                        onSubmit={handleLogin}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Password</Label>
                            <Button
                              variant="link"
                              className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setView("forgot");
                                setError("");
                              }}
                              type="button"
                            >
                              Forgot password?
                            </Button>
                          </div>
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {error}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                  {currentView === "main" && activeTab === "signup" && (
                    <motion.div
                      key="signup"
                      className="absolute top-0 left-0 w-full"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.1, duration: 0.2 },
                      }}
                      exit={{
                        opacity: 0,
                        y: -15,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <form
                        ref={signupRef}
                        onSubmit={handleSignup}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Full Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="John Doe"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-role">Role / Position Title</Label>
                          <Input
                            id="signup-role"
                            type="text"
                            placeholder="e.g. IT Officer II, Administrative Aide"
                            value={signupRole}
                            onChange={(e) => setSignupRole(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-office">Office</Label>
                          <SearchableSelect
                            value={signupOfficeId}
                            onValueChange={setSignupOfficeId}
                            options={offices}
                            placeholder="Select an office..."
                            searchPlaceholder="Search office..."
                            emptyMessage="No office found."
                            loading={loadingOffices}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="••••••••"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {error}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                  {currentView === "forgot" && (
                    <motion.div
                      key="forgot"
                      className="absolute top-0 left-0 w-full"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.1, duration: 0.2 },
                      }}
                      exit={{
                        opacity: 0,
                        y: -15,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <form
                        ref={forgotRef}
                        onSubmit={handleResetPassword}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email Address</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="you@example.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {error}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Send Recovery Code"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full gap-2"
                          onClick={() => {
                            setView("main");
                            setError("");
                          }}
                          disabled={submitting}
                        >
                          <ArrowLeft className="h-4 w-4" /> Back to Login
                        </Button>
                      </form>
                    </motion.div>
                  )}
                  {currentView === "verify" && (
                    <motion.div
                      key="verify"
                      className="absolute top-0 left-0 w-full"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.1, duration: 0.2 },
                      }}
                      exit={{
                        opacity: 0,
                        y: -15,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <form
                        ref={verifyRef}
                        onSubmit={handleVerifyOtp}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="reset-otp">Recovery Code</Label>
                          <Input
                            id="reset-otp"
                            type="text"
                            placeholder="12345678"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            maxLength={8}
                            className="tracking-[0.25em] text-center font-mono text-lg"
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {error}
                          </p>
                        )}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Verify Code"
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full gap-2"
                          onClick={() => {
                            setView("forgot");
                            setError("");
                          }}
                          disabled={submitting}
                        >
                          <ArrowLeft className="h-4 w-4" /> Back to Email
                        </Button>
                      </form>
                    </motion.div>
                  )}
                  {(currentView === "update" || currentView === "update_forced") && (
                    <motion.div
                      key="update"
                      className="absolute top-0 left-0 w-full"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: 0.1, duration: 0.2 },
                      }}
                      exit={{
                        opacity: 0,
                        y: -15,
                        transition: { duration: 0.2 },
                      }}
                    >
                      <form
                        ref={updateRef}
                        onSubmit={handleUpdatePassword}
                        className="space-y-4"
                      >
                        {isForcedReset && (
                          <div className="bg-amber-100/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 p-3 rounded-lg text-sm border border-amber-200 dark:border-amber-900/50 mb-4">
                            Your password has been reset by an administrator. You must choose a new password before you can continue.
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <Input
                            id="new-password"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                        </div>
                        {error && (
                          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {error}
                          </p>
                        )}
                        <div className="flex flex-col gap-2 pt-2">
                          <Button
                            type="submit"
                            className="w-full"
                            disabled={submitting}
                          >
                            {submitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save Password"
                            )}
                          </Button>
                          {!isForcedReset && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full"
                              onClick={handleCancelUpdate}
                              disabled={submitting}
                            >
                              Cancel
                            </Button>
                          )}
                          {isForcedReset && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => signOut()}
                              disabled={submitting}
                            >
                              Sign Out
                            </Button>
                          )}
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Tabs>
          </CardContent>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by Palayan City ICT Division 2026
        </p>
      </div>
    </div>
  );
}
