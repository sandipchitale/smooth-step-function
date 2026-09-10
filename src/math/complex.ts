// Complex arithmetic, and the one transcendental function the reconstruction needs.
//
// Deliberately dependency-free: nothing in src/math imports Three.js, so the
// mathematics can be lifted out of the visualisation and used (or checked) on
// its own.

/** Minimal complex number. Immutable: every operation returns a new value. */
export class Complex {
  re: number;
  im: number;

  constructor(re: number, im: number) {
    this.re = re;
    this.im = im;
  }

  add(c: Complex): Complex {
    return new Complex(this.re + c.re, this.im + c.im);
  }

  sub(c: Complex): Complex {
    return new Complex(this.re - c.re, this.im - c.im);
  }

  mul(c: Complex): Complex {
    return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re);
  }

  div(c: Complex): Complex {
    const denom = c.re * c.re + c.im * c.im;
    return new Complex(
      (this.re * c.re + this.im * c.im) / denom,
      (this.im * c.re - this.re * c.im) / denom
    );
  }

  scale(k: number): Complex {
    return new Complex(this.re * k, this.im * k);
  }

  abs(): number {
    return Math.hypot(this.re, this.im);
  }
}

export const EULER = 0.5772156649015329; // Euler-Mascheroni constant

export function cExp(z: Complex): Complex {
  const e = Math.exp(z.re);
  return new Complex(e * Math.cos(z.im), e * Math.sin(z.im));
}

export function cLog(z: Complex): Complex {
  return new Complex(Math.log(z.abs()), Math.atan2(z.im, z.re));
}

// Complex exponential integral Ei(z).
// Power series for small |z|; asymptotic series (optimal truncation) for large.
export function Ei(z: Complex): Complex {
  if (z.abs() < 20) {
    // Ei(z) = gamma + ln(z) + sum_{k>=1} z^k / (k * k!)
    let sum = cLog(z).add(new Complex(EULER, 0));
    let zk = new Complex(1, 0); // running z^k / k!
    for (let k = 1; k <= 400; k++) {
      zk = zk.mul(z).scale(1 / k);
      const add = zk.scale(1 / k);
      sum = sum.add(add);
      if (add.abs() < 1e-16 * sum.abs() && k > z.abs()) break;
    }
    return sum;
  }
  // Ei(z) ~ (e^z / z) * sum_{k>=0} k! / z^k, truncated at the smallest term.
  const pref = cExp(z).div(z);
  let sum = new Complex(0, 0);
  let term = new Complex(1, 0); // k! / z^k
  let prevMag = Infinity;
  for (let k = 0; k <= 400; k++) {
    const mag = term.abs();
    if (mag > prevMag) break; // asymptotic series starts diverging -> stop
    sum = sum.add(term);
    prevMag = mag;
    term = term.scale(k + 1).div(z);
  }
  return pref.mul(sum);
}
