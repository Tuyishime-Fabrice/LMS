import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RoleDebugger = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getAuthInfo = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        if (authUser) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .single();
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Error fetching auth info:", error);
      } finally {
        setLoading(false);
      }
    };

    getAuthInfo();
  }, []);

  if (loading) {
    return <div>Loading auth info...</div>;
  }

  if (!user) {
    return <div>No user logged in</div>;
  }

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Authentication Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">User Info:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        
        <div>
          <h3 className="font-semibold">Profile Info:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Current Role:</h3>
          <p className="text-lg font-bold text-primary">
            {profile?.role || "No role assigned"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleDebugger;