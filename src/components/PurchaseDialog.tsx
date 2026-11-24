import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CreditCard, Loader2, CheckCircle, XCircle, Phone, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { beginPaymentSignUp } from "@/lib/coursePaymentReturn";
import { initiatePayment, checkPaymentStatus, validateCoupon, formatPrice, type PaymentMethod, type CouponValidationResult } from "@/services/paymentService";
import type { EarlyBirdState } from "@/lib/earlyBirdPricing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const PAYMENT_GATEWAY = "xentripay" as const;

/**
 * Card payments require activation in the XentriPay merchant dashboard.
 * Set VITE_CARD_PAYMENT_ENABLED=true in .env to re-enable once activated.
 */
const CARD_PAYMENT_ENABLED = import.meta.env.VITE_CARD_PAYMENT_ENABLED === "true";

interface PurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "course" | "bundle";
    item: {
        id: string;
        title: string;
        price: number;
        currency: string;
        thumbnail_url?: string;
    };
    onSuccess?: () => void;
    earlyBird?: EarlyBirdState | null;
    instalmentAvailable?: boolean;
    cohortId?: string;
    fullPrice?: number;
    depositPercent?: number;
    mode?: "purchase" | "instalment-pay";
    instalmentScheduleId?: string;
    instalmentNumber?: number;
    dueDate?: string;
}

type PaymentStep = "method" | "confirming" | "processing" | "success" | "failed";

export function PurchaseDialog({
    open,
    onOpenChange,
    type,
    item,
    onSuccess,
    earlyBird,
    instalmentAvailable = false,
    cohortId,
    fullPrice,
    depositPercent = 50,
    mode = "purchase",
    instalmentScheduleId,
    instalmentNumber,
    dueDate,
}: PurchaseDialogProps) {
  const { t } = useTranslation();
    const { user, profile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<PaymentStep>("method");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("momo");
    const [paymentTrack, setPaymentTrack] = useState<"full" | "instalment">("full");
    const [checkoutStartedAt, setCheckoutStartedAt] = useState<string | null>(null);
    const [phone, setPhone] = useState("");
    const [couponInput, setCouponInput] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [referenceId, setReferenceId] = useState<string | null>(null);
    const [gatewayMessage, setGatewayMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pollCount, setPollCount] = useState(0);

    const needsPhone = paymentMethod === "momo" || (paymentMethod === "card" && CARD_PAYMENT_ENABLED);
    const listPrice = fullPrice ?? item.price;
    const isInstalmentDeposit = mode === "purchase" && paymentTrack === "instalment";
    const chargeBase = isInstalmentDeposit
        ? Math.round(listPrice * depositPercent / 100)
        : mode === "instalment-pay"
          ? item.price
          : listPrice;
    const displayAmount = appliedCoupon?.finalAmount ?? chargeBase;
    const displayCurrency = appliedCoupon?.currency ?? item.currency;
    const showCoupons = mode === "purchase";
    const showPaymentPlan = instalmentAvailable && type === "course" && mode === "purchase";

    useEffect(() => {
        if (open) {
            setStep("method");
            setPaymentMethod("momo");
            setPaymentTrack("full");
            setCheckoutStartedAt(new Date().toISOString());
            setPhone("");
            setCouponInput("");
            setAppliedCoupon(null);
            setReferenceId(null);
            setGatewayMessage(null);
            setError(null);
            setPollCount(0);
        }
    }, [open]);

    useEffect(() => {
        if (step !== "confirming" || !referenceId) return;

        const interval = setInterval(async () => {
            const status = await checkPaymentStatus(referenceId, PAYMENT_GATEWAY);

            if (status.data?.status === "success") {
                setStep("success");
                clearInterval(interval);
            } else if (status.data?.status === "failed") {
                setStep("failed");
                setError("Payment was not completed. Please try again.");
                clearInterval(interval);
            }

            setPollCount((prev) => {
                if (prev >= 60) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + 1;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [step, referenceId]);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) {
            setError("Enter a coupon code");
            return;
        }

        setCouponLoading(true);
        setError(null);

        const result = await validateCoupon({
            code: couponInput,
            type,
            itemId: item.id,
            checkoutStartedAt: checkoutStartedAt || undefined,
            paymentTrack: paymentTrack === "instalment" ? "instalment" : "full",
            cohortId,
        });

        setCouponLoading(false);

        if (result.success && result.valid) {
            setAppliedCoupon(result);
        } else {
            setAppliedCoupon(null);
            setError(result.error || "Invalid coupon code");
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput("");
        setError(null);
    };

    const handleInitiatePayment = async () => {
        if (!user) {
            const target = type === "course"
                ? `/course/${item.id}${cohortId ? `?cohort=${encodeURIComponent(cohortId)}` : ""}`
                : `/bundles?bundle=${encodeURIComponent(item.id)}`;
            onOpenChange(false);
            navigate(beginPaymentSignUp(target));
            return;
        }

        if (needsPhone && !phone.trim()) {
            setError("Please enter your phone number");
            return;
        }

        if (showCoupons && couponInput.trim() && !appliedCoupon) {
            setError("Click Apply to validate your coupon before paying");
            return;
        }

        setError(null);
        setGatewayMessage(null);
        setStep("processing");

        const result = await initiatePayment({
            type,
            itemId: item.id,
            email: user.email || "",
            name: profile?.full_name || user.email || "Student",
            phone: needsPhone ? phone : undefined,
            paymentMethod,
            gateway: PAYMENT_GATEWAY,
            couponCode: showCoupons ? appliedCoupon?.code || undefined : undefined,
            checkoutStartedAt: checkoutStartedAt || undefined,
            paymentTrack: paymentTrack === "instalment" ? "instalment" : "full",
            cohortId,
            instalmentScheduleId,
        });

        if (result.success && result.freeCheckout) {
            setReferenceId(result.referenceId || null);
            setStep("success");
            return;
        }

        if (result.success && result.referenceId) {
            setReferenceId(result.referenceId);
            setGatewayMessage(
                result.confirmationMessage ||
                    result.message ||
                    (paymentMethod === "momo"
                        ? "Approve the payment prompt on your phone to continue."
                        : "Complete your payment on the secure checkout page."),
            );
            setStep("confirming");

            if (paymentMethod === "card") {
                const redirectUrl = result.redirectUrl;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                    return;
                }
            }
        } else {
            if (result.referenceId) setReferenceId(result.referenceId);
            setStep("failed");
            setError(result.error || "Failed to initiate payment");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {step === "success"
                            ? t("purchaseDialog.paymentSuccessful", "Payment Successful!")
                            : step === "failed"
                              ? t("purchaseDialog.paymentFailed", "Payment Failed")
                              : step === "confirming"
                                ? t("purchaseDialog.confirmYourPayment", "Confirm Your Payment")
                                : mode === "instalment-pay"
                                  ? `Pay Instalment ${instalmentNumber ?? ""}`
                                  : `Purchase ${type === "bundle" ? "Bundle" : "Course"}`}
                    </DialogTitle>
                    <DialogDescription>
                        {item.title}
                        {mode === "instalment-pay" && dueDate && (
                            <span className="block text-xs mt-1">{t("purchaseDialog.due", "Due {{toLocaleDateString}}", { toLocaleDateString: new Date(dueDate).toLocaleDateString() })}</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-leaf rounded-lg border border-primary/30 space-y-1">
                        {earlyBird?.active && (
                            <div className="flex items-center justify-between text-sm text-warning">
                                <span>{t("purchaseDialog.earlyBirdPrice", "Early bird price")}</span>
                                <span className="line-through text-muted-foreground/60 mr-2">
                                    {formatPrice(earlyBird.regularPrice, item.currency)}
                                </span>
                                <span>{formatPrice(earlyBird.price, item.currency)}</span>
                            </div>
                        )}
                        {appliedCoupon?.discountAmount ? (
                            <>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{isInstalmentDeposit ? t("purchaseDialog.deposit", "Deposit") : t("purchaseDialog.subtotal", "Subtotal")}</span>
                                    <span>{formatPrice(chargeBase, item.currency)}</span>
                                </div>
                                {isInstalmentDeposit && (
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{t("purchaseDialog.fullCoursePrice", "Full course price")}</span>
                                        <span>{formatPrice(listPrice, item.currency)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-sm text-primary">
                                    <span className="flex items-center gap-1">
                                        <Tag className="h-3.5 w-3.5" />
                                        {appliedCoupon.code}
                                    </span>
                                    <span>-{formatPrice(appliedCoupon.discountAmount, displayCurrency)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-primary/30">
                                    <span className="text-sm font-medium text-foreground">{t("purchaseDialog.totalDueNow", "Total due now")}</span>
                                    <span className="text-xl font-bold text-primary">
                                        {formatPrice(displayAmount, displayCurrency)}
                                    </span>
                                </div>
                            </>
                        ) : isInstalmentDeposit ? (
                            <>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{t("purchaseDialog.fullCoursePrice", "Full course price")}</span>
                                    <span>{formatPrice(listPrice, item.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{t("purchaseDialog.deposit2", "Deposit ({{depositPercent}}%)", { depositPercent: depositPercent })}</span>
                                    <span>{formatPrice(chargeBase, item.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-primary/30">
                                    <span className="text-sm font-medium text-foreground">{t("purchaseDialog.dueNow", "Due now")}</span>
                                    <span className="text-xl font-bold text-primary">
                                        {formatPrice(chargeBase, item.currency)}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">{t("purchaseDialog.total", "Total")}</span>
                                <span className="text-xl font-bold text-primary">
                                    {formatPrice(chargeBase, item.currency)}
                                </span>
                            </div>
                        )}
                    </div>

                    {step === "method" && (
                        <div className="space-y-4">
                            {showPaymentPlan && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">{t("purchaseDialog.paymentPlan", "Payment plan")}</Label>
                                    <RadioGroup
                                        value={paymentTrack}
                                        onValueChange={(v) => {
                                            setPaymentTrack(v as "full" | "instalment");
                                            setAppliedCoupon(null);
                                            setCouponInput("");
                                        }}
                                        className="grid grid-cols-2 gap-2"
                                    >
                                        <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                            <RadioGroupItem value="full" />
                                            <span className="text-sm font-medium">{t("purchaseDialog.payInFull", "Pay in full")}</span>
                                        </label>
                                        <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                            <RadioGroupItem value="instalment" />
                                            <span className="text-sm font-medium">{t("purchaseDialog.instalments", "Instalments")}</span>
                                        </label>
                                    </RadioGroup>
                                    {paymentTrack === "instalment" && (
                                        <p className="text-xs text-muted-foreground">
                                            {t("purchaseDialog.payADepositNowRemainingInstalments", "Pay a deposit now; remaining instalments are due monthly.")}
                                        </p>
                                    )}
                                </div>
                            )}

                            {showCoupons && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t("purchaseDialog.couponCode", "Coupon Code")}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t("purchaseDialog.enterCode", "Enter code")}
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        disabled={!!appliedCoupon?.valid}
                                        className="uppercase"
                                    />
                                    {appliedCoupon?.valid ? (
                                        <Button type="button" variant="outline" onClick={handleRemoveCoupon}>
                                            {t("purchaseDialog.remove", "Remove")}
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleApplyCoupon}
                                            disabled={couponLoading || !couponInput.trim()}
                                        >
                                            {couponLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                t("purchaseDialog.apply", "Apply")
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {appliedCoupon?.valid && (
                                    <p className="text-xs text-primary">{t("purchaseDialog.couponAppliedSuccessfully", "Coupon applied successfully")}</p>
                                )}
                            </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t("purchaseDialog.paymentMethod", "Payment Method")}</Label>

                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("momo")}
                                    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${paymentMethod === "momo"
                                        ? "border-primary/30 bg-leaf"
                                        : "border-border hover:border-border"
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "momo" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                            }`}
                                    >
                                        <Smartphone className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold">{t("purchaseDialog.mtnMobileMoney", "MTN Mobile Money")}</p>
                                        <p className="text-xs text-muted-foreground">{t("purchaseDialog.rwandaMomoAirtelRwfOnly", "Rwanda MoMo / Airtel (RWF only)")}</p>
                                    </div>
                                    {paymentMethod === "momo" && (
                                        <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => CARD_PAYMENT_ENABLED && setPaymentMethod("card")}
                                    disabled={!CARD_PAYMENT_ENABLED}
                                    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                                        !CARD_PAYMENT_ENABLED
                                            ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                                            : paymentMethod === "card"
                                              ? "border-info/30 bg-info-surface"
                                              : "border-border hover:border-border"
                                    }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            !CARD_PAYMENT_ENABLED
                                                ? "bg-muted text-muted-foreground/60"
                                                : paymentMethod === "card"
                                                  ? "bg-info text-white"
                                                  : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-muted-foreground">{t("purchaseDialog.cardPayment", "Card Payment")}</p>
                                        <p className="text-xs text-muted-foreground/60">
                                            {CARD_PAYMENT_ENABLED
                                                ? t("purchaseDialog.visaMastercardViaXentripay", "Visa, Mastercard via XentriPay")
                                                : t("purchaseDialog.comingSoonUseMomoForNow", "Coming soon. Use MoMo for now")}
                                        </p>
                                    </div>
                                    {!CARD_PAYMENT_ENABLED && (
                                        <span className="ml-auto text-xs font-medium text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-full">
                                            {t("purchaseDialog.soon", "Soon")}
                                        </span>
                                    )}
                                    {CARD_PAYMENT_ENABLED && paymentMethod === "card" && (
                                        <CheckCircle className="h-5 w-5 text-info ml-auto" />
                                    )}
                                </button>
                            </div>

                            {needsPhone && (
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm">
                                        {paymentMethod === "momo" ? t("purchaseDialog.mtnMomoPhoneNumber", "MTN MoMo Phone Number") : t("purchaseDialog.phoneNumber", "Phone Number")}
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder={paymentMethod === "momo" ? "0788123456" : "+1 555 123 4567"}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {paymentMethod === "momo"
                                            ? t("purchaseDialog.rwandaMtnAirtelNumberOnlyE", "Rwanda MTN/Airtel number only (e.g. 0788123456 or +250788123456)")
                                            : t("purchaseDialog.anyPhoneNumberLocalOrInternational", "Any phone number, local or international (e.g. +1 555 123 4567)")}
                                    </p>
                                </div>
                            )}

                            {error && (
                                <p className="text-sm text-destructive flex items-center gap-1">
                                    <XCircle className="h-4 w-4" /> {error}
                                </p>
                            )}

                            <Button
                                className="w-full bg-action hover:bg-action-hover text-white h-12 text-base"
                                onClick={handleInitiatePayment}
                                disabled={authLoading}
                            >
                                {displayAmount <= 0 && appliedCoupon?.valid
                                    ? t("purchaseDialog.confirmFreeEnrolment", "Confirm Free Enrolment")
                                    : `Pay ${formatPrice(displayAmount, displayCurrency)}`}
                            </Button>
                        </div>
                    )}

                    {step === "confirming" && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-warning-surface flex items-center justify-center mx-auto border-2 border-warning/30">
                                {paymentMethod === "momo" ? (
                                    <Smartphone className="h-8 w-8 text-warning" />
                                ) : (
                                    <CreditCard className="h-8 w-8 text-warning" />
                                )}
                            </div>
                            <p className="font-semibold text-lg">{t("purchaseDialog.confirmYourPayment2", "Confirm your payment")}</p>
                            {paymentMethod === "momo" ? (
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {t("purchaseDialog.aPaymentPromptHasBeenSent", "A payment prompt has been sent to your phone.")}
                                    <br />
                                    <strong>{t("purchaseDialog.openMtnMomo", "Open MTN MoMo")}</strong>{" "}{t("purchaseDialog.andApproveTheRequestToComplete", "and approve the request to complete your purchase.")}
                                </p>
                            ) : (
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {t("purchaseDialog.completeYourPaymentOnTheSecure", "Complete your payment on the secure card checkout page.")}
                                    <br />
                                    {t("purchaseDialog.enterYourCardDetailsToConfirm", "Enter your card details to confirm your purchase.")}
                                </p>
                            )}
                            {gatewayMessage && (
                                <p className="text-sm text-leaf-foreground bg-leaf border border-primary/30 rounded-lg p-3 leading-relaxed">
                                    {gatewayMessage}
                                </p>
                            )}
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                {t("purchaseDialog.waitingForPaymentConfirmation", "Waiting for payment confirmation…")}
                            </div>
                            {referenceId && (
                                <Badge variant="outline" className="text-xs">
                                    {t("purchaseDialog.ref", "Ref: {{referenceId}}", { referenceId: referenceId })}
                                </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                                {t("purchaseDialog.xentripay", "XentriPay ·")}{" "}{paymentMethod === "momo" ? t("purchaseDialog.momo", "MoMo") : t("purchaseDialog.card", "Card")}
                            </Badge>
                        </div>
                    )}

                    {step === "processing" && (
                        <div className="text-center py-6 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                            <p className="font-semibold text-lg">{t("purchaseDialog.startingPayment", "Starting payment…")}</p>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-leaf flex items-center justify-center mx-auto">
                                <CheckCircle className="h-10 w-10 text-primary" />
                            </div>
                            <p className="font-semibold text-lg">{t("purchaseDialog.paymentComplete", "Payment Complete!")}</p>
                            <p className="text-muted-foreground text-sm">
                                {t("purchaseDialog.youHaveBeenEnrolledInThe", "You have been enrolled in the {{type}}. You can now access all course content.", { type: type })}
                            </p>
                            <Button
                                className="w-full bg-action hover:bg-action-hover text-white"
                                onClick={() => {
                                    onOpenChange(false);
                                    onSuccess?.();
                                }}
                            >
                                {t("purchaseDialog.startLearning", "Start Learning")}
                            </Button>
                        </div>
                    )}

                    {step === "failed" && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-destructive-surface flex items-center justify-center mx-auto">
                                <XCircle className="h-10 w-10 text-destructive" />
                            </div>
                            <p className="font-semibold text-lg">{t("purchaseDialog.paymentFailed", "Payment Failed")}</p>
                            <div className="bg-destructive-surface border border-destructive/30 rounded-lg p-3 text-left space-y-1">
                                <p className="text-sm text-destructive font-medium">
                                    {error || t("purchaseDialog.somethingWentWrongPleaseTryAgain", "Something went wrong. Please try again.")}
                                </p>
                                {referenceId && (
                                    <p className="text-xs text-destructive font-mono">
                                        {t("purchaseDialog.ref", "Ref: {{referenceId}}", { referenceId: referenceId })}
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground/60">
                                {t("purchaseDialog.ifTheProblemPersistsContactSupport", "If the problem persists, contact support with the reference above.")}
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                    {t("purchaseDialog.cancel", "Cancel")}
                                </Button>
                                <Button
                                    className="flex-1 bg-action hover:bg-action-hover text-white"
                                    onClick={() => {
                                        setStep("method");
                                        setError(null);
                                    }}
                                >
                                    {t("purchaseDialog.tryAgain", "Try Again")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
