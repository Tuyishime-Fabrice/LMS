// Schema snapshot recovered from the last valid generated types and repository migrations.
// Includes application contracts where migration history is incomplete. Verify and regenerate against the live project with: supabase gen types typescript --project-id <id>
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip_address: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [{"foreignKeyName":"activity_logs_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      announcement_reads: {
        Row: {
          announcement_id: string;
          id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          announcement_id: string;
          id?: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          announcement_id?: string;
          id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [{"foreignKeyName":"announcement_reads_announcement_id_fkey","columns":["announcement_id"],"isOneToOne":false,"referencedRelation":"announcements","referencedColumns":["id"]}];
      };
      announcements: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string | null;
          id: string;
          is_active: boolean | null;
          message: string;
          target_audience: "students" | "teachers" | "all";
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          message: string;
          target_audience: "students" | "teachers" | "all";
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          message?: string;
          target_audience?: "students" | "teachers" | "all";
          title?: string;
        };
        Relationships: [];
      };
      assignment_submissions: {
        Row: {
          created_at: string | null;
          description: string | null;
          feedback: string | null;
          grade: number | null;
          graded_at: string | null;
          id: string;
          lesson_id: string;
          project_links: string[] | null;
          student_id: string;
          submitted_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          feedback?: string | null;
          grade?: number | null;
          graded_at?: string | null;
          id?: string;
          lesson_id: string;
          project_links?: string[] | null;
          student_id: string;
          submitted_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          feedback?: string | null;
          grade?: number | null;
          graded_at?: string | null;
          id?: string;
          lesson_id?: string;
          project_links?: string[] | null;
          student_id?: string;
          submitted_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"assignment_submissions_lesson_id_fkey","columns":["lesson_id"],"isOneToOne":false,"referencedRelation":"course_lessons","referencedColumns":["id"]},{"foreignKeyName":"assignment_submissions_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      assignments: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          due_date: string | null;
          id: string;
          max_score: number | null;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          max_score?: number | null;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          max_score?: number | null;
          title?: string;
        };
        Relationships: [{"foreignKeyName":"assignments_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      bundle_courses: {
        Row: {
          bundle_id: string;
          course_id: string;
          id: string;
        };
        Insert: {
          bundle_id: string;
          course_id: string;
          id?: string;
        };
        Update: {
          bundle_id?: string;
          course_id?: string;
          id?: string;
        };
        Relationships: [{"foreignKeyName":"bundle_courses_bundle_id_fkey","columns":["bundle_id"],"isOneToOne":false,"referencedRelation":"course_bundles","referencedColumns":["id"]},{"foreignKeyName":"bundle_courses_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      capstone_projects: {
        Row: {
          course_id: string;
          created_at: string;
          description: string;
          due_date: string | null;
          file_url: string | null;
          id: string;
          instructions: string;
          requirements: string[] | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description: string;
          due_date?: string | null;
          file_url?: string | null;
          id?: string;
          instructions: string;
          requirements?: string[] | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string;
          due_date?: string | null;
          file_url?: string | null;
          id?: string;
          instructions?: string;
          requirements?: string[] | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [{"foreignKeyName":"capstone_projects_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      capstone_submissions: {
        Row: {
          capstone_project_id: string;
          description: string | null;
          feedback: string | null;
          file_url: string | null;
          grade: number | null;
          graded_at: string | null;
          graded_by: string | null;
          id: string;
          project_links: string[] | null;
          student_id: string;
          submitted_at: string;
        };
        Insert: {
          capstone_project_id: string;
          description?: string | null;
          feedback?: string | null;
          file_url?: string | null;
          grade?: number | null;
          graded_at?: string | null;
          graded_by?: string | null;
          id?: string;
          project_links?: string[] | null;
          student_id: string;
          submitted_at?: string;
        };
        Update: {
          capstone_project_id?: string;
          description?: string | null;
          feedback?: string | null;
          file_url?: string | null;
          grade?: number | null;
          graded_at?: string | null;
          graded_by?: string | null;
          id?: string;
          project_links?: string[] | null;
          student_id?: string;
          submitted_at?: string;
        };
        Relationships: [{"foreignKeyName":"capstone_submissions_capstone_project_id_fkey","columns":["capstone_project_id"],"isOneToOne":false,"referencedRelation":"capstone_projects","referencedColumns":["id"]},{"foreignKeyName":"capstone_submissions_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"capstone_submissions_graded_by_fkey","columns":["graded_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      certificates: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          capstone_grade: number | null;
          certificate_number: string | null;
          certificate_url: string | null;
          completion_date: string;
          course_id: string;
          created_at: string;
          grade: string | null;
          id: string;
          issue_source: "manual" | "auto";
          issued_at: string | null;
          notes: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
          revoked_reason: string | null;
          status: "pending" | "approved" | "rejected" | "revoked";
          student_id: string;
          updated_at: string;
          verification_code: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          capstone_grade?: number | null;
          certificate_number?: string | null;
          certificate_url?: string | null;
          completion_date?: string;
          course_id: string;
          created_at?: string;
          grade?: string | null;
          id?: string;
          issue_source?: "manual" | "auto";
          issued_at?: string | null;
          notes?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revoked_reason?: string | null;
          status?: "pending" | "approved" | "rejected" | "revoked";
          student_id: string;
          updated_at?: string;
          verification_code?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          capstone_grade?: number | null;
          certificate_number?: string | null;
          certificate_url?: string | null;
          completion_date?: string;
          course_id?: string;
          created_at?: string;
          grade?: string | null;
          id?: string;
          issue_source?: "manual" | "auto";
          issued_at?: string | null;
          notes?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revoked_reason?: string | null;
          status?: "pending" | "approved" | "rejected" | "revoked";
          student_id?: string;
          updated_at?: string;
          verification_code?: string | null;
        };
        Relationships: [{"foreignKeyName":"certificates_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      chat_messages: {
        Row: {
          created_at: string;
          edited_at: string | null;
          file_name: string | null;
          file_size: number | null;
          file_url: string | null;
          group_chat_id: string;
          id: string;
          is_edited: boolean | null;
          is_resolved: boolean | null;
          message_text: string;
          message_type: "text" | "file" | "image" | "announcement" | null;
          reply_to_id: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          sender_id: string;
        };
        Insert: {
          created_at?: string;
          edited_at?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_url?: string | null;
          group_chat_id: string;
          id?: string;
          is_edited?: boolean | null;
          is_resolved?: boolean | null;
          message_text: string;
          message_type?: "text" | "file" | "image" | "announcement" | null;
          reply_to_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sender_id: string;
        };
        Update: {
          created_at?: string;
          edited_at?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          file_url?: string | null;
          group_chat_id?: string;
          id?: string;
          is_edited?: boolean | null;
          is_resolved?: boolean | null;
          message_text?: string;
          message_type?: "text" | "file" | "image" | "announcement" | null;
          reply_to_id?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          sender_id?: string;
        };
        Relationships: [{"foreignKeyName":"chat_messages_group_chat_id_fkey","columns":["group_chat_id"],"isOneToOne":false,"referencedRelation":"group_chats","referencedColumns":["id"]},{"foreignKeyName":"chat_messages_sender_id_fkey","columns":["sender_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"chat_messages_resolved_by_fkey","columns":["resolved_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"chat_messages_reply_to_id_fkey","columns":["reply_to_id"],"isOneToOne":false,"referencedRelation":"chat_messages","referencedColumns":["id"]}];
      };
      cohort_join_requests: {
        Row: {
          cohort_id: string;
          created_at: string;
          id: string;
          message: string | null;
          payment_track: "full" | "instalment" | "scholarship" | null;
          status: "pending" | "approved" | "rejected";
          student_id: string;
          updated_at: string;
        };
        Insert: {
          cohort_id: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          payment_track?: "full" | "instalment" | "scholarship" | null;
          status?: "pending" | "approved" | "rejected";
          student_id: string;
          updated_at?: string;
        };
        Update: {
          cohort_id?: string;
          created_at?: string;
          id?: string;
          message?: string | null;
          payment_track?: "full" | "instalment" | "scholarship" | null;
          status?: "pending" | "approved" | "rejected";
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [{"foreignKeyName":"cohort_join_requests_cohort_id_fkey","columns":["cohort_id"],"isOneToOne":false,"referencedRelation":"cohorts","referencedColumns":["id"]},{"foreignKeyName":"cohort_join_requests_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      cohorts: {
        Row: {
          course_id: string | null;
          created_at: string;
          currency: string | null;
          description: string | null;
          end_date: string | null;
          id: string;
          instalment_count: number | null;
          instalment_deposit_percent: number | null;
          instalment_enabled: boolean;
          is_active: boolean | null;
          max_students: number | null;
          name: string;
          price: number | null;
          requires_payment: boolean;
          start_date: string | null;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          currency?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          instalment_count?: number | null;
          instalment_deposit_percent?: number | null;
          instalment_enabled?: boolean;
          is_active?: boolean | null;
          max_students?: number | null;
          name: string;
          price?: number | null;
          requires_payment?: boolean;
          start_date?: string | null;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          currency?: string | null;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          instalment_count?: number | null;
          instalment_deposit_percent?: number | null;
          instalment_enabled?: boolean;
          is_active?: boolean | null;
          max_students?: number | null;
          name?: string;
          price?: number | null;
          requires_payment?: boolean;
          start_date?: string | null;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [{"foreignKeyName":"cohorts_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"cohorts_teacher_id_fkey","columns":["teacher_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          student_id: string;
          teacher_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          student_id: string;
          teacher_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          student_id?: string;
          teacher_id?: string;
          updated_at?: string;
        };
        Relationships: [{"foreignKeyName":"conversations_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"conversations_teacher_id_fkey","columns":["teacher_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      coupon_redemptions: {
        Row: {
          coupon_id: string;
          discount_amount: number;
          id: string;
          payment_id: string | null;
          redeemed_at: string | null;
          student_id: string;
        };
        Insert: {
          coupon_id: string;
          discount_amount?: number;
          id?: string;
          payment_id?: string | null;
          redeemed_at?: string | null;
          student_id: string;
        };
        Update: {
          coupon_id?: string;
          discount_amount?: number;
          id?: string;
          payment_id?: string | null;
          redeemed_at?: string | null;
          student_id?: string;
        };
        Relationships: [{"foreignKeyName":"coupon_redemptions_coupon_id_fkey","columns":["coupon_id"],"isOneToOne":false,"referencedRelation":"coupons","referencedColumns":["id"]},{"foreignKeyName":"coupon_redemptions_payment_id_fkey","columns":["payment_id"],"isOneToOne":false,"referencedRelation":"payments","referencedColumns":["id"]}];
      };
      coupons: {
        Row: {
          applies_to: "all" | "course" | "bundle";
          bundle_id: string | null;
          code: string;
          coupon_type: string;
          course_id: string | null;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          description: string | null;
          discount_type: "percent" | "fixed";
          discount_value: number;
          id: string;
          is_active: boolean | null;
          max_uses: number | null;
          max_uses_per_user: number | null;
          min_purchase_amount: number | null;
          updated_at: string | null;
          uses_count: number;
          valid_from: string | null;
          valid_until: string | null;
        };
        Insert: {
          applies_to?: "all" | "course" | "bundle";
          bundle_id?: string | null;
          code: string;
          coupon_type?: string;
          course_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          description?: string | null;
          discount_type: "percent" | "fixed";
          discount_value: number;
          id?: string;
          is_active?: boolean | null;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          min_purchase_amount?: number | null;
          updated_at?: string | null;
          uses_count?: number;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Update: {
          applies_to?: "all" | "course" | "bundle";
          bundle_id?: string | null;
          code?: string;
          coupon_type?: string;
          course_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          description?: string | null;
          discount_type?: "percent" | "fixed";
          discount_value?: number;
          id?: string;
          is_active?: boolean | null;
          max_uses?: number | null;
          max_uses_per_user?: number | null;
          min_purchase_amount?: number | null;
          updated_at?: string | null;
          uses_count?: number;
          valid_from?: string | null;
          valid_until?: string | null;
        };
        Relationships: [{"foreignKeyName":"coupons_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"coupons_bundle_id_fkey","columns":["bundle_id"],"isOneToOne":false,"referencedRelation":"course_bundles","referencedColumns":["id"]}];
      };
      course_approvals: {
        Row: {
          course_id: string;
          created_at: string | null;
          id: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: "pending" | "approved" | "rejected" | null;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "approved" | "rejected" | null;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "approved" | "rejected" | null;
        };
        Relationships: [{"foreignKeyName":"course_approvals_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"course_approvals_reviewed_by_fkey","columns":["reviewed_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      course_bundles: {
        Row: {
          bundle_price: number;
          created_at: string | null;
          created_by: string | null;
          currency: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          original_price: number;
          thumbnail_url: string | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          bundle_price?: number;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          original_price?: number;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          bundle_price?: number;
          created_at?: string | null;
          created_by?: string | null;
          currency?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          original_price?: number;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      course_certificate_rules: {
        Row: {
          auto_issue: boolean;
          course_id: string;
          min_capstone_grade: number;
          require_all_lessons: boolean;
          signatory_name: string | null;
          signatory_title: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          auto_issue?: boolean;
          course_id: string;
          min_capstone_grade?: number;
          require_all_lessons?: boolean;
          signatory_name?: string | null;
          signatory_title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          auto_issue?: boolean;
          course_id?: string;
          min_capstone_grade?: number;
          require_all_lessons?: boolean;
          signatory_name?: string | null;
          signatory_title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [{"foreignKeyName":"course_certificate_rules_course_id_fkey","columns":["course_id"],"isOneToOne":true,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      course_chapters: {
        Row: {
          course_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_preview: boolean | null;
          order_index: number;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_preview?: boolean | null;
          order_index?: number;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_preview?: boolean | null;
          order_index?: number;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"course_chapters_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      course_enrollments: {
        Row: {
          cohort_id: string | null;
          cohort_name: string | null;
          completed: boolean | null;
          completion_date: string | null;
          course_id: string;
          enrolled_at: string;
          final_grade: string | null;
          id: string;
          last_activity_at: string | null;
          last_lesson_id: string | null;
          progress_percentage: number | null;
          student_id: string;
        };
        Insert: {
          cohort_id?: string | null;
          cohort_name?: string | null;
          completed?: boolean | null;
          completion_date?: string | null;
          course_id: string;
          enrolled_at?: string;
          final_grade?: string | null;
          id?: string;
          last_activity_at?: string | null;
          last_lesson_id?: string | null;
          progress_percentage?: number | null;
          student_id: string;
        };
        Update: {
          cohort_id?: string | null;
          cohort_name?: string | null;
          completed?: boolean | null;
          completion_date?: string | null;
          course_id?: string;
          enrolled_at?: string;
          final_grade?: string | null;
          id?: string;
          last_activity_at?: string | null;
          last_lesson_id?: string | null;
          progress_percentage?: number | null;
          student_id?: string;
        };
        Relationships: [{"foreignKeyName":"course_enrollments_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"course_enrollments_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      course_instalment_plans: {
        Row: {
          course_id: string;
          created_at: string | null;
          deposit_percent: number;
          grace_days: number;
          id: string;
          instalment_count: number;
          is_active: boolean;
          updated_at: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          deposit_percent?: number;
          grace_days?: number;
          id?: string;
          instalment_count?: number;
          is_active?: boolean;
          updated_at?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          deposit_percent?: number;
          grace_days?: number;
          id?: string;
          instalment_count?: number;
          is_active?: boolean;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"course_instalment_plans_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      course_lessons: {
        Row: {
          chapter_id: string;
          content_type: string;
          content_url: string;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          duration: number | null;
          file_url: string | null;
          id: string;
          is_mandatory: boolean | null;
          is_preview: boolean | null;
          learning_objectives: string[] | null;
          order_index: number;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          chapter_id: string;
          content_type: string;
          content_url: string;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          duration?: number | null;
          file_url?: string | null;
          id?: string;
          is_mandatory?: boolean | null;
          is_preview?: boolean | null;
          learning_objectives?: string[] | null;
          order_index?: number;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          chapter_id?: string;
          content_type?: string;
          content_url?: string;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          duration?: number | null;
          file_url?: string | null;
          id?: string;
          is_mandatory?: boolean | null;
          is_preview?: boolean | null;
          learning_objectives?: string[] | null;
          order_index?: number;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"course_lessons_chapter_id_fkey","columns":["chapter_id"],"isOneToOne":false,"referencedRelation":"course_chapters","referencedColumns":["id"]}];
      };
      course_materials: {
        Row: {
          course_id: string;
          description: string | null;
          file_type: string | null;
          file_url: string | null;
          id: string;
          title: string;
          uploaded_at: string;
        };
        Insert: {
          course_id: string;
          description?: string | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          title: string;
          uploaded_at?: string;
        };
        Update: {
          course_id?: string;
          description?: string | null;
          file_type?: string | null;
          file_url?: string | null;
          id?: string;
          title?: string;
          uploaded_at?: string;
        };
        Relationships: [{"foreignKeyName":"course_materials_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      course_price_tiers: {
        Row: {
          course_id: string;
          created_at: string | null;
          currency: string;
          id: string;
          is_active: boolean;
          label: string | null;
          price: number;
          tier_code: string;
          updated_at: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          currency?: string;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          price: number;
          tier_code: string;
          updated_at?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          currency?: string;
          id?: string;
          is_active?: boolean;
          label?: string | null;
          price?: number;
          tier_code?: string;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"course_price_tiers_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      course_update_history: {
        Row: {
          changes: Json | null;
          course_id: string;
          created_at: string | null;
          id: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: "pending" | "approved" | "rejected" | null;
          update_type: "created" | "updated" | "approved" | "rejected";
          updated_by: string;
        };
        Insert: {
          changes?: Json | null;
          course_id: string;
          created_at?: string | null;
          id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "approved" | "rejected" | null;
          update_type: "created" | "updated" | "approved" | "rejected";
          updated_by: string;
        };
        Update: {
          changes?: Json | null;
          course_id?: string;
          created_at?: string | null;
          id?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "approved" | "rejected" | null;
          update_type?: "created" | "updated" | "approved" | "rejected";
          updated_by?: string;
        };
        Relationships: [{"foreignKeyName":"course_update_history_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"course_update_history_updated_by_fkey","columns":["updated_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"course_update_history_reviewed_by_fkey","columns":["reviewed_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      courses: {
        Row: {
          approval_status: "pending" | "approved" | "rejected" | null;
          category: string | null;
          created_at: string;
          currency: string | null;
          description: string | null;
          duration: string | null;
          early_bird_end: string | null;
          early_bird_max_seats: number | null;
          early_bird_price: number | null;
          early_bird_seats_used: number;
          early_bird_start: string | null;
          id: string;
          is_featured: boolean | null;
          is_free: boolean | null;
          language: string | null;
          last_approved_at: string | null;
          learning_outcomes: string[] | null;
          level: "beginner" | "intermediate" | "advanced" | null;
          mode: string | null;
          pending_update: boolean | null;
          price: number | null;
          requirements: string | null;
          scholarship_open: boolean;
          scholarship_slots_max: number | null;
          scholarship_slots_used: number;
          summary: string | null;
          teacher_id: string;
          thumbnail_url: string | null;
          title: string;
          update_notes: string | null;
          update_submitted_at: string | null;
          updated_at: string;
          welcome_video_url: string | null;
          whatsapp_group_link: string | null;
          whatsapp_link: string | null;
        };
        Insert: {
          approval_status?: "pending" | "approved" | "rejected" | null;
          category?: string | null;
          created_at?: string;
          currency?: string | null;
          description?: string | null;
          duration?: string | null;
          early_bird_end?: string | null;
          early_bird_max_seats?: number | null;
          early_bird_price?: number | null;
          early_bird_seats_used?: number;
          early_bird_start?: string | null;
          id?: string;
          is_featured?: boolean | null;
          is_free?: boolean | null;
          language?: string | null;
          last_approved_at?: string | null;
          learning_outcomes?: string[] | null;
          level?: "beginner" | "intermediate" | "advanced" | null;
          mode?: string | null;
          pending_update?: boolean | null;
          price?: number | null;
          requirements?: string | null;
          scholarship_open?: boolean;
          scholarship_slots_max?: number | null;
          scholarship_slots_used?: number;
          summary?: string | null;
          teacher_id: string;
          thumbnail_url?: string | null;
          title: string;
          update_notes?: string | null;
          update_submitted_at?: string | null;
          updated_at?: string;
          welcome_video_url?: string | null;
          whatsapp_group_link?: string | null;
          whatsapp_link?: string | null;
        };
        Update: {
          approval_status?: "pending" | "approved" | "rejected" | null;
          category?: string | null;
          created_at?: string;
          currency?: string | null;
          description?: string | null;
          duration?: string | null;
          early_bird_end?: string | null;
          early_bird_max_seats?: number | null;
          early_bird_price?: number | null;
          early_bird_seats_used?: number;
          early_bird_start?: string | null;
          id?: string;
          is_featured?: boolean | null;
          is_free?: boolean | null;
          language?: string | null;
          last_approved_at?: string | null;
          learning_outcomes?: string[] | null;
          level?: "beginner" | "intermediate" | "advanced" | null;
          mode?: string | null;
          pending_update?: boolean | null;
          price?: number | null;
          requirements?: string | null;
          scholarship_open?: boolean;
          scholarship_slots_max?: number | null;
          scholarship_slots_used?: number;
          summary?: string | null;
          teacher_id?: string;
          thumbnail_url?: string | null;
          title?: string;
          update_notes?: string | null;
          update_submitted_at?: string | null;
          updated_at?: string;
          welcome_video_url?: string | null;
          whatsapp_group_link?: string | null;
          whatsapp_link?: string | null;
        };
        Relationships: [{"foreignKeyName":"courses_teacher_id_fkey","columns":["teacher_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      direct_messages: {
        Row: {
          conversation_id: string;
          created_at: string;
          edited_at: string | null;
          id: string;
          is_edited: boolean | null;
          is_read: boolean | null;
          message_text: string;
          sender_id: string;
        };
        Insert: {
          conversation_id: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          is_edited?: boolean | null;
          is_read?: boolean | null;
          message_text: string;
          sender_id: string;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          edited_at?: string | null;
          id?: string;
          is_edited?: boolean | null;
          is_read?: boolean | null;
          message_text?: string;
          sender_id?: string;
        };
        Relationships: [{"foreignKeyName":"direct_messages_conversation_id_fkey","columns":["conversation_id"],"isOneToOne":false,"referencedRelation":"conversations","referencedColumns":["id"]},{"foreignKeyName":"direct_messages_sender_id_fkey","columns":["sender_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      exhibition_projects: {
        Row: {
          achievements: string[];
          analysis: string | null;
          course_name: string;
          course_score: number;
          created_at: string;
          data_evidence: string | null;
          display_order: number;
          id: string;
          is_featured: boolean;
          problem_definition: string | null;
          project_description: string;
          project_link: string | null;
          project_title: string;
          recommendations: string | null;
          student_image_url: string | null;
          student_name: string;
          technologies: string[];
          tools_methods: string | null;
        };
        Insert: {
          achievements?: string[];
          analysis?: string | null;
          course_name?: string;
          course_score?: number;
          created_at?: string;
          data_evidence?: string | null;
          display_order?: number;
          id?: string;
          is_featured?: boolean;
          problem_definition?: string | null;
          project_description?: string;
          project_link?: string | null;
          project_title?: string;
          recommendations?: string | null;
          student_image_url?: string | null;
          student_name?: string;
          technologies?: string[];
          tools_methods?: string | null;
        };
        Update: {
          achievements?: string[];
          analysis?: string | null;
          course_name?: string;
          course_score?: number;
          created_at?: string;
          data_evidence?: string | null;
          display_order?: number;
          id?: string;
          is_featured?: boolean;
          problem_definition?: string | null;
          project_description?: string;
          project_link?: string | null;
          project_title?: string;
          recommendations?: string | null;
          student_image_url?: string | null;
          student_name?: string;
          technologies?: string[];
          tools_methods?: string | null;
        };
        Relationships: [];
      };
      group_chats: {
        Row: {
          created_at: string;
          description: string | null;
          group_name: string;
          id: string;
          is_archived: boolean | null;
          teacher_id: string;
          updated_at: string;
          whatsapp_link: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          group_name: string;
          id?: string;
          is_archived?: boolean | null;
          teacher_id: string;
          updated_at?: string;
          whatsapp_link?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          group_name?: string;
          id?: string;
          is_archived?: boolean | null;
          teacher_id?: string;
          updated_at?: string;
          whatsapp_link?: string | null;
        };
        Relationships: [{"foreignKeyName":"group_chats_teacher_id_fkey","columns":["teacher_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      group_members: {
        Row: {
          group_chat_id: string;
          id: string;
          joined_at: string;
          last_read_at: string | null;
          role: "admin" | "moderator" | "member";
          user_id: string;
        };
        Insert: {
          group_chat_id: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: "admin" | "moderator" | "member";
          user_id: string;
        };
        Update: {
          group_chat_id?: string;
          id?: string;
          joined_at?: string;
          last_read_at?: string | null;
          role?: "admin" | "moderator" | "member";
          user_id?: string;
        };
        Relationships: [{"foreignKeyName":"group_members_group_chat_id_fkey","columns":["group_chat_id"],"isOneToOne":false,"referencedRelation":"group_chats","referencedColumns":["id"]},{"foreignKeyName":"group_members_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      instalment_schedules: {
        Row: {
          amount: number;
          created_at: string | null;
          due_date: string;
          enrollment_id: string;
          id: string;
          instalment_number: number;
          paid_at: string | null;
          payment_id: string | null;
          status: "pending" | "paid" | "overdue" | "waived";
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          due_date: string;
          enrollment_id: string;
          id?: string;
          instalment_number: number;
          paid_at?: string | null;
          payment_id?: string | null;
          status?: "pending" | "paid" | "overdue" | "waived";
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          due_date?: string;
          enrollment_id?: string;
          id?: string;
          instalment_number?: number;
          paid_at?: string | null;
          payment_id?: string | null;
          status?: "pending" | "paid" | "overdue" | "waived";
        };
        Relationships: [{"foreignKeyName":"instalment_schedules_enrollment_id_fkey","columns":["enrollment_id"],"isOneToOne":false,"referencedRelation":"student_instalment_enrollments","referencedColumns":["id"]},{"foreignKeyName":"instalment_schedules_payment_id_fkey","columns":["payment_id"],"isOneToOne":false,"referencedRelation":"payments","referencedColumns":["id"]}];
      };
      lesson_quiz_questions: {
        Row: {
          correct_answer: string;
          created_at: string;
          explanation: string | null;
          id: string;
          lesson_id: string;
          options: Json;
          order_index: number;
          points: number | null;
          question_text: string;
        };
        Insert: {
          correct_answer: string;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          lesson_id: string;
          options: Json;
          order_index?: number;
          points?: number | null;
          question_text: string;
        };
        Update: {
          correct_answer?: string;
          created_at?: string;
          explanation?: string | null;
          id?: string;
          lesson_id?: string;
          options?: Json;
          order_index?: number;
          points?: number | null;
          question_text?: string;
        };
        Relationships: [{"foreignKeyName":"lesson_quiz_questions_lesson_id_fkey","columns":["lesson_id"],"isOneToOne":false,"referencedRelation":"course_lessons","referencedColumns":["id"]}];
      };
      message_reactions: {
        Row: {
          created_at: string;
          emoji: string;
          id: string;
          message_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji: string;
          id?: string;
          message_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string;
          id?: string;
          message_id?: string;
          user_id?: string;
        };
        Relationships: [{"foreignKeyName":"message_reactions_message_id_fkey","columns":["message_id"],"isOneToOne":false,"referencedRelation":"chat_messages","referencedColumns":["id"]},{"foreignKeyName":"message_reactions_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      message_read_receipts: {
        Row: {
          id: string;
          message_id: string;
          read_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          read_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          read_at?: string;
          user_id?: string;
        };
        Relationships: [{"foreignKeyName":"message_read_receipts_message_id_fkey","columns":["message_id"],"isOneToOne":false,"referencedRelation":"chat_messages","referencedColumns":["id"]},{"foreignKeyName":"message_read_receipts_user_id_fkey","columns":["user_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      notification_preferences: {
        Row: {
          muted_types: string[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          muted_types?: string[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          muted_types?: string[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          data: Json;
          email_sent_at: string | null;
          email_status: "pending" | "sent" | "failed" | "skipped" | null;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          email_sent_at?: string | null;
          email_status?: "pending" | "sent" | "failed" | "skipped" | null;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          data?: Json;
          email_sent_at?: string | null;
          email_status?: "pending" | "sent" | "failed" | "skipped" | null;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      partner_requests: {
        Row: {
          admin_notes: string | null;
          created_at: string | null;
          email: string;
          id: string;
          message: string | null;
          name: string;
          organization: string;
          phone: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: "pending" | "contacted" | "approved" | "rejected" | null;
          updated_at: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          created_at?: string | null;
          email: string;
          id?: string;
          message?: string | null;
          name: string;
          organization: string;
          phone: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "contacted" | "approved" | "rejected" | null;
          updated_at?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          created_at?: string | null;
          email?: string;
          id?: string;
          message?: string | null;
          name?: string;
          organization?: string;
          phone?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "contacted" | "approved" | "rejected" | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          bundle_id: string | null;
          callback_data: Json | null;
          cohort_id: string | null;
          coupon_id: string | null;
          course_id: string | null;
          created_at: string | null;
          currency: string | null;
          discount_amount: number | null;
          id: string;
          instalment_enrollment_id: string | null;
          instalment_schedule_id: string | null;
          original_amount: number | null;
          payer_email: string | null;
          payer_phone: string | null;
          payment_method: string | null;
          payment_provider: string | null;
          payment_track: "full" | "instalment" | "scholarship" | "early_bird" | null;
          provider_ref_id: string | null;
          reference_id: string;
          status: "pending" | "success" | "failed" | null;
          student_id: string;
          transaction_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          amount: number;
          bundle_id?: string | null;
          callback_data?: Json | null;
          cohort_id?: string | null;
          coupon_id?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          discount_amount?: number | null;
          id?: string;
          instalment_enrollment_id?: string | null;
          instalment_schedule_id?: string | null;
          original_amount?: number | null;
          payer_email?: string | null;
          payer_phone?: string | null;
          payment_method?: string | null;
          payment_provider?: string | null;
          payment_track?: "full" | "instalment" | "scholarship" | "early_bird" | null;
          provider_ref_id?: string | null;
          reference_id: string;
          status?: "pending" | "success" | "failed" | null;
          student_id: string;
          transaction_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          amount?: number;
          bundle_id?: string | null;
          callback_data?: Json | null;
          cohort_id?: string | null;
          coupon_id?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          discount_amount?: number | null;
          id?: string;
          instalment_enrollment_id?: string | null;
          instalment_schedule_id?: string | null;
          original_amount?: number | null;
          payer_email?: string | null;
          payer_phone?: string | null;
          payment_method?: string | null;
          payment_provider?: string | null;
          payment_track?: "full" | "instalment" | "scholarship" | "early_bird" | null;
          provider_ref_id?: string | null;
          reference_id?: string;
          status?: "pending" | "success" | "failed" | null;
          student_id?: string;
          transaction_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"payments_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"payments_bundle_id_fkey","columns":["bundle_id"],"isOneToOne":false,"referencedRelation":"course_bundles","referencedColumns":["id"]},{"foreignKeyName":"payments_coupon_id_fkey","columns":["coupon_id"],"isOneToOne":false,"referencedRelation":"coupons","referencedColumns":["id"]},{"foreignKeyName":"payments_cohort_id_fkey","columns":["cohort_id"],"isOneToOne":false,"referencedRelation":"cohorts","referencedColumns":["id"]},{"foreignKeyName":"payments_instalment_enrollment_id_fkey","columns":["instalment_enrollment_id"],"isOneToOne":false,"referencedRelation":"student_instalment_enrollments","referencedColumns":["id"]},{"foreignKeyName":"payments_instalment_schedule_id_fkey","columns":["instalment_schedule_id"],"isOneToOne":false,"referencedRelation":"instalment_schedules","referencedColumns":["id"]}];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          industry: string | null;
          interests: string[] | null;
          is_suspended: boolean | null;
          job_role: string | null;
          last_activity: string | null;
          last_login: string | null;
          onboarding_completed: boolean | null;
          organization: string | null;
          phone: string | null;
          pricing_tier: string;
          role: Database["public"]["Enums"]["user_role"];
          suspension_reason: string | null;
          teacher_approval_date: string | null;
          teacher_approval_status: "pending" | "approved" | "rejected" | null;
          teacher_approved: boolean | null;
          teacher_approved_by: string | null;
          teacher_rejection_reason: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          industry?: string | null;
          interests?: string[] | null;
          is_suspended?: boolean | null;
          job_role?: string | null;
          last_activity?: string | null;
          last_login?: string | null;
          onboarding_completed?: boolean | null;
          organization?: string | null;
          phone?: string | null;
          pricing_tier?: string;
          role: Database["public"]["Enums"]["user_role"];
          suspension_reason?: string | null;
          teacher_approval_date?: string | null;
          teacher_approval_status?: "pending" | "approved" | "rejected" | null;
          teacher_approved?: boolean | null;
          teacher_approved_by?: string | null;
          teacher_rejection_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          industry?: string | null;
          interests?: string[] | null;
          is_suspended?: boolean | null;
          job_role?: string | null;
          last_activity?: string | null;
          last_login?: string | null;
          onboarding_completed?: boolean | null;
          organization?: string | null;
          phone?: string | null;
          pricing_tier?: string;
          role?: Database["public"]["Enums"]["user_role"];
          suspension_reason?: string | null;
          teacher_approval_date?: string | null;
          teacher_approval_status?: "pending" | "approved" | "rejected" | null;
          teacher_approved?: boolean | null;
          teacher_approved_by?: string | null;
          teacher_rejection_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [{"foreignKeyName":"profiles_teacher_approved_by_fkey","columns":["teacher_approved_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      quiz_attempts: {
        Row: {
          answers: Json | null;
          id: string;
          quiz_id: string;
          score: number | null;
          started_at: string;
          student_id: string;
          submitted_at: string | null;
        };
        Insert: {
          answers?: Json | null;
          id?: string;
          quiz_id: string;
          score?: number | null;
          started_at?: string;
          student_id: string;
          submitted_at?: string | null;
        };
        Update: {
          answers?: Json | null;
          id?: string;
          quiz_id?: string;
          score?: number | null;
          started_at?: string;
          student_id?: string;
          submitted_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"quiz_attempts_quiz_id_fkey","columns":["quiz_id"],"isOneToOne":false,"referencedRelation":"quizzes","referencedColumns":["id"]},{"foreignKeyName":"quiz_attempts_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      quiz_questions: {
        Row: {
          correct_answer: string | null;
          id: string;
          options: Json | null;
          order_index: number | null;
          points: number | null;
          question_text: string;
          question_type: string;
          quiz_id: string;
        };
        Insert: {
          correct_answer?: string | null;
          id?: string;
          options?: Json | null;
          order_index?: number | null;
          points?: number | null;
          question_text: string;
          question_type: string;
          quiz_id: string;
        };
        Update: {
          correct_answer?: string | null;
          id?: string;
          options?: Json | null;
          order_index?: number | null;
          points?: number | null;
          question_text?: string;
          question_type?: string;
          quiz_id?: string;
        };
        Relationships: [{"foreignKeyName":"quiz_questions_quiz_id_fkey","columns":["quiz_id"],"isOneToOne":false,"referencedRelation":"quizzes","referencedColumns":["id"]}];
      };
      quizzes: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          max_score: number | null;
          time_limit: number | null;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          max_score?: number | null;
          time_limit?: number | null;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          max_score?: number | null;
          time_limit?: number | null;
          title?: string;
        };
        Relationships: [{"foreignKeyName":"quizzes_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      scheduled_classes: {
        Row: {
          cohort_id: string | null;
          course_id: string;
          created_at: string;
          description: string | null;
          end_time: string | null;
          id: string;
          location: string | null;
          meet_link: string | null;
          modality: "online" | "in_person" | "hybrid";
          scheduled_time: string;
          status: "scheduled" | "cancelled";
          teacher_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          cohort_id?: string | null;
          course_id: string;
          created_at?: string;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          location?: string | null;
          meet_link?: string | null;
          modality?: "online" | "in_person" | "hybrid";
          scheduled_time: string;
          status?: "scheduled" | "cancelled";
          teacher_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          cohort_id?: string | null;
          course_id?: string;
          created_at?: string;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          location?: string | null;
          meet_link?: string | null;
          modality?: "online" | "in_person" | "hybrid";
          scheduled_time?: string;
          status?: "scheduled" | "cancelled";
          teacher_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scholarship_applications: {
        Row: {
          admin_notes: string | null;
          coupon_id: string | null;
          course_id: string;
          created_at: string | null;
          discount_fixed: number | null;
          discount_percent: number | null;
          document_url: string | null;
          email: string;
          full_name: string;
          generated_code: string | null;
          id: string;
          income_band: string | null;
          motivation: string;
          organisation: string | null;
          phone: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          scholarship_level: string | null;
          status: "pending" | "approved" | "rejected" | "redeemed";
          student_id: string;
          updated_at: string | null;
        };
        Insert: {
          admin_notes?: string | null;
          coupon_id?: string | null;
          course_id: string;
          created_at?: string | null;
          discount_fixed?: number | null;
          discount_percent?: number | null;
          document_url?: string | null;
          email: string;
          full_name: string;
          generated_code?: string | null;
          id?: string;
          income_band?: string | null;
          motivation: string;
          organisation?: string | null;
          phone?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scholarship_level?: string | null;
          status?: "pending" | "approved" | "rejected" | "redeemed";
          student_id: string;
          updated_at?: string | null;
        };
        Update: {
          admin_notes?: string | null;
          coupon_id?: string | null;
          course_id?: string;
          created_at?: string | null;
          discount_fixed?: number | null;
          discount_percent?: number | null;
          document_url?: string | null;
          email?: string;
          full_name?: string;
          generated_code?: string | null;
          id?: string;
          income_band?: string | null;
          motivation?: string;
          organisation?: string | null;
          phone?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          scholarship_level?: string | null;
          status?: "pending" | "approved" | "rejected" | "redeemed";
          student_id?: string;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"scholarship_applications_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"scholarship_applications_coupon_id_fkey","columns":["coupon_id"],"isOneToOne":false,"referencedRelation":"coupons","referencedColumns":["id"]}];
      };
      student_instalment_enrollments: {
        Row: {
          cohort_id: string | null;
          course_id: string;
          created_at: string | null;
          currency: string;
          id: string;
          plan_id: string;
          status: "active" | "completed" | "defaulted" | "cancelled";
          student_id: string;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          cohort_id?: string | null;
          course_id: string;
          created_at?: string | null;
          currency?: string;
          id?: string;
          plan_id: string;
          status?: "active" | "completed" | "defaulted" | "cancelled";
          student_id: string;
          total_amount: number;
          updated_at?: string | null;
        };
        Update: {
          cohort_id?: string | null;
          course_id?: string;
          created_at?: string | null;
          currency?: string;
          id?: string;
          plan_id?: string;
          status?: "active" | "completed" | "defaulted" | "cancelled";
          student_id?: string;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"student_instalment_enrollments_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]},{"foreignKeyName":"student_instalment_enrollments_plan_id_fkey","columns":["plan_id"],"isOneToOne":false,"referencedRelation":"course_instalment_plans","referencedColumns":["id"]},{"foreignKeyName":"student_instalment_enrollments_cohort_id_fkey","columns":["cohort_id"],"isOneToOne":false,"referencedRelation":"cohorts","referencedColumns":["id"]}];
      };
      student_lesson_progress: {
        Row: {
          completed_at: string | null;
          id: string;
          is_completed: boolean | null;
          last_position: number | null;
          lesson_id: string;
          started_at: string | null;
          student_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          last_position?: number | null;
          lesson_id: string;
          started_at?: string | null;
          student_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          is_completed?: boolean | null;
          last_position?: number | null;
          lesson_id?: string;
          started_at?: string | null;
          student_id?: string;
        };
        Relationships: [{"foreignKeyName":"student_lesson_progress_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"student_lesson_progress_lesson_id_fkey","columns":["lesson_id"],"isOneToOne":false,"referencedRelation":"course_lessons","referencedColumns":["id"]}];
      };
      student_quiz_attempts: {
        Row: {
          answers: Json;
          id: string;
          lesson_id: string;
          passed: boolean | null;
          score: number;
          started_at: string;
          student_id: string;
          submitted_at: string;
          total_points: number;
        };
        Insert: {
          answers: Json;
          id?: string;
          lesson_id: string;
          passed?: boolean | null;
          score: number;
          started_at?: string;
          student_id: string;
          submitted_at?: string;
          total_points: number;
        };
        Update: {
          answers?: Json;
          id?: string;
          lesson_id?: string;
          passed?: boolean | null;
          score?: number;
          started_at?: string;
          student_id?: string;
          submitted_at?: string;
          total_points?: number;
        };
        Relationships: [{"foreignKeyName":"student_quiz_attempts_student_id_fkey","columns":["student_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"student_quiz_attempts_lesson_id_fkey","columns":["lesson_id"],"isOneToOne":false,"referencedRelation":"course_lessons","referencedColumns":["id"]}];
      };
      system_settings: {
        Row: {
          description: string | null;
          id: string;
          key: string;
          updated_at: string | null;
          updated_by: string | null;
          value: Json;
        };
        Insert: {
          description?: string | null;
          id?: string;
          key: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value: Json;
        };
        Update: {
          description?: string | null;
          id?: string;
          key?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          value?: Json;
        };
        Relationships: [{"foreignKeyName":"system_settings_updated_by_fkey","columns":["updated_by"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]}];
      };
      teacher_announcements: {
        Row: {
          course_id: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          message: string;
          teacher_id: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          message: string;
          teacher_id: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          course_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          message?: string;
          teacher_id?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [{"foreignKeyName":"teacher_announcements_teacher_id_fkey","columns":["teacher_id"],"isOneToOne":false,"referencedRelation":"profiles","referencedColumns":["id"]},{"foreignKeyName":"teacher_announcements_course_id_fkey","columns":["course_id"],"isOneToOne":false,"referencedRelation":"courses","referencedColumns":["id"]}];
      };
      testimonials: {
        Row: {
          career_impact: string | null;
          course_name: string | null;
          created_at: string | null;
          created_by: string | null;
          display_order: number | null;
          id: string;
          is_featured: boolean | null;
          profession: string | null;
          programs_participated: string | null;
          rating: number | null;
          student_image_url: string | null;
          student_name: string;
          testimonial_text: string;
          updated_at: string | null;
        };
        Insert: {
          career_impact?: string | null;
          course_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          display_order?: number | null;
          id?: string;
          is_featured?: boolean | null;
          profession?: string | null;
          programs_participated?: string | null;
          rating?: number | null;
          student_image_url?: string | null;
          student_name: string;
          testimonial_text: string;
          updated_at?: string | null;
        };
        Update: {
          career_impact?: string | null;
          course_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          display_order?: number | null;
          id?: string;
          is_featured?: boolean | null;
          profession?: string | null;
          programs_participated?: string | null;
          rating?: number | null;
          student_image_url?: string | null;
          student_name?: string;
          testimonial_text?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      admin_delete_course: { Args: { p_course_id: string }; Returns: boolean };
      approve_certificate: { Args: { p_student_id: string; p_course_id: string; p_certificate_url: string; p_notes?: string }; Returns: string };
      approve_course_update: { Args: { p_course_id: string; p_review_notes?: string }; Returns: boolean };
      approve_scholarship_application: { Args: { p_application_id: string; p_admin_id: string; p_scholarship_level?: string; p_discount_percent?: number; p_discount_fixed?: number; p_admin_notes?: string }; Returns: Json };
      approve_teacher: { Args: { p_teacher_id: string }; Returns: boolean };
      calculate_chapter_progress: { Args: { p_student_id: string; p_chapter_id: string }; Returns: { total_lessons: number; completed_lessons: number; progress_percentage: number; all_completed: boolean }[] };
      calculate_course_progress: { Args: { p_student_id: string; p_course_id: string }; Returns: { total_lessons: number; completed_lessons: number; progress_percentage: number }[] };
      can_access_lesson: { Args: { p_lesson_id: string }; Returns: boolean };
      can_create_course: { Args: Record<PropertyKey, never>; Returns: boolean };
      can_enroll_in_course: { Args: Record<PropertyKey, never>; Returns: boolean };
      check_course_access: { Args: { p_user_id: string; p_course_id: string }; Returns: boolean };
      create_instalment_enrollment: { Args: { p_student_id: string; p_course_id: string; p_total_amount: number; p_currency?: string; p_cohort_id?: string }; Returns: Json };
      create_payment_record: { Args: { p_student_id: string; p_course_id?: string; p_bundle_id?: string; p_amount?: number; p_currency?: string; p_reference_id?: string; p_payment_method?: string; p_payer_phone?: string; p_payer_email?: string; p_payment_provider?: string; p_provider_ref_id?: string; p_coupon_id?: string; p_original_amount?: number; p_discount_amount?: number; p_payment_track?: string; p_cohort_id?: string; p_instalment_enrollment_id?: string; p_instalment_schedule_id?: string }; Returns: string };
      get_activity_logs: { Args: { p_limit?: number; p_offset?: number }; Returns: { id: string; user_id: string; action: string; entity_type: string; entity_id: string; details: Json; ip_address: string; user_agent: string; created_at: string; user_full_name: string; user_email: string }[] };
      get_admin_dashboard_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      get_all_profiles: { Args: Record<PropertyKey, never>; Returns: { id: string; email: string; full_name: string; role: string; avatar_url: string; phone: string; pricing_tier: string; created_at: string; updated_at: string; teacher_approved: boolean; teacher_approval_status: string; is_suspended: boolean; suspension_reason: string; last_login: string; last_activity: string }[] };
      get_all_student_progress: { Args: Record<PropertyKey, never>; Returns: { student_id: string; student_name: string; student_email: string; student_phone: string; course_id: string; course_title: string; teacher_name: string; enrolled_at: string; total_lessons: number; completed_lessons: number; progress_percentage: number; last_activity: string }[] };
      get_coupon_redemption_stats: { Args: Record<PropertyKey, never>; Returns: { coupon_id: string; code: string; coupon_type: string; discount_type: string; discount_value: number; max_uses: number; uses_count: number; redemption_count: number; total_discount: number; is_active: boolean }[] };
      get_course_approvals: { Args: Record<PropertyKey, never>; Returns: { id: string; course_id: string; status: string; reviewed_by: string; review_notes: string; created_at: string; reviewed_at: string }[] };
      get_course_completions: { Args: { p_course_id?: string }; Returns: { enrollment_id: string; student_id: string; student_name: string; student_email: string; course_id: string; course_title: string; teacher_name: string; completed: boolean; completion_date: string; final_grade: string; progress_percentage: number; certificate_id: string; certificate_status: string; certificate_url: string; certificate_approved_at: string }[] };
      get_instalment_tracker: { Args: Record<PropertyKey, never>; Returns: { enrollment_id: string; student_id: string; student_name: string; student_email: string; course_id: string; course_title: string; total_amount: number; currency: string; status: string; paid_count: number; pending_count: number; overdue_count: number; next_due_date: string; created_at: string }[] };
      get_lesson_quiz: { Args: { p_lesson_id: string }; Returns: { id: string; question_text: string; options: Json; points: number; order_index: number }[] };
      get_lesson_quiz_review: { Args: { p_lesson_id: string }; Returns: Json };
      get_pending_course_updates: { Args: Record<PropertyKey, never>; Returns: { course_id: string; course_title: string; teacher_id: string; teacher_name: string; update_submitted_at: string; update_notes: string; thumbnail_url: string }[] };
      get_student_pending_instalments: { Args: { p_student_id?: string }; Returns: { schedule_id: string; enrollment_id: string; course_id: string; course_title: string; instalment_number: number; amount: number; currency: string; due_date: string; status: string }[] };
      get_system_settings: { Args: Record<PropertyKey, never>; Returns: { id: string; key: string; value: Json; description: string; updated_by: string; updated_at: string }[] };
      get_unread_announcements_count: { Args: Record<PropertyKey, never>; Returns: number };
      get_user_role: { Args: { user_id: string }; Returns: string };
      is_admin: { Args: { user_id: string }; Returns: boolean };
      issue_certificate_if_eligible: { Args: { p_student_id: string; p_course_id: string }; Returns: string };
      issue_pending_certificates: { Args: Record<PropertyKey, never>; Returns: number };
      log_activity: { Args: { p_user_id: string; p_action: string; p_entity_type?: string; p_entity_id?: string; p_details?: Json }; Returns: string };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: number };
      mark_course_completed: { Args: { p_student_id: string; p_course_id: string; p_final_grade?: string }; Returns: boolean };
      mark_notifications_read: { Args: { p_ids?: string[] | null }; Returns: number };
      record_lesson_visit: { Args: { p_lesson_id: string; p_position?: number | null }; Returns: undefined };
      redeem_coupon_for_payment: { Args: { p_payment_id: string }; Returns: Json };
      refresh_enrollment_progress: { Args: { p_student_id: string; p_course_id: string }; Returns: undefined };
      reinstate_certificate: { Args: { p_certificate_id: string }; Returns: undefined };
      reject_course_update: { Args: { p_course_id: string; p_review_notes: string }; Returns: boolean };
      reject_scholarship_application: { Args: { p_application_id: string; p_admin_id: string; p_admin_notes?: string }; Returns: Json };
      reject_teacher: { Args: { p_teacher_id: string; p_rejection_reason: string }; Returns: boolean };
      revoke_certificate: { Args: { p_certificate_id: string; p_reason: string }; Returns: undefined };
      submit_course_update: { Args: { p_course_id: string; p_update_notes?: string }; Returns: boolean };
      submit_lesson_quiz: { Args: { p_lesson_id: string; p_answers: Json }; Returns: Json };
      suspend_user: { Args: { p_user_id: string; p_suspension_reason: string }; Returns: boolean };
      unsuspend_user: { Args: { p_user_id: string }; Returns: boolean };
      update_payment_status: { Args: { p_reference_id: string; p_status: string; p_transaction_id?: string; p_callback_data?: Json }; Returns: Json };
      update_system_setting: { Args: { p_key: string; p_value: Json; p_description?: string }; Returns: string };
      update_user_activity: { Args: Record<PropertyKey, never>; Returns: string };
      update_user_pricing_tier: { Args: { p_user_id: string; p_pricing_tier: string }; Returns: Json };
      validate_coupon: { Args: { p_code: string; p_student_id: string; p_course_id?: string; p_bundle_id?: string; p_original_amount?: number; p_currency?: string }; Returns: Json };
      verify_certificate: { Args: { p_code: string }; Returns: { certificate_number: string; holder_name: string; course_title: string; issued_at: string; completion_date: string; is_valid: boolean; status: string }[] };
    };
    Enums: { user_role: "student" | "teacher" | "admin" };
    CompositeTypes: Record<never, never>;
  };
};
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const
