// Imaginary parts (gamma) of the nontrivial zeros of zeta, standard tabulated
// values to 9 decimal places.
//
// Used for: the zero markers on the critical line, the snap targets for the
// XZ floor and the origin-shift slider, the green "lock" tests, and as input
// to the pi(x)-from-zeros reconstruction in ./riemann.
//
// Every zero here is assumed to lie ON the critical line (rho = 1/2 + i*gamma).
// That is the Riemann Hypothesis, which is unproven -- but it is verified well
// past this range, so for the first 50 zeros it is fact, not assumption.
export const nontrivialZerosImag = [
  14.134725142, 21.022039639, 25.010857580, 30.424876126, 32.935061588,
  37.586178159, 40.918719012, 43.327073281, 48.005150881, 49.773832478,
  52.970321478, 56.446247697, 59.347044003, 60.831778525, 65.112544048,
  67.079810529, 69.546401711, 72.067157674, 75.704690699, 77.144840069,
  79.337375020, 82.910380854, 84.735492981, 87.425274613, 88.809111208,
  92.491899271, 94.651344041, 95.870634228, 98.831194218, 101.317851006,
  103.725538040, 105.446623052, 107.168611184, 111.029535543, 111.874659177,
  114.320220915, 116.226680321, 118.790782866, 121.370125002, 122.946829294,
  124.256818554, 127.516683880, 129.578704200, 131.087688531, 133.497737203,
  134.756509753, 138.116042055, 139.736208952, 141.123707404, 143.111845808,
];

/** How many zeros the reconstruction can use. */
export const ZERO_COUNT = nontrivialZerosImag.length;
