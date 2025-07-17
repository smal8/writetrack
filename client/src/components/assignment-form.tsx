import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertAssignmentSchema } from "@shared/schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AssignmentFormProps {
  classId?: number;
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7); // Default to 1 week from now
  return date.toISOString().slice(0, 16); // Format as YYYY-MM-DDThh:mm
}

export function AssignmentForm({ classId }: AssignmentFormProps) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertAssignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: getDefaultDueDate(),
      classId: classId,
      wordTriggerFrequency: null,
      assignmentType: "general",
      targetUserExperience: "intermediate",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert the date string to an ISO string for the API
      const formattedData = {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      };
      const res = await apiRequest("POST", "/api/assignments", formattedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      if (classId) {
        queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/assignments`] });
      }
      form.reset({
        title: "",
        description: "",
        dueDate: getDefaultDueDate(),
        classId: classId,
      });
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
      <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Essay Assignment Title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide detailed instructions for the essay..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input 
                  type="datetime-local" 
                  {...field}
                  min={new Date().toISOString().slice(0, 16)} // Can't set due date in the past
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create Assignment"}
        </Button>
      </form>
    </Form>
  );
}