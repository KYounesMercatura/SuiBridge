module wicp_bridge::token {
    use sui::coin::{Self, TreasuryCap};
    use sui::tx_context::{Self as tx_context, TxContext};
    use sui::transfer;
    use sui::event;
    use std::option;

    /// The wrapped ICP coin type.
    public struct TOKEN has drop {}

    /// Event ICP will read after a burn on Sui.
    /// Must have `copy + drop` because `event::emit` requires it.
    public struct BurnedWicp has copy, drop, store {
        icp_principal: vector<u8>,  // serialized ICP principal (bytes)
        amount: u64,
        nonce: u64,
    }

    // init must NOT be public
    fun init(witness: TOKEN, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            8,
            b"wICP",
            b"Wrapped ICP",
            b"ICP bridged to Sui",
            option::none(),
            ctx,
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }

    /// Mint wICP – this is what your ICP-signed tx is calling.
    public entry fun mint(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        recipient: address,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Burn wICP and emit an event that the ICP canister can verify.
    /// Sui's coin::burn needs the treasury cap, so we take it here too.
    public entry fun burn(
        treasury_cap: &mut TreasuryCap<TOKEN>,
        coin_to_burn: coin::Coin<TOKEN>,
        icp_principal: vector<u8>,
        nonce: u64,
        _ctx: &mut TxContext,
    ) {
        // actually reduce supply, and get the amount burned
        let amount = coin::burn<TOKEN>(treasury_cap, coin_to_burn);

        let ev = BurnedWicp {
            icp_principal,
            amount,
            nonce,
        };
        event::emit(ev);
    }
}
