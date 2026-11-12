import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSentTo(normalizedEmail);
      toast.success("Password reset link sent. Please check your email.");
    } catch (error: any) {
      toast.error(error.message || "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            className="w-fit px-0 text-gray-600 hover:text-[#006d2c]"
            onClick={() => navigate("/auth")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Forgot password?</CardTitle>
            <CardDescription>
              Enter your account email and we will send you a secure reset link.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {sentTo && (
            <Alert className="border-[#006d2c]/30 bg-green-50 text-green-900">
              <Mail className="h-4 w-4" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                We sent a reset link to {sentTo}. Open it to create a new password.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black hover:bg-[#006d2c] text-white"
            >
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
