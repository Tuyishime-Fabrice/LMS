import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ScholarshipApplyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    courseId: string;
    courseTitle: string;
    onSubmitted?: () => void;
}

export function ScholarshipApplyDialog({
    open,
    onOpenChange,
    courseId,
    courseTitle,
    onSubmitted,
}: ScholarshipApplyDialogProps) {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [email, setEmail] = useState(user?.email || "");
    const [phone, setPhone] = useState("");
    const [organisation, setOrganisation] = useState("");
    const [motivation, setMotivation] = useState("");
    const [incomeBand, setIncomeBand] = useState("");

    const handleSubmit = async () => {
        if (!user) {
            toast({ title: "Sign in required", description: "Please log in to apply.", variant: "destructive" });
            return;
        }
        if (!fullName.trim() || !email.trim() || !motivation.trim()) {
            toast({ title: "Missing fields", description: "Please complete all required fields.", variant: "destructive" });
            return;
        }
        if (motivation.trim().split(/\s+/).length > 300) {
            toast({ title: "Too long", description: "Motivation must be 300 words or fewer.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from("scholarship_applications").insert({
                course_id: courseId,
                student_id: user.id,
                full_name: fullName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                organisation: organisation.trim() || null,
                motivation: motivation.trim(),
                income_band: incomeBand || null,
                status: "pending",
            });

            if (error) throw error;

            toast({
                title: "Application submitted",
                description: "We will email you when your scholarship is reviewed.",
            });
            onOpenChange(false);
            onSubmitted?.();
        } catch (error: any) {
            toast({
                title: "Could not submit",
                description: error.message?.includes("duplicate")
                    ? "You already have an application for this course."
                    : error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Apply for Scholarship</DialogTitle>
                    <DialogDescription>{courseTitle}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Full name *</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0788123456" />
                    </div>
                    <div className="space-y-2">
                        <Label>Organisation / institution</Label>
                        <Input value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Income band (optional)</Label>
                        <Select value={incomeBand} onValueChange={setIncomeBand}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low income</SelectItem>
                                <SelectItem value="medium">Medium income</SelectItem>
                                <SelectItem value="high">Higher income</SelectItem>
                                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Motivation statement * (max 300 words)</Label>
                        <Textarea
                            rows={5}
                            value={motivation}
                            onChange={(e) => setMotivation(e.target.value)}
                            placeholder="Why do you need this scholarship and how will this course help you?"
                        />
                        <p className="text-xs text-gray-500">{motivation.trim().split(/\s+/).filter(Boolean).length} / 300 words</p>
                    </div>

                    <Button
                        className="w-full bg-[#006d2c] hover:bg-[#005523]"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Application"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
