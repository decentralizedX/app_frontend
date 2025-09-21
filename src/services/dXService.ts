import { maxterdXConfig } from "@/contracts/MasterdX";
import { useWriteContract, useAccount, useWaitForTransactionReceipt, useReadContract  } from "wagmi";
import { sepolia } from "wagmi/chains";
import { useState, useEffect } from "react";
import { CommentWithPostTitle } from "@/types";
import { apiService } from "./httpClient";
import { authService } from "./authService";
import { handleCreateGroup, handleUpload } from "./pinataService";

// API Service for posting to group endpoint with proper content upload
export const createGroupPost = async (content: any, title: string, address: string, signature: string, salt: string) => {
  try {
    const groupName = `${title}_${salt}`.slice(0, 50); // Limit to 50 chars
    console.log('🏗️ Creating group:', groupName);
    
    const contentJson = JSON.stringify({
      title,
      content,
    }, null, 2);

    console.log('📦 Content JSON:', contentJson);

    const payload = {
      salt,
      address,
      signature,
      content: contentJson
    };

    const response = await fetch('http://localhost:8888/create/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Content uploaded successfully!');
    
    return {
      ...result,
    };
  } catch (error) {
    console.error('❌ Error in createGroupPost:', error);
    throw error;
  }
};

export const useAddPost = () => {
  const { address } = useAccount();
  const { writeContract, isPending, isSuccess, isError, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const addPost = async (postData: { postId: string, postTitle: string, postCid: string, imageCid: string }) => {
    if (!address) {
      throw new Error("No account connected");
    }

    try {
      await writeContract({
        address: maxterdXConfig.address as `0x${string}`,
        abi: maxterdXConfig.abi,
        functionName: 'addPost',
        args: [postData.postId as `0x${string}`, postData.postTitle, postData.postCid, postData.imageCid],
        account: address,
        chain: sepolia,
      });

    } catch (error: any) {
      console.error("Error in addPost:", error);
      // Handle specific mobile wallet errors
      if (error.message?.includes("user rejected")) {
        throw new Error("Transaction was rejected by user");
      }
      throw error;
    }
  };

  return {
    addPost,
    isPending,
    isSuccess,
    isError,
    isConfirming,
    isConfirmed,
    hash
  };
};

export const useAddComment = () => {
  const { address } = useAccount();
  const { writeContract, isPending, isSuccess, isError, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const addComment = async (commentData: { postId: string, commentCid: string }) => {
    if (!address) {
      throw new Error("No account connected");
    }

    try {
      await writeContract({
        address: maxterdXConfig.address as `0x${string}`,
        abi: maxterdXConfig.abi,
        functionName: 'addComment',
        args: [commentData.postId as `0x${string}`, commentData.commentCid],
        account: address,
        chain: sepolia,
      });

    } catch (error: any) {
      console.error("Error in addComment:", error);
      // Handle specific mobile wallet errors
      if (error.message?.includes("user rejected")) {
        throw new Error("Transaction was rejected by user");
      }
      throw error;
    }
  };

  return {
    addComment,
    isPending,
    isSuccess,
    isError,
    isConfirming,
    isConfirmed,
    hash
  };
};

// API function to fetch file content by CID (with JWT authentication)
export const fetchFileContentByCid = async (cid: string): Promise<any> => {
  try {
    console.log('📄 Fetching file content for CID:', cid);
    
    // Make authenticated API call to get file content by CID
    const data = await apiService.get(`/fileByCid?cid=${cid}`);
    
    // Check if the response has the content nested under a specific key
    if (data && typeof data === 'object') {
      if (data.content) {
        return data.content;
      } else if (data.file) {
        return data.file;
      } else if (data.data) {
        return data.data;
      }
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching file content for CID:', cid, error);
    throw error;
  }
};

// API function to delete a file by CID (with authentication)
export const deleteFileById = async (cid: string, address: string, signMessage: any): Promise<any> => {
  try {
    console.log('🗑️ Starting file deletion process for CID:', cid);
    
    // Generate salt (current timestamp in seconds)
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = `I want to delete my file ${cid} at timestamp - ${timestamp}`;
    
    console.log('🔐 Generated salt for deletion:', salt);
    console.log('📝 User address:', address);
    
    // Sign the salt with wallet
    console.log('✍️ Requesting signature from wallet...');
    const signature = await signMessage({ 
      message: salt,
      account: address as `0x${string}`
    });
    
    console.log('✅ Signature received for deletion');
    
    // Prepare the deletion payload
    const payload = {
      salt,
      address,
      signature
    };
    
    console.log('📡 Sending deletion request for CID:', cid);
    console.log('📦 Deletion payload:', payload);
    
    // Make authenticated API call to delete the file
    const response = await fetch(`http://localhost:8888/delete/file?cid=${cid}`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📥 Deletion API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Deletion API error response:', errorText);
      throw new Error(`Failed to delete file: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ File deleted successfully:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error deleting file for CID:', cid, error);
    throw error;
  }
};

// API function to update a file by CID (with authentication)
export const updateFileById = async (cid: string, content: any, title: string, address: string, signMessage: any): Promise<any> => {
  try {
    console.log('🔄 Starting file update process for CID:', cid);
    console.log('   - Title:', title);
    console.log('   - Content structure:', Object.keys(content || {}));
    
    // Generate salt (current timestamp in seconds)
    const timestamp = Math.floor(Date.now() / 1000);
    const salt = `I want to update file ${cid} at timestamp - ${timestamp}`;
    
    console.log('🔐 Generated salt for update:', salt);
    console.log('📝 User address:', address);
    
    // Sign the salt with wallet
    console.log('✍️ Requesting signature from wallet...');
    const signature = await signMessage({ 
      message: salt,
      account: address as `0x${string}`
    });
    
    console.log('✅ Signature received for update');
    
    // Prepare the update payload with content
    const payload = {
      salt,
      address,
      signature,
      content: JSON.stringify({
        title,
        content
      }, null, 2)
    };
    
    console.log('📡 Sending update request for CID:', cid);
    console.log('📦 Update payload (content length):', payload.content.length, 'characters');
    
    
    // Make authenticated API call to update the file
    const response = await fetch(`http://localhost:8888/update/file?cid=${cid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authService.getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log('📥 Update API response status:', response.status);
    console.log('📥 Update API response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update API error response:', errorText);
      console.error('❌ Update API error status:', response.status);
      console.error('❌ Update API error statusText:', response.statusText);
      throw new Error(`Failed to update file: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ File updated successfully!');
    console.log('🔍 Update API Response Details:');
    console.log('   - Response type:', typeof result);
    console.log('   - Response keys:', Object.keys(result || {}));
    console.log('   - Full response:', result);
    console.log('   - CID field:', result?.cid);
    console.log('   - UpdatedUpload field:', result?.updatedUpload);
    console.log('   - UpdatedUpload CID:', result?.updatedUpload?.cid);
    console.log('   - Data field:', result?.data);
    console.log('   - Data CID:', result?.data?.cid);
    console.log('   - IPFS Hash:', result?.ipfsHash);
    console.log('   - Hash:', result?.hash);
    
    return result;
  } catch (error) {
    console.error('❌ Error updating file for CID:', cid, error);
    throw error;
  }
};

// API function to fetch saved posts for a specific owner with full content
export const fetchSavedPosts = async (owner: string): Promise<any[]> => {
  try {
    console.log('📡 Fetching saved posts for owner:', owner);
    
    // Check if JWT token exists, if not, throw error
    if (!authService.isAuthenticated()) {
      console.log('🔐 No valid JWT token found, authentication required');
      throw new Error('Authentication required. Please sign in first.');
    }

    // Make authenticated API call to fetch saved posts
    const response = await apiService.get(`/pendingFilesByOwner?owner=${owner}`);
    
    console.log('✅ Saved posts fetched successfully:', response);
    
    // If response is an array, iterate over each file to get content
    const savedFiles = Array.isArray(response) ? response : (response.files || []);
    
    if (savedFiles.length === 0) {
      console.log('📝 No saved files found');
      return [];
    }

    console.log(`🔄 Processing ${savedFiles.length} saved files...`);
    
    // Fetch content for each file by CID
    const savedPostsWithContent = await Promise.allSettled(
      savedFiles.map(async (file: any) => {
        try {
          if (!file.cid) {
            console.warn('⚠️ File missing CID:', file);
            return {
              ...file,
              content: null,
              contentError: 'Missing CID'
            };
          }

          // Fetch the actual file content
          const contentData = await fetchFileContentByCid(file.cid);
          
          return {
            ...file,
            content: contentData,
            contentError: null
          };
        } catch (error) {
          console.error(`❌ Failed to fetch content for CID ${file.cid}:`, error);
          return {
            ...file,
            content: null,
            contentError: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // Filter successful results and log any failures
    const processedPosts = savedPostsWithContent
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`❌ Failed to process saved post ${index}:`, result.reason);
          return null;
        }
      })
      .filter(Boolean);

    console.log(`✅ Successfully processed ${processedPosts.length} saved posts with content`);
    return processedPosts;
    
  } catch (error) {
    console.error('❌ Error fetching saved posts:', error);
    throw error;
  }
};

export const useGetUserComments = (owner: string) => {
  const { data: numOfPosts } = useReadContract({
    address: maxterdXConfig.address as `0x${string}`,
    abi: maxterdXConfig.abi,
    functionName: 'totalPosts',
  });

  const [userComments, setUserComments] = useState<CommentWithPostTitle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: postId } = useReadContract({
    address: maxterdXConfig.address as `0x${string}`,
    abi: maxterdXConfig.abi,
    functionName: 'postIds',
    args: [BigInt(currentIndex)],
  });

  const { data: postInfo } = useReadContract({
    address: maxterdXConfig.address as `0x${string}`,
    abi: maxterdXConfig.abi,
    functionName: 'getPostInfo',
    args: [postId],
  });

  const { data: commentInfos } = useReadContract({
    address: maxterdXConfig.address as `0x${string}`,
    abi: maxterdXConfig.abi,
    functionName: 'getCommentsInfo',
    args: [postId],
  });

  useEffect(() => {
    if (!numOfPosts || !owner || !commentInfos || !postId) return;

    // Process comments for the current post
    commentInfos.forEach((commentInfo: any) => {
      const { postId: commentPostId, commentcid, owner: commentOwner } = commentInfo;
      if (commentOwner && commentOwner.toLowerCase() === owner.toLowerCase()) {
        setUserComments(prev => [
          ...prev,
          {
            postId: commentPostId,
            commentCid: commentcid,
            owner: commentOwner,
            postTitle: postInfo?.postTitle,
          },
        ]);
      }
    });

    // Move to next post if we've processed all comments
    if (currentIndex < Number(numOfPosts) - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [commentInfos, currentIndex, numOfPosts, owner, postId]);

  return {
    comments: userComments,
    isLoading: !numOfPosts,
  };
};