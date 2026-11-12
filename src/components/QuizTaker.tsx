import { z } from "zod";
import { parseQuizOptions } from "@/lib/quizData";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Award } from "lucide-react";

interface QuizQuestion {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string;
  points: number;
}

interface QuizTakerProps {
  lessonId: string;
  studentId: string;
  onComplete: () => void;
  isPreviewMode?: boolean; // For teachers to view quiz without submitting
}

export function QuizTaker({ lessonId, studentId, onComplete, isPreviewMode = false }: QuizTakerProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [passed, setPassed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
    // Only check previous attempts for students, not teachers in preview mode
    if (!isPreviewMode) {
      checkPreviousAttempt();
    }
  }, [lessonId, isPreviewMode]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lesson_quiz_questions")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      setQuestions((data || []).map(q => ({ ...q, options: parseQuizOptions(q.options) })));
      
      const total = (data || []).reduce((sum, q) => sum + q.points, 0);
      setTotalPoints(total);
    } catch (error) {
      console.error("Error fetching quiz questions:", error);
      toast.error("Failed to load quiz questions");
    } finally {
      setLoading(false);
    }
  };

  const checkPreviousAttempt = async () => {
    try {
      const { data } = await supabase
        .from("student_quiz_attempts")
        .select("*")
        .eq("student_id", studentId)
        .eq("lesson_id", lessonId)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setIsSubmitted(true);
        setAnswers(z.record(z.string()).parse(data.answers));
        setScore(data.score);
        setTotalPoints(data.total_points);
        setPassed(data.passed);
      }
    } catch (error) {
      // No previous attempt found
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate score
      let calculatedScore = 0;
      questions.forEach((q) => {
        if (answers[q.id] === q.correct_answer) {
          calculatedScore += q.points;
        }
      });

      const passThreshold = totalPoints * 0.6; // 60% to pass
      const isPassed = calculatedScore >= passThreshold;

      // Save attempt
      const { error } = await supabase.from("student_quiz_attempts").insert({
        student_id: studentId,
        lesson_id: lessonId,
        answers: answers,
        score: calculatedScore,
        total_points: totalPoints,
        passed: isPassed,
      });

      if (error) throw error;

      // If passed, mark lesson as complete
      if (isPassed) {
        await supabase.from("student_lesson_progress").upsert({
          student_id: studentId,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "student_id,lesson_id",
        });
      }

      setScore(calculatedScore);
      setPassed(isPassed);
      setIsSubmitted(true);

      if (isPassed) {
        toast.success("Quiz passed! Well done!");
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        toast.error("Quiz not passed. You need 60% to pass. Try again!");
      }
    } catch (error) {
      console.error("Error submitting quiz:", error);
      toast.error("Failed to submit quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setIsSubmitted(false);
    setAnswers({});
    setScore(0);
    setPassed(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>No questions available for this quiz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {isPreviewMode ? "Quiz Preview" : "Quiz Time!"}
        </h2>
        <p className="text-muted-foreground">
          {isPreviewMode 
            ? "You are viewing this quiz as a teacher. Answers will not be recorded."
            : "Answer all questions to complete this lesson"
          }
        </p>
        {!isSubmitted && !isPreviewMode && (
          <p className="text-sm text-muted-foreground mt-2">
            Total Points: {totalPoints} • Pass Score: {Math.ceil(totalPoints * 0.6)} (60%)
          </p>
        )}
        {isPreviewMode && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
            <Award className="h-4 w-4" />
            Teacher Preview Mode
          </div>
        )}
      </div>

      {/* Results Banner */}
      {isSubmitted && (
        <Card className={`p-6 ${passed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {passed ? (
                <CheckCircle className="h-12 w-12 text-green-600" />
              ) : (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
              <div>
                <h3 className={`text-xl font-bold ${passed ? "text-green-900" : "text-red-900"}`}>
                  {passed ? "Congratulations! You Passed!" : "Not Passed"}
                </h3>
                <p className={`text-sm ${passed ? "text-green-700" : "text-red-700"}`}>
                  Score: {score} / {totalPoints} ({Math.round((score / totalPoints) * 100)}%)
                </p>
              </div>
            </div>
            {!passed && (
              <Button onClick={handleRetry} variant="outline">
                Retry Quiz
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <Card key={question.id} className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-lg mb-4">{question.question_text}</p>
                  
                  <RadioGroup
                    value={answers[question.id]}
                    onValueChange={(value) =>
                      !isSubmitted && setAnswers({ ...answers, [question.id]: value })
                    }
                    disabled={isSubmitted}
                  >
                    <div className="space-y-3">
                      {question.options.map((option) => {
                        const isCorrect = option.id === question.correct_answer;
                        const isSelected = answers[question.id] === option.id;
                        const showFeedback = isSubmitted;

                        return (
                          <div
                            key={option.id}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors ${
                              showFeedback && isCorrect
                                ? "bg-green-50 border-green-500"
                                : showFeedback && isSelected && !isCorrect
                                ? "bg-red-50 border-red-500"
                                : isSelected
                                ? "border-purple-500 bg-purple-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                            <Label
                              htmlFor={`${question.id}-${option.id}`}
                              className="flex-1 cursor-pointer font-medium"
                            >
                              <span className="font-bold mr-2">{option.id.toUpperCase()}.</span>
                              {option.text}
                            </Label>
                            {showFeedback && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            {showFeedback && isSelected && !isCorrect && (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>

                  {/* Show explanation after submission */}
                  {isSubmitted && question.explanation && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                      <p className="text-sm text-blue-800">{question.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <span className="text-sm text-muted-foreground">
                  {question.points} {question.points === 1 ? "point" : "points"}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Submit Button - Only show for students, not teachers in preview mode */}
      {!isSubmitted && !isPreviewMode && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length < questions.length}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        </div>
      )}
      
      {/* Preview mode info for teachers */}
      {isPreviewMode && (
        <div className="flex justify-center pt-4">
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600 text-sm">
              As a teacher, you can view quiz questions but cannot submit answers.
            </p>
          </div>
        </div>
      )}

      {/* Pass Certificate */}
      {isSubmitted && passed && (
        <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-center gap-3">
            <Award className="h-8 w-8 text-purple-600" />
            <p className="text-lg font-semibold text-purple-900">
              Quiz completed successfully! You can now proceed to the next lesson.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
