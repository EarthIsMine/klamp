import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CONTRACTS, EXPLORER, NETWORK } from "../lib/config";
import { readSeal, type Seal } from "../lib/seal";

type Tone = "ok" | "kept" | "open";

/**
 * Header status like a dApp's security badge: is the canonical-pool namespace still sealed?
 * Opens a panel with the live ENSv2 role counts behind that answer.
 */
export function SealBadge() {
  const [seal, setSeal] = useState<Seal | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    readSeal().then(setSeal).catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const key = (name: string) => seal?.keys.find((entry) => entry.key === name);
  const rows: { label: string; value: string; tone: Tone; href?: string }[] = seal ? [
    { label: "pool record", value: key("pool")?.registrarOnly ? "registrar only" : `${key("pool")?.writers} writers`, tone: key("pool")?.registrarOnly ? "ok" : "open", href: `${EXPLORER}/address/${CONTRACTS.registrar}#code` },
    { label: "description · url", value: key("description")?.registrarOnly && key("url")?.registrarOnly ? "creator, via registrar" : "open", tone: key("description")?.registrarOnly && key("url")?.registrarOnly ? "ok" : "open" },
    { label: "other keys (avatar)", value: `${key("avatar")?.writers} writers`, tone: key("avatar")?.writers === 0 ? "ok" : "open" },
    { label: "resolver admins", value: `${seal.resolverRootRoles} · no upgrade`, tone: seal.resolverRootRoles === 0 ? "ok" : "open", href: `${EXPLORER}/address/${NETWORK.resolver}` },
    { label: "tokens.klamp.eth", value: `${seal.tokensRoles} roles · ${seal.tokensNeverExpires ? "no expiry" : "expires"}`, tone: seal.tokensRoles === 0 && seal.tokensNeverExpires ? "ok" : "open", href: "https://explorer.ens.dev/tokens.klamp.eth" },
    { label: "klamp.eth", value: `${seal.klampRoles} roles · until ${seal.klampExpiryYear}`, tone: seal.klampRoles === 0 ? "ok" : "open", href: "https://explorer.ens.dev/klamp.eth" },
    { label: "registry", value: `REGISTRAR ×${seal.registryRegistrar} + admin ×${seal.registryRegistrarAdmin} · hooks.klamp.eth`, tone: seal.registryOtherRoles === 0 ? "kept" : "open" },
  ] : [];
  const sealed = seal !== null && rows.every((row) => row.tone !== "open");

  return (
    <div className="seal" ref={ref}>
      <button className={`seal-pill ${failed ? "seal-failed" : sealed ? "seal-ok" : seal ? "seal-open" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="seal-dot" />
        {failed ? "Seal unknown" : !seal ? "Checking ENS…" : sealed ? "Records locked" : "Records writable"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="seal-panel" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            <div className="seal-head">
              <strong>Who can change a canonical pool?</strong>
              <span>{seal ? `ENSv2 roles · live #${seal.blockNumber}` : failed ? "Read failed. Retry later." : "Reading…"}</span>
            </div>
            {rows.map((row, index) => (
              <motion.div key={row.label} className={`seal-row seal-${row.tone}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                <span className="seal-icon">{row.tone === "ok" ? "✓" : row.tone === "kept" ? "!" : "✕"}</span>
                <span className="seal-label">{row.href ? <a href={row.href} target="_blank" rel="noreferrer">{row.label}</a> : row.label}</span>
                <span className="seal-value">{row.value}</span>
              </motion.div>
            ))}
            {seal && <p className="seal-note">Only the registrar writes records, and only after the issuer proof. Two registry roles are left, REGISTRAR and its admin, both ours, to add hooks.klamp.eth in stage 2. Neither can replace tokens.klamp.eth.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
