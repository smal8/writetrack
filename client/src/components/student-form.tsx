import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertStudentSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export function StudentForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");

  const form = useForm({
    resolver: zodResolver(insertStudentSchema),
    defaultValues: {
      studentId: "",
      username: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/students", data);
      return res.json();
    },
    onSuccess: (data) => {
      setTempPassword(data.tempPassword);
      setShowPassword(true);
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student ID</FormLabel>
                <FormControl>
                  <Input placeholder="Enter student ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="student@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Student Account"}
          </Button>
        </form>
      </Form>

      <Dialog open={showPassword} onOpenChange={setShowPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary Password Generated</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="pt-6">
              <p className="mb-2 text-sm text-muted-foreground">
                Please provide this temporary password to the student:
              </p>
              <div className="bg-muted p-4 rounded-md font-mono text-center">
                {tempPassword}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Note: This password will only be shown once. The student should change it upon first login.
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}
