import { ZERO_BD, ZERO_BI, ONE_BI } from './constants'
/* eslint-disable prefer-const */
import {
  UniswapDayData,
  Factory,
  Pool,
  PoolDayData,
  Token,
  TokenDayData,
  TokenHourData,
  Bundle,
  PoolHourData
} from './../types/schema'
import {BigDecimal, ethereum, log} from '@graphprotocol/graph-ts'

/**
 * Tracks global aggregate data over daily windows
 * @param event
 */
export function updateUniswapDayData(uniswap: Factory | null, event: ethereum.Event): UniswapDayData {
  if (uniswap == null) {
    log.critical('updateUniswapDayData NOT FOUND!', [])
    let temp = new UniswapDayData("SF")
    temp.date = 1
    temp.volumeETH = ZERO_BD
    temp.volumeUSD = ZERO_BD
    temp.volumeUSDUntracked = ZERO_BD
    temp.feesUSD = ZERO_BD
    return temp as UniswapDayData
  }

  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400 // rounded
  let dayStartTimestamp = dayID * 86400
  let uniswapDayData = UniswapDayData.load(dayID.toString())
  if (uniswapDayData === null) {
    uniswapDayData = new UniswapDayData(dayID.toString())
    uniswapDayData.date = dayStartTimestamp
    uniswapDayData.volumeETH = ZERO_BD
    uniswapDayData.volumeUSD = ZERO_BD
    uniswapDayData.volumeUSDUntracked = ZERO_BD
    uniswapDayData.feesUSD = ZERO_BD
  }
  uniswapDayData.totalValueLockedUSD = uniswap.totalValueLockedUSD
  uniswapDayData.txCount = uniswap.txCount
  uniswapDayData.save()
  return uniswapDayData as UniswapDayData
}

export function updatePoolDayData(pool: Pool | null, event: ethereum.Event): PoolDayData {
  if (pool == null) {
    log.critical('updatePoolDayData NOT FOUND!', [])
    let temp = new PoolDayData("sf")
    temp.date = 1
    temp.pool = pool.id
    temp.volumeToken0 = ZERO_BD
    temp.volumeToken1 = ZERO_BD
    temp.volumeUSD = ZERO_BD
    temp.feesUSD = ZERO_BD
    temp.txCount = ZERO_BI
    temp.feeGrowthGlobal0X128 = ZERO_BI
    temp.feeGrowthGlobal1X128 = ZERO_BI
    temp.open = ZERO_BD
    temp.high = ZERO_BD
    temp.low = ZERO_BD
    temp.close = ZERO_BD
    return temp as PoolDayData
  }


  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPoolID = event.address
    .toHexString()
    .concat('-')
    .concat(dayID.toString())
  let poolDayData = PoolDayData.load(dayPoolID)
  if (poolDayData === null) {
    poolDayData = new PoolDayData(dayPoolID)
    poolDayData.date = dayStartTimestamp
    poolDayData.pool = pool.id
    // things that dont get initialized always
    poolDayData.volumeToken0 = ZERO_BD
    poolDayData.volumeToken1 = ZERO_BD
    poolDayData.volumeUSD = ZERO_BD
    poolDayData.feesUSD = ZERO_BD
    poolDayData.txCount = ZERO_BI
    poolDayData.feeGrowthGlobal0X128 = ZERO_BI
    poolDayData.feeGrowthGlobal1X128 = ZERO_BI
    poolDayData.open = pool.token0Price
    poolDayData.high = pool.token0Price
    poolDayData.low = pool.token0Price
    poolDayData.close = pool.token0Price
  }

  if (pool.token0Price.gt(poolDayData.high)) {
    poolDayData.high = pool.token0Price
  }
  if (pool.token0Price.lt(poolDayData.low)) {
    poolDayData.low = pool.token0Price
  }

  poolDayData.liquidity = pool.liquidity
  poolDayData.sqrtPrice = pool.sqrtPrice
  poolDayData.feeGrowthGlobal0X128 = pool.feeGrowthGlobal0X128
  poolDayData.feeGrowthGlobal1X128 = pool.feeGrowthGlobal1X128
  poolDayData.token0Price = pool.token0Price
  poolDayData.token1Price = pool.token1Price
  poolDayData.tick = pool.tick
  poolDayData.totalValueLockedUSD = pool.totalValueLockedUSD
  poolDayData.txCount = poolDayData.txCount.plus(ONE_BI)
  poolDayData.save()

  return poolDayData as PoolDayData
}

export function updatePoolHourData(pool: Pool | null, event: ethereum.Event): PoolHourData {
  if (pool == null) {
    log.critical('updatePoolHourData NOT FOUND!', [])
    let temp = new PoolHourData("sf")
    temp.periodStartUnix = 1
    temp.pool = pool.id
    temp.volumeToken0 = ZERO_BD
    temp.volumeToken1 = ZERO_BD
    temp.volumeUSD = ZERO_BD
    temp.feesUSD = ZERO_BD
    temp.txCount = ZERO_BI
    temp.feeGrowthGlobal0X128 = ZERO_BI
    temp.feeGrowthGlobal1X128 = ZERO_BI
    temp.open = ZERO_BD
    temp.high = ZERO_BD
    temp.low = ZERO_BD
    temp.close = ZERO_BD
    return temp as PoolHourData
  }

  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPoolID = event.address
    .toHexString()
    .concat('-')
    .concat(hourIndex.toString())

  let poolHourData = PoolHourData.load(hourPoolID)
  if (poolHourData === null) {
    poolHourData = new PoolHourData(hourPoolID)
    poolHourData.periodStartUnix = hourStartUnix
    poolHourData.pool = pool.id
    // things that dont get initialized always
    poolHourData.volumeToken0 = ZERO_BD
    poolHourData.volumeToken1 = ZERO_BD
    poolHourData.volumeUSD = ZERO_BD
    poolHourData.txCount = ZERO_BI
    poolHourData.feesUSD = ZERO_BD
    poolHourData.feeGrowthGlobal0X128 = ZERO_BI
    poolHourData.feeGrowthGlobal1X128 = ZERO_BI
    poolHourData.open = pool.token0Price
    poolHourData.high = pool.token0Price
    poolHourData.low = pool.token0Price
    poolHourData.close = pool.token0Price
  }

  if (pool.token0Price.gt(poolHourData.high)) {
    poolHourData.high = pool.token0Price
  }
  if (pool.token0Price.lt(poolHourData.low)) {
    poolHourData.low = pool.token0Price
  }

  poolHourData.liquidity = pool.liquidity
  poolHourData.sqrtPrice = pool.sqrtPrice
  poolHourData.token0Price = pool.token0Price
  poolHourData.token1Price = pool.token1Price
  poolHourData.feeGrowthGlobal0X128 = pool.feeGrowthGlobal0X128
  poolHourData.feeGrowthGlobal1X128 = pool.feeGrowthGlobal1X128
  poolHourData.close = pool.token0Price
  poolHourData.tick = pool.tick
  poolHourData.totalValueLockedUSD = pool.totalValueLockedUSD
  poolHourData.txCount = poolHourData.txCount.plus(ONE_BI)
  poolHourData.save()

  // test
  return poolHourData as PoolHourData
}

export function updateTokenDayData(token: Token | null, event: ethereum.Event): TokenDayData {
  if (token == null) {
    log.critical('updateTokenDayData NOT FOUND!', [])
    let temp = new TokenDayData("sf")
    temp.date = 1
    temp.token = token.id
    temp.volume = ZERO_BD
    temp.volumeUSD = ZERO_BD
    temp.feesUSD = ZERO_BD
    temp.volumeUSDUntracked = ZERO_BD
    temp.open = ZERO_BD
    temp.high = ZERO_BD
    temp.low = ZERO_BD
    temp.close = ZERO_BD
    return temp as TokenDayData
  }

  let bundle = Bundle.load('1')
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(dayID.toString())

  let tokenPrice: BigDecimal = ZERO_BD
  if (bundle) {
    token.derivedETH.times(bundle.ethPriceUSD)
  }

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.volume = ZERO_BD
    tokenDayData.volumeUSD = ZERO_BD
    tokenDayData.feesUSD = ZERO_BD
    tokenDayData.volumeUSDUntracked = ZERO_BD
    tokenDayData.open = tokenPrice
    tokenDayData.high = tokenPrice
    tokenDayData.low = tokenPrice
    tokenDayData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenDayData.high)) {
    tokenDayData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenDayData.low)) {
    tokenDayData.low = tokenPrice
  }

  tokenDayData.close = tokenPrice
  tokenDayData.priceUSD = tokenPrice
  tokenDayData.totalValueLocked = token.totalValueLocked
  tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenDayData.save()

  return tokenDayData as TokenDayData
}

export function updateTokenHourData(token: Token | null, event: ethereum.Event): TokenHourData {
  if (token == null) {
    log.critical('updateTokenDayData NOT FOUND!', [])
    let temp = new TokenHourData("sf")
    temp.periodStartUnix = 1
    temp.token = token.id
    temp.volume = ZERO_BD
    temp.volumeUSD = ZERO_BD
    temp.feesUSD = ZERO_BD
    temp.volumeUSDUntracked = ZERO_BD
    temp.open = ZERO_BD
    temp.high = ZERO_BD
    temp.low = ZERO_BD
    temp.close = ZERO_BD
    return temp as TokenHourData
  }
  let bundle = Bundle.load('1')
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let tokenHourID = token.id
    .toString()
    .concat('-')
    .concat(hourIndex.toString())
  let tokenHourData = TokenHourData.load(tokenHourID)

  let tokenPrice: BigDecimal = ZERO_BD
  if (bundle) {
    token.derivedETH.times(bundle.ethPriceUSD)
  }

  if (tokenHourData === null) {
    tokenHourData = new TokenHourData(tokenHourID)
    tokenHourData.periodStartUnix = hourStartUnix
    tokenHourData.token = token.id
    tokenHourData.volume = ZERO_BD
    tokenHourData.volumeUSD = ZERO_BD
    tokenHourData.volumeUSDUntracked = ZERO_BD
    tokenHourData.feesUSD = ZERO_BD
    tokenHourData.open = tokenPrice
    tokenHourData.high = tokenPrice
    tokenHourData.low = tokenPrice
    tokenHourData.close = tokenPrice
  }

  if (tokenPrice.gt(tokenHourData.high)) {
    tokenHourData.high = tokenPrice
  }

  if (tokenPrice.lt(tokenHourData.low)) {
    tokenHourData.low = tokenPrice
  }

  tokenHourData.close = tokenPrice
  tokenHourData.priceUSD = tokenPrice
  tokenHourData.totalValueLocked = token.totalValueLocked
  tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD
  tokenHourData.save()

  return tokenHourData as TokenHourData
}
