
const R_EARTH = 6371000;
const GRAVITY = 9.8;
const MU = GRAVITY * R_EARTH * R_EARTH;

interface SimState {
    r: number;
    phi: number;
    vr: number;
    vphi: number;
}

interface Derivatives {
    dr: number;
    dphi: number;
    dvr: number;
    dvphi: number;
}

// --- ORIGINAL IMPLEMENTATION ---
function getDerivatives(s: SimState): Derivatives {
    const r = s.r;
    const vphi = s.vphi;
    const vr = s.vr;

    const g = MU / (r * r);

    const dvr = (vphi * vphi) / r - g;
    const dvphi = -(vr * vphi) / r;
    const dr = vr;
    const dphi = vphi / r;

    return { dr, dphi, dvr, dvphi };
}

function integrateOriginal(s: SimState, dt: number): SimState {
    const k1 = getDerivatives(s);
    const k2 = getDerivatives({
        r: s.r + k1.dr * dt * 0.5,
        phi: s.phi + k1.dphi * dt * 0.5,
        vr: s.vr + k1.dvr * dt * 0.5,
        vphi: s.vphi + k1.dvphi * dt * 0.5
    });
    const k3 = getDerivatives({
        r: s.r + k2.dr * dt * 0.5,
        phi: s.phi + k2.dphi * dt * 0.5,
        vr: s.vr + k2.dvr * dt * 0.5,
        vphi: s.vphi + k2.dvphi * dt * 0.5
    });
    const k4 = getDerivatives({
        r: s.r + k3.dr * dt,
        phi: s.phi + k3.dphi * dt,
        vr: s.vr + k3.dvr * dt,
        vphi: s.vphi + k3.dvphi * dt
    });

    return {
        r: s.r + (k1.dr + 2 * k2.dr + 2 * k3.dr + k4.dr) * dt / 6,
        phi: s.phi + (k1.dphi + 2 * k2.dphi + 2 * k3.dphi + k4.dphi) * dt / 6,
        vr: s.vr + (k1.dvr + 2 * k2.dvr + 2 * k3.dvr + k4.dvr) * dt / 6,
        vphi: s.vphi + (k1.dvphi + 2 * k2.dvphi + 2 * k3.dvphi + k4.dvphi) * dt / 6
    };
}

// --- OPTIMIZED IMPLEMENTATION ---
function integrateOptimized(s: SimState, dt: number): SimState {
    const r = s.r;
    const phi = s.phi;
    const vr = s.vr;
    const vphi = s.vphi;

    // k1
    const g1 = MU / (r * r);
    const k1_dvr = (vphi * vphi) / r - g1;
    const k1_dvphi = -(vr * vphi) / r;
    const k1_dr = vr;
    const k1_dphi = vphi / r;

    // k2 state
    const r_k2 = r + k1_dr * dt * 0.5;
    const vr_k2 = vr + k1_dvr * dt * 0.5;
    const vphi_k2 = vphi + k1_dvphi * dt * 0.5;

    // k2
    const g2 = MU / (r_k2 * r_k2);
    const k2_dvr = (vphi_k2 * vphi_k2) / r_k2 - g2;
    const k2_dvphi = -(vr_k2 * vphi_k2) / r_k2;
    const k2_dr = vr_k2;
    const k2_dphi = vphi_k2 / r_k2;

    // k3 state
    const r_k3 = r + k2_dr * dt * 0.5;
    const vr_k3 = vr + k2_dvr * dt * 0.5;
    const vphi_k3 = vphi + k2_dvphi * dt * 0.5;

    // k3
    const g3 = MU / (r_k3 * r_k3);
    const k3_dvr = (vphi_k3 * vphi_k3) / r_k3 - g3;
    const k3_dvphi = -(vr_k3 * vphi_k3) / r_k3;
    const k3_dr = vr_k3;
    const k3_dphi = vphi_k3 / r_k3;

    // k4 state
    const r_k4 = r + k3_dr * dt;
    const vr_k4 = vr + k3_dvr * dt;
    const vphi_k4 = vphi + k3_dvphi * dt;

    // k4
    const g4 = MU / (r_k4 * r_k4);
    const k4_dvr = (vphi_k4 * vphi_k4) / r_k4 - g4;
    const k4_dvphi = -(vr_k4 * vphi_k4) / r_k4;
    const k4_dr = vr_k4;
    const k4_dphi = vphi_k4 / r_k4;

    return {
        r: r + (k1_dr + 2 * k2_dr + 2 * k3_dr + k4_dr) * dt / 6,
        phi: phi + (k1_dphi + 2 * k2_dphi + 2 * k3_dphi + k4_dphi) * dt / 6,
        vr: vr + (k1_dvr + 2 * k2_dvr + 2 * k3_dvr + k4_dvr) * dt / 6,
        vphi: vphi + (k1_dvphi + 2 * k2_dvphi + 2 * k3_dvphi + k4_dvphi) * dt / 6
    };
}

// --- BENCHMARK ---
const ITERATIONS = 200000;
const DT = 1.0;

const startState: SimState = {
    r: R_EARTH + 200000, // 200km altitude
    phi: 0,
    vr: 0,
    vphi: 7800 // Orbital velocity approx
};

console.log(`Benchmarking RK4 Integration (${ITERATIONS} iterations)`);

// Warmup
for(let i=0; i<1000; i++) integrateOriginal(startState, DT);
for(let i=0; i<1000; i++) integrateOptimized(startState, DT);

const startOrig = performance.now();
let stateOrig = { ...startState };
for (let i = 0; i < ITERATIONS; i++) {
    stateOrig = integrateOriginal(stateOrig, DT);
}
const timeOrig = performance.now() - startOrig;

const startOpt = performance.now();
let stateOpt = { ...startState };
for (let i = 0; i < ITERATIONS; i++) {
    stateOpt = integrateOptimized(stateOpt, DT);
}
const timeOpt = performance.now() - startOpt;

console.log(`Original:  ${timeOrig.toFixed(4)}ms`);
console.log(`Optimized: ${timeOpt.toFixed(4)}ms`);
console.log(`Speedup:   ${(timeOrig / timeOpt).toFixed(2)}x`);

// Validation
console.log('\nValidation:');
console.log('Orig r:', stateOrig.r.toFixed(4));
console.log('Opt r: ', stateOpt.r.toFixed(4));
const diff = Math.abs(stateOrig.r - stateOpt.r);
if (diff < 0.001) {
    console.log('✅ Results match');
} else {
    console.log(`❌ Results mismatch (diff: ${diff})`);
    throw new Error('Results mismatch');
}

export {};
