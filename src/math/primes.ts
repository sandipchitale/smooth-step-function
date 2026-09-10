// Primes and the (optionally smoothed) prime-counting staircase.

/** Trial-division sieve. Small limits only -- this drives the cyan staircase. */
export function getPrimesUpTo(limit: number): number[] {
  const primes: number[] = [];
  for (let num = 2; num <= limit; num++) {
    let isPrime = true;
    for (const p of primes) {
      if (num % p === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(num);
  }
  return primes;
}

/** Smoothstep: 3t^2 - 2t^3, with t clamped to [0, 1]. */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * pi(x), with each unit jump at a prime p optionally replaced by a smoothstep
 * ramp across [p-e, p+e].
 *
 * e === 0 is not an approximation of the staircase -- it IS the exact,
 * discontinuous prime-counting function (the branch below is a hard step).
 */
export function smoothPrimeCount(primes: number[], x: number, e: number): number {
  let count = 0;
  for (const p of primes) {
    if (e === 0) {
      if (x >= p) count += 1;
    } else {
      // Transition range [p-e, p+e]; outside it the ramp is already saturated.
      if (x > p + e) count += 1;
      else if (x < p - e) { /* contributes 0 */ }
      else count += smoothStep(p - e, p + e, x);
    }
  }
  return count;
}
