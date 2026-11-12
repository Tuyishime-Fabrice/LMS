import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Pencil, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AccountMenuProps {
  profile: {
    id?: string;
    full_name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
  } | null;
  fallback?: string;
  className?: string;
  onProfileUpdated?: (profile: any) => void;
}

export function AccountMenu({ profile, fallback = "U", className, onProfileUpdated }: AccountMenuProps) {
  const navigate = useNavigate();
  const [displayProfile, setDisplayProfile] = useState(profile);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setDisplayProfile(profile);
    setFullName(profile?.full_name || "");
  }, [profile]);

  const initials = displayProfile?.full_name
    ? displayProfile.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : fallback;

  const handleSaveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextName = fullName.trim();
    if (!nextName) {
      toast.error("Please enter your name");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ full_name: nextName })
        .eq("id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      setDisplayProfile(data);
      onProfileUpdated?.(data);
      setEditOpen(false);
      toast.success("Name updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#006d2c] focus:ring-offset-2"
            aria-label="Open account menu"
          >
            <Avatar className={className}>
              <AvatarImage src={displayProfile?.avatar_url || undefined} alt={displayProfile?.full_name || "User avatar"} />
              <AvatarFallback className="bg-[#006d2c] text-white text-sm">{initials || fallback}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={displayProfile?.avatar_url || undefined} alt={displayProfile?.full_name || "User avatar"} />
                <AvatarFallback className="bg-[#006d2c] text-white text-sm">{initials || fallback}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold">{displayProfile?.full_name || "Your profile"}</p>
                {displayProfile?.email && <p className="truncate text-xs font-normal text-muted-foreground">{displayProfile.email}</p>}
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setEditOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit name
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleSignOut();
            }}
            disabled={signingOut}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            {signingOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit profile name
            </DialogTitle>
            <DialogDescription>
              This name appears on your dashboard, courses, chats, and certificates.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">Full name</Label>
              <Input
                id="profile-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#006d2c] hover:bg-[#005523] text-white">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
