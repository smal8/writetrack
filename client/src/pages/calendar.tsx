import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import type { Assignment, Class, Submission } from "@shared/schema";

// Define a palette of 10 colors for class assignments
const palette = [
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-500" },
  { bg: "bg-red-100", text: "text-red-800", border: "border-red-500" },
  { bg: "bg-green-100", text: "text-green-800", border: "border-green-500" },
  { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-500" },
  { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-500" },
  { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-500" },
  { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-500" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-500" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-500" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-500" },
];

// Helper to normalize a date to midnight (local time)
function normalizeDate(dateInput: Date | string): Date {
  const date = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  assignments: Array<Assignment & { className: string; isCompleted?: boolean }>;
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");

  // Fetch classes, assignments (using getAssignments API endpoint), and submissions
  const classesQuery = useQuery<Class[]>({ queryKey: ["/api/classes"] });
  const assignmentsQuery = useQuery<Assignment[]>({
    queryKey: ["/api/assignments"],
    staleTime: 0,
    refetchOnMount: true,
  });
  const submissionsQuery = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    staleTime: 0,
    refetchOnMount: true,
  });

  // Build a calendar grid for the selected month
  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days: CalendarDay[] = [];

    // Fill in days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const date = normalizeDate(new Date(year, month - 1, prevMonthDays - i));
      days.push({ date, isCurrentMonth: false, assignments: [] });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = normalizeDate(new Date(year, month, i));
      days.push({ date, isCurrentMonth: true, assignments: [] });
    }

    // Fill in days for the last week from next month
    const lastDayOfWeek = new Date(year, month, daysInMonth).getDay();
    const remainingDays = 6 - lastDayOfWeek;
    for (let i = 1; i <= remainingDays; i++) {
      const date = normalizeDate(new Date(year, month + 1, i));
      days.push({ date, isCurrentMonth: false, assignments: [] });
    }
    return days;
  };

  // Populate calendarDays with assignments for each day
  useEffect(() => {
    if (!assignmentsQuery.data || !classesQuery.data) return;

    const days = getDaysInMonth(selectedYear, selectedMonth);

    // Filter assignments by selected class if needed
    const relevantAssignments = assignmentsQuery.data.filter(assignment => {
      if (selectedClassId !== "all" && assignment.classId !== selectedClassId) {
        return false;
      }
      return true;
    });

    // For each calendar day, attach assignments that match the due date
    const enhancedDays = days.map(day => {
      const assignmentsForDay = relevantAssignments.filter(assignment => {
        const dueDate = new Date(assignment.dueDate);
        return (
          dueDate.getFullYear() === day.date.getFullYear() &&
          dueDate.getMonth() === day.date.getMonth() &&
          dueDate.getDate() === day.date.getDate()
        );
      }).map(assignment => {
        const className = classesQuery.data.find(c => c.id === assignment.classId)?.name || "Unknown";
        let isCompleted = false;
        if (user && !user.isTeacher && submissionsQuery.data) {
          isCompleted = submissionsQuery.data.some(s =>
            s.assignmentId === assignment.id &&
            s.studentId === user.id &&
            !s.is_draft
          );
        }
        return { ...assignment, className, isCompleted };
      });
      return { ...day, assignments: assignmentsForDay };
    });

    setCalendarDays(enhancedDays);
  }, [
    assignmentsQuery.data,
    classesQuery.data,
    submissionsQuery.data,
    selectedMonth,
    selectedYear,
    selectedClassId,
    user,
  ]);

  // Month navigation handlers
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const isLoading = classesQuery.isLoading || assignmentsQuery.isLoading || submissionsQuery.isLoading;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="container mx-auto p-6">
      {/* Header with navigation and class filter */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl font-semibold">
              {monthNames[selectedMonth]} {selectedYear}
            </CardTitle>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={selectedClassId.toString()}
            onValueChange={(value) =>
              setSelectedClassId(value === "all" ? "all" : parseInt(value))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classesQuery.data?.map(classItem => (
                <SelectItem key={classItem.id} value={classItem.id.toString()}>
                  {classItem.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar grid */}
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map(day => (
                <div key={day} className="p-1 text-center font-semibold text-sm">
                  {day}
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-1 mt-2">
              {calendarDays.map((day, index) => {
                const today = normalizeDate(new Date());
                const isToday = day.date.getTime() === today.getTime();
                return (
                  <div
                    key={index}
                    className={`border rounded p-1.5 min-h-[110px] flex flex-col ${
                      day.isCurrentMonth ? "bg-white" : "bg-gray-50/50 text-gray-400"
                    } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    <div className={`font-medium text-sm p-1 rounded-full w-6 h-6 flex items-center justify-center mb-1 ${
                      isToday ? "bg-primary text-primary-foreground" : ""
                    }`}>
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1 overflow-y-auto flex-1">
                      {day.assignments.map(assignment => {
                        // Use the classId to select a color from the palette
                        const color = palette[assignment.classId % palette.length];
                        // If the assignment is completed, darken the shade
                        const bg = assignment.isCompleted ? color.bg.replace("100", "200") : color.bg;
                        const text = assignment.isCompleted ? color.text.replace("800", "900") : color.text;
                        return (
                          <Link
                            key={assignment.id}
                            to={user?.isTeacher
                              ? `/assignments/${assignment.id}/grade`
                              : `/assignments/${assignment.id}`}
                          >
                            <div
                              className={`
                                text-xs py-1 px-1.5 rounded-sm cursor-pointer truncate
                                hover:brightness-95 transition-all
                                ${bg} ${text} border-l-2 ${color.border}
                              `}
                              title={`${assignment.title} - ${assignment.className}${assignment.isCompleted ? " (Completed)" : ""}`}
                            >
                              {assignment.title}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
