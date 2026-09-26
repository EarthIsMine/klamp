import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type EIP1193Provider,
  type Hash,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import { sepolia } from "viem/chains";
import { RPC_URL } from "./config";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL, { retryCount: 1 }) });

export function walletClient(account: Address): WalletClient {
  if (!window.ethereum) throw new Error("No browser wallet found");
  return createWalletClient({ account, chain: sepolia, transport: custom(window.ethereum) });
}

/** Asks the wallet to switch to Sepolia before any signature. */
export async function ensureSepolia(wallet: WalletClient) {
  if ((await wallet.getChainId()) !== sepolia.id) await wallet.switchChain({ id: sepolia.id });
}

export type TxState =
  | { status: "idle" }
  | { status: "wallet"; label: string }
  | { status: "pending"; label: string; hash: Hash }
  | { status: "done"; label: string; hash: Hash; receipt: TransactionReceipt }
  | { status: "error"; label: string; message: string; hash?: Hash };

/** Sends one transaction and waits for its receipt, reporting each state. */
export async function sendTx(
  label: string,
  send: () => Promise<Hash>,
  onState: (state: TxState) => void,
): Promise<TransactionReceipt | null> {
  onState({ status: "wallet", label });
  let hash: Hash | undefined;
  try {
    hash = await send();
    onState({ status: "pending", label, hash });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") {
      onState({ status: "error", label, hash, message: "Reverted on chain" });
      return null;
    }
    onState({ status: "done", label, hash, receipt });
    return receipt;
  } catch (error) {
    onState({ status: "error", label, hash, message: errorText(error) });
    return null;
  }
}

/** Short reason for the UI: the custom error name for a revert, "Rejected in wallet", or viem's short message. */
export function errorText(error: unknown): string {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "Rejected in wallet";
    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) return revert.data?.errorName ?? revert.reason ?? "Reverted";
    return error.shortMessage;
  }
  return error instanceof Error ? error.message : String(error);
}

export const short = (value: string, head = 6, tail = 4) => `${value.slice(0, head)}…${value.slice(-tail)}`;
