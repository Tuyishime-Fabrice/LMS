import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkPaymentStatus } from "@/services/paymentService";

const PaymentSuccess = () => {
  const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const ref = searchParams.get("ref");
    const [status, setStatus] = useState<"checking" | "success" | "failed" | "pending">("checking");

    useEffect(() => {
        if (!ref) {
            setStatus("failed");
            return;
        }

        const checkStatus = async () => {
            try {
                const result = await checkPaymentStatus(ref);
                if (result.data?.status === "success") {
                    setStatus("success");
                } else if (result.data?.status === "failed") {
                    setStatus("failed");
                } else {
                    setStatus("pending");
                    // Keep polling every 5 seconds for up to 2 minutes
                    const interval = setInterval(async () => {
                        const r = await checkPaymentStatus(ref);
                        if (r.data?.status === "success") {
                            setStatus("success");
                            clearInterval(interval);
                        } else if (r.data?.status === "failed") {
                            setStatus("failed");
                            clearInterval(interval);
                        }
                    }, 5000);

                    setTimeout(() => clearInterval(interval), 120000);
                }
            } catch {
                setStatus("pending");
            }
        };

        checkStatus();
    }, [ref]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/50">
            <div className="bg-card rounded-xl p-8 max-w-md w-full mx-4 text-center">
                {status === "checking" && (
                    <>
                        <Loader2 className="w-16 h-16 text-info animate-spin mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-forest mb-2">{t("paymentSuccess.verifyingPayment", "Verifying Payment...")}</h1>
                        <p className="text-muted-foreground">{t("paymentSuccess.pleaseWaitWhileWeConfirmYour", "Please wait while we confirm your payment.")}</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-forest mb-2">{t("paymentSuccess.paymentSuccessful", "Payment Successful!")}</h1>
                        <p className="text-muted-foreground mb-6">
                            {t("paymentSuccess.youHaveBeenEnrolledInThe", "You have been enrolled in the course. You can now access all course content.")}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button onClick={() => navigate("/student/my-courses")}>
                                {t("paymentSuccess.goToMyCourses", "Go to My Courses")}
                            </Button>
                            <Button variant="outline" onClick={() => navigate("/courses")}>
                                {t("paymentSuccess.browseMore", "Browse More")}
                            </Button>
                        </div>
                    </>
                )}

                {status === "pending" && (
                    <>
                        <Loader2 className="w-16 h-16 text-warning animate-spin mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-forest mb-2">{t("paymentSuccess.paymentProcessing", "Payment Processing")}</h1>
                        <p className="text-muted-foreground mb-6">
                            {t("paymentSuccess.yourPaymentIsBeingProcessedThis", "Your payment is being processed. This may take a few moments. You'll be enrolled automatically once confirmed.")}
                        </p>
                        <Button variant="outline" onClick={() => navigate("/courses")}>
                            {t("paymentSuccess.backToCourses", "Back to Courses")}
                        </Button>
                    </>
                )}

                {status === "failed" && (
                    <>
                        <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-forest mb-2">{t("paymentSuccess.paymentFailed", "Payment Failed")}</h1>
                        <p className="text-muted-foreground mb-6">
                            {ref
                                ? t("paymentSuccess.thereWasAnIssueProcessingYour", "There was an issue processing your payment. Please try again.")
                                : t("paymentSuccess.invalidPaymentReferencePleaseTryPurchasing", "Invalid payment reference. Please try purchasing again.")}
                        </p>
                        <Button onClick={() => navigate("/courses")}>
                            {t("paymentSuccess.backToCourses", "Back to Courses")}
                        </Button>
                    </>
                )}

                {ref && (
                    <p className="text-xs text-muted-foreground/60 mt-6">
                        {t("paymentSuccess.reference", "Reference: {{ref}}", { ref: ref })}
                    </p>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;
