import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Buffer "mo:base/Buffer";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Option "mo:base/Option";

module Blake2b {
    
    // BLAKE2b constants
    private let BLOCK_SIZE : Nat = 128;
    private let OUT_SIZE : Nat = 64;
    private let KEY_SIZE : Nat = 64;
    private let SALT_SIZE : Nat = 16;
    private let PERSONAL_SIZE : Nat = 16;
    
    // BLAKE2b IV constants
    private let IV : [Nat64] = [
        0x6a09e667f3bcc908, 0xbb67ae8584caa73b, 0x3c6ef372fe94f82b, 0xa54ff53a5f1d36f1,
        0x510e527fade682d1, 0x9b05688c2b3e6c1f, 0x1f83d9abfb41bd6b, 0x5be0cd19137e2179
    ];
    
    // BLAKE2b sigma permutation table
    private let SIGMA : [[Nat]] = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
        [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
        [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
        [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
        [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
        [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
        [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
        [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
        [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]
    ];
    
    public type Blake2bConfig = {
        digest_length: Nat;
        key: ?Blob;
        salt: ?Blob;
        personal: ?Blob;
    };
    
    public type Blake2bState = {
        var h: [var Nat64];
        var t: [var Nat64];
        var f: [var Nat64];
        buf: Buffer.Buffer<Nat8>;
        var buflen: Nat;
        outlen: Nat;
        last_node: Bool;
    };
    
    // Utility functions for bit operations
    private func rotr64(w: Nat64, c: Nat) : Nat64 {
        let shift_right = Nat64.fromNat(c);
        let shift_left = Nat64.fromNat(64 - c);
        (w >> shift_right) | (w << shift_left)
    };
    
    // Convert bytes to Nat64 (little-endian)
    private func bytes_to_nat64(bytes: [Nat8], offset: Nat) : Nat64 {
        var result: Nat64 = 0;
        var i = 0;
        while (i < 8) {
            let byte_val = Nat64.fromNat(Nat8.toNat(bytes[offset + i]));
            let shift_amount = Nat64.fromNat(i * 8);
            result := result | (byte_val << shift_amount);
            i += 1;
        };
        result
    };
    
    // Convert Nat64 to bytes (little-endian)
    private func nat64_to_bytes(value: Nat64) : [Nat8] {
        var bytes: [var Nat8] = [var 0, 0, 0, 0, 0, 0, 0, 0];
        var i = 0;
        var v = value;
        while (i < 8) {
            bytes[i] := Nat8.fromNat(Nat64.toNat(v & 0xff));
            let shift_amount = Nat64.fromNat(8);
            v := v >> shift_amount;
            i += 1;
        };
        Array.freeze(bytes)
    };
    
    // BLAKE2b mixing function G
    private func G(v: [var Nat64], a: Nat, b: Nat, c: Nat, d: Nat, x: Nat64, y: Nat64) {
        v[a] := v[a] +% v[b] +% x;
        v[d] := rotr64(v[d] ^ v[a], 32);
        v[c] := v[c] +% v[d];
        v[b] := rotr64(v[b] ^ v[c], 24);
        v[a] := v[a] +% v[b] +% y;
        v[d] := rotr64(v[d] ^ v[a], 16);
        v[c] := v[c] +% v[d];
        v[b] := rotr64(v[b] ^ v[c], 63);
    };
    
    // BLAKE2b compression function
    private func blake2b_compress(state: Blake2bState, block: [Nat8], last: Bool) {
        var v: [var Nat64] = [var 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        
        // Initialize working vector
        var i = 0;
        while (i < 8) {
            v[i] := state.h[i];
            v[i + 8] := IV[i];
            i += 1;
        };
        
        v[12] := v[12] ^ state.t[0];
        v[13] := v[13] ^ state.t[1];
        
        if (last) {
            v[14] := v[14] ^ state.f[0];
        };
        
        // Convert block to message words
        var m: [var Nat64] = [var 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        i := 0;
        while (i < 16) {
            m[i] := bytes_to_nat64(block, i * 8);
            i += 1;
        };
        
        // 12 rounds of mixing
        var round = 0;
        while (round < 12) {
            let s = SIGMA[round % 10];
            
            G(v, 0, 4, 8, 12, m[s[0]], m[s[1]]);
            G(v, 1, 5, 9, 13, m[s[2]], m[s[3]]);
            G(v, 2, 6, 10, 14, m[s[4]], m[s[5]]);
            G(v, 3, 7, 11, 15, m[s[6]], m[s[7]]);
            G(v, 0, 5, 10, 15, m[s[8]], m[s[9]]);
            G(v, 1, 6, 11, 12, m[s[10]], m[s[11]]);
            G(v, 2, 7, 8, 13, m[s[12]], m[s[13]]);
            G(v, 3, 4, 9, 14, m[s[14]], m[s[15]]);
            
            round += 1;
        };
        
        // Finalize
        i := 0;
        while (i < 8) {
            state.h[i] := state.h[i] ^ v[i] ^ v[i + 8];
            i += 1;
        };
    };
    
    // Initialize BLAKE2b state
    public func init(config: Blake2bConfig) : Blake2bState {
        let digest_length = if (config.digest_length == 0) OUT_SIZE else config.digest_length;
        
        if (digest_length > OUT_SIZE) {
            // Should handle error - for now, default to max
        };
        
        var h: [var Nat64] = [var 0, 0, 0, 0, 0, 0, 0, 0];
        var i = 0;
        while (i < 8) {
            h[i] := IV[i];
            i += 1;
        };
        
        // Set parameters
        let param0 = Nat64.fromNat(digest_length) | (Nat64.fromNat(Option.get(config.key, Blob.fromArray([])).size()) << 8) | (1 << 16) | (1 << 24);
        h[0] := h[0] ^ param0;
        
        // Handle salt
        switch (config.salt) {
            case (?salt) {
                let salt_bytes = Blob.toArray(salt);
                if (salt_bytes.size() <= SALT_SIZE) {
                    var padded_salt: [var Nat8] = [var 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    for (j in salt_bytes.keys()) {
                        padded_salt[j] := salt_bytes[j];
                    };
                    h[4] := h[4] ^ bytes_to_nat64(Array.freeze(padded_salt), 0);
                    h[5] := h[5] ^ bytes_to_nat64(Array.freeze(padded_salt), 8);
                };
            };
            case null {};
        };
        
        // Handle personal
        switch (config.personal) {
            case (?personal) {
                let personal_bytes = Blob.toArray(personal);
                if (personal_bytes.size() <= PERSONAL_SIZE) {
                    var padded_personal: [var Nat8] = [var 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    for (j in personal_bytes.keys()) {
                        padded_personal[j] := personal_bytes[j];
                    };
                    h[6] := h[6] ^ bytes_to_nat64(Array.freeze(padded_personal), 0);
                    h[7] := h[7] ^ bytes_to_nat64(Array.freeze(padded_personal), 8);
                };
            };
            case null {};
        };
        
        let state = {
            var h = h;
            var t = [var 0: Nat64, 0: Nat64];
            var f = [var 0: Nat64, 0: Nat64];
            buf = Buffer.Buffer<Nat8>(BLOCK_SIZE);
            var buflen = 0;
            outlen = digest_length;
            last_node = false;
        };
        
        // Handle key
        switch (config.key) {
            case (?key) {
                let key_bytes = Blob.toArray(key);
                if (key_bytes.size() > 0 and key_bytes.size() <= KEY_SIZE) {
                    var padded_key: [var Nat8] = [var 
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                    ];
                    for (j in key_bytes.keys()) {
                        padded_key[j] := key_bytes[j];
                    };
                    update(state, Blob.fromArray(Array.freeze(padded_key)));
                };
            };
            case null {};
        };
        
        state
    };
    
    // Update BLAKE2b state with new data
    public func update(state: Blake2bState, data: Blob) {
        let data_bytes = Blob.toArray(data);
        var offset = 0;
        let data_len = data_bytes.size();
        
        while (offset < data_len) {
            let available = BLOCK_SIZE - state.buflen;
            let remaining = data_len - offset;
            let to_copy = if (remaining < available) remaining else available;
            
            // Copy data to buffer
            var i = 0;
            while (i < to_copy) {
                state.buf.add(data_bytes[offset + i]);
                i += 1;
            };
            
            state.buflen += to_copy;
            offset += to_copy;
            
            if (state.buflen == BLOCK_SIZE) {
                // Increment counter
                let block_size_64 = Nat64.fromNat(BLOCK_SIZE);
                state.t[0] := state.t[0] +% block_size_64;
                if (state.t[0] < block_size_64) {
                    state.t[1] := state.t[1] +% 1;
                };
                
                // Compress block
                blake2b_compress(state, Buffer.toArray(state.buf), false);
                
                // Reset buffer
                state.buf.clear();
                state.buflen := 0;
            };
        };
    };
    
    public func finalize(state: Blake2bState) : Blob {
        // Store the number of data bytes before padding
        let data_bytes = state.buflen;
        
        // Pad the last block
        while (state.buflen < BLOCK_SIZE) {
            state.buf.add(0);
            state.buflen += 1;
        };
        
        // Update counter with actual data bytes (not padding)
        if (data_bytes > 0) {
            let data_bytes_64 = Nat64.fromNat(data_bytes);
            state.t[0] := state.t[0] +% data_bytes_64;
            if (state.t[0] < data_bytes_64) {
                state.t[1] := state.t[1] +% 1;
            };
        };
        
        // Set finalization flag
        state.f[0] := 0xffffffffffffffff;
        
        // Final compression
        blake2b_compress(state, Buffer.toArray(state.buf), true);
        
        // Generate output
        let output = Buffer.Buffer<Nat8>(state.outlen);
        var i = 0;
        while (i < state.outlen) {
            let h_index = i / 8;
            let byte_index = i % 8;
            if (h_index < 8) {
                let h_bytes = nat64_to_bytes(state.h[h_index]);
                output.add(h_bytes[byte_index]);
            };
            i += 1;
        };
        
        Blob.fromArray(Buffer.toArray(output))
    };
    
    // Convenience function for one-shot hashing
    public func hash(data: Blob, config: ?Blake2bConfig) : Blob {
        let final_config = Option.get(config, {
            digest_length = OUT_SIZE;
            key = null;
            salt = null;
            personal = null;
        });
        
        let state = init(final_config);
        update(state, data);
        finalize(state)
    };
    
    // Convenience function with default parameters
    public func digest(data: Blob) : Blob {
        hash(data, null)
    };
    
    // HMAC-BLAKE2b implementation
    public func hmac(key: Blob, message: Blob) : Blob {
        hash(message, ?{
            digest_length = OUT_SIZE;
            key = ?key;
            salt = null;
            personal = null;
        })
    };
}