import { useState } from "react";
import { PostCard } from "@/components/PostCard";
import { TagSearch } from "@/components/TagSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Archive, Hash, Megaphone } from "lucide-react";
import { usePosts } from "@/hooks/usePosts";
import { handleGetFilesByTags } from "@/services/pinataService";
import { Post } from "@/types";
import { admin } from "@/contracts/MasterdX";

export const AnnouncementPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchMode, setSearchMode] = useState<'title' | 'tags'>('title');
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [isTagSearchLoading, setIsTagSearchLoading] = useState(false);
  const [hasSelectedTags, setHasSelectedTags] = useState(false);
  const { allPosts, isAllPostLoading } = usePosts();

  // Filter posts that are made by admin
  const announcementsPost = allPosts.filter((post) => {
    return post.owner.toLowerCase() === admin.toLowerCase();
  });

  // Handle tag search
  const handleTagSearch = async (tags: string[]) => {
    setHasSelectedTags(tags.length > 0);
    
    if (tags.length === 0) {
      setTaggedPosts([]);
      return;
    }

    setIsTagSearchLoading(true);
    try {
      const fileMetadataList = await handleGetFilesByTags(tags);
      
      // Convert file metadata to posts by matching CIDs and filter by admin
      const matchedPosts = announcementsPost.filter(post => 
        fileMetadataList.some(file => file.cid === post.postCid)
      );
      
      setTaggedPosts(matchedPosts);
    } catch (error) {
      console.error('Failed to search by tags:', error);
      setTaggedPosts([]);
    } finally {
      setIsTagSearchLoading(false);
    }
  };

  // Get the posts to display based on search mode
  const getPostsToDisplay = () => {
    if (searchMode === 'tags') {
      // If no tags selected, show all announcement posts
      if (!hasSelectedTags) {
        return announcementsPost;
      }
      // If tags selected but no matches found, show empty array
      // If tags selected and matches found, show tagged posts
      return taggedPosts;
    } else {
      // Filter posts based on search term (title search)
      return announcementsPost.filter(post => 
        post.postTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  };

  const filteredPosts = getPostsToDisplay();

  // Sort posts based on expiration time
  const sortedAndFilteredPosts = filteredPosts.sort((a, b) => {
    const timeA = parseInt(a.endTime);
    const timeB = parseInt(b.endTime);
    return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
  });

  const toggleSort = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleModeSwitch = (mode: 'title' | 'tags') => {
    setSearchMode(mode);
    if (mode === 'title') {
      setTaggedPosts([]);
      setHasSelectedTags(false);
    } else {
      setSearchTerm('');
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="h-8 w-8" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Announcements</h1>
          </div>
        </div>
        
        {isAllPostLoading ? (
          <div className="flex justify-center items-center py-4 md:py-8">
            <div className="w-full space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-muted/50 rounded-lg border border-border">
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="flex justify-between items-center">
                        <div className="h-3 bg-muted rounded w-1/4" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : announcementsPost.length > 0 ? (
          <div>
            {/* Search Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={searchMode === 'title' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeSwitch('title')}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search by Title
              </Button>
              <Button
                variant={searchMode === 'tags' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleModeSwitch('tags')}
                className="flex items-center gap-2"
              >
                <Hash className="h-4 w-4" />
                Search by Tags
              </Button>
            </div>

            {/* Search Section */}
            <div className="mb-6">
              {searchMode === 'title' ? (
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search announcements by title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-transparent"
                    onClick={toggleSort}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TagSearch
                      onTagSearch={handleTagSearch}
                      isLoading={isTagSearchLoading}
                      placeholder="Search announcements by tags (e.g., update, important, news)..."
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-transparent"
                    onClick={toggleSort}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Announcement Posts Results */}
            {(isTagSearchLoading) ? (
              <div className="flex justify-center items-center py-4 md:py-8">
                <div className="w-full space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-muted/50 rounded-lg border border-border">
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                          <div className="flex justify-between items-center">
                            <div className="h-3 bg-muted rounded w-1/4" />
                            <div className="h-3 bg-muted rounded w-1/4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : sortedAndFilteredPosts.length > 0 ? (
              sortedAndFilteredPosts.map((post) => (
                <PostCard key={post.postId} post={post} />
              ))
            ) : (searchTerm || searchMode === 'tags') ? (
              <div className="text-center py-10">
                <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchMode === 'tags' 
                    ? 'No announcements found with the selected tags'
                    : 'No announcements match your search'
                  }
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
              <Archive className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
              <h2 className="text-2xl font-semibold">No Announcements Yet</h2>
            </div>
            <p className="text-muted-foreground">Official announcements will appear here when available</p>
          </div>
        )}
    </div>
  );
};
