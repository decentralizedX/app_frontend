/// <reference types="vite/client" />

interface ViteTypeOptions {
    // By adding this line, you can make the type of ImportMetaEnv strict
    // to disallow unknown keys.
    // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_WAGMI_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// MetaMask Ethereum types
interface EthereumRequest {
  method: string;
  params?: any[];
}

interface Ethereum {
  request: (args: EthereumRequest) => Promise<any>;
  isMetaMask?: boolean;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Ethereum;
  }
} 