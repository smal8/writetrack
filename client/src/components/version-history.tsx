import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubmissionVersion as SchemaVersion } from "@shared/schema";

// Define interface that correctly maps createdAt as string
interface SubmissionVersion extends Omit<SchemaVersion, 'createdAt'> {
  createdAt: string;
}

interface VersionHistoryProps {
  submissionId: number;
  isDraft: boolean;
  onVersionChange: () => void;
}

export function VersionHistory({ submissionId, isDraft, onVersionChange }: VersionHistoryProps) {
  const { toast } = useToast();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<SubmissionVersion | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  // Query to fetch all versions for this submission
  const versionsQuery = useQuery<SubmissionVersion[]>({
    queryKey: [`/api/submissions/${submissionId}/versions`],
    enabled: !!submissionId && isDraft // Only fetch if submission is a draft
  });

  // Mutation to save current state as a new version
  const saveVersionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/versions`, {
        versionName: versionName || `Version ${(versionsQuery.data?.length || 0) + 1}`
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Version saved",
        description: "Your submission's current state has been saved as a version"
      });
      setSaveDialogOpen(false);
      setVersionName("");
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}/versions`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation to restore a previous version
  const restoreVersionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVersion) throw new Error("No version selected");
      
      const res = await apiRequest(
        "POST", 
        `/api/submissions/${submissionId}/restore/${selectedVersion.id}`,
        {}
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Version restored",
        description: "The selected version has been restored"
      });
      setRestoreDialogOpen(false);
      setSelectedVersion(null);
      // Important: refresh versions and the submission content
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}/versions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/assignments/${submissionId}/draft`] });
      onVersionChange(); // Notify parent component to refresh content
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  };

  if (!isDraft) {
    return null; // Don't show version history for finalized submissions
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Version History</span>
          
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Save Current State
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Current Version</DialogTitle>
                <DialogDescription>
                  Create a snapshot of your current draft that you can restore later if needed.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="version-name">Version Name (optional)</Label>
                <Input 
                  id="version-name" 
                  value={versionName} 
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder={`Version ${(versionsQuery.data?.length || 0) + 1}`}
                />
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => saveVersionMutation.mutate()}
                  disabled={saveVersionMutation.isPending}
                >
                  {saveVersionMutation.isPending ? "Saving..." : "Save Version"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {versionsQuery.isLoading ? (
          <div className="flex justify-center items-center py-6">
            <Clock className="h-4 w-4 animate-spin mr-2" />
            <span>Loading versions...</span>
          </div>
        ) : versionsQuery.data && versionsQuery.data.length > 0 ? (
          <div className="space-y-3">
            {versionsQuery.data.map((version) => (
              <div 
                key={version.id} 
                className="p-3 border rounded-md flex items-center justify-between hover:bg-accent/50 cursor-pointer"
                onClick={() => {
                  setSelectedVersion(version);
                  setRestoreDialogOpen(true);
                }}
              >
                <div>
                  <div className="font-medium">{version.versionName}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 inline" /> 
                    {formatDate(version.createdAt.toString())}
                    <span className="mx-1">·</span>
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <Button variant="ghost" size="icon">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No saved versions yet. Save a version to create a snapshot you can restore later.
          </div>
        )}

        {/* Version restore confirmation dialog */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Version</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore {selectedVersion?.versionName}? Your current work will be saved as a version before restoring.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setRestoreDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => restoreVersionMutation.mutate()}
                disabled={restoreVersionMutation.isPending}
              >
                {restoreVersionMutation.isPending ? "Restoring..." : "Restore Version"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}