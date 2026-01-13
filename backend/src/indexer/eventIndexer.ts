import { createPublicClient, http, parseAbiItem, Address, decodeEventLog } from 'viem';
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
    private async handleStaked(args: Record<string, unknown>): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();
        const amount = (args.amount as bigint).toString();
        const lockEnd = Number(args.lockEnd as bigint);

        console.log(`[Staked] User: ${user}, Token: ${token}, Amount: ${amount}`);

        await this.pool.query(
            `INSERT INTO positions (user_address, token_address, amount, lock_end, chain_id, created_at, updated_at)
       VALUES ($1, $2, $3, to_timestamp($4), $5, NOW(), NOW())
       ON CONFLICT (user_address, token_address, chain_id)
       DO UPDATE SET amount = $3, lock_end = to_timestamp($4), updated_at = NOW()`,
            [user, token, amount, lockEnd, this.chainId]
        );
    }

    /**
     * Process StakeIncreased event
     */
    private async handleStakeIncreased(args: Record<string, unknown>): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();
        const newTotal = (args.newTotal as bigint).toString();

        console.log(`[StakeIncreased] User: ${user}, Token: ${token}, NewTotal: ${newTotal}`);

        await this.pool.query(
            `UPDATE positions SET amount = $1, updated_at = NOW()
       WHERE user_address = $2 AND token_address = $3 AND chain_id = $4`,
            [newTotal, user, token, this.chainId]
        );
    }

    /**
     * Process LockExtended event
     */
    private async handleLockExtended(args: Record<string, unknown>): Promise<void> {
        const user = (args.user as string).toLowerCase();
        const token = (args.token as string).toLowerCase();
        const newLockEnd = Number(args.newLockEnd as bigint);

        console.log(`[LockExtended] User: ${user}, Token: ${token}, NewLockEnd: ${newLockEnd}`);

        await this.pool.query(
            `UPDATE positions SET lock_end = to_timestamp($1), updated_at = NOW()
       WHERE user_address = $2 AND token_address = $3 AND chain_id = $4`,
            [newLockEnd, user, token, this.chainId]
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
                decodedLogs.push({
                    eventName: decoded.eventName,
                    args: decoded.args as Record<string, unknown>,
                    blockNumber: log.blockNumber ?? BigInt(0),
                    logIndex: log.logIndex ?? 0,
                });
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
        for (const log of decodedLogs) {
            try {
                switch (log.eventName) {
                    case 'Staked':
                        await this.handleStaked(log.args);
                        break;
                    case 'StakeIncreased':
                        await this.handleStakeIncreased(log.args);
                        break;
                    case 'LockExtended':
                        await this.handleLockExtended(log.args);
                        break;
                    case 'Withdrawn':
                        await this.handleWithdrawn(log.args);
                        break;
                }
            } catch (error) {
                console.error(`Error processing ${log.eventName} at block ${log.blockNumber}:`, error);
            }
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
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || process.env.BASE_RPC_URL;
    const chainId = parseInt(process.env.CHAIN_ID || '84532');

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
