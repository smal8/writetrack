import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface KeystrokeEvent {
  key: string;
  timestamp: string;
  type: string;
}

interface EditorProps {
  value: string;
  onChange: (value: string, keystrokes: KeystrokeEvent[]) => void;
  readOnly?: boolean;
}

// Pattern to detect quotes in the plain text format "[source p. xxx]"
const QUOTE_PATTERN = /"[^"]+"\s+\[[^\]]+\]/g;

export function Editor({ value, onChange, readOnly = false }: EditorProps) {
  const [keystrokes, setKeystrokes] = useState<KeystrokeEvent[]>([]);
  const keystrokesRef = useRef<KeystrokeEvent[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [quoteRanges, setQuoteRanges] = useState<{start: number, end: number}[]>([]);
  
  // For undo/redo functionality
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [lastValue, setLastValue] = useState(value);
  
  // Initialize undo stack with initial value
  useEffect(() => {
    if (undoStack.length === 0) {
      setUndoStack([value]);
    }
  }, []);
  
  // Find all quote ranges in the content
  useEffect(() => {
    const ranges: {start: number, end: number}[] = [];
    let match;
    
    // Create a new regex with the global flag to find all matches
    const regex = new RegExp(QUOTE_PATTERN, 'g');
    
    // Reset regex since we're reusing it
    regex.lastIndex = 0;
    
    while ((match = regex.exec(value)) !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    setQuoteRanges(ranges);
  }, [value]);

  // Prevents editing in the quotes
  const preventQuoteEditing = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    
    // Check if cursor is within a quote range - ONLY the actual quote, not after it
    const isInQuoteRange = quoteRanges.some(range => 
      cursorPos >= range.start && cursorPos < range.end
    );
    
    if (isInQuoteRange) {
      // Prevent typing within quotes
      e.preventDefault();
      return;
    }
  }, [quoteRanges, readOnly]);
  
  // Undo function
  const handleUndo = useCallback(() => {
    if (undoStack.length > 1) {
      const newUndoStack = [...undoStack];
      const currentValue = newUndoStack.pop() || '';
      setUndoStack(newUndoStack);
      setRedoStack([...redoStack, currentValue]);
      
      const previousValue = newUndoStack[newUndoStack.length - 1];
      onChange(previousValue, keystrokesRef.current);
    }
  }, [undoStack, redoStack, onChange, keystrokesRef]);
  
  // Redo function
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const newRedoStack = [...redoStack];
      const valueToRestore = newRedoStack.pop() || '';
      setRedoStack(newRedoStack);
      setUndoStack([...undoStack, valueToRestore]);
      
      onChange(valueToRestore, keystrokesRef.current);
    }
  }, [undoStack, redoStack, onChange, keystrokesRef]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // First check if typing is within a quote (and prevent it)
    preventQuoteEditing(e);
    
    // Only handle keyboard shortcuts when Ctrl or Command keys are pressed
    if (e.ctrlKey || e.metaKey) {
      // Handle undo/redo shortcuts
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        
        if (e.shiftKey) {
          // Ctrl+Shift+Z or Command+Shift+Z for Redo
          handleRedo();
        } else {
          // Ctrl+Z or Command+Z for Undo
          handleUndo();
        }
        return;
      } else if (e.key.toLowerCase() === 'y') {
        // Ctrl+Y or Command+Y for Redo (alternate)
        e.preventDefault();
        handleRedo();
        return;
      }
      
      // Only prevent specific common shortcuts, not all Ctrl/Cmd combinations
      // This allows normal typing even after inserting a quote
      const commonShortcuts = ['s', 'p', 'a', 'f', 'g', 'r', 'n', 'o', 't'];
      if (commonShortcuts.includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }
    }
    
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    
    // Check if cursor is within a quote range - be precise about the range
    const isInQuoteRange = quoteRanges.some(range => 
      cursorPos >= range.start && cursorPos < range.end
    );
    
    // Only record keystrokes that are not within quotes
    if (!isInQuoteRange) {
      let type = "input";
      if (e.key === "Backspace" || e.key === "Delete") {
        type = "delete";
      }
      
      const newKeystroke = {
        key: e.key,
        timestamp: new Date().toISOString(),
        type
      };
  
      keystrokesRef.current = [...keystrokesRef.current, newKeystroke];
      setKeystrokes(keystrokesRef.current);
    }
  }, [quoteRanges, preventQuoteEditing, handleUndo, handleRedo]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    // Add to undo stack if value is different from last one
    if (newValue !== lastValue) {
      setUndoStack([...undoStack, newValue]);
      setRedoStack([]); // Clear redo stack on new changes
      setLastValue(newValue);
    }
    
    onChange(newValue, keystrokesRef.current);
  }, [onChange, lastValue, undoStack]);
  
  // Count only input keystrokes (not deletions or quotes)
  const inputKeystrokesCount = keystrokes.filter(k => k.type === "input").length;

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={readOnly ? undefined : handleChange}
          onKeyDown={readOnly ? undefined : handleKeyDown}
          className="min-h-[400px] resize-none font-mono"
          placeholder="Start writing your essay here..."
          disabled={readOnly}
        />
        <div className="mt-2 text-sm text-muted-foreground">
          <div className="flex justify-between mb-1">
            <span>Characters typed: {inputKeystrokesCount}</span>
            <span>Total keystrokes: {keystrokes.length}</span>
          </div>
          {!readOnly && (
            <div className="text-xs text-muted-foreground italic">
              Tip: Use Ctrl+Z or ⌘+Z to undo, Ctrl+Shift+Z/Ctrl+Y or ⌘+Shift+Z/⌘+Y to redo
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
