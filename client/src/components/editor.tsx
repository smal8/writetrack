import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// New interface for spell check errors
interface SpellError {
  word: string;
  index: number;
  length: number;
  suggestions: string[];
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
  
  // Ref to store internal clipboard content (copied from this editor)
  const internalClipboardRef = useRef<string | null>(null);
  
  // New state for spell check errors
  const [spellErrors, setSpellErrors] = useState<SpellError[]>([]);
  const [isSpellCheckLoaded, setIsSpellCheckLoaded] = useState(false);
  const [dictionary, setDictionary] = useState<any>(null);
  
  // Initialize undo stack with initial value
  useEffect(() => {
    if (undoStack.length === 0) {
      setUndoStack([value]);
    }
  }, []);
  
  // Load Typo.js and dictionary
  useEffect(() => {
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/typo-js@1.2.1/typo.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Typo.js'));
        document.head.appendChild(script);
      });
    };

    const initSpellChecker = async () => {
      try {
        await loadScript();
        // @ts-ignore - Typo is loaded globally
        const dict = new window.Typo('en_US', null, null, {
          platform: 'web',
          dictionaryPath: 'https://cdn.jsdelivr.net/npm/typo-js@1.2.1/dictionaries'
        });
        setDictionary(dict);
        setIsSpellCheckLoaded(true);
      } catch (error) {
        console.error('Error loading spell checker:', error);
      }
    };

    initSpellChecker();
  }, []);

  // Find all quote ranges in the content
  useEffect(() => {
    const ranges: {start: number, end: number}[] = [];
    let match;
    
    // Create a new regex with the global flag to find all matches
    const regex = new RegExp(QUOTE_PATTERN, 'g');
    regex.lastIndex = 0;
    
    while ((match = regex.exec(value)) !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    setQuoteRanges(ranges);
  }, [value]);

  // Run spell check on content changes
  useEffect(() => {
    if (!isSpellCheckLoaded || !dictionary) return;

    const checkSpelling = () => {
      const errors: SpellError[] = [];
      const words = value.match(/\b\w+\b/g) || [];
      
      let lastIndex = 0;
      for (const word of words) {
        const index = value.indexOf(word, lastIndex);
        if (index === -1) continue;
        
        // Skip checking words within quotes
        const isInQuote = quoteRanges.some(
          range => (index >= range.start && index < range.end) ||
                  (index + word.length > range.start && index + word.length <= range.end)
        );
        
        if (!isInQuote && !dictionary.check(word)) {
          const suggestions = dictionary.suggest(word, 5);
          errors.push({
            word,
            index,
            length: word.length,
            suggestions
          });
        }
        
        lastIndex = index + word.length;
      }
      
      setSpellErrors(errors);
    };
    
    const timer = setTimeout(checkSpelling, 500); // Debounce to avoid excessive checks
    return () => clearTimeout(timer);
  }, [value, isSpellCheckLoaded, dictionary, quoteRanges]);

  // Prevent editing within protected quotes
  const preventQuoteEditing = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;
    
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    
    const isInQuoteRange = quoteRanges.some(range => 
      cursorPos >= range.start && cursorPos < range.end
    );
    
    if (isInQuoteRange) {
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
    // Check if typing is within a quote
    preventQuoteEditing(e);
    
    // Handle undo/redo shortcuts (Ctrl/Command + Z, Ctrl/Command + Y or Shift+Z)
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    }
    
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    
    // Only record keystrokes that are not within quotes
    const isInQuoteRange = quoteRanges.some(range => 
      cursorPos >= range.start && cursorPos < range.end
    );
    
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
    
    if (newValue !== lastValue) {
      setUndoStack([...undoStack, newValue]);
      setRedoStack([]); // Clear redo stack on new changes
      setLastValue(newValue);
    }
    
    onChange(newValue, keystrokesRef.current);
  }, [onChange, lastValue, undoStack]);
  
  // Internal copy: store the selected text from the editor.
  const handleCopy = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    internalClipboardRef.current = selectedText;
    // Allow default copy behavior.
  }, []);
  
  // Internal cut: store the selected text from the editor.
  const handleCut = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    internalClipboardRef.current = selectedText;
    // Allow default cut behavior.
  }, []);
  
  // On paste, only allow if the pasted text matches what was copied/cut internally.
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasteData = e.clipboardData.getData('text');
    if (internalClipboardRef.current !== pasteData) {
      // Block paste from external sources.
      e.preventDefault();
    }
  }, []);
  
  // Prevent dropping external text into the editor.
  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
  }, []);

  // Handle replacing a misspelled word with a suggestion
  const handleCorrectSpelling = useCallback((error: SpellError, suggestion: string) => {
    const newText = value.substring(0, error.index) + suggestion + value.substring(error.index + error.length);
    onChange(newText, keystrokesRef.current);
  }, [value, onChange]);
  
  // Count only input keystrokes (not deletions or quotes)
  const inputKeystrokesCount = keystrokes.filter(k => k.type === "input").length;

  // Function to get text segments with error highlighting
  const getHighlightedText = () => {
    if (!isSpellCheckLoaded || spellErrors.length === 0) return value;
    
    // Create spans with error highlighting
    let result = [];
    let lastIndex = 0;
    
    // Sort errors by index to process in order
    const sortedErrors = [...spellErrors].sort((a, b) => a.index - b.index);
    
    for (const error of sortedErrors) {
      // Add text before the error
      if (error.index > lastIndex) {
        result.push(value.substring(lastIndex, error.index));
      }
      
      // Add the highlighted error
      result.push(
        <TooltipProvider key={`error-${error.index}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="bg-red-200 border-b border-red-500">
                {error.word}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <div className="p-1">
                <div className="font-semibold mb-1">Suggestions:</div>
                <ul className="list-none p-0 m-0">
                  {error.suggestions.map((suggestion, i) => (
                    <li 
                      key={i}
                      className="px-2 py-1 hover:bg-gray-100 cursor-pointer rounded"
                      onClick={() => handleCorrectSpelling(error, suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
      
      lastIndex = error.index + error.length;
    }
    
    // Add remaining text
    if (lastIndex < value.length) {
      result.push(value.substring(lastIndex));
    }
    
    return result;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={readOnly ? undefined : handleChange}
            onKeyDown={readOnly ? undefined : handleKeyDown}
            onCopy={readOnly ? undefined : handleCopy}
            onCut={readOnly ? undefined : handleCut}
            onPaste={readOnly ? undefined : handlePaste}
            onDrop={readOnly ? undefined : handleDrop}
            className="min-h-[400px] resize-none font-mono"
            placeholder="Start writing your essay here..."
            disabled={readOnly}
          />
          {isSpellCheckLoaded && spellErrors.length > 0 && (
            <div 
              className="absolute top-3 right-3 bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium"
              title="Click on underlined words to see suggestions"
            >
              {spellErrors.length} spelling error{spellErrors.length === 1 ? '' : 's'}
            </div>
          )}
        </div>
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
        {isSpellCheckLoaded && spellErrors.length > 0 && (
          <div className="mt-4 border-t pt-2">
            <div className="text-sm font-medium mb-2">Spelling Suggestions:</div>
            <ul className="text-xs space-y-1">
              {spellErrors.map((error, index) => (
                <li key={index} className="flex flex-col">
                  <div className="flex items-start">
                    <span className="font-medium">{error.word}</span>
                    <span className="mx-2">→</span>
                    <div className="flex flex-wrap gap-1">
                      {error.suggestions.slice(0, 3).map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleCorrectSpelling(error, suggestion)}
                          className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
