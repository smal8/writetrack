import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddStudentToClassForm } from "@/components/add-student-to-class-form";
import { AssignmentForm } from "@/components/assignment-form";
import { Loader2, Plus, UserMinus, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import type { Class, User, Assignment } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ClassPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, params] = useRoute("/classes/:id/students");
  const classId = parseInt(params?.id || "0");
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<User | null>(null);

  const classQuery = useQuery<Class>({
    queryKey: [`/api/classes/${classId}`],
  });

  const studentsQuery = useQuery<User[]>({
    queryKey: [`/api/classes/${classId}/students`],
    enabled: !!classId,
  });

  const assignmentsQuery = useQuery<Assignment[]>({
    queryKey: [`/api/classes/${classId}/assignments`],
    enabled: !!classId,
  });
  
  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest("DELETE", `/api/classes/${classId}/students/${studentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Student removed",
        description: `${studentToRemove?.username} has been removed from this class.`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/students`] });
      setStudentToRemove(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove student",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (classQuery.isLoading || studentsQuery.isLoading || assignmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!classQuery.data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Class not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{classQuery.data.name}</h1>
        {user?.isTeacher && (
          <Sheet open={showNewAssignment} onOpenChange={setShowNewAssignment}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Create New Assignment</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <AssignmentForm classId={classId} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {classQuery.data.description && (
        <p className="text-muted-foreground">{classQuery.data.description}</p>
      )}

      <Tabs defaultValue="assignments">
        <TabsList className="w-full">
          <TabsTrigger value="assignments" className="flex-1">Assignments</TabsTrigger>
          <TabsTrigger value="students" className="flex-1">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <div className="grid gap-4">
            {assignmentsQuery.data?.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle>{assignment.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </p>
                  <p className="mb-4">{assignment.description}</p>
                  {user?.isTeacher ? (
                    <Button asChild>
                      <Link to={`/assignments/${assignment.id}/grade`}>View Submissions</Link>
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to={`/assignments/${assignment.id}`}>Submit Essay</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          {user?.isTeacher && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add Student</CardTitle>
              </CardHeader>
              <CardContent>
                <AddStudentToClassForm classId={classId} />
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {studentsQuery.data?.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{student.username}</p>
                      <p className="text-sm text-muted-foreground">ID: {student.studentId}</p>
                    </div>
                    {user?.isTeacher && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={() => setStudentToRemove(student)}
                      >
                        <UserMinus className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Confirmation Dialog */}
          <AlertDialog 
            open={!!studentToRemove} 
            onOpenChange={(open) => !open && setStudentToRemove(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center">
                  <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
                  Remove Student
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove <strong>{studentToRemove?.username}</strong> from this class?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => {
                    if (studentToRemove) {
                      removeStudentMutation.mutate(studentToRemove.id);
                    }
                  }}
                  disabled={removeStudentMutation.isPending}
                >
                  {removeStudentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Remove"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}