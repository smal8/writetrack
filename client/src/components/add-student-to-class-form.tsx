import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addStudentToClassSchema } from "@shared/schema";
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
import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Search, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddStudentToClassFormProps {
  classId: number;
}

interface Student {
  id: number;
  username: string;
  studentId: string;
}

export function AddStudentToClassForm({ classId }: AddStudentToClassFormProps) {
  const { toast } = useToast();
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{username: string, password: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const form = useForm({
    resolver: zodResolver(addStudentToClassSchema),
    defaultValues: {
      studentId: "",
    },
  });
  
  // Google-like search functionality with debouncing
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  
  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200); // 200ms debounce delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { data: students = [], isLoading, error: searchError } = useQuery<Student[]>({
    queryKey: ['/api/students/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 1) return []; // Start searching with just 1 character
      
      try {
        console.log(`Searching for students with query: "${debouncedQuery}"`);
        // Use apiRequest to handle authentication properly
        const res = await apiRequest("GET", `/api/students/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        console.log('Search results:', data);
        return data;
      } catch (err) {
        console.error('Search error:', err);
        throw new Error(`Failed to search students: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    enabled: debouncedQuery.length >= 1, // Start searching with just 1 character
    retry: false,
    staleTime: 2000, // Cache results for 2 seconds
    refetchOnWindowFocus: false,
  });
  
  // Update the form when a student is selected
  useEffect(() => {
    if (selectedStudent) {
      form.setValue('studentId', selectedStudent.studentId);
    }
  }, [selectedStudent, form]);
  
  // Handle clicks outside the search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.search-results')
      ) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const addStudentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/classes/${classId}/students`, data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.tempPassword) {
        setCredentials({
          username: `${data.studentId}@temp.edu`,
          password: data.tempPassword
        });
        setShowCredentials(true);
      }
      queryClient.invalidateQueries({ queryKey: [`/api/classes/${classId}/students`] });
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
        <form onSubmit={form.handleSubmit((data) => addStudentMutation.mutate(data))} className="space-y-6">
          <div className="mb-5">
            <h3 className="text-lg font-medium mb-2">Find Existing Student</h3>
            
            <div className="relative">
              {/* Google-like search input */}
              <div className="relative w-full border rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="form-input py-2 pl-10 pr-4 block w-full rounded-md focus:ring-2 focus:ring-primary"
                  placeholder="Search by name or student ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 0) {
                      setOpen(true);
                    } else {
                      setOpen(false);
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.length > 0) {
                      setOpen(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Handle keyboard navigation
                    if (e.key === 'Escape') {
                      setOpen(false);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setOpen(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <span className="h-4 w-4 text-gray-400">×</span>
                  </button>
                )}
              </div>
              
              {/* Search dropdown */}
              {open && searchQuery.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200 search-results">
                  {/* Search info - only show when there are results */}
                  {students.length > 0 && (
                    <div className="px-2 py-1 text-xs text-gray-500 border-b">
                      {students.length} student{students.length > 1 ? 's' : ''} found
                    </div>
                  )}
                  
                  {isLoading && (
                    <div className="py-3 text-center text-sm">
                      <span className="animate-pulse">Searching...</span>
                    </div>
                  )}
                  
                  {searchError && (
                    <div className="py-3 px-2 text-center text-sm text-red-500">
                      Error: {searchError instanceof Error ? searchError.message : String(searchError)}
                    </div>
                  )}
                  
                  {!isLoading && !searchError && students.length === 0 && searchQuery.length >= 1 && (
                    <div className="py-3 px-2 text-center text-sm">
                      No students found matching "{searchQuery}"
                    </div>
                  )}
                  
                  {students.length > 0 && (
                    <div className="py-1">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className={cn(
                            "px-4 py-2 flex items-center cursor-pointer hover:bg-gray-100",
                            selectedStudent?.id === student.id && "bg-gray-50"
                          )}
                          onClick={() => {
                            setSelectedStudent(student);
                            form.setValue('studentId', student.studentId);
                            setOpen(false);
                          }}
                        >
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          {searchQuery && searchQuery.length > 0 ? (
                            // Highlight the matching part of the username and studentId
                            <>
                              <span className="font-medium" dangerouslySetInnerHTML={{ 
                                __html: student.username.replace(
                                  new RegExp(searchQuery, 'gi'), 
                                  match => `<span class="bg-yellow-200 text-black">${match}</span>`
                                ) 
                              }} />
                              <span className="ml-2 text-gray-500" dangerouslySetInnerHTML={{ 
                                __html: `(${student.studentId || 'No ID'})`.replace(
                                  new RegExp(searchQuery, 'gi'), 
                                  match => `<span class="bg-yellow-200 text-black">${match}</span>`
                                ) 
                              }} />
                            </>
                          ) : (
                            <>
                              <span>{student.username}</span>
                              <span className="ml-2 text-gray-500">({student.studentId || 'No ID'})</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {selectedStudent && (
              <div className="mt-2 text-sm">
                Selected Student: <span className="font-semibold">{selectedStudent.username}</span> ({selectedStudent.studentId})
              </div>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or Enter Student ID Manually</span>
            </div>
          </div>

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

          <Button type="submit" disabled={addStudentMutation.isPending}>
            {addStudentMutation.isPending ? "Adding Student..." : "Add Student"}
          </Button>
        </form>
      </Form>

      <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Account Created</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="pt-6">
              <p className="mb-2 text-sm text-muted-foreground">
                Please provide these login credentials to the student:
              </p>
              <div className="space-y-2">
                <div className="bg-muted p-4 rounded-md">
                  <p className="font-mono">Username: {credentials?.username}</p>
                  <p className="font-mono">Temporary Password: {credentials?.password}</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Note: The student should change their password upon first login.
              </p>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  );
}