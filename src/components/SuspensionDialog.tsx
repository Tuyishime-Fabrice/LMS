import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { fetchSuspensionStatus } from "@/lib/fetchProfile";

export const SuspensionDialog = () => {
  const [open, setOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");

  useEffect(() => {
    checkSuspensionStatus();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        window.setTimeout(() => {
          checkSuspensionStatus();
        }, 100);
      } else {
        setOpen(false);
      }
    });

    // Check suspension status every 30 seconds
    const interval = setInterval(() => {
      checkSuspensionStatus();
    }, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const checkSuspensionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setOpen(false);
        return;
      }

      const { data: profile, error } = await fetchSuspensionStatus(user.id);

      if (error) {
        console.error("Error checking suspension:", error);
        return;
      }

      if (profile?.is_suspended) {
        setSuspensionReason(profile.suspension_reason || "No reason provided");
        setOpen(true);
      } else {
        setOpen(false);
      }
    } catch (error) {
      console.error("Error checking suspension:", error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl">Account Suspended</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p className="text-gray-700">
              Your account has been suspended by an administrator.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-900 mb-1">Reason:</p>
              <p className="text-red-800">{suspensionReason}</p>
            </div>
            <p className="text-gray-600 text-sm">
              If you believe this is a mistake, please contact support.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={handleSignOut} className="w-full">
            Sign Out
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
