import { useState, useEffect } from "react";
import { useGetUserComments } from "@/services/dXService";
import { CommentWithPostTitle } from "@/types";
import { useAccount } from "wagmi";
import { toast } from "@/components/ui/sonner";
import { MessageCircle, Wallet, ArrowRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CommentCard } from "@/components/CommentCard";

export const MyCommentsPage = () => {
  const [comments, setComments] = useState<CommentWithPostTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { comments: userComments, isLoading: isLoadingComments } = useGetUserComments(address || '');

  useEffect(() => {
    if (!isConnected || !userComments) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      setComments(userComments);
    } catch (error) {
      console.error("Error processing comments:", error);
      toast.error("Failed to load my comments");
    } finally {
      setIsLoading(false);
    }
  }, [userComments, isConnected]);

  return (
    <div className="px-4 sm:px-6 py-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Comments</h1>
          </div>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
              <Wallet className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
              <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
            </div>
            <p className="text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000">
              Please connect wallet to view your comments.
            </p>
          </div>
        ) : isLoading ? (
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
        ) : comments.length > 0 ? (
          <div>
            {comments.map((comment) => (
              <CommentCard key={comment.postId} comment={comment} postTitle={comment.postTitle} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-2 animate-in fade-in-50 zoom-in-50 duration-700">
              <MessageCircle className="h-8 w-8 animate-[float_3s_ease-in-out_infinite]" />
              <h2 className="text-2xl font-semibold">No Comments Yet</h2>
            </div>
            <div 
              onClick={() => navigate('/app')}
              className="flex items-center gap-2 text-muted-foreground mb-6 max-w-md animate-in fade-in-50 slide-in-from-bottom-2 duration-1000 cursor-pointer hover:text-foreground transition-colors"
            >
              <p>Browse posts to get started</p>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        )}
    </div>
  );
};