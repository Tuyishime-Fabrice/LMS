import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./i18n/config";
import { SuspensionDialog } from "@/components/SuspensionDialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SignUp = lazy(() => import("./pages/SignUp"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherSchedule = lazy(() => import("./pages/TeacherSchedule"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CreateCourse = lazy(() => import("./pages/CreateCourse"));
const Exhibition = lazy(() => import("./pages/Exhibition"));
const StudentOnboarding = lazy(() => import("./pages/StudentOnboarding"));
const TeacherOnboarding = lazy(() => import("./pages/TeacherOnboarding"));
const TeacherChat = lazy(() => import("./pages/TeacherChat"));
const StudentChat = lazy(() => import("./pages/StudentChat"));
const StudentSchedule = lazy(() => import("./pages/StudentSchedule"));
const StudentCertificates = lazy(() => import("./pages/StudentCertificates"));
const BrowseCourses = lazy(() => import("./pages/BrowseCourses"));
const MyCourses = lazy(() => import("./pages/MyCourses"));
const StudentSettings = lazy(() => import("./pages/StudentSettings"));
const StudentAssignments = lazy(() => import("./pages/StudentAssignments"));
const StudentScores = lazy(() => import("./pages/StudentScores"));
const StudentSubscription = lazy(() => import("./pages/StudentSubscription"));
const TeacherSettings = lazy(() => import("./pages/TeacherSettings"));
const TeacherAnnouncements = lazy(() => import("./pages/TeacherAnnouncements"));
const TeacherAssignments = lazy(() => import("./pages/TeacherAssignments"));
const TeacherGrades = lazy(() => import("./pages/TeacherGrades"));
const TeacherCohorts = lazy(() => import("./pages/TeacherCohorts"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const TeacherStudents = lazy(() => import("./pages/TeacherStudents"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthCallback = lazy(() => import("./components/AuthCallback"));
const RoleDebugger = lazy(() => import("./components/RoleDebugger"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminTeacherApprovals = lazy(() => import("./pages/AdminTeacherApprovals"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminLogs = lazy(() => import("./pages/AdminLogs"));
const AdminCourses = lazy(() => import("./pages/AdminCourses"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminStudentProgress = lazy(() => import("./pages/AdminStudentProgress"));
const AdminCertificates = lazy(() => import("./pages/AdminCertificates"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));
const AdminExhibition = lazy(() => import("./pages/AdminExhibition"));
const AdminTestimonials = lazy(() => import("./pages/AdminTestimonials"));
const AdminPartners = lazy(() => import("./pages/AdminPartners"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminBundles = lazy(() => import("./pages/AdminBundles"));
const AdminCoupons = lazy(() => import("./pages/AdminCoupons"));
const AdminScholarships = lazy(() => import("./pages/AdminScholarships"));
const AdminPricing = lazy(() => import("./pages/AdminPricing"));
const TeacherPendingApproval = lazy(() => import("./pages/TeacherPendingApproval"));
const BrowseBundles = lazy(() => import("./pages/BrowseBundles"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SuspensionDialog />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/student/dashboard" element={<ProtectedRoute roles={["student"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/chat" element={<StudentChat />} />
            <Route path="/student/schedule" element={<StudentSchedule />} />
            <Route path="/student/certificates" element={<StudentCertificates />} />
            <Route path="/student/my-courses" element={<MyCourses />} />
            <Route path="/student/assignments" element={<StudentAssignments />} />
            <Route path="/student/scores" element={<StudentScores />} />
            <Route path="/student/settings" element={<StudentSettings />} />
            <Route path="/student/subscription" element={<StudentSubscription />} />
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/schedule" element={<TeacherSchedule />} />
            <Route path="/teacher/chat" element={<TeacherChat />} />
            <Route path="/teacher/students" element={<TeacherStudents />} />
            <Route path="/teacher/assignments" element={<TeacherAssignments />} />
            <Route path="/teacher/grades" element={<TeacherGrades />} />
            <Route path="/teacher/settings" element={<TeacherSettings />} />
            <Route path="/teacher/announcements" element={<TeacherAnnouncements />} />
            <Route path="/teacher/cohorts" element={<TeacherCohorts />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/create-course" element={<CreateCourse />} />
            <Route path="/courses" element={<BrowseCourses />} />
            <Route path="/exhibition" element={<Exhibition />} />
            <Route path="/onboarding" element={<StudentOnboarding />} />
            <Route path="/student/onboarding" element={<StudentOnboarding />} />
            <Route path="/teacher/onboarding" element={<TeacherOnboarding />} />
            <Route path="/teacher/pending-approval" element={<TeacherPendingApproval />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/debug" element={<RoleDebugger />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/grades" element={<TeacherGrades />} />
            <Route path="/admin/teacher-approvals" element={<AdminTeacherApprovals />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/student-progress" element={<AdminStudentProgress />} />
            <Route path="/admin/certificates" element={<AdminCertificates />} />
            <Route path="/admin/announcements" element={<AdminAnnouncements />} />
            <Route path="/admin/exhibition" element={<AdminExhibition />} />
            <Route path="/admin/testimonials" element={<AdminTestimonials />} />
            <Route path="/admin/partners" element={<AdminPartners />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/bundles" element={<AdminBundles />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/scholarships" element={<AdminScholarships />} />
            <Route path="/admin/pricing" element={<AdminPricing />} />
            <Route path="/bundles" element={<BrowseBundles />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
