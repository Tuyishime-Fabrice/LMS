import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-[#006d2c]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
                <p className="text-sm text-gray-600">Last updated: January 2025</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              Welcome to DataPlus Learning. We are committed to protecting your personal information and your right to privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
              learning management platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-[#006d2c]" />
              <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal Information</h3>
                <p className="text-gray-700 leading-relaxed">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1 ml-4">
                  <li>Name and contact information (email address, phone number)</li>
                  <li>Account credentials (username and password)</li>
                  <li>Profile information (avatar, bio, educational background)</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Course enrollment and progress data</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Automatically Collected Information</h3>
                <p className="text-gray-700 leading-relaxed">
                  When you access our platform, we automatically collect certain information, including:
                </p>
                <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1 ml-4">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, features used)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="h-6 w-6 text-[#006d2c]" />
              <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your course enrollments and track your progress</li>
              <li>Send you important updates, notifications, and educational content</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Personalize your learning experience</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-6 w-6 text-[#006d2c]" />
              <h2 className="text-2xl font-bold text-gray-900">Information Sharing and Disclosure</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>With Teachers:</strong> Course instructors can see your enrollment and progress in their courses</li>
              <li><strong>Service Providers:</strong> We share information with third-party vendors who perform services on our behalf</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition of our company</li>
              <li><strong>With Your Consent:</strong> We may share information with your explicit permission</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="h-6 w-6 text-[#006d2c]" />
              <h2 className="text-2xl font-bold text-gray-900">Data Security</h2>
            </div>
            <p className="text-gray-700 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. These measures include:
            </p>
            <ul className="list-disc list-inside text-gray-700 mt-2 space-y-1 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Secure data storage with reputable cloud providers</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-6 w-6 text-[#006d2c]" />
              <h2 className="text-2xl font-bold text-gray-900">Your Privacy Rights</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Access:</strong> Request access to your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
              <li><strong>Opt-Out:</strong> Opt-out of marketing communications</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for data processing where applicable</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar tracking technologies to track activity on our platform and store certain information. 
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you 
              do not accept cookies, you may not be able to use some portions of our service.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our service is not intended for children under the age of 13. We do not knowingly collect personal information 
              from children under 13. If you are a parent or guardian and believe your child has provided us with personal 
              information, please contact us so we can delete it.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy 
              Policy periodically for any changes.
            </p>
          </section>

          {/* Contact Information */}
          <section className="bg-[#006d2c]/5 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="h-6 w-6 text-[#006d2c]" />
              <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="space-y-2 text-gray-700">
              <p><strong>Email:</strong> privacy@datapluslearning.com</p>
              <p><strong>Address:</strong> DataPlus Learning, 123 Education Street, Learning City, LC 12345</p>
              <p><strong>Phone:</strong> +1 (555) 123-4567</p>
            </div>
          </section>

          {/* Back Button */}
          <div className="pt-6 border-t">
            <Button
              onClick={() => navigate(-1)}
              className="bg-[#006d2c] hover:bg-[#005523] text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
