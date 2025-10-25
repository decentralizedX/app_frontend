import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, User, FileImage, Lock, Eye, ExternalLink, Users, Copy, Check, UserPlus, ChevronDown, ChevronUp, Shield, Wallet, Sparkles, Info } from "lucide-react";
import EditorTextParser from "@/components/editor/EditorTextParser";
import { fetchFileContentByAssetAddress, useAssetCidByAddress, useAssetData, useBuyAsset } from "@/services/dXService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import "@/components/editor/Editor.css";
import { useAccount, useReadContract } from "wagmi";
import { useAssetOwnership } from "@/hooks/useAssetOwnership";
import { AuthGuard } from "@/components/AuthGuard";
import { dXassetContract } from "@/contracts/dXasset";

export const PostPreviewPage = () => {
  const { assetAddress } = useParams<{ assetAddress: string }>();
  const { address, isConnected } = useAccount();
  const { cid: assetCid, isLoading: isCidLoading, isError: isCidError } = useAssetCidByAddress(assetAddress || '');
  const { assetData, isLoading: isAssetDataLoading, isError: isAssetDataError } = useAssetData(assetCid || '');
  const { buyAsset, isPending: isBuying, isConfirmed: isBuyConfirmed, isError: isBuyError } = useBuyAsset();
  const { isOwned, isLoading: isOwnershipLoading } = useAssetOwnership(assetAddress || '', assetData);
  
  // Fetch total supply (number of subscribers)
  const { data: totalSupply } = useReadContract({
    address: assetAddress as `0x${string}`,
    abi: dXassetContract.abi,
    functionName: 'totalSupply',
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState<string>("");
  const [postImage, setPostImage] = useState<string | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [copiedAsset, setCopiedAsset] = useState(false);
  const [copiedAuthor, setCopiedAuthor] = useState(false);
  const [copiedCid, setCopiedCid] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  // Update post title when asset data is loaded
  useEffect(() => {
    if (assetData) {
      console.log('Asset Data:', assetData);
      console.log('Thumbnail CID:', assetData.thumbnailCid);
      if (assetData.assetTitle) {
        setPostTitle(assetData.assetTitle);
      }
    }
  }, [assetData]);

  // Set access denied when user doesn't own the asset (but not for free posts)
  useEffect(() => {
    if (!isOwnershipLoading && !isOwned && assetData) {
      // Check if the post is free
      // Note: costInNativeInWei can be 0n (BigInt 0), which is falsy, so we need to check !== undefined
      const isFreePost = assetData?.costInNativeInWei !== undefined ? parseFloat(assetData.costInNativeInWei.toString()) === 0 : false;
      
      // Only deny access if it's not a free post
      if (!isFreePost) {
        setIsAccessDenied(true);
      } else {
        // For free posts, explicitly allow access
        setIsAccessDenied(false);
      }
    } else if (isOwned) {
      setIsAccessDenied(false);
    }
  }, [isOwned, isOwnershipLoading, assetData]);

  // Fetch content when asset CID is available
  useEffect(() => {
    const fetchContent = async () => {
      if (!assetCid) {
        if (isCidError) {
          setContentError("Failed to load asset CID");
          setIsLoading(false);
        }
        return;
      }

      // Wait for asset data to load to check if post is free
      if (!assetData || isAssetDataLoading) {
        return;
      }

      // Check if the post is free (cost is 0)
      // Note: costInNativeInWei can be 0n (BigInt 0), which is falsy, so we need to check !== undefined
      const isFreePost = assetData?.costInNativeInWei !== undefined ? parseFloat(assetData.costInNativeInWei.toString()) === 0 : false;

      // For paid posts, only fetch content if user owns the asset
      if (!isFreePost && (!isOwned || isOwnershipLoading)) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setContentError(null);
        
        // For free posts, we can fetch without user address; for paid posts, we need it
        const contentData = await fetchFileContentByAssetAddress(assetAddress || '', address || '');
        
        if (contentData) {
          try {
            // Parse the JSON response that contains title and content (same as editor)
            const parsedResponse = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
            
            if (parsedResponse.content) {
              // Set the title
              if (parsedResponse.title) {
                setPostTitle(parsedResponse.title);
              }
              
              setPreviewData(parsedResponse.content);
              
              // Extract image from EditorJS content for header display
              if (parsedResponse.content.blocks) {
                const imageBlock = parsedResponse.content.blocks.find((block: any) => 
                  block.type === 'image' && block.data && (block.data.file?.url || block.data.url)
                );
                if (imageBlock) {
                  setPostImage(imageBlock.data.file?.url || imageBlock.data.url);
                }
              }
            } else {
              // Fallback to the original content if structure is different
              setPreviewData(contentData);
              setPostTitle("Untitled");
            }
          } catch (error) {
            // If parsing fails, use the content as-is
            setPreviewData(contentData);
            setPostTitle("Untitled");
          }
        } else {
          setContentError("No content found for this CID");
        }
      } catch (error) {
        console.error('Error fetching content:', error);
        
        // Check if it's a 404 error (user doesn't have access)
        if (error instanceof Error && error.message.includes('404')) {
          setIsAccessDenied(true);
          setContentError(null);
        } else {
          setContentError(error instanceof Error ? error.message : 'Failed to load content');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [assetCid, isCidError, isOwned, isOwnershipLoading, assetData, assetAddress, address, isAssetDataLoading]);

  const handleCopyAsset = async () => {
    if (assetAddress) {
      await navigator.clipboard.writeText(assetAddress);
      setCopiedAsset(true);
      setTimeout(() => setCopiedAsset(false), 2000);
    }
  };

  const handleCopyAuthor = async () => {
    if (assetData?.author) {
      await navigator.clipboard.writeText(assetData.author);
      setCopiedAuthor(true);
      setTimeout(() => setCopiedAuthor(false), 2000);
    }
  };

  const handleCopyCid = async () => {
    if (assetCid) {
      await navigator.clipboard.writeText(assetCid);
      setCopiedCid(true);
      setTimeout(() => setCopiedCid(false), 2000);
    }
  };

  const handlePurchase = async () => {
    if (!assetAddress || !assetData) return;

    try {
      setIsTransactionPending(true);
      const costInWei = assetData.costInNativeInWei ? assetData.costInNativeInWei.toString() : "0";
      await buyAsset({
        assetAddress,
        amount: "1",
        costInNativeInWei: costInWei
      });
      
      setIsPurchaseDialogOpen(false);
    } catch (error) {
      console.error('Error subscribing to asset:', error);
      setIsTransactionPending(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isBuyConfirmed) {
      setIsTransactionPending(false);
      // Reload the page to show the content
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [isBuyConfirmed]);

  // Handle transaction error
  useEffect(() => {
    if (isBuyError) {
      setIsTransactionPending(false);
    }
  }, [isBuyError]);


  if (isLoading || isCidLoading || isAssetDataLoading || isOwnershipLoading) {
    return (
      <div className="bg-transparent py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="w-full max-w-7xl mx-auto">
          {/* Scroll Container with Loading State */}
          <div className="scroll-container">
            {/* Top Wooden Handle */}
            <div className="wooden-handle wooden-handle-top">
              <div className="handle-rod">
                <div className="handle-knob handle-knob-left"></div>
                <div className="handle-knob handle-knob-right"></div>
              </div>
            </div>
            
            {/* Top Paper Roll */}
            <div className="paper-roll paper-roll-top"></div>
            
            {/* Parchment Paper Content with Loading State */}
            <div className="parchment-paper">
              <div className="parchment-content">
                {/* Loading Title Skeleton */}
                <div className="mb-6">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 animate-pulse"></div>
                </div>

                {/* Loading Metadata Skeleton */}
                <div className="mb-8 flex flex-wrap items-center justify-end gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                </div>

                {/* Loading Content Area */}
                <div className="min-h-[500px] w-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom Paper Roll */}
            <div className="paper-roll paper-roll-bottom"></div>
            
            {/* Bottom Wooden Handle */}
            <div className="wooden-handle wooden-handle-bottom">
              <div className="handle-rod">
                <div className="handle-knob handle-knob-left"></div>
                <div className="handle-knob handle-knob-right"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAccessDenied) {
    const pricePerAsset = assetData?.costInNativeInWei !== undefined ? parseFloat(assetData.costInNativeInWei.toString()) / 1e18 : 0;
    
    // Don't show purchase card for free posts
    if (pricePerAsset === 0) {
      // For free posts, just show loading or wait for content to load
      return (
        <div className="bg-transparent py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
          <div className="w-full max-w-7xl mx-auto">
            {/* Scroll Container with Loading State */}
            <div className="scroll-container">
              {/* Top Wooden Handle */}
              <div className="wooden-handle wooden-handle-top">
                <div className="handle-rod">
                  <div className="handle-knob handle-knob-left"></div>
                  <div className="handle-knob handle-knob-right"></div>
                </div>
              </div>
              
              {/* Top Paper Roll */}
              <div className="paper-roll paper-roll-top"></div>
              
              {/* Parchment Paper Content with Loading State */}
              <div className="parchment-paper">
                <div className="parchment-content">
                  {/* Loading Title Skeleton */}
                  <div className="mb-6">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 animate-pulse"></div>
                  </div>

                  {/* Loading Metadata Skeleton */}
                  <div className="mb-8 flex flex-wrap items-center justify-end gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                  </div>

                  {/* Loading Content Area */}
                  <div className="min-h-[500px] w-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 dark:text-gray-400">Loading free content...</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bottom Paper Roll */}
              <div className="paper-roll paper-roll-bottom"></div>
              
              {/* Bottom Wooden Handle */}
              <div className="wooden-handle wooden-handle-bottom">
                <div className="handle-rod">
                  <div className="handle-knob handle-knob-left"></div>
                  <div className="handle-knob handle-knob-right"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full min-h-[calc(100vh-8rem)] py-8">
        <div className="max-w-5xl mx-auto w-full space-y-4">
          
          {/* First-Time Visitor Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Welcome to DecentralizedX
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  This is a decentralized content platform where creators publish premium content as blockchain assets. 
                  Subscribe once with cryptocurrency to get lifetime access. Your subscription is stored on-chain and can never be revoked.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a 
                    href="https://decentralizedx.gitbook.io/dx/tutorials/getting-started" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    New to Web3? Get Started
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <a 
                    href="https://decentralizedx.gitbook.io/dx/tutorials/subscribing-first-post" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    How to Subscribe
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Content Card - Enhanced Design */}
          <Card className="relative overflow-hidden border-0 shadow-xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/3 via-purple-600/3 to-indigo-600/3 dark:from-blue-400/3 dark:via-purple-400/3 dark:to-indigo-400/3"></div>
            
            <CardHeader className="relative pb-4 pt-6 px-4 sm:px-6">
              <div className="flex items-start gap-4">
                {/* Thumbnail image with trust badge */}
                <div className="flex-shrink-0 relative">
                  {(postImage || assetData?.thumbnailCid) ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800">
                      <img 
                        src={postImage || `https://${import.meta.env.VITE_GATEWAY_URL}/ipfs/${assetData?.thumbnailCid}`}
                        alt={assetData?.assetTitle || 'Post thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-3 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-md">
                      <Lock className="h-8 w-8 sm:h-10 sm:w-10 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                  {/* Trust badge */}
                  <div className="absolute -bottom-1 -right-1 p-1 bg-green-500 rounded-full shadow-md" title="Verified on blockchain">
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                {/* Title and description */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 flex-1">
                          {assetData?.assetTitle || 'Untitled'}
                        </h3>
                        {/* Premium badge */}
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-semibold">
                          <Sparkles className="h-3 w-3" />
                          Premium
                        </span>
                      </div>
                      {assetData?.description && (
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                          {assetData.description}
                        </p>
                      )}
                      {/* Author info */}
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <User className="h-4 w-4" />
                        <span className="font-medium">By {assetData?.author?.slice(0, 6)}...{assetData?.author?.slice(-4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative px-4 sm:px-6 pb-6 space-y-5">
              {/* Key Stats - Simplified */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Subscription Price</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pricePerAsset.toFixed(4)}</span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">ETH</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-500">One-time payment</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Subscribers
                    </span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalSupply ? totalSupply.toString() : '0'}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-500">Lifetime access</span>
                  </div>
                </div>
              </div>

              {/* What You Get - Value Proposition */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                  What You Get
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Lifetime Access:</strong> Read this content forever, no recurring fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Blockchain-Secured:</strong> Your subscription is stored on-chain and can't be revoked</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Support Creators:</strong> Your payment goes directly to the content creator</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Decentralized:</strong> No platform can remove your access or censor content</span>
                  </li>
                </ul>
              </div>

              {/* Call to Action */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center">
                {isOwned ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      You own this content. Click below to read it.
                    </p>
                    <Button 
                      onClick={() => window.location.reload()}
                      size="lg"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      <Eye className="h-5 w-5 mr-2" />
                      Read Now
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {!isConnected ? (
                        <>Connect your wallet to subscribe and unlock this premium content</>
                      ) : (
                        <>Ready to get lifetime access? Subscribe now to unlock this content</>
                      )}
                    </p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            <Button 
                              onClick={() => setIsPurchaseDialogOpen(true)}
                              disabled={!isConnected || isTransactionPending}
                              size="lg"
                              className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 px-8 py-3 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                            >
                              {isTransactionPending ? (
                                <>
                                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-5 w-5 mr-2" />
                                  Subscribe Now
                                </>
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!isConnected && (
                          <TooltipContent>
                            <p>Connect wallet to subscribe</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>

              {/* Technical Details - Collapsible */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Technical Details (Blockchain Info)
                  </span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {showTechnicalDetails && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">Asset Contract</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded flex-1 truncate">
                            {assetAddress?.slice(0, 10)}...{assetAddress?.slice(-8)}
                          </span>
                          <button 
                            onClick={handleCopyAsset}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                            title="Copy asset address"
                          >
                            {copiedAsset ? (
                              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-slate-600 dark:text-slate-400 font-medium text-xs">Content CID</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded flex-1 truncate">
                            {assetCid ? `${assetCid.slice(0, 10)}...${assetCid.slice(-8)}` : 'Loading...'}
                          </span>
                          <button 
                            onClick={handleCopyCid}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                            title="Copy content CID"
                          >
                            {copiedCid ? (
                              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

            {/* Subscription Dialog - Responsive */}
            <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center pb-3 sm:pb-4 space-y-2">
                  <div className="mx-auto mb-2 sm:mb-3 p-2 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 w-fit">
                    <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold">Complete Subscription</DialogTitle>
                  <DialogDescription className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                    Confirm your subscription to unlock this content
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 sm:p-6 border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-200">Price:</span>
                      <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{pricePerAsset.toFixed(4)} ETH</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPurchaseDialogOpen(false)}
                    disabled={isTransactionPending}
                    className="w-full sm:w-auto border-2 h-11 sm:h-10 text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePurchase}
                    disabled={isBuying || isTransactionPending}
                    className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 font-semibold h-11 sm:h-10 text-sm sm:text-base"
                  >
                    {isBuying || isTransactionPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {isBuying ? 'Confirming...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Confirm Subscription
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
      </div>
    );
  }

  if (contentError) {
    return <AuthGuard>{null}</AuthGuard>;
  }

  return (
    <div className="bg-transparent py-8 px-4 sm:px-6 lg:px-8 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        {/* Scroll Container */}
        <div className="scroll-container">
          {/* Top Wooden Handle */}
          <div className="wooden-handle wooden-handle-top">
            <div className="handle-rod">
              <div className="handle-knob handle-knob-left"></div>
              <div className="handle-knob handle-knob-right"></div>
            </div>
          </div>
          
          {/* Top Paper Roll */}
          <div className="paper-roll paper-roll-top"></div>
          
          {/* Parchment Paper Content */}
          <div className="parchment-paper">
            <div className="parchment-content">
              {/* Title */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black dark:text-white">
                  {postTitle}
                </h1>
              </div>

              {/* Metadata */}
              <div className="mb-8 flex flex-wrap items-center justify-end gap-4 text-sm text-muted-foreground pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span className="text-xs">
                    {assetData?.author?.slice(0, 6)}...{assetData?.author?.slice(-4)}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="min-h-[500px] w-full">
                {previewData ? (
                  <EditorTextParser data={previewData} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileImage className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>No content available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Paper Roll */}
          <div className="paper-roll paper-roll-bottom"></div>
          
          {/* Bottom Wooden Handle */}
          <div className="wooden-handle wooden-handle-bottom">
            <div className="handle-rod">
              <div className="handle-knob handle-knob-left"></div>
              <div className="handle-knob handle-knob-right"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
