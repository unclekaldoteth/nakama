import { createPublicClient, http, Address, decodeEventLog } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { Pool } from 'pg';

// Contract ABI for events
const VAULT_ABI = [
    {
        type: 'event',
        name: 'Staked',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
            { name: 'lockEnd', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'StakeIncreased',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'addedAmount', type: 'uint256', indexed: false },
            { name: 'newTotal', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'LockExtended',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'newLockEnd', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'Withdrawn',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
] as const;

const SECONDS_PER_DAY = 86400n;

function sqrtBigInt(value: bigint): bigint {
    if (value < 0n) {
        throw new Error('sqrt only supports non-negative values');
    }
    if (value < 2n) {
        return value;
    }

    let x0 = value / 2n;
    let x1 = (x0 + value / x0) / 2n;
    while (x1 < x0) {
        x0 = x1;
        x1 = (x0 + value / x0) / 2n;
    }
    return x0;
}

function calculateTierFromLockDays(lockDays: bigint): number {
    if (lockDays >= 90n) {
        return 4;
    }
    if (lockDays >= 30n) {
        return 3;
    }
    if (lockDays >= 7n) {
        return 2;
    }
    return 1;
}

interface IndexerConfig {
    vaultAddress: Address;
    rpcUrl: string;
    chainId: number;
}

interface DecodedLog {
    eventName: string;
    args: Record<string, unknown>;
    blockNumber: bigint;
    logIndex: number;
}

export class EventIndexer {
    private client: any;
    private pool: Pool;
    private vaultAddress: Address;
    private chainId: number;
    private isRunning: boolean = false;
    private pollInterval: number = 5000; // 5 seconds
    private blockTimestampCache: Map<bigint, bigint> = new Map();

    constructor(pool: Pool, config: IndexerConfig) {
        this.pool = pool;
        this.vaultAddress = config.vaultAddress;
        this.chainId = config.chainId;

        const chain = config.chainId === 84532 ? baseSepolia : base;
        this.client = createPublicClient({
            chain,
            transport: http(config.rpcUrl),
        });
    }

    private async getBlockTimestamp(blockNumber: bigint): Promise<bigint> {
        const cached = this.blockTimestampCache.get(blockNumber);
        if (cached !== undefined) {
            return cached;
        }
        const block = await this.client.getBlock({ blockNumber });
        this.blockTimestampCache.set(blockNumber, block.timestamp);
        return block.timestamp;
    }

    /**
     * Get the last synced block from database
     */
    async getLastSyncedBlock(): Promise<bigint> {
        const result = await this.pool.query(
            'SELECT last_block FROM sync_state WHERE chain_id = $1',
            [this.chainId]
        );
        if (result.rows.length === 0) {
            // Initialize sync state
            await this.pool.query(
                'INSERT INTO sync_state (chain_id, last_block) VALUES ($1, $2)',
                [this.chainId, 0]
            );
            return BigInt(0);
        }
        return BigInt(result.rows[0].last_block);
    }

    /**
     * Update the last synced block in database
     */
    async updateLastSyncedBlock(blockNumber: bigint): Promise<void> {
        await this.pool.query(
            'UPDATE sync_state SET last_block = $1, updated_at = NOW() WHERE chain_id = $2',
            [blockNumber.toString(), this.chainId]
        );
    }

    /**
     * Process Staked event
     */
    private async handleStaked(args: Record<string, unknown>, blockTimestamp: bigint): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();
        const amount = args.amount as bigint;
        const lockEnd = args.lockEnd as bigint;
        const lockDays = lockEnd > blockTimestamp
            ? (lockEnd - blockTimestamp) / SECONDS_PER_DAY
            : 0n;
        const tier = calculateTierFromLockDays(lockDays);
        const convictionScore = sqrtBigInt(amount).toString();
        const lockEndSeconds = Number(lockEnd);
        const blockTimestampSeconds = Number(blockTimestamp);

        console.log(`[Staked] User: ${user}, Token: ${token}, Amount: ${amount.toString()}`);

        await this.pool.query(
            `INSERT INTO positions (user_address, token_address, amount, lock_end, tier, conviction_score, chain_id, created_at, updated_at)
       VALUES ($1, $2, $3, to_timestamp($4), $5, $6, $7, to_timestamp($8), to_timestamp($8))
       ON CONFLICT (user_address, token_address, chain_id)
       DO UPDATE SET amount = $3, lock_end = to_timestamp($4), tier = $5, conviction_score = $6, updated_at = to_timestamp($8)`,
            [user, token, amount.toString(), lockEndSeconds, tier, convictionScore, this.chainId, blockTimestampSeconds]
        );
    }

    /**
     * Process StakeIncreased event
     */
    private async handleStakeIncreased(args: Record<string, unknown>, blockTimestamp: bigint): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();
        const newTotal = args.newTotal as bigint;
        const convictionScore = sqrtBigInt(newTotal).toString();
        const blockTimestampSeconds = Number(blockTimestamp);

        console.log(`[StakeIncreased] User: ${user}, Token: ${token}, NewTotal: ${newTotal.toString()}`);

        await this.pool.query(
            `UPDATE positions SET amount = $1, conviction_score = $2, updated_at = to_timestamp($3)
       WHERE user_address = $4 AND token_address = $5 AND chain_id = $6`,
            [newTotal.toString(), convictionScore, blockTimestampSeconds, user, token, this.chainId]
        );
    }

    /**
     * Process LockExtended event
     */
    private async handleLockExtended(args: Record<string, unknown>, blockTimestamp: bigint): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();
        const newLockEnd = args.newLockEnd as bigint;
        const lockDays = newLockEnd > blockTimestamp
            ? (newLockEnd - blockTimestamp) / SECONDS_PER_DAY
            : 0n;
        const tier = calculateTierFromLockDays(lockDays);
        const newLockEndSeconds = Number(newLockEnd);
        const blockTimestampSeconds = Number(blockTimestamp);

        console.log(`[LockExtended] User: ${user}, Token: ${token}, NewLockEnd: ${newLockEndSeconds}`);

        await this.pool.query(
            `UPDATE positions SET lock_end = to_timestamp($1), tier = $2, updated_at = to_timestamp($3)
       WHERE user_address = $4 AND token_address = $5 AND chain_id = $6`,
            [newLockEndSeconds, tier, blockTimestampSeconds, user, token, this.chainId]
        );
    }

    /**
     * Process Withdrawn event
     */
    private async handleWithdrawn(args: Record<string, unknown>): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();

        console.log(`[Withdrawn] User: ${user}, Token: ${token}`);

        await this.pool.query(
            `DELETE FROM positions WHERE user_address = $1 AND token_address = $2 AND chain_id = $3`,
            [user, token, this.chainId]
        );
    }

    /**
     * Fetch and process logs for a block range
     */
    async syncBlockRange(fromBlock: bigint, toBlock: bigint): Promise<void> {
        console.log(`Syncing blocks ${fromBlock} to ${toBlock}...`);
        this.blockTimestampCache.clear();

        // Fetch all logs from vault contract
        const logs = await this.client.getLogs({
            address: this.vaultAddress,
            fromBlock,
            toBlock,
        });

        // Decode and process each log
        const decodedLogs: DecodedLog[] = [];
        for (const log of logs) {
            try {
                const decoded = decodeEventLog({
                    abi: VAULT_ABI,
                    data: log.data,
                    topics: log.topics,
                });
                if (log.blockNumber !== null && log.blockNumber !== undefined) {
                    decodedLogs.push({
                        eventName: decoded.eventName,
                        args: decoded.args as Record<string, unknown>,
                        blockNumber: log.blockNumber,
                        logIndex: log.logIndex ?? 0,
                    });
                }
            } catch {
                // Not a vault event, skip
            }
        }

        // Sort by block number + log index
        decodedLogs.sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) {
                return Number(a.blockNumber - b.blockNumber);
            }
            return a.logIndex - b.logIndex;
        });

        // Process each log
        let hadError = false;
        for (const log of decodedLogs) {
            try {
                const blockTimestamp = await this.getBlockTimestamp(log.blockNumber);
                switch (log.eventName) {
                    case 'Staked':
                        await this.handleStaked(log.args, blockTimestamp);
                        break;
                    case 'StakeIncreased':
                        await this.handleStakeIncreased(log.args, blockTimestamp);
                        break;
                    case 'LockExtended':
                        await this.handleLockExtended(log.args, blockTimestamp);
                        break;
                    case 'Withdrawn':
                        await this.handleWithdrawn(log.args);
                        break;
                }
            } catch (error) {
                hadError = true;
                console.error(`Error processing ${log.eventName} at block ${log.blockNumber}:`, error);
            }
        }

        if (hadError) {
            console.warn(`Skipping sync_state update for blocks ${fromBlock} to ${toBlock} due to processing errors`);
            return;
        }

        // Update sync state
        await this.updateLastSyncedBlock(toBlock);
        console.log(`Synced ${decodedLogs.length} events up to block ${toBlock}`);
    }

    /**
     * Start the indexer polling loop
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('Indexer already running');
            return;
        }

        this.isRunning = true;
        console.log(`Starting event indexer for vault ${this.vaultAddress}`);

        while (this.isRunning) {
            try {
                const lastSynced = await this.getLastSyncedBlock();
                const currentBlock = await this.client.getBlockNumber();

                if (currentBlock > lastSynced) {
                    // Sync in chunks of 1000 blocks to avoid RPC limits
                    const chunkSize = BigInt(1000);
                    let fromBlock = lastSynced + BigInt(1);

                    while (fromBlock <= currentBlock && this.isRunning) {
                        const toBlock = fromBlock + chunkSize - BigInt(1) > currentBlock
                            ? currentBlock
                            : fromBlock + chunkSize - BigInt(1);

                        await this.syncBlockRange(fromBlock, toBlock);
                        fromBlock = toBlock + BigInt(1);
                    }
                }
            } catch (error) {
                console.error('Error in indexer loop:', error);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
    }

    /**
     * Stop the indexer
     */
    stop(): void {
        console.log('Stopping event indexer');
        this.isRunning = false;
    }
}

// Create and export indexer instance
export function createIndexer(pool: Pool): EventIndexer | null {
    const vaultAddress = process.env.VAULT_ADDRESS as Address;
    const chainId = parseInt(process.env.CHAIN_ID || '84532', 10);
    const preferredRpcUrl = chainId === 8453
        ? process.env.BASE_RPC_URL
        : process.env.BASE_SEPOLIA_RPC_URL;
    const rpcUrl = preferredRpcUrl || process.env.BASE_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL;

    if (!vaultAddress || !rpcUrl) {
        console.warn('Missing VAULT_ADDRESS or RPC_URL - indexer disabled');
        return null;
    }

    return new EventIndexer(pool, {
        vaultAddress,
        rpcUrl,
        chainId,
    });
}
