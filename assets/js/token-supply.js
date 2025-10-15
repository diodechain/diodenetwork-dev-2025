// Shared functions to fetch token supply data from the Diode token contract
// Used by totalsupply.html, totalsupply_cg.html, circulatingsupply.html, and circulatingsupply_cg.html

const RPC_URL   = "https://rpc.api.moonbeam.network";
const CONTRACT  = "0x434116a99619f2B465A137199C38c1Aab0353913";
const DECIMALS  = 18n;
const TOTAL_SUPPLY_SELECTOR  = "0x18160ddd";                 // totalSupply()

export async function fetchTotalSupply() {
  const payload = {
    jsonrpc : "2.0",
    id      : 1,
    method  : "eth_call",
    params  : [{ to: CONTRACT, data: TOTAL_SUPPLY_SELECTOR }, "latest"]
  };

  const res   = await fetch(RPC_URL, {
    method  : "POST",
    headers : { "Content-Type": "application/json" },
    body    : JSON.stringify(payload)
  });
  const { result } = await res.json();
  return BigInt(result) / 10n ** DECIMALS;
}

export function fetchCirculatingSupply() {
  // Circulating supply is currently hardcoded based on manual calculations
  return Promise.resolve(187834n);

  // Epoch 678 + 2930 on 2025-10-15 + 45103.5 vestings = 187,834 -->
  // Epoch 677 + 3443 on 2025-09-15 = 139,800.5 -->
  // Epoch 676 + 2956.5 on 2025-08-18 = 136,357.5 -->
  // Epoch 675 + 3,009 on 2025-07-16 = 133,401 -->
  // Updating fine grained calcs on 2025-06-25 = 130,392 -->
  // Epoch 674 + 2,931.5 on 2025-06-25 = 108,705.5 -->
  // Start @ 105,774 -->
}
