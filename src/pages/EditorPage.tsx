import "../components/editor/Editor.css";
import { useState, useCallback, useEffect, useRef } from "react";
import { Edit3, Eye, BookOpen, ExternalLink } from 'lucide-react';
import Editor from "../components/editor/Editor";
import EditorTextParser from "../components/editor/EditorTextParser";
import { useAccount, useSignMessage, usePublicClient } from 'wagmi';
import { createGroupPost, updateFileById, useAddAsset, publishFile } from '@/services/dXService';
import { useToast } from '@/hooks/use-toast';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEditor } from '@/context/EditorContext';
import { PublishData } from '@/components/PublishOverlay';
import PublishProgressModal, { PublishStep } from '@/components/PublishProgressModal';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { dXmasterContract } from "@/contracts/dXmaster";

type EditorData = {
	time?: number;
	blocks?: any[];
	version?: string;
};

const EditorPage = () => {
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [data, setData] = useState<EditorData>({ blocks: [] });
	const [documentTitle, setDocumentTitle] = useState('');
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isPublishing, setIsPublishing] = useState(false);
	const [isLoadingContent, setIsLoadingContent] = useState(false);
	const [showPublishOverlay, setShowPublishOverlay] = useState(false);
	const [showNavigationDialog, setShowNavigationDialog] = useState(false);
	const [editorKey, setEditorKey] = useState(0);
	const editorInstanceRef = useRef<any>(null);
	const justSavedOrLoaded = useRef(false);
	const pendingNavigationRef = useRef<string | null>(null);
	const allowNavigationRef = useRef(false);
	
	// Publishing progress state
	const [publishStep, setPublishStep] = useState<PublishStep>('uploading');
	const [showProgressModal, setShowProgressModal] = useState(false);
	const [publishError, setPublishError] = useState<string>('');
	const [publishedAssetAddress, setPublishedAssetAddress] = useState<string>('');
	
	const { address } = useAccount();
	const { signMessageAsync } = useSignMessage();
	const publicClient = usePublicClient();
	const { toast } = useToast();
	const { cid } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { isAuthenticated } = useAuth();
	const { setEditorProps } = useEditor();
	const { addAsset, isPending: isContractPending, isConfirming: isContractConfirming, isConfirmed: isContractConfirmed, isError: isContractError, hash: txHash } = useAddAsset();

	// Load existing post content from IPFS when CID is present, or clear editor when no CID
	useEffect(() => {
		const loadExistingPost = async () => {
			if (!cid) {
				// Clear the editor when navigating to new post
				setData({ blocks: [] });
				setDocumentTitle('');
				setHasUnsavedChanges(false);
				justSavedOrLoaded.current = true;
				// Force remount of editor component by changing the key
				setEditorKey(prev => prev + 1);
				return;
			}
			
			setIsLoadingContent(true);
			try {
				const { fetchFileContentByCid } = await import('@/services/dXService');
				const contentData = await fetchFileContentByCid(cid);
				
				if (contentData) {
					try {
						const parsedResponse = typeof contentData === 'string' ? JSON.parse(contentData) : contentData;
						
						if (parsedResponse.content) {
							setData(parsedResponse.content);
							if (parsedResponse.title) {
								setDocumentTitle(parsedResponse.title);
							}
						} else {
							setData(contentData);
						}
					} catch (error) {
						setData(contentData);
					}
					// Reset unsaved changes flag after loading
					setHasUnsavedChanges(false);
					justSavedOrLoaded.current = true;
				}
			} catch (error) {
				console.error('Error loading content from IPFS:', error);
				toast({
					title: "Error",
					description: "Failed to load content from IPFS. Redirecting to editor...",
					variant: "destructive"
				});
				// Redirect to new editor page after a short delay
				setTimeout(() => {
					navigate('/app/editor');
				}, 1500);
			} finally {
				setIsLoadingContent(false);
			}
		};

		loadExistingPost();
	}, [cid, toast, navigate]);

	async function togglePreview() {
		// If switching to preview mode, save the current editor state first
		if (!isPreviewMode && editorInstanceRef.current) {
			try {
				const currentData = await editorInstanceRef.current.save();
				setData(currentData);
			} catch (error) {
				console.error('Error getting data from editor:', error);
			}
		}
		setIsPreviewMode(!isPreviewMode);
	}

	// Save content to IPFS
	const saveToAPI = useCallback(async () => {
		if (!address) {
			toast({
				title: "Error",
				description: "Please connect your wallet to save.",
				variant: "destructive"
			});
			return false;
		}

		// Since wallet connected = authenticated, no need for separate check
		setIsSaving(true);
		try {
			// Get the latest data from the editor before saving
			let currentData = data;
			if (editorInstanceRef.current) {
				try {
					currentData = await editorInstanceRef.current.save();
				} catch (error) {
					console.error('Error getting data from editor:', error);
				}
			}
			
			if (cid) {
				// Update existing post
				const result = await updateFileById(cid, currentData, documentTitle, address, signMessageAsync);
				const newCid = result?.upload?.cid || result?.cid || result?.data?.cid;
				
				if (newCid) {
					toast({
						title: "Success",
						description: "Content updated successfully!",
					});
					navigate(`/app/editor/${newCid}`);
				}
			} else {
				// Create new post
				const timestamp = Math.floor(Date.now() / 1000);
				const salt = `I want to create a new file at timestamp - ${timestamp}`;
				const signature = await signMessageAsync({ 
					message: salt,
					account: address as `0x${string}`
				});
				
				const result = await createGroupPost(currentData, documentTitle, address, signature, salt);
				const newCid = result?.updatedUpload?.cid || result?.cid || result?.data?.cid;
				
				if (newCid) {
					toast({
						title: "Success",
						description: "Content saved successfully!",
					});
					navigate(`/app/editor/${newCid}`);
				}
			}
			
			setHasUnsavedChanges(false);
			justSavedOrLoaded.current = true;
			return true;
		} catch (error: any) {
			console.error('Error saving:', error);
			toast({
				title: "Error",
				description: error.message || "Failed to save content.",
				variant: "destructive"
			});
			return false;
		} finally {
			setIsSaving(false);
		}
	}, [address, signMessageAsync, cid, data, documentTitle, toast, navigate]);

	// Track changes when data updates
	useEffect(() => {
		// Don't mark as unsaved while loading from IPFS
		if (isLoadingContent) return;
		
		// If we just saved or loaded, skip marking as unsaved this time
		if (justSavedOrLoaded.current) {
			justSavedOrLoaded.current = false;
			return;
		}
		
		// Mark as unsaved when there are actual changes
		const hasContent = data?.blocks?.length || documentTitle;
		if (hasContent) {
			setHasUnsavedChanges(true);
		}
	}, [data, documentTitle, isLoadingContent]);

	// Prevent browser unload when there are unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges && !allowNavigationRef.current) {
				e.preventDefault();
				e.returnValue = '';
				return '';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [hasUnsavedChanges]);

	// Intercept navigation by clicking links
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (!hasUnsavedChanges || allowNavigationRef.current) return;

			// Check if click is on a link or inside a link
			let target = e.target as HTMLElement;
			let link: HTMLAnchorElement | null = null;

			// Traverse up to find an anchor tag
			while (target && target !== document.body) {
				if (target.tagName === 'A') {
					link = target as HTMLAnchorElement;
					break;
				}
				target = target.parentElement as HTMLElement;
			}

			if (link && link.href) {
				const linkUrl = new URL(link.href);
				const currentUrl = new URL(window.location.href);

				// Only intercept same-origin navigations that change the path
				if (linkUrl.origin === currentUrl.origin && linkUrl.pathname !== currentUrl.pathname) {
					e.preventDefault();
					e.stopPropagation();
					pendingNavigationRef.current = linkUrl.pathname;
					setShowNavigationDialog(true);
				}
			}
		};

		document.addEventListener('click', handleClick, true);
		return () => document.removeEventListener('click', handleClick, true);
	}, [hasUnsavedChanges]);

	// Handle navigation dialog actions
	const handleSaveAndLeave = async () => {
		const saved = await saveToAPI();
		if (saved && pendingNavigationRef.current) {
			allowNavigationRef.current = true;
			setHasUnsavedChanges(false);
			navigate(pendingNavigationRef.current);
			setTimeout(() => {
				allowNavigationRef.current = false;
			}, 100);
			pendingNavigationRef.current = null;
		}
		setShowNavigationDialog(false);
	};

	const handleDiscardAndLeave = () => {
		if (pendingNavigationRef.current) {
			allowNavigationRef.current = true;
			setHasUnsavedChanges(false);
			navigate(pendingNavigationRef.current);
			setTimeout(() => {
				allowNavigationRef.current = false;
			}, 100);
			pendingNavigationRef.current = null;
		}
		setShowNavigationDialog(false);
	};

	const handleCancelNavigation = () => {
		pendingNavigationRef.current = null;
		setShowNavigationDialog(false);
	};

	// Check if editor is empty
	const isEmpty = !documentTitle.trim() && (!data?.blocks || data.blocks.length === 0);

	// Monitor transaction hash (transaction submitted to wallet)
	useEffect(() => {
		if (txHash && isPublishing && publishStep === 'signing') {
			setPublishStep('confirming');
		}
	}, [txHash, isPublishing, publishStep]);

	// Monitor contract transaction confirmation and extract asset address
	useEffect(() => {
		const handleConfirmation = async () => {
			if (isContractConfirmed && isPublishing && cid) {
				try {
					// Use the contract's assetData mapping to get asset address by CID
					// This is more reliable than trying to decode event logs
					const assetAddress = await publicClient?.readContract({
						address: dXmasterContract.address as `0x${string}`,
						abi: dXmasterContract.abi,
						functionName: 'assetData',
						args: [cid],
					}) as string;

					if (assetAddress && assetAddress !== '0x0000000000000000000000000000000000000000') {
						setPublishedAssetAddress(assetAddress);
						setPublishStep('completed');
						setIsPublishing(false);
						console.log('✅ Published asset address:', assetAddress);
					} else {
						// Fallback: show success without redirect
						console.warn('Asset address not found in contract');
						setPublishStep('completed');
						setIsPublishing(false);
					}
				} catch (error) {
					console.error('Error fetching asset address:', error);
					// Still show success even if we couldn't get the address
					setPublishStep('completed');
					setIsPublishing(false);
				}
			}
		};

		handleConfirmation();
	}, [isContractConfirmed, isPublishing, cid, publicClient]);

	// Monitor contract transaction errors
	useEffect(() => {
		if (isContractError && isPublishing) {
			setPublishStep('error');
			setPublishError('The blockchain transaction failed. Please try again.');
			setIsPublishing(false);
		}
	}, [isContractError, isPublishing]);

	// Safety timeout - reset publishing state after 5 minutes if stuck
	useEffect(() => {
		if (isPublishing) {
			const timeout = setTimeout(() => {
				console.warn('Publishing timeout - resetting state');
				setPublishStep('error');
				setPublishError('Publishing took too long. Please check your transaction and try again if needed.');
				setIsPublishing(false);
			}, 5 * 60 * 1000); // 5 minutes

			return () => clearTimeout(timeout);
		}
	}, [isPublishing]);

	// Publish with data from overlay (with thumbnail upload)
	const publishWithData = useCallback(async (publishData: PublishData) => {
		if (!address) {
			toast({
				title: "Error",
				description: "Please connect your wallet to publish.",
				variant: "destructive"
			});
			return false;
		}

		if (!cid) {
			toast({
				title: "Error",
				description: "Please save your content first before publishing.",
				variant: "destructive"
			});
			return false;
		}

		// Since wallet connected = authenticated, no need for separate check

		// Reset state and show progress modal
		setIsPublishing(true);
		setPublishStep('uploading');
		setPublishError('');
		setPublishedAssetAddress('');
		setShowProgressModal(true);
		setShowPublishOverlay(false);

		try {
			const timestamp = Math.floor(Date.now() / 1000);
			
			// Convert price to wei (assuming 18 decimals for ETH)
			const priceInWei = (parseFloat(publishData.price || '0') * Math.pow(10, 18)).toString();
			
			// Step 1: Upload thumbnail image to get thumbnail CID
			let thumbnailCid = "";
			if (publishData.thumbnail) {
				try {
					const result = await publishFile(publishData.thumbnail, address, signMessageAsync, cid);
					thumbnailCid = result.thumbnailCid;
					console.log('✅ Thumbnail uploaded successfully:', thumbnailCid);
				} catch (uploadError) {
					console.error('❌ Error uploading thumbnail:', uploadError);
					setPublishStep('error');
					setPublishError('Failed to upload thumbnail image. Please try again.');
					setIsPublishing(false);
					return false;
				}
			}
			
			// Step 2: Call the smart contract to add the asset to blockchain
			try {
				setPublishStep('signing');
				
				await addAsset({
					salt: timestamp.toString(16),
					assetTitle: documentTitle,
					assetCid: cid,
					thumbnailCid: thumbnailCid,
					description: publishData.description || "",
					costInNative: priceInWei
				});
				
				// Transaction submitted - wait for confirmation via useEffect
				return true;
				
			} catch (contractError: any) {
				console.error('❌ Error calling addAsset contract:', contractError);
				const errorMsg = contractError.message?.includes('user rejected') 
					? 'Transaction was rejected by user.'
					: 'Failed to publish to blockchain. Please try again.';
				
				setPublishStep('error');
				setPublishError(errorMsg);
				setIsPublishing(false);
				return false;
			}
			
		} catch (error: any) {
			console.error('Error publishing:', error);
			const errorMessage = error.message || "Failed to publish content.";
			setPublishStep('error');
			setPublishError(errorMessage);
			setIsPublishing(false);
			return false;
		}
	}, [address, cid, documentTitle, addAsset, signMessageAsync, toast]);

	// Simple publish without overlay (no thumbnail/price/description) - kept for backward compatibility
	const publishToAPI = useCallback(async () => {
		// Just call publishWithData with empty values
		return await publishWithData({
			thumbnail: null,
			description: "",
			price: "0"
		});
	}, [publishWithData]);

	// Close progress modal and reset state
	const handleCloseProgressModal = useCallback(() => {
		setShowProgressModal(false);
		setPublishStep('uploading');
		setPublishError('');
	}, []);

	// Set editor props in context for TopHeader
	useEffect(() => {
		setEditorProps({
			onSave: saveToAPI,
			onPublish: publishToAPI,
			onPublishWithData: publishWithData,
			isSaving,
			isPublishing,
			isAuthenticated,
			hasUnsavedChanges,
			isEmpty,
			showPublishOverlay,
			setShowPublishOverlay,
		});
	}, [isSaving, isPublishing, isAuthenticated, hasUnsavedChanges, isEmpty, saveToAPI, publishToAPI, publishWithData, showPublishOverlay, setEditorProps]);

	return (
		<div className="bg-white dark:bg-gray-950 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto w-full">
				{/* Tutorial Banner */}
				<div className="mb-6 max-w-6xl mx-auto">
					<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 p-4 sm:p-6 border border-border/50 dark:border-border dark:shadow-lg dark:shadow-primary/5">
						{/* Background Pattern */}
						<div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))] dark:bg-grid-slate-400/10" />
						
						<div className="relative z-10">
							<div className="flex items-start gap-2 sm:gap-4">
								<div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 shadow-lg flex-shrink-0">
									<BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
								</div>
								<div className="flex-1 min-w-0">
									<h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-1 sm:mb-1.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 dark:from-indigo-300 dark:via-blue-300 dark:to-cyan-300 bg-clip-text text-transparent">
										Create Your Post
									</h2>
									<p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-medium mb-1 sm:mb-1.5">
										Write, format, and publish your content. <span className="text-foreground font-semibold">Monetize your knowledge</span>
									</p>
									<div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base text-muted-foreground/80 font-medium">
										{/* <span>Need help getting started?</span> */}
										<a 
											href="https://decentralizedx.gitbook.io/dx/tutorials/creating-first-post" 
											target="_blank" 
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold hover:underline transition-colors"
										>
											Read the tutorial
											<ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Scroll Container */}
				<div className="scroll-container">
					{/* Top Wooden Handle */}
					<div className="wooden-handle wooden-handle-top">
						<div className="handle-rod"></div>
						<div className="handle-knob handle-knob-left"></div>
						<div className="handle-knob handle-knob-right"></div>
					</div>

					{/* Paper Roll - Top */}
					<div className="paper-roll paper-roll-top"></div>

					{/* Parchment Paper - Content Area */}
					<div className="parchment-paper">
						<div className="parchment-content">
							{/* Title input */}
							<div className="mb-6">
								<input
									type="text"
									value={documentTitle}
									onChange={(e) => setDocumentTitle(e.target.value)}
									className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-transparent border-none outline-none w-full text-black dark:text-white placeholder-gray-400 focus:ring-0"
									placeholder="Give your post a title..."
									disabled={isPreviewMode}
								/>
							</div>

							{/* Tab Navigation */}
							<div className="mb-6">
								<nav className="flex justify-end items-center" aria-label="Tabs">
									{/* Edit/Preview Toggle */}
									<div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 shadow-sm">
										<button
											onClick={() => {
												if (isPreviewMode) {
													setIsPreviewMode(false);
												}
											}}
											className={`flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
												!isPreviewMode
													? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-500'
													: 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-600/50'
											}`}
										>
											<Edit3 className="w-4 h-4" />
											<span className="hidden sm:inline">Edit</span>
										</button>
										<button
											onClick={togglePreview}
											className={`flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
												isPreviewMode
													? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-500'
													: 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-600/50'
											}`}
										>
											<Eye className="w-4 h-4" />
											<span className="hidden sm:inline">Preview</span>
										</button>
									</div>
								</nav>
							</div>

							{/* Editor/Preview Content */}
							<div className="min-h-[300px] sm:min-h-[500px] w-full">
								{isLoadingContent ? (
									<div className="flex items-center justify-center py-12">
										<div className="text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
											<p className="text-gray-600 dark:text-gray-400">Loading content...</p>
										</div>
									</div>
								) : isPreviewMode ? (
									<EditorTextParser data={data} />
								) : (
									<Editor 
										key={cid || `new-${editorKey}`} 
										data={data} 
										setData={setData}
										editorInstanceRef={editorInstanceRef}
									/>
								)}
							</div>
						</div>
					</div>

					{/* Paper Roll - Bottom */}
					<div className="paper-roll paper-roll-bottom"></div>

					{/* Bottom Wooden Handle */}
					<div className="wooden-handle wooden-handle-bottom">
						<div className="handle-rod"></div>
						<div className="handle-knob handle-knob-left"></div>
						<div className="handle-knob handle-knob-right"></div>
					</div>
				</div>
			</div>

			{/* Unsaved Changes Warning Dialog */}
			<AlertDialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
						<AlertDialogDescription>
							You have unsaved changes. What would you like to do?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex-col sm:flex-row gap-2">
						<AlertDialogCancel onClick={handleCancelNavigation} className="sm:order-1">
							Stay on Page
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDiscardAndLeave}
							className="bg-red-600 hover:bg-red-700 sm:order-2"
						>
							Discard Changes
						</AlertDialogAction>
						<AlertDialogAction
							onClick={handleSaveAndLeave}
							disabled={isSaving}
							className="bg-blue-600 hover:bg-blue-700 sm:order-3"
						>
							{isSaving ? 'Saving...' : 'Save & Leave'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Publish Progress Modal */}
			<PublishProgressModal
				isOpen={showProgressModal}
				currentStep={publishStep}
				txHash={txHash}
				error={publishError}
				onClose={handleCloseProgressModal}
				assetAddress={publishedAssetAddress}
			/>
		</div>
	);
};

export default EditorPage;