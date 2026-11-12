import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Users, CheckCircle, Star, Pencil, Lock, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/services/paymentService";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description?: string | null;
    summary?: string | null;
    thumbnail_url?: string | null;
    level?: string;
    price?: number;
    is_free?: boolean;
    currency?: string;
    profiles?: {
      full_name: string;
    };
  };
  onClick: () => void;
  gradient?: string;
  showTeacher?: boolean;
  columnIndex?: number; // To determine popup position
  isEnrolled?: boolean; // To show enrolled status
  showEnrollButton?: boolean; // To show enroll button
  onEnroll?: () => void; // Callback for enroll action
  onEdit?: () => void; // Callback for edit action (teacher view)
  onBuy?: () => void; // Callback for buy action (student view)
}

export const CourseCard = ({ course, onClick, gradient = "from-blue-500 to-purple-600", showTeacher = false, columnIndex = 0, isEnrolled = false, showEnrollButton = false, onEnroll, onEdit, onBuy }: CourseCardProps) => {
  const { t } = useTranslation();
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const summary = course.summary && course.summary.trim().length > 0
    ? course.summary
    : course.description || t('courseCard.exploreDescription');

  // Show popup on left for columns 3 and 4 (index 2 and 3)
  const showPopupOnLeft = columnIndex >= 2;

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => {
      setShowHoverCard(true);
    }, 250); // Show after 250ms hover
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setShowHoverCard(false);
  };

  // Sample learning points - in production, these would come from the database
  const learningPoints = [
    t('courseCard.masterConcepts'),
    t('courseCard.buildProjects'),
    t('courseCard.learnBestPractices'),
  ];

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Card
        className="group hover:shadow-2xl transition-all duration-300 border border-black cursor-pointer rounded-xl sm:rounded-2xl overflow-hidden h-full flex flex-col"
        onClick={onClick}
      >
        <CardContent className="p-0 flex flex-col h-full">
          {/* Course Image */}
          <div className={`relative h-28 sm:h-40 bg-gradient-to-br ${gradient} overflow-hidden`}>
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-white/30" />
              </div>
            )}
            {/* Level Badge */}
            {course.level && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <Badge
                  className={`text-xs sm:text-sm ${course.level === "beginner"
                    ? "bg-green-500"
                    : course.level === "intermediate"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                    } text-white`}
                >
                  {course.level}
                </Badge>
              </div>
            )}
            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="absolute top-2 left-2 sm:top-3 sm:left-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                title="Edit course"
              >
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-700" />
              </button>
            )}
            {/* Price Badge */}
            {course.is_free === false && course.price && course.price > 0 ? (
              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                <Badge className="bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-md">
                  {formatPrice(course.price, course.currency || 'RWF')}
                </Badge>
              </div>
            ) : course.is_free !== undefined ? (
              <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3">
                <Badge className="bg-green-500 text-white text-xs sm:text-sm">
                  Free
                </Badge>
              </div>
            ) : null}
          </div>

          {/* Course Info */}
          <div className="p-3 sm:p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-2 transition-colors">
              {course.title}
            </h3>

            <div className="mt-auto space-y-1.5 sm:space-y-2">
              {showTeacher && course.profiles && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">{course.profiles.full_name}</span>
                </div>
              )}

              {isEnrolled ? (
                <Button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 cursor-not-allowed text-xs sm:text-sm"
                  size="sm"
                >
                  {t('courseCard.enrolled')}
                </Button>
              ) : course.is_free === false && course.price && course.price > 0 ? (
                <div className="flex gap-1.5">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    variant="outline"
                    className="flex-1 border-[#006d2c] text-[#006d2c] hover:bg-[#006d2c]/10 text-xs sm:text-sm"
                    size="sm"
                  >
                    Preview
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onBuy) onBuy();
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm"
                    size="sm"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Enroll
                  </Button>
                </div>
              ) : showEnrollButton && onEnroll ? (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnroll();
                  }}
                  className="w-full bg-[#006d2c] hover:bg-[#005523] text-white text-xs sm:text-sm"
                  size="sm"
                >
                  {t('courseCard.enrollNow')}
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Udemy-style Hover Popup - Hidden on mobile */}
      {showHoverCard && (
        <div className={`absolute top-0 w-96 z-50 animate-in fade-in duration-200 hidden lg:block ${showPopupOnLeft
          ? 'right-full mr-2 slide-in-from-right-2'
          : 'left-full ml-2 slide-in-from-left-2'
          }`}>
          <Card className="border border-black shadow-2xl">
            <CardContent className="p-6 space-y-4">
              {/* Title */}
              <h3 className="font-bold text-xl text-gray-900">
                {course.title}
              </h3>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-green-100 text-green-800">
                  {t('courseCard.bestseller')}
                </Badge>
                {course.level && (
                  <Badge variant="outline">
                    {course.level}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">4.6</span>
                  <span className="text-gray-500">(1,234 {t('courseCard.ratings')})</span>
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary}
              </p>

              {/* What you'll learn */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-900">
                  {t('courseCard.whatYouWillLearn')}
                </h4>
                <ul className="space-y-2">
                  {learningPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-[#006d2c] flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Course Details */}
              <div className="flex items-center gap-4 text-sm text-gray-600 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>12 {t('courseCard.hours')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{t('courseCard.allLevels')}</span>
                </div>
              </div>

              {/* Teacher */}
              {showTeacher && course.profiles && (
                <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                  <Users className="h-4 w-4" />
                  <span>{t('courseCard.by')} {course.profiles.full_name}</span>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-[#006d2c] hover:bg-[#005523] text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}
                >
                  {t('courseCard.viewCourseDetails')}
                </Button>
                {onEdit && (
                  <Button
                    variant="outline"
                    className="border-[#006d2c] text-[#006d2c] hover:bg-[#006d2c]/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onBuy && !isEnrolled && course.is_free === false && (
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuy();
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Enroll
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
