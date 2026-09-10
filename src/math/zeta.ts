// The zeta evaluator: Dirichlet eta via Borwein acceleration, then the
// eta -> zeta conversion.
//
// s = sigma + i*t. The visualisation's headline case is the critical line
// sigma = 1/2, but sigma is a free parameter so the ribbon can be swept off
// the line and back (see the "sigma" control).

import { Complex } from './complex';

/** The critical line. The default value of sigma everywhere in the app. */
export const CRITICAL_SIGMA = 0.5;

// n^(-s) where s = sigma + i*t.
//   n^(-s) = n^(-sigma) * n^(-i t) = n^(-sigma) * exp(-i t ln n)
// and exp(-i x) = cos(x) - i sin(x), so the angle carried below is -t ln n.
function nPowMinusS(n: number, sigma: number, t: number): Complex {
  const r = Math.pow(n, -sigma);
  const theta = -t * Math.log(n);
  return new Complex(r * Math.cos(theta), r * Math.sin(theta));
}

// Dirichlet eta (alternating zeta):  eta(s) = sum (-1)^(n-1) / n^s
//
// Computed via Borwein's algorithm rather than the naive alternating sum.
// The naive series converges far too slowly on the critical line (Re(s)=0.5):
// even 200 terms left zeta(0.5) reading ~-1.38 instead of -1.46. Borwein gives
// ~n digits of accuracy from n terms, so n=60 nails the whole t in [-50,50] range
// (including ~1e-10 magnitude at the nontrivial zeros).
//
//   d_k = n * sum_{i=0}^{k} (n+i-1)! 4^i / ((n-i)! (2i)!)
//   eta(s) = -1/d_n * sum_{k=0}^{n-1} (-1)^k (d_k - d_n) / (k+1)^s
export function eta(sigma: number, t: number, n: number = 60): Complex {
  // Build d_k cumulatively. t_0 = 1/n, and
  // t_i = t_{i-1} * (n+i-1) * 4 * (n-i+1) / ((2i)(2i-1)).
  const d = new Array<number>(n + 1);
  let cum = 0;
  let term = 1 / n;
  for (let i = 0; i <= n; i++) {
    cum += term;
    d[i] = n * cum;
    const i1 = i + 1;
    term = term * (n + i1 - 1) * 4 * (n - i1 + 1) / ((2 * i1) * (2 * i1 - 1));
  }

  const dn = d[n];
  let sum = new Complex(0, 0);
  for (let k = 0; k < n; k++) {
    const sign = (k % 2 === 0) ? 1 : -1;
    // nPowMinusS(k+1, ...) = (k+1)^(-s) = 1 / (k+1)^s
    sum = sum.add(nPowMinusS(k + 1, sigma, t).scale(sign * (d[k] - dn)));
  }
  return sum.scale(-1 / dn);
}

// zeta(s) = eta(s) / (1 - 2^(1-s)),  s = sigma + i*t.
//
//   2^(1-s) = 2^(1-sigma) * 2^(-i t) = 2^(1-sigma) * exp(-i t ln 2)
//
// This is the analytic continuation into the critical strip: the eta series is
// what actually converges there, and dividing by (1 - 2^(1-s)) recovers zeta.
export function zeta(sigma: number, t: number): Complex {
  const ln2 = Math.log(2);
  const mag = Math.pow(2, 1 - sigma);
  const factorRe = mag * Math.cos(-t * ln2);
  const factorIm = mag * Math.sin(-t * ln2);

  const denom = new Complex(1 - factorRe, -factorIm);
  const num = eta(sigma, t); // Borwein algorithm, n=60 terms is accurate over t in [-50,50]

  return num.div(denom);
}

/** zeta on the critical line: the sigma = 1/2 case, kept as a named shorthand. */
export function zetaCritical(t: number): Complex {
  return zeta(CRITICAL_SIGMA, t);
}
