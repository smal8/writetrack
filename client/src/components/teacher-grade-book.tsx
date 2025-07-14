import React, { useMemo, useState, useCallback, useEffect } from "react";
import type { Assignment, Class, Submission, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowUpDown,
  Download,
  Table2,
  FileCheck,
  Brain,
  Shield
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "./ui/dropdown-menu";

interface TeacherGradeBookProps {
  classData: Class;
  assignments: Assignment[];
  submissions: Submission[];
  students: User[];
}

// Add interface for the grade data type
interface GradeDataType {
  studentGrades: {
    student: {
      id: number;
      studentId: string | null;
      username: string;
      password: string;
      isTeacher: boolean;
    };
    grades: (number | null | undefined)[];
    submissionIds: number[];
    average: number | null;
    completedCount: number;
    completionPercentage: number;
  }[];
  assignmentAverages: (number | null)[];
  overallAverage: number | null;
  completionRate: number;
}

// Add AI Analysis interface
interface AIAnalysis {
  writingQuality: {
    qualityScore: number;
    confidence: number;
    details: string;
  };
  plagiarism: {
    plagiarismProbability: number;
    confidence: number;
    details: string;
  };
  metadata: {
    keystrokeCount: number;
    analyzedAt: string;
  };
}

// Add AI Analysis component
function AIScoreIndicator({ submission }: { submission: Submission }) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if analysis already exists in the database
  const hasExistingAnalysis = submission.aiAnalysisDate && 
    submission.aiWritingQualityScore !== null && 
    submission.aiPlagiarismProbability !== null;

  // Initialize analysis state from existing data if available
  useEffect(() => {
    if (hasExistingAnalysis && !analysis) {
      setAnalysis({
        writingQuality: {
          qualityScore: (submission.aiWritingQualityScore || 0) / 100, // Convert back from stored format
          confidence: (submission.aiWritingQualityConfidence || 75) / 100,
          details: 'Cached analysis result'
        },
        plagiarism: {
          plagiarismProbability: (submission.aiPlagiarismProbability || 0) / 100, // Convert back from stored format
          confidence: (submission.aiPlagiarismConfidence || 70) / 100,
          details: 'Cached analysis result'
        },
        metadata: {
          keystrokeCount: submission.aiKeystrokeCount || 0,
          analyzedAt: submission.aiAnalysisDate ? 
            (typeof submission.aiAnalysisDate === 'string' ? submission.aiAnalysisDate : submission.aiAnalysisDate.toISOString()) 
            : new Date().toISOString()
        }
      });
    }
  }, [hasExistingAnalysis, submission, analysis]);

  const analyzeSubmission = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/submissions/${submission.id}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to analyze submission');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPlagiarismColor = (probability: number) => {
    if (probability < 20) return 'text-green-600';
    if (probability < 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center gap-2">
      {/* Only show Analyze button if no existing analysis and not currently loading */}
      {!hasExistingAnalysis && !analysis && !loading && (
        <Button
          variant="outline"
          size="sm"
          onClick={analyzeSubmission}
          className="h-7 text-xs"
        >
          <Brain className="h-3 w-3 mr-1" />
          Analyze
        </Button>
      )}
      
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
          Analyzing...
        </div>
      )}
      
      {error && (
        <div className="text-xs text-red-600">
          Error: {error}
        </div>
      )}
      
      {analysis && (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            <span className={getQualityColor(analysis.writingQuality.qualityScore)}>
              {analysis.writingQuality.qualityScore.toFixed(1)}/6.0
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span className={getPlagiarismColor(analysis.plagiarism.plagiarismProbability)}>
              {analysis.plagiarism.plagiarismProbability.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function TeacherGradeBook({ classData, assignments, submissions, students }: TeacherGradeBookProps) {
  const [sortField, setSortField] = useState<'name' | 'average'>('average');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedStudents, setExpandedStudents] = useState<Record<number, boolean>>({});

  // Create a map for easy submission lookup
  const submissionMap = useMemo(() => {
    const map = new Map<number, Submission>();
    submissions.forEach(submission => {
      map.set(submission.id, submission);
    });
    return map;
  }, [submissions]);

  // Toggle student expanded state
  const toggleStudentExpanded = (studentId: number) => {
    setExpandedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Calculate all the grade data for the class
  const gradeData: GradeDataType = useMemo(() => {
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

    // Calculate overall completion rate
    const totalAssignments = students.length * assignments.length;
    const completedAssignments = studentGrades.reduce(
      (sum, sg) => sum + sg.completedCount,
      0
    );
    
    const completionRate =
      totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;

    return {
      studentGrades,
      assignmentAverages,
      overallAverage,
      completionRate
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

  // Generate CSV for gradebook
  const generateGradebookCSV = useCallback(() => {
    // Create headers
    const headers = [
      'Student Name', 
      'Student ID'
    ];
    
    // Add assignment headers
    assignments.forEach(assignment => {
      headers.push(`${assignment.title} (${new Date(assignment.dueDate).toLocaleDateString()})`);
    });
    
    // Add overall columns
    headers.push('Average Grade', 'Completion Rate');
    
    // Start with headers
    const csvRows = [headers.join(',')];
    
    // Add data for each student
    sortedStudentGrades.forEach(({ student, grades, average, completionPercentage }) => {
      const row = [
        `"${student.username}"`, // Quote student names in case they contain commas
        student.studentId || '',
      ];
      
      // Add grades for each assignment
      grades.forEach(grade => {
        if (grade !== undefined) {
          row.push(grade !== null ? grade.toString() : 'Not Graded');
        } else {
          row.push('Missing');
        }
      });
      
      // Add average and completion rate
      row.push(average !== null ? average.toFixed(1) : 'N/A');
      row.push(`${completionPercentage.toFixed(1)}%`);
      
      csvRows.push(row.join(','));
    });
    
    // Add class average row
    const avgRow = ['Class Average', ''];
    gradeData.assignmentAverages.forEach(avg => {
      avgRow.push(avg !== null ? avg.toFixed(1) : 'N/A');
    });
    avgRow.push(gradeData.overallAverage !== null ? gradeData.overallAverage.toFixed(1) : 'N/A');
    avgRow.push(`${gradeData.completionRate.toFixed(1)}%`);
    
    csvRows.push(avgRow.join(','));
    
    return csvRows.join('\n');
  }, [sortedStudentGrades, assignments, gradeData]);

  // Generate CSV for rubric template
  const generateRubricTemplateCSV = useCallback(() => {
    // Create the rubric template headers
    const headers = [
      'Criteria',
      'Description',
      'Weight (0-100)',
      'Excellent (90-100)',
      'Good (80-89)',
      'Satisfactory (70-79)',
      'Needs Improvement (60-69)',
      'Unsatisfactory (0-59)'
    ];
    
    // Example criteria rows
    const exampleRows = [
      [
        'Content',
        'Quality and relevance of information',
        '25',
        'Comprehensive, relevant, insightful',
        'Thorough, mostly relevant',
        'Basic content, generally relevant',
        'Limited content, partially relevant',
        'Minimal content, irrelevant'
      ],
      [
        'Organization',
        'Structure and flow of the essay',
        '20',
        'Exceptional organization and coherence',
        'Well-organized with clear transitions',
        'Generally organized, some transitions',
        'Somewhat disorganized',
        'Disorganized, difficult to follow'
      ],
      [
        'Analysis',
        'Depth of critical thinking',
        '20',
        'Exceptional analysis and insight',
        'Strong analysis with some insight',
        'Adequate analysis',
        'Limited analysis',
        'Minimal or no analysis'
      ],
      [
        'Evidence',
        'Support for arguments',
        '15',
        'Excellent use of relevant evidence',
        'Good use of evidence',
        'Adequate evidence',
        'Limited evidence',
        'Insufficient evidence'
      ],
      [
        'Writing Mechanics',
        'Grammar, spelling, punctuation',
        '10',
        'Error-free, sophisticated language',
        'Few errors, clear language',
        'Some errors, readable',
        'Many errors, somewhat unclear',
        'Numerous errors, difficult to read'
      ],
      [
        'Citations',
        'Proper citation format',
        '10',
        'Perfect citation format',
        'Minor citation errors',
        'Some citation errors',
        'Many citation errors',
        'Improper or missing citations'
      ]
    ];
    
    // Convert to CSV format
    const csvRows = [headers.join(',')];
    
    exampleRows.forEach(row => {
      // Escape any fields with commas by wrapping in quotes
      const escapedRow = row.map(field => `"${field}"`);
      csvRows.push(escapedRow.join(','));
    });
    
    return csvRows.join('\n');
  }, []);

  // Fix the type definitions for the downloadCSV function
  const downloadCSV = useCallback((csvContent: string, filename: string): void => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Handle export gradebook
  const handleDownloadGradebook = useCallback(() => {
    const csv = generateGradebookCSV();
    const className = "Class"; // You could use a prop for the actual class name
    const filename = `${className}_Gradebook_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  }, [generateGradebookCSV, downloadCSV]);

  // Handle export rubric template
  const handleDownloadRubricTemplate = useCallback(() => {
    const csv = generateRubricTemplateCSV();
    const filename = `Rubric_Template_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csv, filename);
  }, [generateRubricTemplateCSV, downloadCSV]);

  return (
    <div className="space-y-6">
      {/* Class Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              Class Grade Summary
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadGradebook}>
                  <Table2 className="mr-2 h-4 w-4" />
                  Download Gradebook CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadRubricTemplate}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Download Rubric Template
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            Export your gradebook as a CSV file or download a rubric template
          </CardDescription>
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
                            Math.max(1, students.length)) * 100
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
                            Math.max(1, students.length)) * 100
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
                            Math.max(1, students.length)) * 100
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
                            Math.max(1, students.length)) * 100
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
                            Math.max(1, students.length)) * 100
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

      {/* Student Grades Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-500" />
              Student Grades
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">
                    <Button 
                      variant="ghost" 
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1 font-medium"
                    >
                      Student
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'name' ? 'opacity-100' : 'opacity-30'}`} />
                    </Button>
                  </TableHead>
                  {assignments.map((assignment, index) => (
                    <TableHead key={assignment.id} className="text-center w-[100px]">
                      <div className="truncate max-w-[100px]" title={assignment.title}>
                        {assignment.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => toggleSort('average')}
                      className="flex items-center gap-1 font-medium"
                    >
                      Average
                      <ArrowUpDown className={`ml-2 h-4 w-4 ${sortField === 'average' ? 'opacity-100' : 'opacity-30'}`} />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudentGrades.map(({ student, grades, submissionIds, average, completionPercentage }) => (
                  <React.Fragment key={student.id}>
                    <TableRow className="group">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-0 h-auto font-normal text-left flex items-center gap-2 w-full"
                          onClick={() => toggleStudentExpanded(student.id)}
                        >
                          {expandedStudents[student.id] ? 
                            <ChevronDown className="h-4 w-4 text-muted-foreground" /> : 
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                          <div className="flex flex-col gap-0">
                            <span className="font-medium">{student.username}</span>
                            {student.studentId && <span className="text-xs text-muted-foreground">ID: {student.studentId}</span>}
                          </div>
                        </Button>
                      </TableCell>
                      
                      {grades.map((grade, index) => (
                        <TableCell key={index} className="text-center">
                          {grade !== undefined ? (
                            <div className="flex flex-col items-center gap-1">
                              <Link to={`/submissions/${submissionIds[index]}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={`rounded-full font-medium ${getGradeColorClass(grade)}`}
                                >
                                  {grade !== null ? `${grade}%` : "—"}
                                </Button>
                              </Link>
                              {submissionIds[index] && submissionMap.get(submissionIds[index]) && (
                                <AIScoreIndicator submission={submissionMap.get(submissionIds[index])!} />
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-muted-foreground">
                              Missing
                            </Badge>
                          )}
                        </TableCell>
                      ))}
                      
                      <TableCell className="text-right">
                        <div className={`text-center font-medium ${getGradeColorClass(average)}`}>
                          {average !== null 
                            ? `${average.toFixed(1)}%` 
                            : "—"
                          }
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className={`h-1.5 rounded-full ${
                              (average || 0) >= 90 ? 'bg-green-600' :
                              (average || 0) >= 80 ? 'bg-green-500' :
                              (average || 0) >= 70 ? 'bg-amber-500' :
                              (average || 0) >= 60 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          ></div>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded view with student details */}
                    {expandedStudents[student.id] && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={assignments.length + 2} className="p-0">
                          <div className="p-4 space-y-4">
                            <div className="text-sm">
                              <h4 className="font-medium mb-2">Assignment Details for {student.username}</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {assignments.map((assignment, index) => {
                                  const submissionId = submissionIds[index];
                                  const grade = grades[index];
                                  return (
                                    <div key={assignment.id} className="border rounded-md p-3 bg-white">
                                      <div className="text-sm font-medium">{assignment.title}</div>
                                      <div className="text-xs text-muted-foreground mb-2">
                                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                      </div>
                                      
                                      <div className="flex justify-between items-center mt-2">
                                        {grade !== undefined ? (
                                          <div className={`text-sm font-medium ${getGradeColorClass(grade)}`}>
                                            {grade !== null ? `${grade}% (${getLetterGrade(grade)})` : "Not Graded"}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-red-500 font-medium">Missing</div>
                                        )}
                                        
                                        {submissionId ? (
                                          <div className="flex flex-col gap-2">
                                            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                              <Link to={`/submissions/${submissionId}`}>View</Link>
                                            </Button>
                                            {submissionMap.get(submissionId) && (
                                              <AIScoreIndicator submission={submissionMap.get(submissionId)!} />
                                            )}
                                          </div>
                                        ) : (
                                          <Button disabled variant="outline" size="sm" className="h-7 text-xs">
                                            No Submission
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                
                {/* Class averages row */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell>Class Average</TableCell>
                  {gradeData.assignmentAverages.map((avg, index) => (
                    <TableCell key={index} className="text-center">
                      <span className={getGradeColorClass(avg)}>
                        {avg !== null ? `${avg.toFixed(1)}%` : "—"}
                      </span>
                    </TableCell>
                  ))}
                  <TableCell className="text-center">
                    <span className={getGradeColorClass(gradeData.overallAverage)}>
                      {gradeData.overallAverage !== null 
                        ? `${gradeData.overallAverage.toFixed(1)}%` 
                        : "—"
                      }
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 