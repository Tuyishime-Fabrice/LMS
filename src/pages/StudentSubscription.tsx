import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Rocket, 
  Sparkles, 
  Bell, 
  ArrowLeft,
  Crown,
  Zap,
  Shield,
  Gift
} from "lucide-react";
import { useTranslation } from 'react-i18next';

const StudentSubscription = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = [
    { icon: Crown, title: "Premium Courses", description: "Access exclusive content" },
    { icon: Zap, title: "Priority Support", description: "Get help when you need it" },
    { icon: Shield, title: "Ad-Free Experience", description: "Learn without distractions" },
    { icon: Gift, title: "Early Access", description: "Be first to try new features" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="max-w-2xl w-full text-center">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-8 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>

            {/* Main Content */}
            <div className="relative">
              {/* Decorative Elements */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0A400C] to-[#116315] flex items-center justify-center shadow-2xl">
                    <Rocket className="h-12 w-12 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <Sparkles className="h-8 w-8 text-yellow-400 animate-pulse" />
                  </div>
                </div>
              </div>

              <Card className="pt-20 pb-10 px-8 border-0 shadow-xl rounded-3xl bg-white/80 backdrop-blur-sm">
                <Badge className="mb-4 bg-[#0A400C]/10 text-[#0A400C] hover:bg-[#0A400C]/20 px-4 py-1.5 text-sm font-medium">
                  Coming Soon
                </Badge>
                
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Premium Subscriptions
                </h1>
                
                <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
                  We're working on something amazing. Premium features will unlock a whole new learning experience.
                </p>

                {/* Features Preview */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {features.map((feature, index) => (
                    <div 
                      key={index}
                      className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-left"
                    >
                      <feature.icon className="h-6 w-6 text-[#0A400C] mb-2" strokeWidth={1.5} />
                      <h3 className="font-semibold text-gray-900 text-sm">{feature.title}</h3>
                      <p className="text-xs text-gray-500">{feature.description}</p>
                    </div>
                  ))}
                </div>

                {/* Notify Button */}
                <Button 
                  className="bg-[#0A400C] hover:bg-[#083308] text-white rounded-xl px-8 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Notify Me When Available
                </Button>

                <p className="mt-6 text-sm text-gray-400">
                  Be the first to know when we launch
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentSubscription;
