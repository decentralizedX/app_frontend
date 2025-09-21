import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hash, X, Loader2 } from "lucide-react";

interface TagSearchProps {
  onTagSearch: (tags: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  showAddButton?: boolean;
}

export const TagSearch = ({ 
  onTagSearch, 
  isLoading = false, 
  placeholder = "Enter tags and press Enter...",
  className = "",
  showAddButton = true
}: TagSearchProps) => {
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      const newTags = [...selectedTags, trimmedTag];
      setSelectedTags(newTags);
      onTagSearch(newTags);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter(tag => tag !== tagToRemove);
    setSelectedTags(newTags);
    onTagSearch(newTags);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };


  return (
    <div className={`space-y-3 ${className}`}>
      {/* Tag Input */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 w-full"
            disabled={isLoading}
          />
        </div>
        
        {/* Add Button with theme contrast - conditionally rendered */}
        {showAddButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => tagInput.trim() && handleAddTag(tagInput)}
            disabled={!tagInput.trim() || isLoading}
            className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 border-foreground disabled:bg-muted disabled:text-muted-foreground disabled:border-muted"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Add
          </Button>
        )}

      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                onClick={() => handleRemoveTag(tag)}
              >
                #{tag}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && selectedTags.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching for posts with tags...
        </div>
      )}
    </div>
  );
};
