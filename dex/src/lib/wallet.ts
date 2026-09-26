import { useCallback, useEffect, useState } from "react";
import { getAddress, type Address } from "viem";
import { sepolia } from "viem/chains";
import { publicClient } from "./chain";

export type Wallet = {
  account: Address | null;
  onSepolia: boolean;
  eth: bigint | null;
  available: boolean;
  connect: () => Promise<void>;
  refresh: () => void;
};

/** Injected wallet (MetaMask or any EIP-1193 extension). Reads go through the public RPC, signatures through the wallet. */
export function useWallet(): Wallet {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [eth, setEth] = useState<bigint | null>(null);
  const [tick, setTick] = useState(0);
  const available = typeof window !== "undefined" && Boolean(window.ethereum);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const onAccounts = (accounts: string[]) => setAccount(accounts[0] ? getAddress(accounts[0]) : null);
    const onChain = (id: string) => setChainId(Number(id));
    provider.request({ method: "eth_accounts" }).then(onAccounts).catch(() => undefined);
    provider.request({ method: "eth_chainId" }).then(onChain).catch(() => undefined);
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, []);

  useEffect(() => {
    if (!account) return setEth(null);
    let live = true;
    publicClient.getBalance({ address: account }).then((value) => live && setEth(value)).catch(() => undefined);
    return () => { live = false; };
  }, [account, tick]);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) return;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0] ? getAddress(accounts[0]) : null);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${sepolia.id.toString(16)}` }] });
    } catch {
      // The user can still switch by hand; every transaction checks the chain again.
    }
  }, []);

  const refresh = useCallback(() => setTick((value) => value + 1), []);
  return { account, onSepolia: chainId === sepolia.id, eth, available, connect, refresh };
}
