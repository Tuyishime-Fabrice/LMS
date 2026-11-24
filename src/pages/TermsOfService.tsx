import { siteFacts } from "@/content/site-facts";
import { usePageMeta } from "@/lib/pageMeta";
import { PageBand } from "@/features/site/PageBand";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, CreditCard, BookOpen, AlertTriangle, Scale, Mail } from "lucide-react";

const TermsOfService = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.terms.title", "Terms of service"), description: t("meta.terms.description", "The terms for using DATA+ Academy."), path: "/terms-of-service" });
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-muted/50">
            <SiteHeader />
            <PageBand title={t("termsOfService.title", "Terms of service")} body={t("termsOfService.updated", "Last updated: February 2026")} />

            {/* Content */}
            <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
                <div className="bg-card rounded-xl p-8 space-y-8">
                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-bold text-forest mb-4">{t("termsOfService.introduction", "Introduction")}</h2>
                        <p className="text-foreground leading-relaxed">
                            {t("termsOfService.welcomeToDataplusLearningTheseTerms", "Welcome to DATA+ Academy. These Terms of Service (\"Terms\") govern your access to and use of our learning management platform, including any content, features, and services offered through our website. By accessing or using our platform, you agree to be bound by these Terms.")}
                        </p>
                        <p className="text-foreground leading-relaxed mt-3">
                            {t("termsOfService.pleaseReadTheseTermsCarefullyBefore", "Please read these Terms carefully before using our services. If you do not agree with any part of these Terms, you may not access or use our platform.")}
                        </p>
                    </section>

                    {/* Account Registration */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.accountRegistration", "Account Registration")}</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-foreground leading-relaxed">
                                {t("termsOfService.toAccessCertainFeaturesOfOur", "To access certain features of our platform, you must create an account. When registering, you agree to:")}
                            </p>
                            <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
                                <li>{t("termsOfService.provideAccurateCurrentAndCompleteInformati", "Provide accurate, current, and complete information during registration")}</li>
                                <li>{t("termsOfService.maintainAndPromptlyUpdateYourAccount", "Maintain and promptly update your account information")}</li>
                                <li>{t("termsOfService.keepYourPasswordSecureAndConfidential", "Keep your password secure and confidential")}</li>
                                <li>{t("termsOfService.acceptResponsibilityForAllActivitiesThat", "Accept responsibility for all activities that occur under your account")}</li>
                                <li>{t("termsOfService.notifyUsImmediatelyOfAnyUnauthorized", "Notify us immediately of any unauthorized use of your account")}</li>
                            </ul>
                            <p className="text-foreground leading-relaxed">
                                {t("termsOfService.youMustBeAtLeast18", "You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account and use our services.")}
                            </p>
                        </div>
                    </section>

                    {/* Course Enrollment & Access */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.courseEnrollmentAccess", "Course Enrollment & Access")}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-forest mb-2">{t("termsOfService.enrollment", "Enrollment")}</h3>
                                <p className="text-foreground leading-relaxed">
                                    {t("termsOfService.whenYouEnrollInACourse", "When you enroll in a course or purchase a bundle, you are granted a limited, non-exclusive, non-transferable license to access and view the course content for your personal, non-commercial educational purposes.")}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-forest mb-2">{t("termsOfService.courseContent", "Course Content")}</h3>
                                <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
                                    <li>{t("termsOfService.allCourseMaterialsAreTheIntellectual", "All course materials are the intellectual property of DATA+ Academy or respective instructors")}</li>
                                    <li>{t("termsOfService.youMayNotReproduceDistributeModify", "You may not reproduce, distribute, modify, or create derivative works from our content")}</li>
                                    <li>{t("termsOfService.accessToCourseContentMayBe", "Access to course content may be time-limited based on your enrollment type")}</li>
                                    <li>{t("termsOfService.weReserveTheRightToUpdate", "We reserve the right to update, modify, or remove course content at any time")}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-forest mb-2">{t("termsOfService.certificates", "Certificates")}</h3>
                                <p className="text-foreground leading-relaxed">
                                    {t("termsOfService.certificatesOfCompletionAreIssuedUpon", "Certificates of completion are issued upon meeting all course requirements. Certificates represent course completion and do not constitute accredited academic credentials unless explicitly stated.")}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Payments & Refunds */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.paymentsRefunds", "Payments & Refunds")}</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-forest mb-2">{t("termsOfService.paymentTerms", "Payment Terms")}</h3>
                                <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
                                    <li>{t("termsOfService.allPricesAreDisplayedInRwandan", "All prices are displayed in Rwandan Francs (RWF) or US Dollars (USD) as indicated")}</li>
                                    <li>{t("termsOfService.paymentsAreProcessedSecurelyThroughOur", "Payments are processed securely through our authorized payment partners (MTN MoMo, Card)")}</li>
                                    <li>{t("termsOfService.youAgreeToPayAllFees", "You agree to pay all fees associated with your selected courses or bundles")}</li>
                                    <li>{t("termsOfService.pricesMayChangeAtAnyTime", "Prices may change at any time, but changes will not affect existing enrollments")}</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-forest mb-2">{t("termsOfService.refundPolicy", "Refund Policy")}</h3>
                                <p className="text-foreground leading-relaxed">
                                    {t("termsOfService.refundRequestsMustBeSubmittedWithin", "Refund requests must be submitted within 7 days of purchase. Refunds are considered on a case-by-case basis and may not be available if you have accessed a significant portion of the course content. To request a refund, please contact our support team.")}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* User Conduct */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Scale className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.userConduct", "User Conduct")}</h2>
                        </div>
                        <p className="text-foreground leading-relaxed mb-3">
                            {t("termsOfService.whenUsingOurPlatformYouAgree", "When using our platform, you agree not to:")}
                        </p>
                        <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
                            <li>{t("termsOfService.shareYourAccountCredentialsWithOthers", "Share your account credentials with others or allow others to access your account")}</li>
                            <li>{t("termsOfService.copyDistributeOrShareCourseMaterials", "Copy, distribute, or share course materials without authorization")}</li>
                            <li>{t("termsOfService.useThePlatformForAnyIllegal", "Use the platform for any illegal or unauthorized purpose")}</li>
                            <li>{t("termsOfService.harassBullyOrIntimidateOtherUsers", "Harass, bully, or intimidate other users, teachers, or staff")}</li>
                            <li>{t("termsOfService.submitFalseOrMisleadingInformationIncludin", "Submit false or misleading information, including assignments or assessments")}</li>
                            <li>{t("termsOfService.attemptToInterfereWithThePlatform", "Attempt to interfere with the platform's security or proper functioning")}</li>
                            <li>{t("termsOfService.useAutomatedToolsBotsScrapersTo", "Use automated tools (bots, scrapers) to access or collect data from the platform")}</li>
                            <li>{t("termsOfService.engageInAcademicDishonestyPlagiarismOr", "Engage in academic dishonesty, plagiarism, or cheating")}</li>
                        </ul>
                        <p className="text-foreground leading-relaxed mt-3">
                            {t("termsOfService.violationOfTheseRulesMayResult", "Violation of these rules may result in suspension or termination of your account without refund.")}
                        </p>
                    </section>

                    {/* Teacher Terms */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.teacherTerms", "Teacher Terms")}</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-foreground leading-relaxed">
                                {t("termsOfService.ifYouRegisterAsATeacher", "If you register as a teacher on our platform, the following additional terms apply:")}
                            </p>
                            <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
                                <li>{t("termsOfService.teacherAccountsAreSubjectToAn", "Teacher accounts are subject to an approval process by our administration")}</li>
                                <li>{t("termsOfService.youAreResponsibleForTheAccuracy", "You are responsible for the accuracy and quality of the content you create and upload")}</li>
                                <li>{t("termsOfService.youGrantDataplusLearningALicense", "You grant DATA+ Academy a license to display, distribute, and promote your course content on our platform")}</li>
                                <li>{t("termsOfService.youRetainOwnershipOfYourOriginal", "You retain ownership of your original content but agree it may be used for platform purposes")}</li>
                                <li>{t("termsOfService.youMustComplyWithOurContent", "You must comply with our content guidelines and respond to student inquiries in a timely manner")}</li>
                            </ul>
                        </div>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.limitationOfLiability", "Limitation of Liability")}</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-foreground leading-relaxed">
                                {t("termsOfService.toTheFullestExtentPermittedBy", "To the fullest extent permitted by law:")}
                            </p>
                            <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
                                <li>{t("termsOfService.ourPlatformIsProvidedAsIs", "Our platform is provided \"as is\" and \"as available\" without warranties of any kind")}</li>
                                <li>{t("termsOfService.weDoNotGuaranteeUninterruptedOr", "We do not guarantee uninterrupted or error-free access to our services")}</li>
                                <li>{t("termsOfService.weAreNotLiableForAny", "We are not liable for any indirect, incidental, special, or consequential damages")}</li>
                                <li>{t("termsOfService.ourTotalLiabilityShallNotExceed", "Our total liability shall not exceed the amount you paid for the specific service in question")}</li>
                                <li>{t("termsOfService.weAreNotResponsibleForThe", "We are not responsible for the actions or content of third-party services linked to our platform")}</li>
                            </ul>
                        </div>
                    </section>

                    {/* Account Suspension */}
                    <section>
                        <h2 className="text-2xl font-bold text-forest mb-4">{t("termsOfService.accountSuspensionTermination", "Account Suspension & Termination")}</h2>
                        <p className="text-foreground leading-relaxed">
                            {t("termsOfService.weReserveTheRightToSuspend", "We reserve the right to suspend or terminate your account at our sole discretion, with or without notice, for conduct that we believe violates these Terms, is harmful to other users, or is otherwise objectionable. Upon termination, your right to access the platform and any enrolled courses will immediately cease.")}
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-bold text-forest mb-4">{t("termsOfService.governingLaw", "Governing Law")}</h2>
                        <p className="text-foreground leading-relaxed">
                            {t("termsOfService.theseTermsShallBeGovernedBy", "These Terms shall be governed by and construed in accordance with the laws of the Republic of Rwanda, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Rwanda.")}
                        </p>
                    </section>

                    {/* Changes to Terms */}
                    <section>
                        <h2 className="text-2xl font-bold text-forest mb-4">{t("termsOfService.changesToTheseTerms", "Changes to These Terms")}</h2>
                        <p className="text-foreground leading-relaxed">
                            {t("termsOfService.weMayUpdateTheseTermsFrom", "We may update these Terms from time to time. We will notify you of any material changes by posting the updated Terms on this page and updating the \"Last updated\" date. Your continued use of the platform after any changes constitutes your acceptance of the new Terms.")}
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section className="bg-leaf rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-forest">{t("termsOfService.contactUs", "Contact Us")}</h2>
                        </div>
                        <p className="text-foreground leading-relaxed mb-4">
                            {t("termsOfService.ifYouHaveAnyQuestionsAbout", "If you have any questions about these Terms of Service, please contact us:")}
                        </p>
                        <div className="space-y-2 text-foreground">
                            <p><strong>{t("termsOfService.email", "Email:")}</strong>{" "}<a href="mailto:info@dataplusrwanda.com" className="text-primary hover:underline">info@dataplusrwanda.com</a></p>
                            <p><strong>{t("termsOfService.address", "Address:")}</strong>{" "}{siteFacts.brand.legalName}, {siteFacts.contact.address}</p>
                        </div>
                    </section>

                    {/* Back Button */}
                    <div className="pt-6 border-t">
                        <Button
                            onClick={() => navigate(-1)}
                            className="bg-primary hover:bg-primary-hover text-white"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {t("termsOfService.goBack", "Go Back")}
                        </Button>
                    </div>
                </div>
            </main>
            <SiteFooter />
        </div>
    );
};

export default TermsOfService;
