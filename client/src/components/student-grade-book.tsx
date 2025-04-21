import { useMemo } from "react";
import type { Assignment, Submission } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  XCircle,
  Trophy 
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";

interface StudentGradeBookProps {
  assignments: Assignment[];
  submissions: Submission[];
  studentId: number;
}

export function StudentGradeBook({ assignments, submissions, studentId }: StudentGradeBookProps) {
  // Filter submissions to only include this student's
  const studentSubmissions = useMemo(() => {
    return submissions.filter(sub => sub.studentId === studentId);
  }, [submissions, studentId]);

  // Calculate the overall grade
  const gradeData = useMemo(() => {
    // Group submissions by assignment ID
    const submissionsByAssignment = studentSubmissions.reduce<Record<number, Submission>>((acc, sub) => {
      if (!sub.is_draft) {
        acc[sub.assignmentId] = sub;
      }
      return acc;
    }, {});

    // Calculate points and max points
    let totalPoints = 0;
    let maxPossiblePoints = 0;
    let completedAssignmentsCount = 0;
    let totalGradedAssignments = 0;

    // Calculate for each assignment
    const assignmentGrades = assignments.map(assignment => {
      const submission = submissionsByAssignment[assignment.id];
      const isPastDue = new Date(assignment.dueDate) < new Date();
      const isCompleted = !!submission && !submission.is_draft;
      const grade = submission?.grade;
      
      let status: 'completed' | 'missing' | 'pending' | 'upcoming' = 'upcoming';
      
      if (isCompleted) {
        status = 'completed';
        completedAssignmentsCount++;
        if (grade !== null) {
          totalGradedAssignments++;
          totalPoints += grade;
          maxPossiblePoints += 100; // Assuming max grade is 100
        }
      } else if (isPastDue) {
        status = 'missing';
        maxPossiblePoints += 100; // Count it in the total even if missing
      } else {
        status = 'upcoming';
      }
      
      return {
        assignmentId: assignment.id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        status,
        grade: grade !== null ? grade : undefined,
        submission: submission,
      };
    });

    // Calculate class average
    const classAverage = maxPossiblePoints > 0 
      ? (totalPoints / maxPossiblePoints) * 100 
      : 0;

    return {
      assignmentGrades,
      classAverage,
      totalPoints,
      maxPossiblePoints,
      completedAssignmentsCount,
      totalGradedAssignments
    };
  }, [assignments, studentSubmissions]);

  // Helper function to render status badge
  const renderStatusBadge = (status: 'completed' | 'missing' | 'pending' | 'upcoming') => {
    switch(status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
        );
      case 'missing':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Missing
          </Badge>
        );
      case 'upcoming':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Upcoming
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Pending
          </Badge>
        );
    }
  };

  // Helper function to get grade color class
  const getGradeColorClass = (grade?: number) => {
    if (grade === undefined) return '';
    if (grade >= 90) return 'text-green-600 font-bold';
    if (grade >= 80) return 'text-green-500 font-semibold';
    if (grade >= 70) return 'text-amber-500 font-semibold';
    if (grade >= 60) return 'text-orange-500 font-semibold';
    return 'text-red-500 font-semibold';
  };

  // Helper function to get letter grade
  const getLetterGrade = (grade?: number) => {
    if (grade === undefined) return '-';
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  // Get class letter grade
  const classLetterGrade = getLetterGrade(gradeData.classAverage);
  const classGradeColorClass = getGradeColorClass(gradeData.classAverage);

  return (
    <div className="space-y-6">
      {/* Overall Class Grade Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold mb-1">Overall Class Grade</h3>
              <p className="text-sm text-muted-foreground">
                Based on {gradeData.totalGradedAssignments} graded assignment{gradeData.totalGradedAssignments !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <div className="text-right">
                <div className={`text-3xl font-bold ${classGradeColorClass}`}>
                  {gradeData.classAverage.toFixed(1)}% <span className="text-2xl">({classLetterGrade})</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {gradeData.totalPoints} / {gradeData.maxPossiblePoints} points
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                gradeData.classAverage >= 90 ? 'bg-green-500' :
                gradeData.classAverage >= 80 ? 'bg-green-400' :
                gradeData.classAverage >= 70 ? 'bg-amber-400' :
                gradeData.classAverage >= 60 ? 'bg-orange-400' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, gradeData.classAverage))}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2 rounded-md shadow-sm">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="font-bold">{gradeData.completedAssignmentsCount} / {assignments.length}</p>
            </div>
            <div className="bg-white p-2 rounded-md shadow-sm">
              <p className="text-sm text-muted-foreground">Graded</p>
              <p className="font-bold">{gradeData.totalGradedAssignments} / {assignments.length}</p>
            </div>
            <div className="bg-white p-2 rounded-md shadow-sm">
              <p className="text-sm text-muted-foreground">Missing</p>
              <p className="font-bold text-red-500">
                {assignments.filter(a => 
                  new Date(a.dueDate) < new Date() && 
                  !studentSubmissions.some(s => s.assignmentId === a.id && !s.is_draft)
                ).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Table */}
      <Table>
        <TableCaption>
          Your class grade and assignment details.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Assignment</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Grade</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gradeData.assignmentGrades.map((item) => (
            <TableRow key={item.assignmentId}>
              <TableCell className="font-medium">
                {item.title}
              </TableCell>
              <TableCell>
                {new Date(item.dueDate).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {renderStatusBadge(item.status)}
              </TableCell>
              <TableCell className="text-center">
                {item.grade !== undefined ? (
                  <span className={getGradeColorClass(item.grade)}>
                    {item.grade}% ({getLetterGrade(item.grade)})
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {item.submission ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/submissions/${item.submission.id}`}>View Submission</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/assignments/${item.assignmentId}`}>
                      {item.status === 'missing' ? 'Submit Late' : 'Submit'}
                    </Link>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 