import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileImage, ShoppingCart, Loader2, Eye, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBuyAsset, getAssetCost, fetchFileContentByAssetAddress } from "@/services/dXService";
import { useAccount, useReadContract } from "wagmi";
import { useState, useEffect } from "react";
import { useAssetOwnership } from "@/hooks/useAssetOwnership";
import { dXassetContract } from "@/contracts/dXasset";

interface HomeCardProps {
  asset: {
    assetTitle: string;
    assetCid: string;
    assetAddress: string;
    author: string;
    thumbnailCid?: string;
    description?: string;
    costInNative?: string;
  };
}

export const HomeCard = ({ asset }: HomeCardProps) => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { buyAsset, isPending, isConfirmed, isError } = useBuyAsset();
  const { isOwned, isLoading: isOwnershipLoading } = useAssetOwnership(asset.assetAddress, asset);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [thumbnailImage, setThumbnailImage] = useState<string>("");
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // Safety check for asset
  if (!asset) {
    console.error('HomeCard: asset prop is undefined');
    return null;
  }

  // Fetch total supply for the asset
  const { data: totalSupply } = useReadContract({
    address: asset.assetAddress as `0x${string}`,
    abi: dXassetContract.abi,
    functionName: "totalSupply",
  });

  // Monitor transaction confirmation
  useEffect(() => {
    if (isConfirmed && isBuying) {
      setIsBuying(false);
      setIsDialogOpen(false);
    }
  }, [isConfirmed, isBuying]);

  // Monitor transaction errors
  useEffect(() => {
    if (isError && isBuying) {
      setIsBuying(false);
    }
  }, [isError, isBuying]);

  // Fetch thumbnail image when component mounts
  useEffect(() => {
    const fetchThumbnail = async () => {
      if (asset.thumbnailCid && !thumbnailImage) {
        setIsLoadingThumbnail(true);
        setThumbnailError(null);
        
        try {
          // Use the Vite gateway URL to fetch the thumbnail
          const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'gateway.pinata.cloud';
          const thumbnailUrl = `https://${gatewayUrl}/ipfs/${asset.thumbnailCid}`;
          
          // Test if the image loads
          const img = new Image();
          img.onload = () => {
            setThumbnailImage(thumbnailUrl);
            setIsLoadingThumbnail(false);
          };
          img.onerror = () => {
            setThumbnailError('Failed to load thumbnail');
            setIsLoadingThumbnail(false);
          };
          img.src = thumbnailUrl;
        } catch (error) {
          console.error('Failed to load thumbnail:', error);
          setThumbnailError('Failed to load thumbnail');
          setIsLoadingThumbnail(false);
        }
      }
    };

    fetchThumbnail();
  }, [asset.thumbnailCid, thumbnailImage]);

  // Fetch file content when user clicks on card (only for owned assets)
  const fetchContent = async () => {
    if (asset.assetAddress && address && !fileContent && !isLoadingContent && isOwned && !isOwnershipLoading) {
      setIsLoadingContent(true);
      setContentError(null);
      
      try {
        const content = await fetchFileContentByAssetAddress(asset.assetAddress, address);
        setFileContent(content);
      } catch (error) {
        console.error('❌ HomeCard - Error loading file content:', error);
        setContentError(error instanceof Error ? error.message : 'Failed to load content');
      } finally {
        setIsLoadingContent(false);
      }
    }
  };
  
  // Get asset cost from asset data or smart contract
  const costInWei = asset.costInNative || getAssetCost(asset.assetAddress);
  const pricePerAsset = costInWei ? parseFloat(costInWei.toString()) / 1e18 : 0; // Convert from wei to ETH with decimals

  // Use asset data from contract
  const postTitle = asset.assetTitle || 'Untitled';
  const postDescription = asset.description || '';

  const handleCardClick = async () => {
    if (!asset.assetAddress) return;
    
    // Navigate directly to the post page - let PostPreviewPage handle access control
    navigate(`/app/post/${asset.assetAddress}`);
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsDialogOpen(true);
  };

  const handleConfirmBuy = async () => {
    if (!asset.assetCid) {
      return;
    }

    setIsBuying(true);
    try {
      await buyAsset({
        assetAddress: asset.assetAddress,
        amount: "1",
        costInNativeInWei: costInWei.toString()
      });
      
      // Don't set isBuying to false here - let the useEffect handle it when transaction is confirmed
    } catch (error: any) {
      console.error('Error buying asset:', error);
      setIsBuying(false);
    }
  };

  // Use price per asset as the total price (quantity is always 1)
  const totalPrice = pricePerAsset;

  return (
    <Card 
      className="w-full max-w-sm hover:shadow-xl transition-all duration-300 group overflow-hidden cursor-pointer border-2"
      onClick={handleCardClick}
    >
      <div className="relative h-48 bg-muted/30 overflow-hidden flex items-center justify-center rounded-t-2xl">
        {isLoadingThumbnail ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/80">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : thumbnailError || !asset.thumbnailCid ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/80">
            <FileImage className="h-16 w-16 text-muted-foreground/50" />
          </div>
        ) : thumbnailImage ? (
          <img 
            src={thumbnailImage} 
            alt={postTitle}
            className="group-hover:scale-105 transition-transform duration-500 w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/80">
            <FileImage className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        
      </div>

      <CardContent className="p-5">
        {/* Author Info and Price at Top */}
        <div className="flex items-center mb-3 gap-2">
          <Badge 
            variant="secondary" 
            className="text-xs px-3 py-1.5 flex-shrink-0 font-medium"
          >
            {asset.author?.slice(0, 6)}...{asset.author?.slice(-4)}
          </Badge>
          
          <Badge 
            variant="secondary" 
            className="text-xs px-3 py-1 flex-shrink-0 font-medium"
          >
            {pricePerAsset === 0 ? "FREE" : `${pricePerAsset.toFixed(4)} ETH`}
          </Badge>
        </div>

        {/* Content area */}
        <div className="flex flex-col">
          <div className="mb-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {postTitle}
            </h3>
          </div>

          <div className="relative min-h-[4.5rem] max-h-[4.5rem] overflow-hidden">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {postDescription}
            </p>
            {/* Gradient fade overlay - only visible when content overflows */}
            {postDescription && postDescription.length > 100 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
        </div>

        {/* Total Supply and Action Section */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="font-medium">
              {totalSupply ? Number(totalSupply) : "0"} Collected
            </span>
          </div>
          {isOwned || pricePerAsset === 0 ? (
            <Badge 
              variant="secondary"
              className="cursor-pointer text-xs px-3 py-1 font-medium"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Read
            </Badge>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Badge 
                  variant="secondary"
                  className="cursor-pointer text-xs px-3 py-1 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Mint
                </Badge>
              </DialogTrigger>
              <DialogContent 
                className="sm:max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <DialogHeader className="text-center pb-3 space-y-2">
                  <div className="mx-auto mb-2 p-2 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 w-fit">
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <DialogTitle className="text-lg sm:text-xl font-bold">Complete Purchase</DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                  <div className={`rounded-lg p-4 sm:p-6 border ${totalPrice === 0 
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200/50 dark:border-emerald-700/50"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200/50 dark:border-blue-700/50"
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-200">Price:</span>
                      <span className={`text-2xl sm:text-3xl font-bold bg-clip-text text-transparent ${totalPrice === 0
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                        : "bg-gradient-to-r from-blue-600 to-indigo-600"
                      }`}>
                        {totalPrice === 0 ? "FREE" : `${totalPrice.toFixed(4)} ETH`}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDialogOpen(false);
                    }}
                    className="flex-1 h-11 sm:h-10"
                    disabled={isBuying}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmBuy();
                    }}
                    disabled={isBuying}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 sm:h-10"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Confirm Purchase
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
