import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import HomePage from "@/pages/HomePage";
import { PostInfoPage } from "@/pages/PostInfoPage";
import { MyPostsPage } from "@/pages/MyPostsPage";
import { AnnouncementPage } from "@/pages/AnnouncementPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { DraftsPage } from "@/pages/DraftsPage";
import NotFound from "@/pages/NotFound";
import EditorPage from "@/pages/editor";

import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';

import { sepolia } from "wagmi/chains"
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'dX',
  projectId: import.meta.env.VITE_WAGMI_PROJECT_ID,
  chains: [sepolia],
  ssr: false, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

const App = () => (
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <TooltipProvider>
          <BrowserRouter>
            <AppLayout>
              <Sonner position="top-right" />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/app" element={<HomePage />} />
                <Route path="/app/post/:id" element={<PostInfoPage />} />
                <Route path="/app/my-posts" element={<MyPostsPage />} />
                <Route path="/app/drafts" element={<DraftsPage />} />
                <Route path="/app/announcements" element={<AnnouncementPage />} />
                <Route path="/app/library" element={<LibraryPage />} />
                <Route path="/app/editor/:cid?" element={<EditorPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default App;