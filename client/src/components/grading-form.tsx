import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { gradeSchema } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Submission } from "@shared/schema";

interface GradingFormProps {
  submission: Submission;
}

export function GradingForm({ submission }: GradingFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      grade: submission.grade || 0,
      feedback: submission.feedback || "",
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async (data: { grade: number; feedback: string }) => {
      const res = await apiRequest("POST", `/api/submissions/${submission.id}/grade`, {
        grade: Number(data.grade), // Ensure grade is a number
        feedback: data.feedback,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Grade submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        // Convert grade to number before submitting
        const formData = {
          ...data,
          grade: Number(data.grade)
        };
        gradeMutation.mutate(formData);
      })} className="space-y-6">
        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grade (0-100)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feedback</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide detailed feedback..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="mt-4">
          <Button type="submit" disabled={gradeMutation.isPending}>
            {gradeMutation.isPending ? "Submitting..." : "Submit Grade"}
          </Button>
        </div>
      </form>
    </Form>
  );
}