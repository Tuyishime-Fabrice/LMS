import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Smartphone, CreditCard, Loader2, CheckCircle, XCircle, Phone, Tag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { beginPaymentSignUp } from "@/lib/coursePaymentReturn";
import {
    initiatePayment,
    checkPaymentStatus,
    validateCoupon,
    formatPrice,
    type PaymentMethod,
    type CouponValidationResult,
} from "@/services/paymentService";
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
                            ? "Payment Successful!"
                            : step === "failed"
                              ? "Payment Failed"
                              : step === "confirming"
                                ? "Confirm Your Payment"
                                : mode === "instalment-pay"
                                  ? `Pay Instalment ${instalmentNumber ?? ""}`
                                  : `Purchase ${type === "bundle" ? "Bundle" : "Course"}`}
                    </DialogTitle>
                    <DialogDescription>
                        {item.title}
                        {mode === "instalment-pay" && dueDate && (
                            <span className="block text-xs mt-1">Due {new Date(dueDate).toLocaleDateString()}</span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 space-y-1">
                        {earlyBird?.active && (
                            <div className="flex items-center justify-between text-sm text-orange-700">
                                <span>Early bird price</span>
                                <span className="line-through text-gray-400 mr-2">
                                    {formatPrice(earlyBird.regularPrice, item.currency)}
                                </span>
                                <span>{formatPrice(earlyBird.price, item.currency)}</span>
                            </div>
                        )}
                        {appliedCoupon?.discountAmount ? (
                            <>
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>{isInstalmentDeposit ? "Deposit" : "Subtotal"}</span>
                                    <span>{formatPrice(chargeBase, item.currency)}</span>
                                </div>
                                {isInstalmentDeposit && (
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Full course price</span>
                                        <span>{formatPrice(listPrice, item.currency)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between text-sm text-emerald-700">
                                    <span className="flex items-center gap-1">
                                        <Tag className="h-3.5 w-3.5" />
                                        {appliedCoupon.code}
                                    </span>
                                    <span>-{formatPrice(appliedCoupon.discountAmount, displayCurrency)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-green-200">
                                    <span className="text-sm font-medium text-gray-700">Total due now</span>
                                    <span className="text-xl font-bold text-green-700">
                                        {formatPrice(displayAmount, displayCurrency)}
                                    </span>
                                </div>
                            </>
                        ) : isInstalmentDeposit ? (
                            <>
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>Full course price</span>
                                    <span>{formatPrice(listPrice, item.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                    <span>Deposit ({depositPercent}%)</span>
                                    <span>{formatPrice(chargeBase, item.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-green-200">
                                    <span className="text-sm font-medium text-gray-700">Due now</span>
                                    <span className="text-xl font-bold text-green-700">
                                        {formatPrice(chargeBase, item.currency)}
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Total</span>
                                <span className="text-xl font-bold text-green-700">
                                    {formatPrice(chargeBase, item.currency)}
                                </span>
                            </div>
                        )}
                    </div>

                    {step === "method" && (
                        <div className="space-y-4">
                            {showPaymentPlan && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Payment plan</Label>
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
                                            <span className="text-sm font-medium">Pay in full</span>
                                        </label>
                                        <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
                                            <RadioGroupItem value="instalment" />
                                            <span className="text-sm font-medium">Instalments</span>
                                        </label>
                                    </RadioGroup>
                                    {paymentTrack === "instalment" && (
                                        <p className="text-xs text-gray-500">
                                            Pay a deposit now; remaining instalments are due monthly.
                                        </p>
                                    )}
                                </div>
                            )}

                            {showCoupons && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Coupon Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter code"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        disabled={!!appliedCoupon?.valid}
                                        className="uppercase"
                                    />
                                    {appliedCoupon?.valid ? (
                                        <Button type="button" variant="outline" onClick={handleRemoveCoupon}>
                                            Remove
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
                                                "Apply"
                                            )}
                                        </Button>
                                    )}
                                </div>
                                {appliedCoupon?.valid && (
                                    <p className="text-xs text-emerald-700">Coupon applied successfully</p>
                                )}
                            </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Payment Method</Label>

                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod("momo")}
                                    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${paymentMethod === "momo"
                                        ? "border-green-500 bg-green-50"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === "momo" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                                            }`}
                                    >
                                        <Smartphone className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold">MTN Mobile Money</p>
                                        <p className="text-xs text-gray-500">Rwanda MoMo / Airtel (RWF only)</p>
                                    </div>
                                    {paymentMethod === "momo" && (
                                        <CheckCircle className="h-5 w-5 text-green-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => CARD_PAYMENT_ENABLED && setPaymentMethod("card")}
                                    disabled={!CARD_PAYMENT_ENABLED}
                                    className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                                        !CARD_PAYMENT_ENABLED
                                            ? "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                                            : paymentMethod === "card"
                                              ? "border-blue-500 bg-blue-50"
                                              : "border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            !CARD_PAYMENT_ENABLED
                                                ? "bg-gray-100 text-gray-400"
                                                : paymentMethod === "card"
                                                  ? "bg-blue-500 text-white"
                                                  : "bg-gray-100 text-gray-500"
                                        }`}
                                    >
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-gray-500">Card Payment</p>
                                        <p className="text-xs text-gray-400">
                                            {CARD_PAYMENT_ENABLED
                                                ? "Visa, Mastercard via XentriPay"
                                                : "Coming soon — use MoMo for now"}
                                        </p>
                                    </div>
                                    {!CARD_PAYMENT_ENABLED && (
                                        <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            Soon
                                        </span>
                                    )}
                                    {CARD_PAYMENT_ENABLED && paymentMethod === "card" && (
                                        <CheckCircle className="h-5 w-5 text-blue-500 ml-auto" />
                                    )}
                                </button>
                            </div>

                            {needsPhone && (
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm">
                                        {paymentMethod === "momo" ? "MTN MoMo Phone Number" : "Phone Number"}
                                    </Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder={paymentMethod === "momo" ? "0788123456" : "+1 555 123 4567"}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {paymentMethod === "momo"
                                            ? "Rwanda MTN/Airtel number only (e.g. 0788123456 or +250788123456)"
                                            : "Any phone number — local or international (e.g. +1 555 123 4567)"}
                                    </p>
                                </div>
                            )}

                            {error && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <XCircle className="h-4 w-4" /> {error}
                                </p>
                            )}

                            <Button
                                className="w-full bg-[#006d2c] hover:bg-[#005523] text-white h-12 text-base"
                                onClick={handleInitiatePayment}
                                disabled={authLoading}
                            >
                                {displayAmount <= 0 && appliedCoupon?.valid
                                    ? "Confirm Free Enrolment"
                                    : `Pay ${formatPrice(displayAmount, displayCurrency)}`}
                            </Button>
                        </div>
                    )}

                    {step === "confirming" && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto border-2 border-amber-200">
                                {paymentMethod === "momo" ? (
                                    <Smartphone className="h-8 w-8 text-amber-600" />
                                ) : (
                                    <CreditCard className="h-8 w-8 text-amber-600" />
                                )}
                            </div>
                            <p className="font-semibold text-lg">Confirm your payment</p>
                            {paymentMethod === "momo" ? (
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    A payment prompt has been sent to your phone.
                                    <br />
                                    <strong>Open MTN MoMo</strong> and approve the request to complete your purchase.
                                </p>
                            ) : (
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    Complete your payment on the secure card checkout page.
                                    <br />
                                    Enter your card details to confirm your purchase.
                                </p>
                            )}
                            {gatewayMessage && (
                                <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-3 leading-relaxed">
                                    {gatewayMessage}
                                </p>
                            )}
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                                Waiting for payment confirmation…
                            </div>
                            {referenceId && (
                                <Badge variant="outline" className="text-xs">
                                    Ref: {referenceId}
                                </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                                XentriPay · {paymentMethod === "momo" ? "MoMo" : "Card"}
                            </Badge>
                        </div>
                    )}

                    {step === "processing" && (
                        <div className="text-center py-6 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto" />
                            <p className="font-semibold text-lg">Starting payment…</p>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            <p className="font-semibold text-lg">Payment Complete!</p>
                            <p className="text-gray-500 text-sm">
                                You have been enrolled in the {type}. You can now access all course content.
                            </p>
                            <Button
                                className="w-full bg-[#006d2c] hover:bg-[#005523] text-white"
                                onClick={() => {
                                    onOpenChange(false);
                                    onSuccess?.();
                                }}
                            >
                                Start Learning
                            </Button>
                        </div>
                    )}

                    {step === "failed" && (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <p className="font-semibold text-lg">Payment Failed</p>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left space-y-1">
                                <p className="text-sm text-red-700 font-medium">
                                    {error || "Something went wrong. Please try again."}
                                </p>
                                {referenceId && (
                                    <p className="text-xs text-red-500 font-mono">
                                        Ref: {referenceId}
                                    </p>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">
                                If the problem persists, contact support with the reference above.
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-[#006d2c] hover:bg-[#005523] text-white"
                                    onClick={() => {
                                        setStep("method");
                                        setError(null);
                                    }}
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
