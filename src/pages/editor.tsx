import React, { useEffect, useRef, useState } from 'react';
import EditorJS from '@editorjs/editorjs';
import EditorPreview from "@/components/EditorPreview";
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import InlineCode from '@editorjs/inline-code';
import Table from '@editorjs/table';
import Image from '@editorjs/image';
import CustomImageTool from '@/components/CustomImageTool';
import Link from '@editorjs/link';
import Marker from '@editorjs/marker';
import Underline from '@editorjs/underline';
import Delimiter from '@editorjs/delimiter';
import { Edit3, Eye } from 'lucide-react';
import { useAccount, useSignMessage } from 'wagmi';
import { createGroupPost, updateFileById } from '@/services/dXService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEditor } from '@/context/EditorContext';
import '../styles/editor.css';

// localStorage removed - users must manually save using save button

const EditorPage = () => {
  const editorRef = useRef<EditorJS | null>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [lastSaved, setLastSaved] = useState<string>('');
  // Auto-save removed - users must manually save
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [dialogType, setDialogType] = useState<'write' | 'other'>('other');
  const [idleTimer, setIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  
  // Image resize state management
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    activeImage: HTMLImageElement | null;
    startX: number;
    startWidth: number;
    originalAspectRatio: number;
    animationFrame: number | null;
    lastResizeTime: number;
  }>({
    isResizing: false,
    activeImage: null,
    startX: 0,
    startWidth: 0,
    originalAspectRatio: 0,
    animationFrame: null,
    lastResizeTime: 0
  });
  
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  const originalNavigate = useNavigate();
  const { cid } = useParams();
  const { ensureAuthenticated, isAuthenticated } = useAuth();
  const { setEditorProps } = useEditor();


  // Create a blocked navigate function that shows dialog only when there are unsaved changes
  const navigate = (to: any, options?: any) => {
    console.log('Programmatic navigation attempt from editor', { to, options, hasUnsavedChanges });
    
    // Check if we're navigating from an existing post to a new post
    const cidFromUrl = getCidFromUrl();
    const isNavigatingToNewPost = !to.includes('/editor/') && !to.includes('editor/');
    
    if (hasUnsavedChanges) {
      // Determine dialog type based on destination
      const isWriteNavigation = to === '/app/editor' || to.startsWith('/app/editor/');
      setDialogType(isWriteNavigation ? 'write' : 'other');
      setShowUnsavedDialog(true);
      setPendingNavigation(() => () => {
        console.log('Programmatic navigation function created, will navigate to:', to);
        
        // Set flag if navigating from existing post to new post
        if (cidFromUrl && isNavigatingToNewPost) {
          sessionStorage.setItem('coming-from-existing-post', 'true');
        }
        
        // localStorage removed - no need to clear
        setTimeout(() => {
          originalNavigate(to, options);
        }, 0);
      });
    } else {
      // No unsaved changes, navigate directly
      
      // Set flag if navigating from existing post to new post
      if (cidFromUrl && isNavigatingToNewPost) {
        sessionStorage.setItem('coming-from-existing-post', 'true');
      }
      
      // localStorage removed - no need to clear
      setTimeout(() => {
        originalNavigate(to, options);
      }, 0);
    }
  };

  // Get CID from URL parameters if present (for editing existing posts)
  const getCidFromUrl = () => {
    return cid || null;
  };

  // Handle image resize events with useEffect
  useEffect(() => {
    if (!resizeState.isResizing || !resizeState.activeImage) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Throttle resize events to 60fps
      const now = performance.now();
      if (now - resizeState.lastResizeTime < 16) return; // ~60fps
      
      setResizeState(prev => ({ ...prev, lastResizeTime: now }));

      // Cancel previous animation frame
      if (resizeState.animationFrame) {
        cancelAnimationFrame(resizeState.animationFrame);
      }

      const animationFrame = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizeState.startX;
        let newWidth = resizeState.startWidth + deltaX;
        
        // Constrain width between 100px and container width
        const container = resizeState.activeImage?.closest('.ce-block__content') || 
                        resizeState.activeImage?.closest('.ce-block');
        const maxWidth = container ? (container as HTMLElement).clientWidth - 40 : 800;
        newWidth = Math.max(100, Math.min(newWidth, maxWidth));

        // Maintain aspect ratio
        const newHeight = newWidth / resizeState.originalAspectRatio;

        if (resizeState.activeImage) {
          // Apply all styles at once to prevent flickering
          resizeState.activeImage.style.cssText = `
            width: ${newWidth}px !important;
            height: ${newHeight}px !important;
            max-width: none !important;
            object-fit: contain !important;
            transition: none !important;
            will-change: width, height !important;
            transform: translateZ(0) !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
          `;
        }
      });

      setResizeState(prev => ({ ...prev, animationFrame }));
    };

    const handleMouseUp = () => {
      if (!resizeState.activeImage) return;

      // Cancel any pending animation frame
      if (resizeState.animationFrame) {
        cancelAnimationFrame(resizeState.animationFrame);
      }

      // Remove resizing class
      const wrapper = resizeState.activeImage.closest('.image-resize-wrapper');
      wrapper?.classList.remove('resizing');
      
      // Restore image styles
      resizeState.activeImage.style.transition = '';
      resizeState.activeImage.style.willChange = '';
      resizeState.activeImage.style.transform = '';
      
      // Restore body styles
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.body.style.pointerEvents = '';
      
      // Save the new image size when resize is complete
      const imageId = getImageId(resizeState.activeImage);
      const currentWidth = parseInt(resizeState.activeImage.style.width) || resizeState.activeImage.offsetWidth;
      const currentHeight = parseInt(resizeState.activeImage.style.height) || resizeState.activeImage.offsetHeight;
      // Image size saving removed - localStorage not used
      
      // Force a reflow to ensure the final size is applied
      resizeState.activeImage.offsetHeight;

      // Reset resize state
      setResizeState({
        isResizing: false,
        activeImage: null,
        startX: 0,
        startWidth: 0,
        originalAspectRatio: 0,
        animationFrame: null,
        lastResizeTime: 0
      });
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (resizeState.animationFrame) {
        cancelAnimationFrame(resizeState.animationFrame);
      }
    };
  }, [resizeState.isResizing, resizeState.activeImage, resizeState.startX, resizeState.startWidth, resizeState.originalAspectRatio, resizeState.lastResizeTime, resizeState.animationFrame]);

  // localStorage removed - no saved content to load

  // Image size management removed - localStorage not used

  const getImageId = (img: HTMLImageElement) => {
    // Create a unique identifier using image src and some context
    const src = img.src || img.getAttribute('data-src') || '';
    const alt = img.alt || '';
    const parent = img.closest('.ce-block');
    const blockIndex = parent ? Array.from(parent.parentElement?.children || []).indexOf(parent) : 0;
    return `${src}_${alt}_${blockIndex}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  };

  const applySavedImageSizes = () => {
    if (!holderRef.current) return;
    
    // Image size management removed - localStorage not used
    const images = holderRef.current.querySelectorAll('img');
    
    images.forEach(img => {
      const imageElement = img as HTMLImageElement;
      const imageId = getImageId(imageElement);
      
      // Image size management removed - localStorage not used
      // No stored sizes to apply
        imageElement.style.maxWidth = 'none';
        // console.log(`Applied saved size to image ${imageId}:`, { width, height });
    });
  };

  // Debounce function to prevent excessive calls
  let imageSizeApplicationTimeout: NodeJS.Timeout | null = null;
  let hasAppliedImageSizes = false;
  
  // Apply image sizes from EditorJS block data (for loaded saved content)
  const applyImageSizesFromBlockData = async () => {
    if (!editorRef.current || !holderRef.current) {
      return;
    }
    
    // Don't apply if we've already applied recently
    if (hasAppliedImageSizes) {
      return;
    }
    
    // Debounce to prevent excessive calls
    if (imageSizeApplicationTimeout) {
      clearTimeout(imageSizeApplicationTimeout);
    }
    
    imageSizeApplicationTimeout = setTimeout(async () => {
      try {
        console.log('🔍 Starting image size application from block data...');
        
        // Get images directly from DOM instead of calling save()
        const images = holderRef.current!.querySelectorAll('img');
      
        console.log('📊 Found', images.length, 'images in DOM');
      
      // localStorage removed - no stored content to process
      
      let imageIndex = 0;
      let sizesApplied = 0;
      
      // Iterate through blocks to find image blocks with custom dimensions
      const parsedContent = await editorRef.current.save();
      parsedContent.blocks?.forEach((block: any, blockIndex: number) => {
        if (block.type === 'image' && block.data) {
          const imageElement = images[imageIndex] as HTMLImageElement;
          
          console.log(`🔍 Processing image block ${blockIndex}:`, {
            blockType: block.type,
            hasImageElement: !!imageElement,
            imageElementSrc: imageElement?.src,
            blockData: {
              url: block.data.file?.url || block.data.url,
              customWidth: block.data.customWidth,
              customHeight: block.data.customHeight,
              width: block.data.width,
              height: block.data.height,
              file: block.data.file
            }
          });
          
          if (imageElement) {
            // Extract custom dimensions from block data with fallbacks
            const customWidth = block.data.customWidth || block.data.width || block.data.file?.width;
            const customHeight = block.data.customHeight || block.data.height || block.data.file?.height;
            
            console.log(`🖼️ Image ${imageIndex} dimension analysis:`, {
              customWidth,
              customHeight,
              currentElementWidth: imageElement.offsetWidth,
              currentElementHeight: imageElement.offsetHeight,
              currentStyleWidth: imageElement.style.width,
              currentStyleHeight: imageElement.style.height
            });
            
            if (customWidth && customHeight) {
              // Force application with !important style properties
              imageElement.style.setProperty('width', `${customWidth}px`, 'important');
              imageElement.style.setProperty('height', `${customHeight}px`, 'important');
              imageElement.style.setProperty('max-width', 'none', 'important');
              imageElement.style.setProperty('object-fit', 'contain', 'important');
              
              // Also try setting attributes as backup
              imageElement.setAttribute('width', customWidth.toString());
              imageElement.setAttribute('height', customHeight.toString());
              
              // Force a reflow to ensure the changes take effect
              imageElement.offsetHeight;
              
              // Save to localStorage for consistency with resize handles
              const imageId = getImageId(imageElement);
              // Image size saving removed - localStorage not used
              
              sizesApplied++;
              
              console.log(`✅ Applied forced size to image ${imageIndex}:`, { 
                width: customWidth, 
                height: customHeight,
                imageId,
                newStyleWidth: imageElement.style.width,
                newStyleHeight: imageElement.style.height
              });
              
              // Trigger a reflow to ensure changes are applied
              imageElement.offsetHeight;
            } else {
              console.log(`⚠️ No custom dimensions found for image ${imageIndex}`);
            }
          } else {
            console.log(`⚠️ No image element found for block ${blockIndex}`);
          }
          
          imageIndex++;
        }
      });
      
        console.log(`🎯 Finished applying image sizes: ${sizesApplied}/${imageIndex} images processed`);
        
        // Mark as applied to prevent repeated calls
        hasAppliedImageSizes = true;
        
        // localStorage removed - no stored content to retry with
        
      } catch (error) {
        console.error('❌ Error applying image sizes from block data:', error);
      }
    }, 200); // Debounce for 200ms
  };

  // Fallback function to apply sizes from localStorage content
  // Fallback function removed - localStorage not used

  // Auto-save removed - users must manually save using save button

  // Check if content has meaningful changes that require IPFS saving
  const hasContentChanged = async () => {
    if (!editorRef.current) return false;
    
    try {
      const currentData = await editorRef.current.save();
      // localStorage removed - no saved data to compare
      
      // Check if title is different
      // localStorage removed - no saved title to compare
      // Title comparison removed - localStorage not used
      
      // If no saved data exists, check if current content has meaningful data
      // Always check for meaningful content since localStorage is removed
      {
      const currentBlocks = currentData?.blocks || [];
        return currentBlocks.some(block => {
        if (block.type === 'paragraph' && block.data?.text?.trim()) return true;
        if (block.type === 'header' && block.data?.text?.trim()) return true;
        if (block.type === 'list' && block.data?.items?.length > 0) return true;
        if (block.type === 'quote' && (block.data?.text?.trim() || block.data?.caption?.trim())) return true;
        if (block.type === 'code' && block.data?.code?.trim()) return true;
          if (block.type === 'image' && block.data?.file?.url) return true;
          if (block.type === 'table' && block.data?.content?.length > 0) return true;
        return false;
      });
      }
      
      // localStorage removed - no saved data to compare
      
      // localStorage removed - no comparison needed
      
      // localStorage removed - no comparison needed
    } catch (error) {
      console.error('Error checking content changes:', error);
      return false;
    }
  };

  // Inject current image sizes into EditorJS blocks
  const injectImageSizes = async (outputData: any) => {
    if (!outputData?.blocks || !holderRef.current) {
      return outputData;
    }

    console.log('🖼️ Injecting image sizes into blocks...');
    console.log('📊 Original blocks before injection:', outputData.blocks?.map((b: any, i: number) => ({
      index: i,
      type: b.type,
      hasCustomWidth: !!b.data?.customWidth,
      hasCustomHeight: !!b.data?.customHeight,
      customWidth: b.data?.customWidth,
      customHeight: b.data?.customHeight
    })));
    
    // Create a copy of the output data
    const enhancedData = JSON.parse(JSON.stringify(outputData));
    
    // Find all image elements in the editor
    const imageElements = holderRef.current.querySelectorAll('img');
    console.log('🖼️ Found', imageElements.length, 'image elements in DOM');
    let imageIndex = 0;
    
    // Process each block
    enhancedData.blocks = enhancedData.blocks.map((block: any, blockIndex: number) => {
      if (block.type === 'image') {
        // Find the corresponding image element
        const imageElement = imageElements[imageIndex] as HTMLImageElement;
        
        if (imageElement) {
          // Get current dimensions from the DOM
          const computedStyle = window.getComputedStyle(imageElement);
          const currentWidth = parseInt(computedStyle.width);
          const currentHeight = parseInt(computedStyle.height);
          
          // Get stored sizes from localStorage as fallback
          const imageId = getImageId(imageElement);
          // Image size management removed - localStorage not used
          // Image size management removed - no stored sizes
          
          console.log(`🔍 Block ${blockIndex} dimension analysis:`, {
            currentDOM: { width: currentWidth, height: currentHeight },
            // storedSize removed - localStorage not used
            blockData: {
              customWidth: block.data.customWidth,
              customHeight: block.data.customHeight,
              width: block.data.width,
              height: block.data.height
            },
            imageId
          });
          
          // Use current DOM dimensions or block data dimensions
          const finalWidth = currentWidth > 0 ? currentWidth : block.data.customWidth;
          const finalHeight = currentHeight > 0 ? currentHeight : block.data.customHeight;
          
          if (finalWidth && finalHeight) {
            block.data.customWidth = finalWidth;
            block.data.customHeight = finalHeight;
            
            console.log(`📐 Block ${blockIndex}: Added size ${finalWidth}x${finalHeight} to image`, {
              url: block.data.file?.url,
              imageId
            });
          }
        }
        
        imageIndex++;
      }
      
      return block;
    });
    
    console.log('✅ Image size injection completed');
    console.log('📊 Enhanced blocks after injection:', enhancedData.blocks?.map((b: any, i: number) => ({
      index: i,
      type: b.type,
      hasCustomWidth: !!b.data?.customWidth,
      hasCustomHeight: !!b.data?.customHeight,
      customWidth: b.data?.customWidth,
      customHeight: b.data?.customHeight
    })));
    
    return enhancedData;
  };

  // Save content to API (internal function)
  const saveToAPIInternal = async (clearPendingNavigation = false) => {
    if (!editorRef.current || !address) {
      toast({
        title: "Error",
        description: "Please connect your wallet to save.",
        variant: "destructive"
      });
      return false;
    }

    // Clear pending navigation if this is a direct save (not from dialog)
    if (clearPendingNavigation) {
      console.log('💾 Direct save initiated - clearing any pending navigation');
      setPendingNavigation(null);
      setShowUnsavedDialog(false);
    }

    // Ensure user is authenticated before saving
    const authenticated = await ensureAuthenticated();
    if (!authenticated) {
      toast({
        title: "Authentication Required",
        description: "Please authenticate with your wallet to save content.",
        variant: "destructive"
      });
      return false;
    }
    
    setIsSaving(true);
    try {
      const outputData = await editorRef.current.save();
      
      // Inject current image sizes into the blocks before saving
      const enhancedOutputData = await injectImageSizes(outputData);
      
      // Check if we're updating an existing post or creating a new one
      const cidFromUrl = getCidFromUrl();
      
      if (cidFromUrl) {
        // UPDATE EXISTING POST
        console.log('🔄 Updating existing post with CID:', cidFromUrl);
        console.log('   - Title:', documentTitle);
        console.log('   - Content structure:', Object.keys(enhancedOutputData || {}));
        
        // localStorage removed - no need to clear before IPFS request
        
        // Ensure user is authenticated before making the update call
        try {
          await ensureAuthenticated();
        } catch (authError) {
          console.error('❌ Authentication failed:', authError);
          toast({
            title: "Authentication Error",
            description: "Please connect your wallet and try again",
            variant: "destructive"
          });
          return false;
        }
        
        let result;
        try {
          result = await updateFileById(cidFromUrl, enhancedOutputData, documentTitle, address, signMessageAsync);
        } catch (error) {
          console.error('❌ Error in updateFileById:', error);
          
          // Check if it's an authentication error
          if (error.message && error.message.includes('401')) {
            try {
              await ensureAuthenticated();
              result = await updateFileById(cidFromUrl, enhancedOutputData, documentTitle, address, signMessageAsync);
            } catch (retryError) {
              console.error('❌ Retry failed:', retryError);
              toast({
                title: "Error",
                description: "Failed to update content after retry",
                variant: "destructive"
              });
              return false;
            }
          } else {
            toast({
              title: "Error",
              description: "Failed to update content",
              variant: "destructive"
            });
            return false;
          }
        }
        
        // Extract new CID from the update response (same format as create/group)
        const newCid = result?.upload?.cid || result?.cid || result?.data?.cid || result?.ipfsHash || result?.hash;
        
        // Debug: Log to localStorage so it persists across redirects
        localStorage.setItem('debug-update', JSON.stringify({
          timestamp: new Date().toISOString(),
          hasResult: !!result,
          resultKeys: result ? Object.keys(result) : [],
          extractedCid: newCid,
          currentUrl: window.location.href
        }));
        
        if (newCid) {
          // Update the URL with the new CID and redirect
          const newUrl = `/app/editor/${newCid}`;
          
          // Debug: Log redirect details
          localStorage.setItem('debug-redirect', JSON.stringify({
            timestamp: new Date().toISOString(),
            newCid: newCid,
            newUrl: newUrl,
            fullUrl: window.location.origin + newUrl,
            currentUrl: window.location.href
          }));
        
        toast({
          title: "Success", 
            description: "Content updated successfully! Redirecting to updated content...",
          });
          
          // For direct saves, redirect to the new CID
          // For dialog saves, call handleSuccessfulSave to respect pendingNavigation
          if (clearPendingNavigation) {
            // Direct save from floating navbar - redirect to new CID
            console.log('💾 Direct save - redirecting to new CID:', newCid);
            setTimeout(() => {
              window.location.href = newUrl;
            }, 1000);
          } else {
            // Dialog save - call handleSuccessfulSave to respect pendingNavigation
            handleSuccessfulSave();
          }
          
        } else {
          console.warn('⚠️ No new CID found in update response, reloading with current CID');
          
          toast({
            title: "Success", 
            description: "Content updated successfully! Reloading...",
          });
          
          // Fallback: reload the page if no new CID
        setTimeout(() => {
          window.location.reload();
          }, 1000);
        }
        
        return true;
        
      } else {
        // CREATE NEW POST
        console.log('✨ Creating new post');
        
        // Generate salt (current timestamp in seconds)
        const timestamp = Math.floor(Date.now() / 1000);
        const salt = `I want to create a new file at timestamp - ${timestamp}`;
        
        console.log('=== SIGNING PROCESS START ===');
        console.log('1. Generated salt (timestamp):', salt);
        console.log('   - Salt type:', typeof salt);
        console.log('   - Salt value as number:', parseInt(salt));
        console.log('2. User address from wagmi:', address);
        console.log('3. About to sign salt with MetaMask...');
        
        // Sign the salt directly (API requirement)
        const signature = await signMessageAsync({ 
          message: salt,
          account: address as `0x${string}`
        });
        
        console.log('4. Received signature:', signature);
        console.log('5. API payload will be:', {
          salt,
          address,
          signature
        });
        console.log('=== SIGNING PROCESS END ===');
        
        // localStorage removed - no need to clear before IPFS request
        
        // Ensure user is authenticated before making the create call
        try {
          await ensureAuthenticated();
        } catch (authError) {
          console.error('❌ Authentication failed for new post:', authError);
          toast({
            title: "Authentication Error",
            description: "Please connect your wallet and try again",
            variant: "destructive"
          });
          return false;
        }
        
        // Post to API and get the response with CID
        const result = await createGroupPost(enhancedOutputData, documentTitle, address, signature, salt);
        
        // Check if we got a CID from the API response (try different possible field names)
        const cid = result?.updatedUpload?.cid || result?.cid || result?.data?.cid || result?.ipfsHash || result?.hash;
        if (result && cid) {
          // Update the URL with the new CID and redirect
          const newUrl = `/app/editor/${cid}`;
          
          toast({
            title: "Success", 
            description: "Content saved! Redirecting to new content...",
          });
          
        // For direct saves, redirect to the new CID
        // For dialog saves, call handleSuccessfulSave to respect pendingNavigation
        if (clearPendingNavigation) {
          // Direct save from floating navbar - redirect to new CID
          console.log('💾 Direct save - redirecting to new CID:', cid);
          setTimeout(() => {
            window.location.href = newUrl;
          }, 1000);
        } else {
          // Dialog save - call handleSuccessfulSave to respect pendingNavigation
          handleSuccessfulSave();
        }
        } else {
          // Fallback: Handle successful save without CID
          console.warn('⚠️ No CID returned from API, using fallback behavior');
        handleSuccessfulSave();
        }
        
        return true;
      }
      
    } catch (error: any) {
      console.error('Error saving to API:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save content.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Public save function for direct saves (clears pending navigation)
  const saveToAPI = async () => {
    return await saveToAPIInternal(true);
  };

  // Set editor props in context for TopHeader
  useEffect(() => {
    setEditorProps({
      onSave: saveToAPI,
      onPublish: saveToAPI,
      isSaving,
      isAuthenticated,
    });
  }, [saveToAPI, isSaving, isAuthenticated, setEditorProps]);

  // Handle save action from dialog (preserves pending navigation)
  const handleSave = async () => {
    console.log('💾 Dialog save button clicked');
    console.log('💾 pendingNavigation exists:', !!pendingNavigation);
    console.log('💾 dialogType:', dialogType);
    const success = await saveToAPIInternal(false);
    console.log('💾 saveToAPIInternal result:', success);
    // The handleSuccessfulSave function will handle the navigation logic
    // No need to duplicate it here
  };

  // localStorage removed - no need to clear storage

  // fetchAndLoadContent function removed - using redirect approach instead

  // Debug function to check update/redirect status
  const checkUpdateDebug = () => {
    const updateDebug = localStorage.getItem('debug-update');
    const redirectDebug = localStorage.getItem('debug-redirect');
    
    console.log('🔍 Update Debug Info:');
    if (updateDebug) {
      console.log(JSON.parse(updateDebug));
    } else {
      console.log('No update debug info found');
    }
    
    console.log('🔍 Redirect Debug Info:');
    if (redirectDebug) {
      console.log(JSON.parse(redirectDebug));
    } else {
      console.log('No redirect debug info found');
    }
  };

  // Make debug function available globally
  (window as any).checkUpdateDebug = checkUpdateDebug;

  // Reload content from IPFS after successful save using /fileByCid API
  const reloadContentFromIPFS = async () => {
    const cidFromUrl = getCidFromUrl();
    console.log('🔄 reloadContentFromIPFS called, CID from URL:', cidFromUrl);
    if (!cidFromUrl) {
      console.log('❌ No CID found in URL, cannot reload content');
      return;
    }

    setIsLoadingContent(true);
    try {
      console.log('🔄 Reloading content using /fileByCid API for CID:', cidFromUrl);
      
      // Import fetchFileContentByCid from dXService
      const { fetchFileContentByCid } = await import('@/services/dXService');
      
      const contentData = await fetchFileContentByCid(cidFromUrl);
      console.log('🔍 /fileByCid API result:', contentData);
      
      if (contentData) {
        console.log('🔍 Content data type:', typeof contentData);
        console.log('🔍 Content data keys:', Object.keys(contentData || {}));
        
        try {
          // Parse the JSON response that contains title and content
          const parsedResponse = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
          console.log('🔍 Parsed response:', parsedResponse);
          console.log('🔍 Parsed response keys:', Object.keys(parsedResponse));
          console.log('🔍 Content field:', parsedResponse.content);
          console.log('🔍 Title field:', parsedResponse.title);
          
          if (parsedResponse.content) {
            console.log('✅ Successfully loaded content from /fileByCid API');
            console.log('🔍 Content structure:', Object.keys(parsedResponse.content));
            console.log('🔍 Content blocks count:', parsedResponse.content.blocks?.length);
            
            // Store the loaded content in localStorage for consistency
            // localStorage removed - no need to store content
            
            // Clear old image size data to ensure fresh content is used
            // localStorage removed - no image sizes to clear
            console.log('🧹 Cleared old localStorage data after reloading from API');
            
            // Set the title
            if (parsedResponse.title) {
              setDocumentTitle(parsedResponse.title);
              console.log('🔍 Title set to:', parsedResponse.title);
            }
            
            // Force editor re-initialization by destroying and recreating
            if (editorRef.current && editorRef.current.destroy) {
              console.log('🔄 Destroying existing editor before reload');
              editorRef.current.destroy();
              editorRef.current = null;
            }
            
            // Small delay to ensure DOM cleanup is complete
            setTimeout(() => {
              // Set preview data to trigger editor re-initialization
              console.log('🔍 Setting preview data:', parsedResponse.content);
              setPreviewData(parsedResponse.content);
              console.log('✅ Preview data set, editor will re-initialize');
            }, 100);
            
          } else {
            // Fallback to the original content if structure is different
            console.log('⚠️ No content field in parsed response, using fallback structure');
            console.log('🔍 Using raw contentData:', contentData);
            // localStorage removed - no need to store content
            setPreviewData(contentData);
          }
        } catch (error) {
          // If parsing fails, use the content as-is
          console.log('⚠️ JSON parsing failed, using raw content:', error);
          console.log('🔍 Raw contentData:', contentData);
          // localStorage removed - no need to store content
          setPreviewData(contentData);
        }
      } else {
        console.error('❌ Failed to reload content from /fileByCid API: No content data');
      }
    } catch (error) {
      console.error('❌ Error reloading content from /fileByCid API:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Handle successful save from dialog - execute user's intended navigation
  const handleSuccessfulSave = () => {
    console.log('🔄 handleSuccessfulSave called (dialog save)');
    console.log('🔄 pendingNavigation exists:', !!pendingNavigation);
    console.log('🔄 dialogType:', dialogType);
    
    setHasUnsavedChanges(false);
    setShowUnsavedDialog(false);
    // localStorage removed - no need to clear
    
    // This function is only called for dialog saves, so there should always be a pendingNavigation
    if (pendingNavigation) {
      console.log('✅ Executing pending navigation after save');
      toast({
        title: "Success", 
        description: "Content saved! Redirecting...",
      });
      
      // Execute the pending navigation after successful save
      const navFunction = pendingNavigation;
      setPendingNavigation(null);
      
      // Check if this is a write button navigation - use full page refresh for clean editor
      if (dialogType === 'write') {
        console.log('📝 Write navigation from save dialog - using full page refresh');
        setTimeout(() => {
          window.location.href = '/app/editor';
        }, 1000);
      } else {
        console.log('🏠 Other navigation from save dialog - using normal navigation');
        // For other navigation, use normal navigation
        setTimeout(() => {
          navFunction();
        }, 1000);
      }
    } else {
      console.warn('⚠️ No pending navigation in dialog save - this should not happen');
      // Fallback: reload content from IPFS
      toast({
        title: "Success", 
        description: "Content saved! Reloading...",
      });
      
      setTimeout(() => {
        reloadContentFromIPFS();
      }, 1000);
    }
  };

  // Handle discard action from dialog
  const handleDiscard = () => {
    console.log('Discard button clicked, pendingNavigation exists:', !!pendingNavigation);
    
    // Execute the pending navigation when discarding
    if (pendingNavigation) {
      console.log('Executing pending navigation after discard');
      
      // Close dialog and clear state
      setShowUnsavedDialog(false);
      setHasUnsavedChanges(false);
      setPendingNavigation(null);
      
      // Check if destination is /app/editor (write button) - use full page refresh
      if (dialogType === 'write') {
        console.log('Write navigation detected - using full page refresh to clear editor');
        setTimeout(() => {
          window.location.href = '/app/editor';
        }, 0);
      } else {
        // For other navigation, use normal navigation
        const navFunction = pendingNavigation;
        setTimeout(() => {
          navFunction();
        }, 0);
      }
    } else {
      console.log('No pending navigation to execute');
      // Still close dialog even if no navigation
      setShowUnsavedDialog(false);
      setHasUnsavedChanges(false);
      // Clear localStorage even when no navigation
      // localStorage removed - no need to clear
    }
  };

  // Toggle between edit and preview modes
  const togglePreview = async () => {
    if (isPreviewMode) {
      // Switch back to edit mode - useEffect will handle editor recreation
      setIsPreviewMode(false);
    } else {
      // Switch to preview mode - save current content first
      if (editorRef.current) {
        try {
          const outputData = await editorRef.current.save();
          setPreviewData(outputData);
          // Also save to localStorage as backup
          // localStorage removed - no need to store content
          setIsPreviewMode(true);
        } catch (error) {
          console.error('Error saving content for preview:', error);
        }
      }
    }
  };

  // Force apply image dimensions - more aggressive approach
  const forceApplyImageDimensions = async () => {
    if (!editorRef.current || !holderRef.current) {
      console.log('⚠️ Editor or holder not ready for force image dimension application');
      return;
    }

    try {
      console.log('🔧 Force applying image dimensions...');
      
      // Get current editor data
      const outputData = await editorRef.current.save();
      const images = holderRef.current.querySelectorAll('img');
      
      console.log('🔧 Found', images.length, 'images for force application');
      
      let imageIndex = 0;
      let appliedCount = 0;
      
      // Process each image block
      outputData.blocks?.forEach((block: any, blockIndex: number) => {
        if (block.type === 'image' && block.data) {
          const imageElement = images[imageIndex] as HTMLImageElement;
          
          if (imageElement) {
            // Get custom dimensions from block data
            const customWidth = block.data.customWidth || block.data.width || block.data.file?.width;
            const customHeight = block.data.customHeight || block.data.height || block.data.file?.height;
            
            console.log(`🔧 Force applying to image ${imageIndex}:`, {
              customWidth,
              customHeight,
              currentWidth: imageElement.offsetWidth,
              currentHeight: imageElement.offsetHeight
            });
            
            if (customWidth && customHeight) {
              // Force apply with !important and multiple methods
              imageElement.style.setProperty('width', `${customWidth}px`, 'important');
              imageElement.style.setProperty('height', `${customHeight}px`, 'important');
              imageElement.style.setProperty('max-width', 'none', 'important');
              imageElement.style.setProperty('object-fit', 'contain', 'important');
              
              // Set attributes
              imageElement.setAttribute('width', customWidth.toString());
              imageElement.setAttribute('height', customHeight.toString());
              
              // Force reflow
              imageElement.offsetHeight;
              
              appliedCount++;
              console.log(`✅ Force applied dimensions to image ${imageIndex}:`, { customWidth, customHeight });
            }
          }
          
          imageIndex++;
        }
      });
      
      console.log(`🔧 Force application completed: ${appliedCount}/${images.length} images processed`);
    } catch (error) {
      console.error('❌ Error in force apply image dimensions:', error);
    }
  };


  // Load existing post content using /fileByCid API when editing
  useEffect(() => {
    const loadExistingPostContent = async () => {
      const cidFromUrl = getCidFromUrl();
      if (!cidFromUrl) return;

      setIsLoadingContent(true);
      try {
        console.log('🔄 Loading existing post content using /fileByCid API for CID:', cidFromUrl);
        
        // Import fetchFileContentByCid from dXService
        const { fetchFileContentByCid } = await import('@/services/dXService');
        
        const contentData = await fetchFileContentByCid(cidFromUrl);
        if (contentData) {
          try {
            // Parse the JSON response that contains title and content
            const parsedResponse = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
            if (parsedResponse.content) {
              // Debug: Log the loaded content to check for image size data
              console.log('🔍 Loaded content structure:', {
                hasBlocks: !!parsedResponse.content.blocks,
                blockCount: parsedResponse.content.blocks?.length || 0,
                imageBlocks: parsedResponse.content.blocks?.filter((b: any) => b.type === 'image').map((b: any, i: number) => ({
                  index: i,
                  url: b.data?.file?.url || b.data?.url,
                  customWidth: b.data?.customWidth,
                  customHeight: b.data?.customHeight,
                  width: b.data?.width,
                  height: b.data?.height,
                  fileWidth: b.data?.file?.width,
                  fileHeight: b.data?.file?.height
                })) || []
              });
              
              // Set the content as preview data to be loaded into editor
              setPreviewData(parsedResponse.content);
              // Also set the title
              if (parsedResponse.title) {
                setDocumentTitle(parsedResponse.title);
              }
              console.log('✅ Successfully loaded existing post content from /fileByCid API');
              
              // Store the loaded content in localStorage as well for consistency
              // localStorage removed - no need to store content
              
              // Clear any old localStorage data after loading fresh content from server
              // This ensures we're working with the latest server content
              const cidFromUrl = getCidFromUrl();
              if (cidFromUrl) {
                // Clear old data to ensure fresh content is used
                // localStorage removed - no image sizes to clear
                console.log('🧹 Cleared old localStorage data after loading fresh content from server');
              }
            } else {
              // Fallback to the original content if structure is different
              setPreviewData(contentData);
              console.log('✅ Loaded existing post content (fallback structure)');
            }
          } catch (error) {
            // If parsing fails, use the content as-is
            setPreviewData(contentData);
            console.log('✅ Loaded existing post content (raw format)');
          }
        } else {
          console.error('❌ Failed to load existing post content: No content data');
        }
      } catch (error) {
        console.error('❌ Error loading existing post content from /fileByCid API:', error);
      } finally {
        setIsLoadingContent(false);
      }
    };

    loadExistingPostContent();
  }, []); // Run once on mount

  useEffect(() => {
    console.log('🔍 Editor initialization useEffect triggered');
    console.log('🔍 holderRef.current:', !!holderRef.current);
    console.log('🔍 isPreviewMode:', isPreviewMode);
    console.log('🔍 isLoadingContent:', isLoadingContent);
    console.log('🔍 previewData:', previewData);
    
    if (!holderRef.current || isPreviewMode || isLoadingContent) {
      console.log('🔍 Skipping editor initialization - conditions not met');
      return;
    }

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      console.log('🔍 Starting editor initialization...');
      
      // Destroy existing editor if it exists
      if (editorRef.current && editorRef.current.destroy) {
        console.log('🔍 Destroying existing editor');
        editorRef.current.destroy();
        editorRef.current = null;
      }

      // Only load saved content if we're editing an existing post (has CID)
      const cidFromUrl = getCidFromUrl();
      let initialData = null;
      
      if (cidFromUrl) {
        // Editing existing post - use preview data from IPFS
        console.log('🔍 Editing existing post - using preview data:', previewData);
        initialData = previewData;
      } else {
        // New post - check if we should clear content or preserve it
        const wasComingFromExistingPost = sessionStorage.getItem('coming-from-existing-post') === 'true';
        
        if (wasComingFromExistingPost) {
          // Coming from existing post - start empty
          console.log('🔍 New post after existing post - starting with empty editor');
          setDocumentTitle('');
          setHasUnsavedChanges(false);
          initialData = null;
          // Clear the flag
          sessionStorage.removeItem('coming-from-existing-post');
        } else {
          // Regular new post - start empty (no localStorage to preserve)
          console.log('🔍 New post - starting with empty editor');
          initialData = null; // Always start empty for new posts
        }
      }
      
      console.log('🔍 Initial data for editor:', initialData);

      const editor = new EditorJS({
      holder: holderRef.current,
      placeholder: "Write '/' for commands...",
      autofocus: true,
      data: initialData || undefined,
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: 'Heading...',
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 1
          },
          shortcut: 'CMD+SHIFT+H'
        },
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
          config: {
            placeholder: "Write '/' for commands..."
          }
        },
        list: {
          class: List,
          inlineToolbar: true,
          config: {
            defaultStyle: 'unordered'
          },
          shortcut: 'CMD+SHIFT+L'
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
          config: {
            quotePlaceholder: 'Enter a quote',
            captionPlaceholder: 'Quote\'s author'
          },
          shortcut: 'CMD+SHIFT+O'
        },
        code: {
          class: Code,
          config: {
            placeholder: 'Enter your code...'
          },
          shortcut: 'CMD+SHIFT+C'
        },
        inlineCode: {
          class: InlineCode,
          shortcut: 'CMD+SHIFT+M'
        },
        table: {
          class: Table as any,
          inlineToolbar: true,
          config: {
            rows: 2,
            cols: 3
          }
        },
        image: {
          class: CustomImageTool,
          config: {
            uploader: {
              uploadByFile: (file: File) => {
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    resolve({
                      success: 1,
                      file: {
                        url: reader.result as string
                      }
                    });
                  };
                  reader.readAsDataURL(file);
                });
              },
              uploadByUrl: (url: string) => {
                return Promise.resolve({
                  success: 1,
                  file: { url }
                });
              }
            },
            captionPlaceholder: 'Image caption'
          }
        },
        linkTool: {
          class: Link,
          config: {
            endpoint: 'https://api.allorigins.win/get?url='
          }
        },
        marker: {
          class: Marker,
          shortcut: 'CMD+SHIFT+M'
        },
        underline: {
          class: Underline,
          shortcut: 'CMD+U'
        },
        delimiter: {
          class: Delimiter
        }
      },
      onChange: async () => {
        console.log('Content changed - checking for unsaved changes');
        // Check if content has meaningful changes
        const hasChanges = await hasContentChanged();
        setHasUnsavedChanges(hasChanges);
      },
      onReady: () => {
        console.log('Editor.js is ready to work!');
        // Delay initialization to ensure DOM is ready
        setTimeout(() => {
          initializeImageResizing();
          // Apply saved image sizes after initialization
          setTimeout(() => {
            applySavedImageSizes();
            // If editing existing content, also apply sizes from block data with multiple retries
            const cidFromUrl = getCidFromUrl();
            if (cidFromUrl) {
              console.log('🔄 Detected CID in URL, will apply saved image sizes with retries...');
              
              // Immediate attempt - try right away
              console.log('🔄 Immediate attempt: Applying image sizes from block data...');
              applyImageSizesFromBlockData();
              
              // Multiple attempts with increasing delays to ensure images are fully loaded
              setTimeout(() => {
                console.log('🔄 Attempt 1: Applying image sizes from block data...');
                applyImageSizesFromBlockData();
              }, 300);
              setTimeout(() => {
                console.log('🔄 Attempt 2: Applying image sizes from block data...');
                applyImageSizesFromBlockData();
              }, 800);
              setTimeout(() => {
                console.log('🔄 Attempt 3: Applying image sizes from block data...');
                applyImageSizesFromBlockData();
              }, 1500);
              setTimeout(() => {
                console.log('🔄 Attempt 4: Applying image sizes from block data...');
                applyImageSizesFromBlockData();
              }, 3000);
              
              // Additional aggressive approach - force apply dimensions after editor is fully loaded
              setTimeout(() => {
                console.log('🔄 Final attempt: Force applying image dimensions...');
                forceApplyImageDimensions();
              }, 5000);
            }
          }, 100);
        }, 300);
      }
    });

      editorRef.current = editor;
      console.log('✅ Editor created successfully:', !!editorRef.current);
      console.log('🔍 Editor holder element:', holderRef.current);
      console.log('🔍 Editor holder children:', holderRef.current?.children.length);
    }, 100); // Small delay to ensure DOM is ready

    return () => {
      clearTimeout(timer);
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
      }
      // Auto-save removed - no timeout to clear
    };
  }, [isPreviewMode, previewData, isLoadingContent, cid]);

  // Title saving removed - localStorage not used

  // Clear preview data when navigating to new post (no CID)
  useEffect(() => {
    const cidFromUrl = getCidFromUrl();
    if (!cidFromUrl) {
      console.log('🔍 New post detected - clearing all content');
      setPreviewData(null);
      setDocumentTitle('');
      setHasUnsavedChanges(false);
    }
  }, [cid]); // Run whenever CID changes

  // Set up comprehensive unsaved changes protection
  useEffect(() => {
    // Disable browser beforeunload warning - we handle this with our custom dialog
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Don't show browser warning - our custom dialog handles this better
      console.log('Beforeunload triggered - using custom dialog instead of browser warning');
    };

    // Removed aggressive visibility and focus handlers to prevent multiple dialogs

    // Detection for tab close attempts and save shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save shortcut (Ctrl/Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        console.log('Save shortcut triggered');
        saveToAPI();
        return;
      }
      
      // Detect Ctrl+W (close tab), Ctrl+Shift+W (close window), Alt+F4, Cmd+Q
      if (hasUnsavedChanges && !showUnsavedDialog) {
        const isCloseAttempt = 
          ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) || // Ctrl/Cmd+W
          ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'w' || e.key === 'W')) || // Ctrl/Cmd+Shift+W
          (e.altKey && e.key === 'F4') || // Alt+F4
          (e.metaKey && e.key === 'q'); // Cmd+Q on Mac
          
        if (isCloseAttempt) {
          console.log('Close attempt detected via keyboard shortcut - showing CUSTOM dialog only');
          e.preventDefault();
          setShowUnsavedDialog(true);
        }
      }
    };

    // Detect mouse movement towards close button area (experimental)
    // Removed aggressive mouse movement handler to prevent multiple dialogs

    // Add event listeners (simplified to prevent multiple dialogs)
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasUnsavedChanges, showUnsavedDialog]);

  // Idle timer removed - warning only shows when actually trying to navigate away

  // Check for changes when title changes
  useEffect(() => {
    const checkChanges = async () => {
      const hasChanges = await hasContentChanged();
      setHasUnsavedChanges(hasChanges);
    };
    checkChanges();
  }, [documentTitle]);

  // Handle navigation attempts from editor page - show warning dialog only when there are unsaved changes
  useEffect(() => {
    let dialogTimeout: NodeJS.Timeout | null = null;
    
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      
      // Only block navigation if there are unsaved changes and no dialog is already showing
      if (link && !link.hasAttribute('data-ignore-unsaved') && hasUnsavedChanges && !showUnsavedDialog) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Navigation attempt from editor with unsaved changes - showing save dialog');
        
        // Clear any existing timeout
        if (dialogTimeout) {
          clearTimeout(dialogTimeout);
        }
        
        // Add small delay to prevent rapid-fire dialogs
        dialogTimeout = setTimeout(() => {
          // Determine dialog type based on destination
          const href = (link as HTMLAnchorElement).href;
          const path = href.replace(window.location.origin, '');
          const isWriteNavigation = path === '/app/editor' || path.startsWith('/app/editor/');
          
          setDialogType(isWriteNavigation ? 'write' : 'other');
          setShowUnsavedDialog(true);
          setPendingNavigation(() => () => {
            // Use React Router navigate instead of window.location
            console.log('Link navigation function created, will navigate to:', path);
            
            // Check if navigating from existing post to new post
            const cidFromUrl = getCidFromUrl();
            const isNavigatingToNewPost = !path.includes('/editor/') && !path.includes('editor/');
            
            // Set flag if navigating from existing post to new post
            if (cidFromUrl && isNavigatingToNewPost) {
              sessionStorage.setItem('coming-from-existing-post', 'true');
            }
            
            // Clear localStorage before redirecting
            // localStorage removed - no need to clear
            // Use setTimeout to avoid React warning about updating during render
            setTimeout(() => {
              originalNavigate(path);
            }, 0);
          });
        }, 100);
      }
    };

    // Handle browser back/forward buttons - show dialog only when there are unsaved changes
    const handlePopState = (e: PopStateEvent) => {
      console.log('Browser navigation from editor', { hasUnsavedChanges });
      if (hasUnsavedChanges) {
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        // For popstate, we can't determine the exact destination, so default to 'other'
        setDialogType('other');
        setShowUnsavedDialog(true);
        setPendingNavigation(() => () => {
          // Check if navigating from existing post to new post
          const cidFromUrl = getCidFromUrl();
          const currentUrl = window.location.href;
          const isNavigatingToNewPost = !currentUrl.includes('/editor/') && !currentUrl.includes('editor/');
          
          // Set flag if navigating from existing post to new post
          if (cidFromUrl && isNavigatingToNewPost) {
            sessionStorage.setItem('coming-from-existing-post', 'true');
          }
          
          // Clear localStorage before redirecting
          // localStorage removed - no need to clear
          // Allow the navigation to proceed
          setTimeout(() => {
            window.history.back();
          }, 0);
        });
      }
      // If no unsaved changes, let the navigation proceed naturally
    };

    document.addEventListener('click', handleLinkClick, true); // Use capture phase
    window.addEventListener('popstate', handlePopState);
    
    // Push initial state to enable popstate detection
    window.history.pushState(null, '', window.location.href);
    
    return () => {
      if (dialogTimeout) {
        clearTimeout(dialogTimeout);
      }
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [originalNavigate, hasUnsavedChanges, showUnsavedDialog]); // Include all relevant dependencies


  const initializeImageResizing = () => {
    console.log('Initializing image resizing...');
    
    // Function to scan for all images and add resize handles
    const scanAndAddHandles = () => {
      if (!holderRef.current) return;
      
      const imageSelectors = [
        '.ce-image img',
        '.image-tool img', 
        '[data-tool="image"] img',
        '.ce-block img',
        'img'
      ];
      
      let foundImages = 0;
      const processedImages = new Set();
      
      imageSelectors.forEach(selector => {
        const images = holderRef.current!.querySelectorAll(selector);
        images.forEach(img => {
          // Use a unique identifier to avoid processing the same image twice
          const imgSrc = (img as HTMLImageElement).src || (img as HTMLImageElement).getAttribute('data-src') || img.outerHTML;
          const imgId = `${imgSrc}_${(img as HTMLImageElement).offsetWidth}_${(img as HTMLImageElement).offsetHeight}`;
          
          if (!processedImages.has(imgId) && !img.closest('.image-resize-wrapper')) {
            processedImages.add(imgId);
            addResizeHandles(img);
            
            // Apply saved size to this image
            const imageElement = img as HTMLImageElement;
            const imageId = getImageId(imageElement);
            // Image size management removed - localStorage not used
            // No stored sizes to apply
              imageElement.style.maxWidth = 'none';
            // console.log(`Applied saved size to new image ${imageId}:`, { width, height });
            
            foundImages++;
          }
        });
      });
      
      // console.log(`Scan found ${foundImages} new images to add handles to`);
      return foundImages;
    };
    
    // Efficient mutation observer that handles all changes without periodic scanning
    let mutationTimeout: NodeJS.Timeout | null = null;
    const throttledMutationHandler = (mutations: MutationRecord[]) => {
      if (mutationTimeout) return;
      
      mutationTimeout = setTimeout(() => {
        let hasImageChanges = false;
        let hasQuoteChanges = false;
        let hasCodeChanges = false;
        
        mutations.forEach((mutation) => {
          // Check for added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for images - more comprehensive detection
              if (element.querySelector('img') || element.tagName === 'IMG' || 
                  element.classList.contains('ce-image') || element.classList.contains('image-tool')) {
                hasImageChanges = true;
              }
              
              // Check for quotes
              if (element.querySelector('.cdx-quote') || element.classList.contains('cdx-quote') ||
                  element.querySelector('[data-tool="quote"]') || element.getAttribute('data-tool') === 'quote') {
                hasQuoteChanges = true;
              }
              
              // Check for code blocks
              if (element.querySelector('.ce-code') || element.classList.contains('ce-code') ||
                  element.querySelector('[data-tool="code"]') || element.getAttribute('data-tool') === 'code') {
                hasCodeChanges = true;
              }
            }
          });
          
          // Check for attribute changes that might affect images
          if (mutation.type === 'attributes') {
            const target = mutation.target as Element;
            
            if ((mutation.attributeName === 'src' || mutation.attributeName === 'class' || 
                 mutation.attributeName === 'style') &&
                (target.tagName === 'IMG' || target.querySelector('img') || 
                 target.classList.contains('ce-image') || target.classList.contains('image-tool'))) {
              hasImageChanges = true;
            }
          }
        });
        
        if (hasImageChanges) {
          // Process images immediately when detected
          setTimeout(() => {
            scanAndAddHandles();
            applySavedImageSizes();
            
            // For editing existing content, also apply block data sizes
            const cidFromUrl = getCidFromUrl();
            if (cidFromUrl) {
              // Only apply if we haven't already applied recently
              if (!imageSizeApplicationTimeout) {
                applyImageSizesFromBlockData();
              }
            }
          }, 50); // Faster response for images
        }
        
        if (hasQuoteChanges) {
          setTimeout(() => ensureQuoteCaptions(), 25);
        }
        
        if (hasCodeChanges) {
          setTimeout(() => autoResizeCodeBlocks(), 50);
        }
        
        mutationTimeout = null;
      }, 50); // Reduced throttle to 50ms for better responsiveness
    };

    // Observer to watch for new blocks (images, quotes, code blocks)
    const observer = new MutationObserver(throttledMutationHandler);

    // Start observing
    if (holderRef.current) {
      observer.observe(holderRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'class', 'style']
      });

      // Initial scan - only retry if no images found initially
      const initialScanWithRetry = (attempts = 0) => {
        const foundImages = scanAndAddHandles();
        applySavedImageSizes(); // Apply saved sizes to all images
        
        // If editing existing content, also apply sizes from block data
        const cidFromUrl = getCidFromUrl();
        if (cidFromUrl) {
          applyImageSizesFromBlockData();
        }
        
        // Only retry if no images were found and we haven't tried too many times
        if (foundImages === 0 && attempts < 3) {
          setTimeout(() => initialScanWithRetry(attempts + 1), 1000 * (attempts + 1));
        }
      };
      
      initialScanWithRetry();
      
      // No periodic scanning needed - mutation observer handles all changes
      // The mutation observer will detect new images and apply handles/sizes as needed
      
      // Initial quote caption setup with multiple attempts
      setTimeout(() => ensureQuoteCaptions(), 100);
      setTimeout(() => ensureQuoteCaptions(), 500);
      setTimeout(() => ensureQuoteCaptions(), 1000);
      setTimeout(() => ensureQuoteCaptions(), 2000);
      
      // Initial code block auto-resize setup
      setTimeout(() => autoResizeCodeBlocks(), 1000);
    }

    return () => observer.disconnect();
  };

  const addResizeHandles = (img: Element) => {
    const imageElement = img as HTMLImageElement;
    
    // Create a wrapper div specifically for the image and handles
    if (imageElement.parentElement?.classList.contains('image-resize-wrapper')) return;
    
    const wrapper = document.createElement('div');
    wrapper.className = 'image-resize-wrapper';
    
    // Insert wrapper and move image into it
    imageElement.parentElement?.insertBefore(wrapper, imageElement);
    wrapper.appendChild(imageElement);
    
    // Ensure image has proper styling for smooth resizing
    imageElement.style.display = 'block';
    imageElement.style.margin = '0';
    imageElement.style.padding = '0';
    imageElement.style.border = 'none';
    imageElement.style.outline = 'none';
    
    // console.log('Adding resize handles to image:', imageElement);

    // Create resize handles
    const leftHandle = document.createElement('div');
    leftHandle.className = 'resize-handle left';
    
    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle right';

    wrapper.appendChild(leftHandle);
    wrapper.appendChild(rightHandle);

     // Show handles on hover - multiple event targets
     const showHandles = () => {
       leftHandle.style.opacity = '1';
       rightHandle.style.opacity = '1';
     };
     
     const hideHandles = () => {
       leftHandle.style.opacity = '0';
       rightHandle.style.opacity = '0';
     };

     // Add hover events to wrapper and image
     wrapper.addEventListener('mouseenter', showHandles);
     wrapper.addEventListener('mouseleave', hideHandles);
     imageElement.addEventListener('mouseenter', showHandles);
     imageElement.addEventListener('mouseleave', hideHandles);

    // Add resize functionality using React state
    const startResize = (e: MouseEvent, handle: HTMLElement) => {
      const startX = e.clientX;
      const startWidth = imageElement.offsetWidth;
      const originalAspectRatio = imageElement.naturalWidth / imageElement.naturalHeight;
      
      // Update React state to trigger useEffect
      setResizeState({
        isResizing: true,
        activeImage: imageElement,
        startX,
        startWidth,
        originalAspectRatio,
        animationFrame: null,
        lastResizeTime: 0
      });
      
      // Disable all transitions and optimizations
      imageElement.style.transition = 'none';
      imageElement.style.willChange = 'width, height';
      imageElement.style.transform = 'translateZ(0)'; // Force hardware acceleration
      
      // Prevent text selection and other interactions
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
      document.body.style.pointerEvents = 'none';
      
      // Add class to wrapper for styling
      wrapper.classList.add('resizing');
      
      e.preventDefault();
      e.stopPropagation();
    };

    leftHandle.addEventListener('mousedown', (e) => startResize(e, leftHandle));
    rightHandle.addEventListener('mousedown', (e) => startResize(e, rightHandle));
  };

  const ensureQuoteCaptions = () => {
    if (!holderRef.current) return;

    // Target the exact quote caption elements
    const quoteCaptions = holderRef.current.querySelectorAll(
      '.cdx-input.cdx-quote__caption, .cdx-input[data-placeholder="Quote\'s author"]'
    );
    
    quoteCaptions.forEach(captionElement => {
      const htmlCaptionElement = captionElement as HTMLElement;
        
      // Ensure it has the proper styling and placeholder
      htmlCaptionElement.style.textAlign = 'right';
      htmlCaptionElement.style.fontStyle = 'italic';
      htmlCaptionElement.style.fontSize = '14px';
      htmlCaptionElement.style.color = '#666';
      htmlCaptionElement.style.border = 'none';
      htmlCaptionElement.style.outline = 'none';
      htmlCaptionElement.style.background = 'transparent';
      htmlCaptionElement.style.display = 'block';
      htmlCaptionElement.style.width = '100%';
      htmlCaptionElement.style.setProperty('margin', '8px 0 0 0', 'important');
      htmlCaptionElement.style.setProperty('padding', '0', 'important');
      htmlCaptionElement.style.setProperty('position', 'relative', 'important');
      htmlCaptionElement.style.setProperty('z-index', '1', 'important');
      
      // Add event listeners to maintain spacing on focus changes
      const enforceSpacing = () => {
        // Apply immediately without setTimeout for instant response
        htmlCaptionElement.style.setProperty('margin', '8px 0 0 0', 'important');
        htmlCaptionElement.style.setProperty('padding', '0', 'important');
        htmlCaptionElement.style.setProperty('position', 'relative', 'important');
        htmlCaptionElement.style.setProperty('z-index', '1', 'important');
      };
      
      // Remove existing listeners if they exist
      htmlCaptionElement.removeEventListener('focus', enforceSpacing);
      htmlCaptionElement.removeEventListener('blur', enforceSpacing);
      htmlCaptionElement.removeEventListener('input', enforceSpacing);
      
      // Add listeners to enforce spacing
      htmlCaptionElement.addEventListener('focus', enforceSpacing);
      htmlCaptionElement.addEventListener('blur', enforceSpacing);
      htmlCaptionElement.addEventListener('input', enforceSpacing);
      
      // Ensure placeholder is set
      htmlCaptionElement.setAttribute('data-placeholder', "Quote's author");
    });
  };

  const autoResizeCodeBlocks = () => {
    if (!holderRef.current) return;

    // Find all code block textareas with exact selectors
    const codeTextareas = holderRef.current.querySelectorAll(
      '.cdx-block.ce-code .ce-code__textarea.cdx-input, .ce-code__textarea.cdx-input'
    );

    codeTextareas.forEach(textarea => {
      const textareaElement = textarea as HTMLTextAreaElement;
      
      // Auto-resize function with aggressive styling override
      const autoResize = () => {
        // Reset height to get proper scrollHeight
        textareaElement.style.setProperty('height', 'auto', 'important');
        
        // Calculate new height
        const newHeight = Math.max(60, textareaElement.scrollHeight);
        
        // Set new height with important priority
        textareaElement.style.setProperty('height', `${newHeight}px`, 'important');
        
        // Also ensure overflow is hidden
        textareaElement.style.setProperty('overflow', 'hidden', 'important');
        textareaElement.style.setProperty('overflow-y', 'hidden', 'important');
      };

      // Initial resize
      autoResize();

      // Remove existing listeners to avoid duplicates
      textareaElement.removeEventListener('input', autoResize);
      textareaElement.removeEventListener('keyup', autoResize);
      textareaElement.removeEventListener('paste', autoResize);
      textareaElement.removeEventListener('change', autoResize);
      
      // Add event listeners for auto-resize
      textareaElement.addEventListener('input', autoResize);
      textareaElement.addEventListener('keyup', autoResize);
      textareaElement.addEventListener('change', autoResize);
      textareaElement.addEventListener('paste', () => {
        setTimeout(autoResize, 10); // Delay for paste content to be processed
      });

      // Force multiple resize attempts with delays to override EditorJS
      setTimeout(autoResize, 100);
      setTimeout(autoResize, 500);
      setTimeout(autoResize, 1000);
      
      // Monitor for changes in content
      const observer = new MutationObserver(() => {
        autoResize();
      });
      
      observer.observe(textareaElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });
  };

  return (
    <div className={`min-h-screen bg-background ${isPreviewMode ? 'preview-mode' : ''}`}>
      {/* Title input and auto-save indicator */}
      <div className="max-w-4xl mx-auto px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="text-5xl font-bold bg-transparent border-none outline-none flex-1 text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Untitled"
            disabled={isPreviewMode}
          />
        </div>

        {/* Tab Navigation */}
        <div className="mb-2">
          <nav className="flex justify-between items-center" aria-label="Tabs">
            <div className="flex items-center bg-gray-100 dark:bg-gray-900 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => {
                  if (isPreviewMode) {
                    setIsPreviewMode(false);
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  !isPreviewMode
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={togglePreview}
                className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  isPreviewMode
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
            </div>
            
          </nav>
        </div>
      </div>

      {/* Main editor or preview */}
      <div className="max-w-4xl mx-auto px-8 pb-64">
        <div className="tab-content">
          {isLoadingContent ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
              </div>
            </div>
          ) : isPreviewMode ? (
            <EditorPreview 
              data={previewData}
              className="min-h-[400px]"
            />
          ) : (
            <div 
              ref={holderRef}
              className="min-h-[400px] focus:outline-none"
              style={{
                minHeight: '400px'
              }}
            />
          )}
        </div>
      </div>

      {/* CSS for smooth image resizing and editor spacing */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .image-resize-wrapper {
            position: relative !important;
            display: inline-block !important;
            margin: 0 auto !important;
            overflow: hidden !important;
            contain: layout style !important;
          }
          
          .image-resize-wrapper.resizing {
            contain: layout style paint !important;
          }
          
          .image-resize-wrapper.resizing img {
            image-rendering: auto !important;
            backface-visibility: hidden !important;
            perspective: 1000px !important;
          }
          
          .resize-handle {
            position: absolute !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            width: 8px !important;
            height: 100px !important;
            background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%) !important;
            border: 2px solid #ffffff !important;
            border-radius: 4px !important;
            cursor: ew-resize !important;
            opacity: 0 !important;
            transition: opacity 0.2s ease !important;
            z-index: 10000 !important;
            pointer-events: auto !important;
            display: block !important;
            visibility: visible !important;
            box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5), 0 2px 8px rgba(0,0,0,0.3) !important;
          }
          
          .resize-handle.left {
            left: 2px !important;
          }
          
          .resize-handle.right {
            right: 2px !important;
          }
          
          .image-resize-wrapper:hover .resize-handle {
            opacity: 1 !important;
          }
          
          /* Keep EditorJS default spacing but remove extra margins */
          .codex-editor {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .codex-editor__redactor {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .ce-block__content {
            margin: 0 !important;
            padding: 0 !important;
          }
        `
      }} />

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {dialogType === 'write' ? 'Open New Editor?' : 'Leave Editor?'}
                </h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {dialogType === 'write' 
                  ? 'You are opening a new editor. Make sure to save your current changes to IPFS before proceeding. Your current work will be lost if you continue without saving.'
                  : 'You are about to leave the editor. Make sure to save your changes to IPFS before navigating away. Your work will be lost if you continue without saving.'
                }
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                {dialogType === 'write' ? 'Open Without Saving' : 'Leave Without Saving'}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isSaving ? 'Saving...' : (dialogType === 'write' ? 'Save & Open New' : 'Save & Leave')}
              </button>
            </div>
          </div>
        </div>
      )}


      </div>
  );
};

export default EditorPage;