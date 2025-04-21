import React, { useMemo, useState } from "react";
import type { Assignment, Class, Submission, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Award,
  FileText,
  AlertTriangle,
  BookOpen,
  ArrowUpDown
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";

interface TeacherGradeBookProps {
  classData: Class;
  assignments: Assignment[];
  submissions: Submission[];
  students: User[];
}

export function TeacherGradeBook({ classData, assignments, submissions, students }: TeacherGradeBookProps) {
  const [sortField, setSortField] = useState<'name' | 'average'>('average');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});

  // Toggle student expanded state
  const toggleStudentExpanded = (studentId: number) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Calculate all the grade data for the class
  const gradeData = useMemo(() => {
    // Map of assignment ID to index for easy lookup
    const assignmentIndexMap = new Map(
      assignments.map((assignment, index) => [assignment.id, index])
    );

    // Calculate student grade data
    const studentGrades = students.map(student => {
      // Get all non-draft submissions for this student
      const studentSubmissions = submissions.filter(
        sub => sub.studentId === student.id && !sub.is_draft
      );

      // Initialize grades array with undefined values (no submission)
      const grades = new Array(assignments.length).fill(undefined);
      
      // Initialize submission IDs array
      const submissionIds = new Array(assignments.length).fill(undefined);

      // Fill in grades and submission IDs where they exist
      studentSubmissions.forEach(submission => {
        const assignmentIndex = assignmentIndexMap.get(submission.assignmentId);
        if (assignmentIndex !== undefined) {
          grades[assignmentIndex] = submission.grade;
          submissionIds[assignmentIndex] = submission.id;
        }
      });

      // Calculate student's average grade
      const gradedAssignments = grades.filter(g => g !== undefined && g !== null);
      const totalPoints = gradedAssignments.reduce((sum, grade) => sum + (grade || 0), 0);
      const average = gradedAssignments.length > 0 
        ? totalPoints / gradedAssignments.length 
        : null;

      // Calculate completion percentage
      const completedCount = grades.filter(g => g !== undefined).length;
      const completionPercentage = assignments.length > 0 
        ? (completedCount / assignments.length) * 100 
        : 0;

      return {
        student,
        grades,
        submissionIds,
        average,
        completedCount,
        completionPercentage
      };
    });

    // Calculate class average for each assignment
    const assignmentAverages = assignments.map((_, index) => {
      const assignmentGrades = studentGrades
        .map(sg => sg.grades[index])
        .filter(g => g !== undefined && g !== null) as number[];

      return assignmentGrades.length > 0
        ? assignmentGrades.reduce((sum, grade) => sum + grade, 0) / assignmentGrades.length
        : null;
    });

    // Calculate overall class average
    const allGrades = studentGrades.flatMap(sg => 
      sg.grades.filter(g => g !== undefined && g !== null)
    ) as number[];
    
    const overallAverage = allGrades.length > 0
      ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length
      : null;

    return {
      studentGrades,
      assignmentAverages,
      overallAverage
    };
  }, [assignments, students, submissions]);

  // Sort students based on current sort criteria
  const sortedStudentGrades = useMemo(() => {
    return [...gradeData.studentGrades].sort((a, b) => {
      if (sortField === 'name') {
        const nameA = a.student.username.toLowerCase();
        const nameB = b.student.username.toLowerCase();
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else { // 'average'
        const avgA = a.average || 0;
        const avgB = b.average || 0;
        return sortDirection === 'asc' 
          ? avgA - avgB 
          : avgB - avgA;
      }
    });
  }, [gradeData.studentGrades, sortField, sortDirection]);

  // Helper function to toggle sort
  const toggleSort = (field: 'name' | 'average') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Helper function to get grade color class
  const getGradeColorClass = (grade?: number | null) => {
    if (grade === undefined || grade === null) return '';
    if (grade >= 90) return 'text-green-600 font-bold';
    if (grade >= 80) return 'text-green-500 font-semibold';
    if (grade >= 70) return 'text-amber-500 font-semibold';
    if (grade >= 60) return 'text-orange-500 font-semibold';
    return 'text-red-500 font-semibold';
  };

  // Helper function to get letter grade
  const getLetterGrade = (grade?: number | null) => {
    if (grade === undefined || grade === null) return '-';
    if (grade >= 90) return 'A';
    if (grade >= 80) return 'B';
    if (grade >= 70) return 'C';
    if (grade >= 60) return 'D';
    return 'F';
  };

  return (
    <div className="space-y-6">
      {/* Class Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            Class Grade Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold mb-1">Overall Class Average</h3>
              <p className="text-sm text-muted-foreground">
                Based on all completed assignments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <div className="text-right">
                <div className={`text-3xl font-bold ${getGradeColorClass(gradeData.overallAverage)}`}>
                  {gradeData.overallAverage !== null 
                    ? `${gradeData.overallAverage.toFixed(1)}% (${getLetterGrade(gradeData.overallAverage)})` 
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-1">Assignment Completion</p>
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="flex justify-between mb-1 text-sm">
                  <span>Overall Completion Rate</span>
                  <span>
                    {Math.round(
                      (submissions.filter(s => !s.is_draft).length / 
                      (students.length * assignments.length)) * 100
                    )}%
                  </span>
                </div>
                <Progress 
                  value={
                    (submissions.filter(s => !s.is_draft).length / 
                    (students.length * assignments.length)) * 100
                  } 
                  className="h-2" 
                />
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mb-1">Grade Distribution</p>
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                  <div>
                    <div className="h-10 bg-green-600 rounded-sm flex items-end">
                      <div 
                        className="w-full bg-green-600" 
                        style={{ 
                          height: `${Math.round(
                            (gradeData.studentGrades.filter(sg => (sg.average || 0) >= 90).length / 
                            students.length) * 100
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <span>A</span>
                  </div>
                  <div>
                    <div className="h-10 bg-green-500 rounded-sm flex items-end">
                      <div 
                        className="w-full bg-green-500" 
                        style={{ 
                          height: `${Math.round(
                            (gradeData.studentGrades.filter(sg => (sg.average || 0) >= 80 && (sg.average || 0) < 90).length / 
                            students.length) * 100
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <span>B</span>
                  </div>
                  <div>
                    <div className="h-10 bg-amber-500 rounded-sm flex items-end">
                      <div 
                        className="w-full bg-amber-500" 
                        style={{ 
                          height: `${Math.round(
                            (gradeData.studentGrades.filter(sg => (sg.average || 0) >= 70 && (sg.average || 0) < 80).length / 
                            students.length) * 100
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <span>C</span>
                  </div>
                  <div>
                    <div className="h-10 bg-orange-500 rounded-sm flex items-end">
                      <div 
                        className="w-full bg-orange-500" 
                        style={{ 
                          height: `${Math.round(
                            (gradeData.studentGrades.filter(sg => (sg.average || 0) >= 60 && (sg.average || 0) < 70).length / 
                            students.length) * 100
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <span>D</span>
                  </div>
                  <div>
                    <div className="h-10 bg-red-500 rounded-sm flex items-end">
                      <div 
                        className="w-full bg-red-500" 
                        style={{ 
                          height: `${Math.round(
                            (gradeData.studentGrades.filter(sg => (sg.average || 0) < 60).length / 
                            students.length) * 100
                          )}%` 
                        }}
                      ></div>
                    </div>
                    <span>F</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Book Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh]">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="w-[200px] cursor-pointer"
                      onClick={() => toggleSort('name')}
                    >
                      <div className="flex items-center">
                        Student
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                    {assignments.map(assignment => (
                      <TableHead key={assignment.id} className="text-center min-w-[100px]">
                        <div className="font-medium text-xs">
                          {assignment.title}
                          <div className="text-muted-foreground text-[10px]">
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead 
                      className="text-right cursor-pointer min-w-[120px]"
                      onClick={() => toggleSort('average')}
                    >
                      <div className="flex items-center justify-end">
                        Average
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudentGrades.map(({ student, grades, average, submissionIds, completionPercentage }) => (
                    <React.Fragment key={student.id}>
                      <TableRow className="group">
                        <TableCell>
                          <Collapsible
                            open={expandedStudents[student.id] || false}
                            onOpenChange={() => toggleStudentExpanded(student.id)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 hover:bg-transparent -ml-1 text-left justify-start font-medium"
                              >
                                {expandedStudents[student.id] ? (
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 mr-1" />
                                )}
                                <UserIcon className="h-4 w-4 mr-1" />
                                {student.username}
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        </TableCell>
                        
                        {/* Assignment Grades */}
                        {grades.map((grade, index) => (
                          <TableCell key={index} className="text-center">
                            {grade !== undefined ? (
                              submissionIds[index] ? (
                                <Link to={`/submissions/${submissionIds[index]}`}>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={`px-2 py-1 h-auto ${getGradeColorClass(grade)}`}
                                  >
                                    {grade !== null ? grade : "—"}
                                  </Button>
                                </Link>
                              ) : (
                                <span className={getGradeColorClass(grade)}>
                                  {grade !== null ? grade : "—"}
                                </span>
                              )
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 text-xs">
                                Missing
                              </Badge>
                            )}
                          </TableCell>
                        ))}
                        
                        {/* Average Grade */}
                        <TableCell className="text-right">
                          <div className={`font-medium ${getGradeColorClass(average)}`}>
                            {average !== null 
                              ? `${average.toFixed(1)}% (${getLetterGrade(average)})` 
                              : "N/A"}
                          </div>
                          <div className="w-full mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                (average || 0) >= 90 ? 'bg-green-500' :
                                (average || 0) >= 80 ? 'bg-green-400' :
                                (average || 0) >= 70 ? 'bg-amber-400' :
                                (average || 0) >= 60 ? 'bg-orange-400' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, completionPercentage))}%` }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Student Detail Row */}
                      {expandedStudents[student.id] && (
                        <TableRow className="bg-blue-50">
                          <TableCell colSpan={assignments.length + 2} className="p-4">
                            <div className="bg-white rounded-md shadow-sm p-4 border">
                              <h4 className="font-medium mb-2 flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                {student.username}'s Assignment Details
                              </h4>
                              
                              <div className="space-y-2 mt-4">
                                {assignments.map((assignment, index) => {
                                  const submissionId = submissionIds[index];
                                  const grade = grades[index];
                                  const isCompleted = grade !== undefined;
                                  
                                  return (
                                    <div key={assignment.id} className="bg-gray-50 p-3 rounded-md">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-medium">{assignment.title}</div>
                                          <div className="text-sm text-muted-foreground">
                                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                          </div>
                                          
                                          {/* Status */}
                                          <div className="flex items-center gap-1 mt-1">
                                            {isCompleted ? (
                                              <>
                                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                                <span className="text-sm text-green-600">Completed</span>
                                                
                                                {grade !== null && (
                                                  <span className={`ml-2 text-sm ${getGradeColorClass(grade)}`}>
                                                    Grade: {grade}/100 ({getLetterGrade(grade)})
                                                  </span>
                                                )}
                                              </>
                                            ) : (
                                              <>
                                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                                <span className="text-sm text-red-600">Missing</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {isCompleted && submissionId && (
                                          <Button asChild variant="outline" size="sm">
                                            <Link to={`/submissions/${submissionId}`}>
                                              <FileText className="mr-1 h-4 w-4" />
                                              View Submission
                                            </Link>
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Class Average Row */}
                  <TableRow className="bg-muted font-medium">
                    <TableCell>Class Average</TableCell>
                    {gradeData.assignmentAverages.map((avg, index) => (
                      <TableCell key={index} className="text-center">
                        <span className={getGradeColorClass(avg)}>
                          {avg !== null ? avg.toFixed(1) : "—"}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <span className={getGradeColorClass(gradeData.overallAverage)}>
                        {gradeData.overallAverage !== null 
                          ? `${gradeData.overallAverage.toFixed(1)}%` 
                          : "N/A"}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 