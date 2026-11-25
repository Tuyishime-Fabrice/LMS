import { siteFacts } from "@/content/site-facts";
import { usePageMeta } from "@/lib/pageMeta";
import { PageBand } from "@/features/site/PageBand";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.privacy.title", "Privacy policy"), description: t("meta.privacy.description", "How DATA+ Academy collects, uses and protects your personal data."), path: "/privacy-policy" });
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-muted/50">
      <SiteHeader />
      <PageBand title={t("privacyPolicy.title", "Privacy policy")} body={t("privacyPolicy.updated", "Last updated: January 2025")} />

      {/* Content */}
      <main className="mx-auto max-w-site px-4 py-10 sm:px-6 lg:px-8"><div className="max-w-3xl">
        <div className="bg-card rounded-xl p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-forest mb-4">{t("privacyPolicy.introduction", "Introduction")}</h2>
            <p className="text-foreground leading-relaxed">
              {t("privacyPolicy.welcomeToDataplusLearningWeAre", "Welcome to DATA+ Academy. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our learning management platform.")}
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-forest">{t("privacyPolicy.informationWeCollect", "Information We Collect")}</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-forest mb-2">{t("privacyPolicy.personalInformation", "Personal Information")}</h3>
                <p className="text-foreground leading-relaxed">
                  {t("privacyPolicy.weCollectInformationThatYouProvide", "We collect information that you provide directly to us, including:")}
                </p>
                <ul className="list-disc list-inside text-foreground mt-2 space-y-1 ml-4">
                  <li>{t("privacyPolicy.nameAndContactInformationEmailAddress", "Name and contact information (email address, phone number)")}</li>
                  <li>{t("privacyPolicy.accountCredentialsUsernameAndPassword", "Account credentials (username and password)")}</li>
                  <li>{t("privacyPolicy.profileInformationAvatarBioEducationalBack", "Profile information (avatar, bio, educational background)")}</li>
                  <li>{t("privacyPolicy.paymentInformationProcessedSecurelyThrough", "Payment information (processed securely through third-party providers)")}</li>
                  <li>{t("privacyPolicy.courseEnrollmentAndProgressData", "Course enrollment and progress data")}</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-forest mb-2">{t("privacyPolicy.automaticallyCollectedInformation", "Automatically Collected Information")}</h3>
                <p className="text-foreground leading-relaxed">
                  {t("privacyPolicy.whenYouAccessOurPlatformWe", "When you access our platform, we automatically collect certain information, including:")}
                </p>
                <ul className="list-disc list-inside text-foreground mt-2 space-y-1 ml-4">
                  <li>{t("privacyPolicy.deviceInformationIpAddressBrowserType", "Device information (IP address, browser type, operating system)")}</li>
                  <li>{t("privacyPolicy.usageDataPagesVisitedTimeSpent", "Usage data (pages visited, time spent, features used)")}</li>
                  <li>{t("privacyPolicy.cookiesAndSimilarTrackingTechnologies", "Cookies and similar tracking technologies")}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-forest">{t("privacyPolicy.howWeUseYourInformation", "How We Use Your Information")}</h2>
            </div>
            <p className="text-foreground leading-relaxed mb-3">
              {t("privacyPolicy.weUseTheInformationWeCollect", "We use the information we collect to:")}
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
              <li>{t("privacyPolicy.provideMaintainAndImproveOurServices", "Provide, maintain, and improve our services")}</li>
              <li>{t("privacyPolicy.processYourCourseEnrollmentsAndTrack", "Process your course enrollments and track your progress")}</li>
              <li>{t("privacyPolicy.sendYouImportantUpdatesNotificationsAnd", "Send you important updates, notifications, and educational content")}</li>
              <li>{t("privacyPolicy.respondToYourCommentsQuestionsAnd", "Respond to your comments, questions, and customer service requests")}</li>
              <li>{t("privacyPolicy.personalizeYourLearningExperience", "Personalize your learning experience")}</li>
              <li>{t("privacyPolicy.analyzeUsagePatternsToImproveOur", "Analyze usage patterns to improve our platform")}</li>
              <li>{t("privacyPolicy.detectPreventAndAddressTechnicalIssues", "Detect, prevent, and address technical issues and security threats")}</li>
              <li>{t("privacyPolicy.complyWithLegalObligations", "Comply with legal obligations")}</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-forest">{t("privacyPolicy.informationSharingAndDisclosure", "Information Sharing and Disclosure")}</h2>
            </div>
            <p className="text-foreground leading-relaxed mb-3">
              {t("privacyPolicy.weDoNotSellYourPersonal", "We do not sell your personal information. We may share your information in the following circumstances:")}
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
              <li><strong>{t("privacyPolicy.withTeachers", "With Teachers:")}</strong>{" "}{t("privacyPolicy.courseInstructorsCanSeeYourEnrollment", "Course instructors can see your enrollment and progress in their courses")}</li>
              <li><strong>{t("privacyPolicy.serviceProviders", "Service Providers:")}</strong>{" "}{t("privacyPolicy.weShareInformationWithThirdParty", "We share information with third-party vendors who perform services on our behalf")}</li>
              <li><strong>{t("privacyPolicy.legalRequirements", "Legal Requirements:")}</strong>{" "}{t("privacyPolicy.weMayDiscloseInformationIfRequired", "We may disclose information if required by law or to protect our rights")}</li>
              <li><strong>{t("privacyPolicy.businessTransfers", "Business Transfers:")}</strong>{" "}{t("privacyPolicy.inConnectionWithAnyMergerSale", "In connection with any merger, sale, or acquisition of our company")}</li>
              <li><strong>{t("privacyPolicy.withYourConsent", "With Your Consent:")}</strong>{" "}{t("privacyPolicy.weMayShareInformationWithYour", "We may share information with your explicit permission")}</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-forest">{t("privacyPolicy.dataSecurity", "Data Security")}</h2>
            </div>
            <p className="text-foreground leading-relaxed">
              {t("privacyPolicy.weImplementAppropriateTechnicalAndOrganiza", "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:")}
            </p>
            <ul className="list-disc list-inside text-foreground mt-2 space-y-1 ml-4">
              <li>{t("privacyPolicy.encryptionOfDataInTransitAnd", "Encryption of data in transit and at rest")}</li>
              <li>{t("privacyPolicy.regularSecurityAssessmentsAndUpdates", "Regular security assessments and updates")}</li>
              <li>{t("privacyPolicy.accessControlsAndAuthenticationMechanisms", "Access controls and authentication mechanisms")}</li>
              <li>{t("privacyPolicy.secureDataStorageWithReputableCloud", "Secure data storage with reputable cloud providers")}</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-3">
              {t("privacyPolicy.howeverNoMethodOfTransmissionOver", "However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.")}
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-forest">{t("privacyPolicy.yourPrivacyRights", "Your Privacy Rights")}</h2>
            </div>
            <p className="text-foreground leading-relaxed mb-3">
              {t("privacyPolicy.dependingOnYourLocationYouMay", "Depending on your location, you may have the following rights:")}
            </p>
            <ul className="list-disc list-inside text-foreground space-y-2 ml-4">
              <li><strong>{t("privacyPolicy.access", "Access:")}</strong>{" "}{t("privacyPolicy.requestAccessToYourPersonalInformation", "Request access to your personal information")}</li>
              <li><strong>{t("privacyPolicy.correction", "Correction:")}</strong>{" "}{t("privacyPolicy.requestCorrectionOfInaccurateOrIncomplete", "Request correction of inaccurate or incomplete data")}</li>
              <li><strong>{t("privacyPolicy.deletion", "Deletion:")}</strong>{" "}{t("privacyPolicy.requestDeletionOfYourPersonalInformation", "Request deletion of your personal information")}</li>
              <li><strong>{t("privacyPolicy.dataPortability", "Data Portability:")}</strong>{" "}{t("privacyPolicy.requestACopyOfYourData", "Request a copy of your data in a portable format")}</li>
              <li><strong>{t("privacyPolicy.optOut", "Opt-Out:")}</strong>{" "}{t("privacyPolicy.optOutOfMarketingCommunications", "Opt-out of marketing communications")}</li>
              <li><strong>{t("privacyPolicy.withdrawConsent", "Withdraw Consent:")}</strong>{" "}{t("privacyPolicy.withdrawConsentForDataProcessingWhere", "Withdraw consent for data processing where applicable")}</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-3">
              {t("privacyPolicy.toExerciseTheseRightsPleaseContact", "To exercise these rights, please contact us using the information provided below.")}
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-forest mb-4">{t("privacyPolicy.cookiesAndTrackingTechnologies", "Cookies and Tracking Technologies")}</h2>
            <p className="text-foreground leading-relaxed">
              {t("privacyPolicy.weUseCookiesAndSimilarTracking", "We use cookies and similar tracking technologies to track activity on our platform and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.")}
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-forest mb-4">{t("privacyPolicy.childrenSPrivacy", "Children's Privacy")}</h2>
            <p className="text-foreground leading-relaxed">
              {t("privacyPolicy.ourServiceIsNotIntendedFor", "Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete it.")}
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-forest mb-4">{t("privacyPolicy.changesToThisPrivacyPolicy", "Changes to This Privacy Policy")}</h2>
            <p className="text-foreground leading-relaxed">
              {t("privacyPolicy.weMayUpdateOurPrivacyPolicy", "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the \"Last updated\" date. You are advised to review this Privacy Policy periodically for any changes.")}
            </p>
          </section>

          {/* Contact Information */}
          <section className="bg-leaf rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold text-forest">{t("privacyPolicy.contactUs", "Contact Us")}</h2>
            </div>
            <p className="text-foreground leading-relaxed mb-4">
              {t("privacyPolicy.ifYouHaveAnyQuestionsAbout", "If you have any questions about this Privacy Policy or our data practices, please contact us:")}
            </p>
            <div className="space-y-2 text-foreground">
              <p><strong>{t("privacyPolicy.email", "Email:")}</strong>{" "}<a href="mailto:info@dataplusrwanda.com" className="text-primary hover:underline">info@dataplusrwanda.com</a></p>
              <p><strong>{t("privacyPolicy.address", "Address:")}</strong>{" "}{siteFacts.brand.legalName}, {siteFacts.contact.address}</p>
              <p><strong>{t("privacyPolicy.phone", "Phone:")}</strong> +250 784 857 317</p>
            </div>
          </section>

          {/* Back Button */}
          <div className="pt-6 border-t">
            <Button
              onClick={() => navigate(-1)}
              className="bg-action hover:bg-action-hover text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("privacyPolicy.backToSettings", "Back to Settings")}
            </Button>
          </div>
        </div>
      </div></main>
      <SiteFooter />
    </div>
  );
};

export default PrivacyPolicy;
