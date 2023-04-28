/* eslint-disable prefer-const */
import { ONE_BD, ZERO_BD, ZERO_BI } from './constants'
import { Bundle, Pool, Token } from './../types/schema'
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { log } from '@graphprotocol/graph-ts'

import { exponentToBigDecimal, safeDiv } from '../utils/index'
import {
  MINIMUM_ETH_LOCKED,
  STABLE_COINS,
  STABLE_IS_TOKEN_0,
  STABLE_POOL_ADDRESS,
  WETH_ADDRESS,
  WHITELIST_TOKENS
} from '../networkConstants/constants'

let Q192 = 2 ** 192
export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: BigInt, token0: Token | null, token1: Token | null): BigDecimal[] {

  if (token0 == null) {
    log.critical('sqrtPriceX96ToTokenPrices TOKEN0 NOT FOUND!', [])
    return [ZERO_BD, ZERO_BD]
  }



  if (token1 == null) {
    log.critical('sqrtPriceX96ToTokenPrices TOKEN0 NOT FOUND!', [])
    return [ZERO_BD, ZERO_BD]
  }


  let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
  let denom = BigDecimal.fromString(Q192.toString())
  let price1 = num
    .div(denom)
    .times(exponentToBigDecimal(token0.decimals))
    .div(exponentToBigDecimal(token1.decimals))

  let price0 = safeDiv(BigDecimal.fromString('1'), price1)
  return [price0, price1]
}

export function getEthPriceInUSD(): BigDecimal {
  // fetch eth prices for each stablecoin
  let stablePool = Pool.load(STABLE_POOL_ADDRESS) // stable is token0
  if (stablePool !== null) {
    if (STABLE_IS_TOKEN_0) {
      return stablePool.token0Price
    } else {
      return stablePool.token1Price
    }
  } else {
    return ZERO_BD
  }
}

/**
 * Search through graph to find derived Eth per token.
 * @todo update to be derived ETH (add stablecoin estimates)
 **/
export function findEthPerToken(token: Token | null): BigDecimal {
  if (token == null) {
    return ZERO_BD
  }

  if (token.id == WETH_ADDRESS) {
    return ONE_BD
  }
  let whiteList = token.whitelistPools
  // for now just take USD from pool with greatest TVL
  // need to update this to actually detect best rate based on liquidity distribution
  let largestLiquidityETH = ZERO_BD
  let priceSoFar = ZERO_BD
  let bundle = Bundle.load('1')

  if (bundle === null) {
    return ZERO_BD
  }

  // hardcoded fix for incorrect rates
  // if whitelist includes token - get the safe price
  if (STABLE_COINS.includes(token.id)) {
    priceSoFar = safeDiv(ONE_BD, bundle.ethPriceUSD)
  } else {
    for (let i = 0; i < whiteList.length; ++i) {
      let poolAddress = whiteList[i]
      let pool = Pool.load(poolAddress)

      if (pool === null) {
        continue
      }

      if (pool.liquidity.gt(ZERO_BI)) {
        if (pool.token0 == token.id) {
          // whitelist token is token1
          let token1 = Token.load(pool.token1)
          if (token1 === null) {
            continue
          }
          // get the derived ETH in pool
          let ethLocked = pool.totalValueLockedToken1.times(token1.derivedETH)
          if (
            ethLocked.gt(largestLiquidityETH) &&
            (ethLocked.gt(MINIMUM_ETH_LOCKED) || WHITELIST_TOKENS.includes(pool.token0))
          ) {
            largestLiquidityETH = ethLocked
            // token1 per our token * Eth per token1
            priceSoFar = pool.token1Price.times(token1.derivedETH as BigDecimal)
          }
        }
        if (pool.token1 == token.id) {
          let token0 = Token.load(pool.token0)
          if (token0 === null) {
            continue
          }
          // get the derived ETH in pool
          let ethLocked = pool.totalValueLockedToken0.times(token0.derivedETH)
          if (
            ethLocked.gt(largestLiquidityETH) &&
            (ethLocked.gt(MINIMUM_ETH_LOCKED) || WHITELIST_TOKENS.includes(pool.token1))
          ) {
            largestLiquidityETH = ethLocked
            // token0 per our token * ETH per token0
            priceSoFar = pool.token0Price.times(token0.derivedETH as BigDecimal)
          }
        }
      }
    }
  }
  return priceSoFar // nothing was found return 0
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountUSD(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let bundle = Bundle.load('1')

  if (bundle === null) {
    return ZERO_BD
  }

  let price0USD = token0.derivedETH.times(bundle.ethPriceUSD)
  let price1USD = token1.derivedETH.times(bundle.ethPriceUSD)

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).plus(tokenAmount1.times(price1USD))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(price0USD).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(price1USD).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}

/**
 * Accepts tokens and amounts, return tracked amount based on token whitelist
 * If one token on whitelist, return amount in that token converted to USD * 2.
 * If both are, return sum of two amounts
 * If neither is, return 0
 */
export function getTrackedAmountETH(
  tokenAmount0: BigDecimal,
  token0: Token,
  tokenAmount1: BigDecimal,
  token1: Token
): BigDecimal {
  let derivedETH0 = token0.derivedETH
  let derivedETH1 = token1.derivedETH

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(derivedETH0).plus(tokenAmount1.times(derivedETH1))
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount0.times(derivedETH0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    return tokenAmount1.times(derivedETH1).times(BigDecimal.fromString('2'))
  }

  // neither token is on white list, tracked amount is 0
  return ZERO_BD
}

export class AmountType {
  eth: BigDecimal
  usd: BigDecimal
  ethUntracked: BigDecimal
  usdUntracked: BigDecimal
}

export function getAdjustedAmounts(
  tokenAmount0: BigDecimal,
  token0: Token | null,
  tokenAmount1: BigDecimal,
  token1: Token | null
): AmountType {
  let derivedETH0 = token0.derivedETH
  let derivedETH1 = token1.derivedETH
  let bundle = Bundle.load('1')
  log.info('get-adjusted-amounts', [])

  if (token0 === null) {
    log.critical('TOKEN 0 NOT FOUND!', [])
    return { eth: ZERO_BD, usd: ZERO_BD, ethUntracked: ZERO_BD, usdUntracked: ZERO_BD }
  }

  if (token1 === null) {
    log.critical('TOKEN 1 NOT FOUND!', [])
    return { eth: ZERO_BD, usd: ZERO_BD, ethUntracked: ZERO_BD, usdUntracked: ZERO_BD }
  }


  if (bundle === null) {
    log.info('\'get-adjusted-amounts: bundle not set early exit', [])
    return { eth: ZERO_BD, usd: ZERO_BD, ethUntracked: ZERO_BD, usdUntracked: ZERO_BD }
  }
  log.info('token0: {}', [token0.id])
  log.info('token1: {}', [token1.id])
  log.info('derivedETH0: {}',[derivedETH0.toString()])
  log.info('derivedETH1: {}', [derivedETH1.toString()])
  log.info('bundle.ethPriceUSD: {}', [bundle.ethPriceUSD.toString()])
  log.info('tokenAmount0: {}', [tokenAmount0.toString()])
  log.info('tokenAmount1: {}', [tokenAmount1.toString()])

  let eth = ZERO_BD
  let ethUntracked = tokenAmount0.times(derivedETH0).plus(tokenAmount1.times(derivedETH1))
  log.info('ethUntracked: {}', [ethUntracked.toString()])

  // both are whitelist tokens, return sum of both amounts
  if (WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    log.info('get-adjusted-amounts: both whitelisted', [])
    eth = ethUntracked
  }

  // take double value of the whitelisted token amount
  if (WHITELIST_TOKENS.includes(token0.id) && !WHITELIST_TOKENS.includes(token1.id)) {
    log.info('get-adjusted-amounts: token0 whitelisted', [])
    eth = tokenAmount0.times(derivedETH0).times(BigDecimal.fromString('2'))
  }

  // take double value of the whitelisted token amount
  if (!WHITELIST_TOKENS.includes(token0.id) && WHITELIST_TOKENS.includes(token1.id)) {
    log.info('get-adjusted-amounts: token1 whitelisted', [])
    eth = tokenAmount1.times(derivedETH1).times(BigDecimal.fromString('2'))
  }

  // Define USD values based on ETH derived values.
  let usd = eth.times(bundle.ethPriceUSD)
  let usdUntracked = ethUntracked.times(bundle.ethPriceUSD)
  log.info('usd: {}', [usd.toString()])
  log.info('usdUntracked: {}', [usdUntracked.toString()])
  return { eth, usd, ethUntracked, usdUntracked }
}
