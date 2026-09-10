// Reconstructing the prime-counting function pi(x) from the zeros of zeta.
//
// What this actually computes
// ---------------------------
// Riemann's R function is
//
//     R(w) = sum_{n>=1} mu(n)/n * li(w^(1/n))
//
// (li(w) = Ei(ln w) is the logarithmic integral, mu is Moebius). The classical
// explicit formula is naturally stated for J(x) = sum_{p^k <= x} 1/k, and
// Moebius inversion turns it into a statement about pi(x). Truncating the sum
// over zeros at the first N gives what this module returns:
//
//     pi(x)  ~  R(x) - sum_{k<N} R(x^rho_k)     [rho_k = 1/2 + i*gamma_k]
//
// Pairing each rho with its conjugate makes every zero's contribution real,
// which is why the code below takes 2 * Re(li(x^rho)).
//
// HONEST SCOPE -- read this before quoting the formula.
//   * This is a FINITE-ZERO APPROXIMATION, not the complete explicit formula.
//     The full identity also carries the pole term, the trivial zeros
//     (a -integral term), and a constant; all are omitted here because over
//     x in [0, 55] they are far below the ringing from truncating at N zeros.
//   * It therefore converges to pi(x) only as N -> infinity. At finite N the
//     curve oscillates ("ringing") around the true staircase -- that ringing is
//     the point of the visualisation, not a bug.
//   * The zeros are assumed to lie on the critical line (see ./zeros).

import { Complex, Ei } from './complex';
import { nontrivialZerosImag } from './zeros';

// Moebius function for the small n needed here.
// x <= 55 gives nMax = floor(ln 55 / ln 2) = 5, so n <= 10 is ample.
const mobius = [0, 1, -1, -1, 0, -1, 1, -1, 0, 0, 1];

/** Largest n with x^(1/n) >= 2; beyond it li(x^(1/n)) contributes nothing here. */
function moebiusDepth(x: number): number {
  return Math.floor(Math.log(x) / Math.LN2);
}

/**
 * The smooth main term R(x) = sum_n mu(n)/n * li(x^(1/n)).
 * This is the N = 0 reconstruction: Riemann's approximation to pi(x) with no
 * zero corrections at all. Already a strikingly good fit -- the zeros supply
 * the wiggles around it.
 */
export function piMainTerm(x: number): number {
  if (x < 2) return 0;
  const lnx = Math.log(x);
  const nMax = moebiusDepth(x);
  let total = 0;
  for (let n = 1; n <= nMax; n++) {
    const mu = mobius[n];
    if (mu === 0) continue;
    const Ln = lnx / n; // ln(x^(1/n))
    total += (mu / n) * Ei(new Complex(Ln, 0)).re; // li(x^(1/n))
  }
  return total;
}

/**
 * The correction contributed by ONE zero rho_k (and its conjugate), i.e. the
 * -R(x^rho_k) - R(x^conj(rho_k)) term.
 *
 * This is the key to making the zero count interactive: a zero's contribution
 * does not depend on how many other zeros are in play, so the corrections can
 * be computed once and prefix-summed to give every N at once, instead of
 * rebuilding the whole curve each time the count changes.
 */
export function piZeroTerm(x: number, k: number): number {
  if (x < 2) return 0;
  const g = nontrivialZerosImag[k];
  if (g === undefined) return 0;
  const lnx = Math.log(x);
  const nMax = moebiusDepth(x);
  let total = 0;
  for (let n = 1; n <= nMax; n++) {
    const mu = mobius[n];
    if (mu === 0) continue;
    const Ln = lnx / n; // ln(x^(1/n))
    // li(x^(rho/n)) = Ei(rho * Ln), rho = 1/2 + i*g; pair with conjugate -> 2 Re
    total -= (mu / n) * 2 * Ei(new Complex(Ln * 0.5, g * Ln)).re;
  }
  return total;
}

/**
 * Riemann's finite-zero reconstruction of pi(x) using the first N zeros.
 *
 * Kept as the direct (unbatched) formulation: correct, self-contained, and the
 * reference that piMainTerm + piZeroTerm are checked against.
 */
export function piRiemann(x: number, N: number): number {
  if (x < 2) return 0;
  let total = piMainTerm(x);
  for (let k = 0; k < N; k++) total += piZeroTerm(x, k);
  return total;
}
