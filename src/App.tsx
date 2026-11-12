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
const LearningRoom = lazy(() => import("./pages/LearningRoom"));
const VerifyCertificate = lazy(() => import("./pages/VerifyCertificate"));
const AdminCalendar = lazy(() => import("./pages/AdminCalendar"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

const student = (page: JSX.Element) => <ProtectedRoute roles={["student"]}>{page}</ProtectedRoute>;
const teacher = (page: JSX.Element) => <ProtectedRoute roles={["teacher"]}>{page}</ProtectedRoute>;
const admin = (page: JSX.Element) => <ProtectedRoute roles={["admin"]} requireOnboarding={false}>{page}</ProtectedRoute>;
const signedIn = (page: JSX.Element) => <ProtectedRoute requireOnboarding={false}>{page}</ProtectedRoute>;

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
            <Route path="/student/dashboard" element={student(<StudentDashboard />)} />
            <Route path="/student/chat" element={student(<StudentChat />)} />
            <Route path="/student/schedule" element={student(<StudentSchedule />)} />
            <Route path="/student/certificates" element={student(<StudentCertificates />)} />
            <Route path="/student/my-courses" element={student(<MyCourses />)} />
            <Route path="/student/assignments" element={student(<StudentAssignments />)} />
            <Route path="/student/scores" element={student(<StudentScores />)} />
            <Route path="/student/settings" element={student(<StudentSettings />)} />
            <Route path="/student/subscription" element={student(<StudentSubscription />)} />
            <Route path="/teacher/dashboard" element={teacher(<TeacherDashboard />)} />
            <Route path="/teacher/schedule" element={teacher(<TeacherSchedule />)} />
            <Route path="/teacher/chat" element={teacher(<TeacherChat />)} />
            <Route path="/teacher/students" element={teacher(<TeacherStudents />)} />
            <Route path="/teacher/assignments" element={teacher(<TeacherAssignments />)} />
            <Route path="/teacher/grades" element={teacher(<TeacherGrades />)} />
            <Route path="/teacher/settings" element={teacher(<TeacherSettings />)} />
            <Route path="/teacher/announcements" element={teacher(<TeacherAnnouncements />)} />
            <Route path="/teacher/cohorts" element={teacher(<TeacherCohorts />)} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/create-course" element={<ProtectedRoute roles={["teacher", "admin"]} requireOnboarding={false}><CreateCourse /></ProtectedRoute>} />
            <Route path="/courses" element={<BrowseCourses />} />
            <Route path="/exhibition" element={<Exhibition />} />
            <Route path="/onboarding" element={<StudentOnboarding />} />
            <Route path="/student/onboarding" element={<StudentOnboarding />} />
            <Route path="/teacher/onboarding" element={<TeacherOnboarding />} />
            <Route path="/teacher/pending-approval" element={<TeacherPendingApproval />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/admin/dashboard" element={admin(<AdminDashboard />)} />
            <Route path="/admin/grades" element={admin(<TeacherGrades />)} />
            <Route path="/admin/teacher-approvals" element={admin(<AdminTeacherApprovals />)} />
            <Route path="/admin/users" element={admin(<AdminUsers />)} />
            <Route path="/admin/logs" element={admin(<AdminLogs />)} />
            <Route path="/admin/courses" element={admin(<AdminCourses />)} />
            <Route path="/admin/settings" element={admin(<AdminSettings />)} />
            <Route path="/admin/student-progress" element={admin(<AdminStudentProgress />)} />
            <Route path="/admin/certificates" element={admin(<AdminCertificates />)} />
            <Route path="/admin/announcements" element={admin(<AdminAnnouncements />)} />
            <Route path="/admin/exhibition" element={admin(<AdminExhibition />)} />
            <Route path="/admin/testimonials" element={admin(<AdminTestimonials />)} />
            <Route path="/admin/partners" element={admin(<AdminPartners />)} />
            <Route path="/admin/payments" element={admin(<AdminPayments />)} />
            <Route path="/admin/bundles" element={admin(<AdminBundles />)} />
            <Route path="/admin/coupons" element={admin(<AdminCoupons />)} />
            <Route path="/admin/scholarships" element={admin(<AdminScholarships />)} />
            <Route path="/admin/pricing" element={admin(<AdminPricing />)} />
            <Route path="/bundles" element={<BrowseBundles />} />
            <Route path="/learn/:courseId" element={signedIn(<LearningRoom />)} />
            <Route path="/learn/:courseId/:lessonId" element={signedIn(<LearningRoom />)} />
            <Route path="/admin/calendar" element={admin(<AdminCalendar />)} />
            <Route path="/verify" element={<VerifyCertificate />} />
            <Route path="/verify/:code" element={<VerifyCertificate />} />
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
