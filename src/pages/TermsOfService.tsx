import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Users, CreditCard, BookOpen, AlertTriangle, Scale, Mail } from "lucide-react";

const TermsOfService = () => {
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
                            <FileText className="h-8 w-8 text-[#006d2c]" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Terms of Service</h1>
                                <p className="text-sm text-gray-600">Last updated: February 2026</p>
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
                            Welcome to DataPlus Learning. These Terms of Service ("Terms") govern your access to and use of our
                            learning management platform, including any content, features, and services offered through our website.
                            By accessing or using our platform, you agree to be bound by these Terms.
                        </p>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            Please read these Terms carefully before using our services. If you do not agree with any part of these
                            Terms, you may not access or use our platform.
                        </p>
                    </section>

                    {/* Account Registration */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">Account Registration</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                To access certain features of our platform, you must create an account. When registering, you agree to:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                                <li>Provide accurate, current, and complete information during registration</li>
                                <li>Maintain and promptly update your account information</li>
                                <li>Keep your password secure and confidential</li>
                                <li>Accept responsibility for all activities that occur under your account</li>
                                <li>Notify us immediately of any unauthorized use of your account</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed">
                                You must be at least 18 years old, or the age of majority in your jurisdiction, to create an account
                                and use our services.
                            </p>
                        </div>
                    </section>

                    {/* Course Enrollment & Access */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">Course Enrollment & Access</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Enrollment</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    When you enroll in a course or purchase a bundle, you are granted a limited, non-exclusive,
                                    non-transferable license to access and view the course content for your personal, non-commercial
                                    educational purposes.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Content</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                                    <li>All course materials are the intellectual property of DataPlus Learning or respective instructors</li>
                                    <li>You may not reproduce, distribute, modify, or create derivative works from our content</li>
                                    <li>Access to course content may be time-limited based on your enrollment type</li>
                                    <li>We reserve the right to update, modify, or remove course content at any time</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Certificates</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Certificates of completion are issued upon meeting all course requirements. Certificates represent
                                    course completion and do not constitute accredited academic credentials unless explicitly stated.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Payments & Refunds */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <CreditCard className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">Payments & Refunds</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Terms</h3>
                                <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                                    <li>All prices are displayed in Rwandan Francs (RWF) or US Dollars (USD) as indicated</li>
                                    <li>Payments are processed securely through our authorized payment partners (MTN MoMo, Card)</li>
                                    <li>You agree to pay all fees associated with your selected courses or bundles</li>
                                    <li>Prices may change at any time, but changes will not affect existing enrollments</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Refund Policy</h3>
                                <p className="text-gray-700 leading-relaxed">
                                    Refund requests must be submitted within 7 days of purchase. Refunds are considered on a case-by-case
                                    basis and may not be available if you have accessed a significant portion of the course content.
                                    To request a refund, please contact our support team.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* User Conduct */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Scale className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">User Conduct</h2>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-3">
                            When using our platform, you agree not to:
                        </p>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                            <li>Share your account credentials with others or allow others to access your account</li>
                            <li>Copy, distribute, or share course materials without authorization</li>
                            <li>Use the platform for any illegal or unauthorized purpose</li>
                            <li>Harass, bully, or intimidate other users, teachers, or staff</li>
                            <li>Submit false or misleading information, including assignments or assessments</li>
                            <li>Attempt to interfere with the platform's security or proper functioning</li>
                            <li>Use automated tools (bots, scrapers) to access or collect data from the platform</li>
                            <li>Engage in academic dishonesty, plagiarism, or cheating</li>
                        </ul>
                        <p className="text-gray-700 leading-relaxed mt-3">
                            Violation of these rules may result in suspension or termination of your account without refund.
                        </p>
                    </section>

                    {/* Teacher Terms */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">Teacher Terms</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                If you register as a teacher on our platform, the following additional terms apply:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                                <li>Teacher accounts are subject to an approval process by our administration</li>
                                <li>You are responsible for the accuracy and quality of the content you create and upload</li>
                                <li>You grant DataPlus Learning a license to display, distribute, and promote your course content on our platform</li>
                                <li>You retain ownership of your original content but agree it may be used for platform purposes</li>
                                <li>You must comply with our content guidelines and respond to student inquiries in a timely manner</li>
                            </ul>
                        </div>
                    </section>

                    {/* Limitation of Liability */}
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">Limitation of Liability</h2>
                        </div>
                        <div className="space-y-4">
                            <p className="text-gray-700 leading-relaxed">
                                To the fullest extent permitted by law:
                            </p>
                            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                                <li>Our platform is provided "as is" and "as available" without warranties of any kind</li>
                                <li>We do not guarantee uninterrupted or error-free access to our services</li>
                                <li>We are not liable for any indirect, incidental, special, or consequential damages</li>
                                <li>Our total liability shall not exceed the amount you paid for the specific service in question</li>
                                <li>We are not responsible for the actions or content of third-party services linked to our platform</li>
                            </ul>
                        </div>
                    </section>

                    {/* Account Suspension */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Suspension & Termination</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to suspend or terminate your account at our sole discretion, with or without notice,
                            for conduct that we believe violates these Terms, is harmful to other users, or is otherwise objectionable.
                            Upon termination, your right to access the platform and any enrolled courses will immediately cease.
                        </p>
                    </section>

                    {/* Governing Law */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
                        <p className="text-gray-700 leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the Republic of Rwanda,
                            without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject
                            to the exclusive jurisdiction of the courts of Rwanda.
                        </p>
                    </section>

                    {/* Changes to Terms */}
                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to These Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We may update these Terms from time to time. We will notify you of any material changes by posting the
                            updated Terms on this page and updating the "Last updated" date. Your continued use of the platform after
                            any changes constitutes your acceptance of the new Terms.
                        </p>
                    </section>

                    {/* Contact Information */}
                    <section className="bg-[#006d2c]/5 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Mail className="h-6 w-6 text-[#006d2c]" />
                            <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            If you have any questions about these Terms of Service, please contact us:
                        </p>
                        <div className="space-y-2 text-gray-700">
                            <p><strong>Email:</strong> info@dataplusrwanda.com</p>
                            <p><strong>Address:</strong> DataPlus Labs, Kigali, Rwanda</p>
                        </div>
                    </section>

                    {/* Back Button */}
                    <div className="pt-6 border-t">
                        <Button
                            onClick={() => navigate(-1)}
                            className="bg-[#006d2c] hover:bg-[#005523] text-white"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;
