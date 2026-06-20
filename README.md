# The Zeta Landscape — a 3‑D exploration of ζ(s), its zeros, and the ½ origin shift

An interactive, real‑time **3‑D visualization of the Riemann zeta function on the
critical line**, the **non‑trivial zeros**, the **critical strip**, the **prime‑counting
staircase**, and — its signature idea — a **½ origin shift** that turns "ζ has a zero
here" into a *geometric incidence* you can see and drag.

Built with TypeScript, [Three.js](https://threejs.org/), [Vite](https://vitejs.dev/),
and [lil‑gui](https://lil-gui.georgealways.com/). Everything is computed live in the
browser — nothing is pre‑baked.

> **▶ Live demo:** **https://sandipchitale.github.io/smooth-step-function/**
>
> _Or run it locally in ~30 seconds — see [Getting started](#getting-started)._

---

## Table of contents

- [The one big idea: the ½ origin shift](#the-one-big-idea-the-½-origin-shift)
- [What you are looking at](#what-you-are-looking-at)
  - [The three planes](#the-three-planes)
  - [The objects in the scene](#the-objects-in-the-scene)
  - [Green: the "lock" signal](#green-the-lock-signal)
  - [Colour key](#colour-key)
- [Mathematical background](#mathematical-background)
  - [The Riemann zeta function](#the-riemann-zeta-function)
  - [Analytic continuation](#analytic-continuation)
  - [The critical strip and the critical line](#the-critical-strip-and-the-critical-line)
  - [Zeros: trivial and non‑trivial](#zeros-trivial-and-non-trivial)
  - [The Riemann Hypothesis](#the-riemann-hypothesis)
  - [Counting primes: π(x)](#counting-primes-πx)
  - [The value as a phasor: |ζ| and arg ζ](#the-value-as-a-phasor-ζ-and-arg-ζ)
- [How ζ is computed (and why it is accurate on the line)](#how-ζ-is-computed-and-why-it-is-accurate-on-the-line)
- [Controls reference](#controls-reference)
- [Keyboard & snapping](#keyboard--snapping)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [References & further reading](#references--further-reading)
- [Status, scope, and honest caveats](#status-scope-and-honest-caveats)

---

## The one big idea: the ½ origin shift

Most pictures of ζ(s) on the critical line plot **Re ζ** and **Im ζ** as two separate
curves, or collapse the whole complex plane into a domain‑colouring. Both are useful,
but both make it hard to *see* the single, honest 3‑D trajectory of the value — and
hard to see what a **zero** actually is.

This project uses a different convention. The complex number
`s = ½ + it` lives in an **input plane**, and the complex value `ζ(s)` is drawn in an
**output frame** — but the two frames are registered onto **one shared real axis read
with two different origins**:

| Origin | Belongs to | Marks |
|:------:|:-----------|:------|
| **0**  | the **number line** | primes, counting, the imaginary axis Re = 0 |
| **½**  | the **ζ‑value frame** | the **critical line** Re(s) = ½ |

Concretely, the value is plotted at

```
( ½ + Re ζ ,  t ,  Im ζ )
```

so the **real part of ζ is measured *from the critical line*** and the **imaginary part
of ζ lives on an independent depth (Z) axis**. The immediate payoff:

> **A non‑trivial zero — where `Re ζ = Im ζ = 0` — becomes a geometric incidence: the
> magenta value‑ribbon physically touches the critical line.** Zeros stop being a number
> you read off a label and become a *place where two things coincide*.

And because the shift is a **live slider** (`Origin shift`, range `0 → 1`), you can drag
the entire output frame across the critical strip and watch the value‑ribbon's
zero‑crossings slide onto the critical line **exactly at ½**, snapping onto the zero
markers — at which point the line, ribbon and zeros all turn **green** to mark the
registration. The whole output apparatus — the movable floor, the YZ plane, and its
vertical axis — translates together as one rigid frame, so the slider dramatizes a
*coordinate registration*, not just a moving curve.

This is a **representational idea, not a new theorem** — a coordinate convention chosen
to make an analytic fact perceptible. But it is the heart of the tool, and (as far as I
know) an original way to encode it.

---

## What you are looking at

### The three planes

| Plane | Role | Axes | Default |
|:------|:-----|:-----|:-------:|
| **XY plane** (`Z = 0`) | the **input s‑plane** *and* the counting plane | `X = Re(s)`, `Y = Im(s) = t` (also the π(x) height) | shown |
| **XZ plane** (movable floor) | the **output ζ‑plane** at height `t = "XZ Grid Y"` | `X = Re(ζ)`, `Z = Im(ζ)` | shown |
| **YZ plane** (output‑frame origin) | the **origin plane of the ζ‑value frame** | vertical centre line = the output‑frame `t`‑axis | grid hidden, **axis shown** |

The XY plane holds the primes, the prime‑counting staircase, and the zeros. The XZ
plane is a **sweepable floor**: raise or lower it to a height `t` and read off the value
of ζ at that point. The YZ plane's grey vertical axis is the **foot the radial line
drops onto**, and it slides with the origin shift.

### The objects in the scene

- **Magenta ribbon** — the 3‑D trajectory of `ζ(½ + it)` as `t` runs along the critical
  line. The single honest curve, not a Re/Im split.
- **White critical line** — the line `Re(s) = ½`, the spine of the whole picture.
- **Semi‑transparent critical strip** — the band `0 < Re(s) < 1` (toggleable).
- **White zero markers** — the non‑trivial zeros on the critical line.
- **White prime points** — the primes laid out on the real axis.
- **Cyan staircase** — the **prime‑counting function π(x)**, drawn with a
  [smoothstep](https://en.wikipedia.org/wiki/Smoothstep) interpolation whose sharpness
  you control (`Smoothness (e)`): from a crisp step function to a smooth ramp.
- **Red marker** — the value of ζ at the current floor height, with a live readout
  `ζ = a + bi · |ζ| · arg ζ`.
- **Red radial line** — the value drawn as a **phasor**: a segment from the output‑frame
  axis to the marker, whose **length is `|ζ|`** and **direction is `arg ζ`**. It pulses
  and rotates as you sweep `t`, and **shrinks to nothing at a zero**.
- **Faint magenta phasor trail** *(off by default)* — the value curve over a window of
  `t` flattened into the floor plane, fading out away from the marker; a flat read on the
  ribbon's winding where perspective is hard.
- **Green offset‑origin dot** — a small dot marking the **output‑frame origin** on the
  `y = 0` plane (at `x = origin shift`). It slides with the Origin shift, carrying a green
  label and a leader line drawn perpendicular to the XY plane.

### Green: the "lock" signal

Green is reserved for one thing: **you have landed on a distinguished, discrete
position.** These are the measure‑zero points you'd otherwise slide right past, so green
is the unambiguous "you're exactly there" cue — and it's the *same* cue everywhere:

- **Origin shift = ½** → the **critical line, the ζ ribbon, and the non‑trivial zeros all
  turn green**: the output frame has *registered* onto the critical line.
- **Floor at `y = 0` or exactly on a non‑trivial zero** → the floor's **z‑axis turns
  green**, making those special heights stand out as you sweep.
- The **offset‑origin dot** is permanently green — it *is* the registered origin the
  others lock onto.

It pairs with snapping (see [Keyboard & snapping](#keyboard--snapping)): the snap puts you
*on* the special position, and green *confirms* it — detent plus indicator.

### Colour key

| Colour | Meaning |
|:------:|:--------|
| ⚪ white | primes & zeros on the real axis / critical line |
| 🔵 cyan | prime count π(x) — smoothstep staircase |
| 🟣 magenta | `ζ(½ + it)` ribbon & its flattened phasor trail |
| 🔴 red | ζ at the current height — marker + radial line (length = |ζ|) |
| 🟢 green | a **special, locked position** — offset origin; registration at shift ½; floor on a zero / `y = 0` |
| ⚫ grey | critical strip, axes & grids |

---

## Mathematical background

This section is a guided tour with links, not a textbook. If you want the deep version,
follow the [references](#references--further-reading).

### The Riemann zeta function

For `Re(s) > 1` the [Riemann zeta function](https://en.wikipedia.org/wiki/Riemann_zeta_function)
is the convergent series

```
ζ(s) = Σ 1/nˢ   =   1 + 1/2ˢ + 1/3ˢ + 1/4ˢ + …
       n≥1
```

It is the single most important function connecting the **continuous** world of complex
analysis with the **discrete** world of the primes, via Euler's product
`ζ(s) = Π_p 1/(1 − p⁻ˢ)`.

### Analytic continuation

The series above **diverges** for `Re(s) ≤ 1`, including the entire critical line. Yet ζ
is defined there — through
[analytic continuation](https://en.wikipedia.org/wiki/Analytic_continuation), the unique
extension of the function to (almost) the whole complex plane. This is the subtle point
that trips up most newcomers: **you cannot simply sum `Σ n⁻ˢ` to evaluate ζ on the
critical line.** This tool sidesteps the divergence with a convergent alternating
representation — see [How ζ is computed](#how-ζ-is-computed-and-why-it-is-accurate-on-the-line).

Grant Sanderson's
[*Visualizing the Riemann zeta function and analytic continuation*](https://youtu.be/sD0NjbwqlYw)
(3Blue1Brown) is the canonical visual introduction to this idea.

### The critical strip and the critical line

- The **critical strip** is the vertical band `0 < Re(s) < 1`.
- The **critical line** is its centre, `Re(s) = ½`.

All the "interesting" zeros live inside the strip, and conjecturally on the line.

### Zeros: trivial and non‑trivial

- **Trivial zeros**: ζ vanishes at the negative even integers `s = −2, −4, −6, …`.
  These are well understood and not mysterious.
- **Non‑trivial zeros**: the zeros inside the critical strip, occurring in
  conjugate pairs `½ ± i·tₙ`. The first few imaginary parts are
  `t₁ ≈ 14.1347`, `t₂ ≈ 21.0220`, `t₃ ≈ 25.0109`, …  These are the ones that matter, and
  the ones this tool plants as white markers on the critical line.

### The Riemann Hypothesis

> **[The Riemann Hypothesis](https://en.wikipedia.org/wiki/Riemann_hypothesis):** every
> non‑trivial zero of ζ(s) has real part exactly `½` — i.e. they *all* lie on the
> critical line.

It is one of the
[Millennium Prize Problems](https://en.wikipedia.org/wiki/Millennium_Prize_Problems) and
arguably the most famous open problem in mathematics. In this visualization, RH is
exactly the statement that **the magenta ribbon's zero‑crossings all land on the white
critical line** — which is precisely what the ½ origin shift is built to show.

Background videos: [Mathologer](https://www.youtube.com/@Mathologer) and
[Numberphile](https://www.youtube.com/@numberphile) both have accessible explainers on
the zeta function, the zeros, and why the hypothesis is such a big deal.

### Counting primes: π(x)

The [prime‑counting function](https://en.wikipedia.org/wiki/Prime-counting_function)
`π(x)` counts how many primes are `≤ x`. It is a **staircase** that jumps by 1 at each
prime. Its large‑scale growth is the content of the
[Prime Number Theorem](https://en.wikipedia.org/wiki/Prime_number_theorem)
(`π(x) ∼ x / ln x`). The zeros of ζ control the *fine structure* — the wiggles — of this
staircase, which is the deep reason the zeros matter for the primes.

In the scene, π(x) is the **cyan staircase**, rendered with an adjustable
[smoothstep](https://en.wikipedia.org/wiki/Smoothstep) so you can morph between a hard
step function and a smooth curve with the `Smoothness (e)` slider.

### The value as a phasor: |ζ| and arg ζ

Any complex number can be written in **polar form** `r·e^{iθ}`, with **modulus**
`r = |ζ|` and **argument** `θ = arg ζ`
([argument of a complex number](https://en.wikipedia.org/wiki/Argument_(complex_analysis))).
The **red radial line** is exactly this picture: its length is `|ζ|` and its direction in
the floor plane is `arg ζ`. As you sweep the critical line, the phasor rotates and its
length breathes — and at a non‑trivial zero, `|ζ| → 0` and the phasor vanishes. The live
label reports all three views at once: `a + bi`, `|ζ|`, and `arg ζ`.

---

## How ζ is computed (and why it is accurate on the line)

Because the defining series diverges on the critical line, the tool evaluates ζ through
the **[Dirichlet eta function](https://en.wikipedia.org/wiki/Dirichlet_eta_function)**
(the alternating zeta):

```
η(s) = Σ (−1)^{n−1} / nˢ = (1 − 2^{1−s}) · ζ(s)      ⇒      ζ(s) = η(s) / (1 − 2^{1−s})
```

The alternating series converges (conditionally) for `Re(s) > 0`, which already covers
the critical line — but it converges *slowly*. To get accurate values fast, the code uses
**Borwein's acceleration** for the alternating series (the Chebyshev‑polynomial
weighting from P. Borwein's *An Efficient Algorithm for the Riemann Zeta Function*),
which converges geometrically and nails ζ on the critical line to high precision in a few
dozen terms.

As a sanity check, the tool reproduces the known value
`ζ(½) ≈ −1.4603545` and drives the non‑trivial zeros to within `~10⁻¹⁰`.

Complex arithmetic is provided by a small hand‑rolled `Complex` class
(`add`, `sub`, `mul`, `div`, `scale`, `abs`).

---

## Controls reference

Controls live in the [lil‑gui](https://lil-gui.georgealways.com/) panel docked to the
**right edge**, with the **XZ Grid Y sweep as a vertical slider** in its own panel just
below it (the floor moves up the screen as `t` increases). The collapsible legend on the
left explains the ideas. **Every slider is keyboard‑operable** — see
[Keyboard & snapping](#keyboard--snapping).

| Control | What it does | Default |
|:--------|:-------------|:-------:|
| **Smoothness (e)** | morph the cyan π(x) staircase between a hard step and a smooth ramp | `0` (crisp) |
| **π(x) from zeros** | (+ `# zeros`) the yellow Riemann reconstruction of the staircase | off |
| **Show XY Grid** | the input s‑plane grid + its label | on |
| **Show XZ Grid** | the output ζ‑plane floor + its label | on |
| **XZ Grid Y** *(vertical slider + number field)* | sweep the floor to height `t`; the red marker reads ζ there. ↑/↓ move, Shift+↑/↓ snap to non‑trivial zeros / origin, or type a value | `0` |
| **Show ζ‑value label** | the `ζ = a + bi · |ζ| · arg` readout and its connector line | on |
| **Show phasor trail** | the flattened, fading value‑trail in the floor | **off** |
| **└ trail ± window (t)** | how far in `t` the trail extends around the marker | `6` |
| **Origin shift** | ⭐ slide the output frame `0 → 1`; `0` = imaginary axis, `½` = critical line. At ½ the line, ribbon & zeros go **green**. Shift+↑/↓ snaps to `0 / ½ / 1` | `0.5` |
| **Show YZ Grid (output origin)** | the YZ plane grid lines | **off** |
| **Show YZ vertical axis** | the YZ plane's grey vertical axis (foot of the radial line) | **on** |
| **Show Critical Strip** | the semi‑transparent band `0 < Re(s) < 1` | on |

> **Tip:** the most rewarding sequence — drag **Origin shift** to ½ (everything special
> turns green), focus the vertical **XZ Grid Y** slider, then **Shift+↑** repeatedly to
> hop from zero to zero: at each one the red phasor pinches to nothing and the floor's
> z‑axis lights up green.

---

## Keyboard & snapping

Every range is operable from the keyboard. Click a slider (or Tab to it) — a cyan outline
shows focus — then:

- **↑ / ↓** — step the value; **Shift+↑ / ↓** — a coarse jump (×10), or a *snap* where
  noted below. (`Home`/`End` go to max/min.)
- **Origin shift** — **Shift+↑ / ↓ snaps to `0`, `½`, `1`** (the imaginary axis, the
  critical‑line registration, the right strip edge).
- **XZ Grid Y** (the vertical slider) — **↑ / ↓** nudge by `0.1`; **Shift+↑ / ↓ snap to
  the non‑trivial zeros and the origin `t = 0`**; or type an exact `t` in the number field.

Snapping and the [green "lock" signal](#green-the-lock-signal) are designed to work
together: the snap lands you exactly on a distinguished position, and green confirms it.

---

## Getting started

Prerequisites: a recent [Node.js](https://nodejs.org/) (18+ recommended).

```bash
# install dependencies
npm install

# run the dev server (hot reload) — open the printed localhost URL
npm run dev

# type-check + production build into dist/
npm run build

# preview the production build locally
npm run preview

# deploy to GitHub Pages (builds first, publishes dist/ via gh-pages)
npm run deploy
```

The Vite `base` is set to `/smooth-step-function/` (in `vite.config.ts`) so the built
site works under a GitHub Pages project path.

---

## Project structure

```
smooth-step-function/
├── index.html        # page shell + the collapsible left-hand legend (the cards)
├── src/
│   ├── main.ts       # everything: Complex/zeta math, scene, geometry, GUI, interaction
│   └── style.css     # sidebar, legend cards, 3-D label styling
├── vite.config.ts    # Vite config (GitHub Pages base path)
├── tsconfig.json
└── package.json
```

It is deliberately a **single‑file scene** (`src/main.ts`): the maths (the `Complex`
class, the eta/zeta evaluator), the Three.js scene graph, the
[CSS2DRenderer](https://threejs.org/docs/#examples/en/renderers/CSS2DRenderer) labels,
and the lil‑gui wiring all live together so the data‑flow is easy to follow.

---

## Tech stack

- **[Three.js](https://threejs.org/)** — WebGL scene, geometry, `GridHelper`,
  `BufferGeometry`, and `CSS2DRenderer` for crisp HTML labels anchored in 3‑D.
- **[TypeScript](https://www.typescriptlang.org/)** — typed maths and scene code.
- **[Vite](https://vitejs.dev/)** — dev server and build.
- **[lil‑gui](https://lil-gui.georgealways.com/)** — the control panel.
- **Plain CSS** — the collapsible legend, no UI framework.

---

## References & further reading

**Wikipedia (the maths):**

- [Riemann zeta function](https://en.wikipedia.org/wiki/Riemann_zeta_function)
- [Riemann Hypothesis](https://en.wikipedia.org/wiki/Riemann_hypothesis)
- [Analytic continuation](https://en.wikipedia.org/wiki/Analytic_continuation)
- [Dirichlet eta function](https://en.wikipedia.org/wiki/Dirichlet_eta_function)
- [Prime-counting function](https://en.wikipedia.org/wiki/Prime-counting_function)
- [Prime Number Theorem](https://en.wikipedia.org/wiki/Prime_number_theorem)
- [Argument of a complex number](https://en.wikipedia.org/wiki/Argument_(complex_analysis))
- [Smoothstep](https://en.wikipedia.org/wiki/Smoothstep)
- [Millennium Prize Problems](https://en.wikipedia.org/wiki/Millennium_Prize_Problems)

**Videos (the intuition):**

- 3Blue1Brown — [*Visualizing the Riemann zeta function and analytic continuation*](https://youtu.be/sD0NjbwqlYw)
  (the single best visual intro to ζ and continuation).
- [Mathologer](https://www.youtube.com/@Mathologer) — deep, careful explainers on primes
  and the zeta function.
- [Numberphile](https://www.youtube.com/@numberphile) — short, friendly takes on the
  Riemann Hypothesis and the zeros.

**Computation:**

- P. Borwein, *An Efficient Algorithm for the Riemann Zeta Function* — the accelerated
  alternating‑series method used here to evaluate ζ on the critical line.

---

## Status, scope, and honest caveats

- This is an **exploration / teaching instrument**, not a research‑grade ζ evaluator. The
  zero list is a fixed table of known imaginary parts; ζ accuracy is excellent on the
  critical line but the tool is not trying to *discover* zeros.
- The **½ origin shift** is the project's signature contribution. To be precise about it:
  it is an **original representational convention** — a way of encoding the value so that
  a zero becomes a visible incidence — **not** a new mathematical result. That distinction
  is part of what makes it honest *and* useful.
- 3‑D perspective makes depth (the `Im ζ` excursion) inherently hard to read from a still
  frame; rotate the scene, and use the phasor trail, the radial line, and the live readout
  together rather than relying on the ribbon's apparent depth alone.

---

*Built out of a long study of the analytic theory and the wonderful expository work of
Terence Tao, the late‑night rabbit holes of 3Blue1Brown, Mathologer, and Numberphile —
distilled into one draggable picture.*
