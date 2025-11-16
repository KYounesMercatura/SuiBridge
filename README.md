# Sui ⇄ ICP Native Bridge (Experimental)

This repository contains an experimental native bridge between the Internet Computer (ICP) and the Sui blockchain.

At a high level:

- An ICP canister uses **chain key ECDSA** to derive Sui compatible secp256k1 keys.
- The canister can:
  - Derive a **Sui address for the canister itself**.
  - Derive a **unique Sui address per Internet Identity principal**.
  - Sign Sui transactions on behalf of the canister or the user.
- A React frontend shows the user:
  - Their ICP principal.
  - Their derived Sui address.
  - Dummy multichain previews (Aptos and Cardano) for education.
  - A **Send SUI** demo that builds a Sui transfer locally, signs it through the ICP canister, then broadcasts it to Sui.

> ⚠️ This is research and demo code. It is not audited and must not be used to secure real value in production.

---

## Features

- **Native cryptographic bridge**  
  No off chain relayer, no separate bridge operator. Signatures are produced inside ICP using threshold ECDSA and are accepted by Sui validators as if they came from a normal Sui wallet.

- **Per user Sui addresses from Internet Identity**  
  Each logged in principal gets a unique Sui address derived from:
  - ECDSA key name (for example `key_1`)
  - A structured derivation path that includes a schema tag and the principal bytes.

- **Canister level Sui address**  
  The canister itself can also derive a Sui address that can own Sui objects or treasury caps.

- **Sui send demo from ICP login**  
  The frontend builds a Sui transfer transaction, asks the backend to sign the digest with the per user key, and sends it to a Sui fullnode RPC. No browser wallet or seed phrase.

- **wICP bridge building blocks**  
  Backend code includes ICP deposit and withdrawal helpers plus Sui mint and burn tracking. These are the primitives for a wrapped ICP token on Sui and a return channel back to ICP.

- **Educational multichain UI**  
  The homepage shows:
  - ICP principal  
  - Derived Sui address  
  - Deterministic dummy Aptos and Cardano addresses computed from the same principal  
  This helps explain how one root identity can fan out into many ecosystems.

---

## High level architecture

### On chain components

- **Backend canister (`Backend.mo`)**
  - Stores admin and configuration.
  - Interfaces with the ICP ledger canister for ICP and ICRC operations.
  - Records deposits and withdrawals via `Bridge1` and `BridgeState`.
  - Integrates Sui functionality:
    - Canister level Sui address derivation.
    - Per user Sui address derivation.
    - Records per principal Sui mint events.
    - Signs Sui transaction digests for:
      - The canister itself.
      - Individual users.

- **User key derivation module (`UserSuiKeys.mo`)**
  - Pure Motoko module, not a canister.
  - Defines the management canister ECDSA interface.
  - Implements:
    - `deriveUserAddress` – Sui address from principal based derivation path.
    - `deriveCanisterAddress` – Sui address with empty derivation path.
    - `signForUser` and `signForCanister` – ECDSA signature and compressed public key.

### Frontend

- **React app** (written in TypeScript and Tailwind style)
  - Connects to Internet Identity through `@dfinity/auth-client`.
  - Talks to the backend canister through `@dfinity/agent` and generated IDL.
  - Calls `deriveMyUserSuiAddress` to obtain the user Sui address.
  - Uses `@mysten/sui.js` to:
    - Build a Sui transaction block (transfer SUI).
    - Serialize it to bytes for signing.
    - Submit the signed transaction to a Sui fullnode RPC.

---

