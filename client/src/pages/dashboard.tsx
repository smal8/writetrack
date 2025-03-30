import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm } from "@/components/student-form";
import { ClassForm } from "@/components/class-form";
import { Loader2, UserPlus, BookOpen } from "lucide-react";
import type { Class } from "@shared/schema";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function DashboardPage() {
  const { user } = useAuth();
  const [showNewStudent, setShowNewStudent] = useState(false);
  const [showNewClass, setShowNewClass] = useState(false);

  const classesQuery = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  if (classesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-bold">
          {user?.isTeacher ? "Your Classes" : "My Classes"}
        </h2>
        {user?.isTeacher && (
          <div className="flex flex-wrap gap-2 md:gap-4">
            <Sheet open={showNewStudent} onOpenChange={setShowNewStudent}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 md:flex-none">
                  <UserPlus className="mr-2 h-4 w-4" />
                  New Student
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Create Student Account</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <StudentForm />
                </div>
              </SheetContent>
            </Sheet>

            <Sheet open={showNewClass} onOpenChange={setShowNewClass}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex-1 md:flex-none">
                  <BookOpen className="mr-2 h-4 w-4" />
                  New Class
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Create New Class</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ClassForm />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classesQuery.data?.map((class_) => (
          <Card key={class_.id} className="transition-all duration-300 hover:shadow-lg">
            <CardHeader>
              <CardTitle>{class_.name}</CardTitle>
              {class_.description && (
                <p className="text-sm text-muted-foreground">
                  {class_.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {user?.isTeacher ? (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline">
                    <Link to={`/classes/${class_.id}/students`}>Manage Students</Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/classes/${class_.id}/assignments`}>View Assignments</Link>
                  </Button>
                </div>
              ) : (
                <Button asChild className="w-full">
                  <Link to={`/classes/${class_.id}/assignments`}>View Assignments</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}