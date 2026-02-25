
const R_EARTH = 6371000;
const GRAVITY = 9.8;
const MU = GRAVITY * R_EARTH * R_EARTH;

interface SimState {
    r: number;
    phi: number;
    vr: number;
    vphi: number;
}

function integrateInline(s: SimState, dt: number, steps: number): SimState {
    let r = s.r;
    let phi = s.phi;
    let vr = s.vr;
    let vphi = s.vphi;

    const dtHalf = dt * 0.5;
    const dtSixth = dt / 6.0;

    for (let i = 0; i < steps; i++) {
        // k1
        const inv_r = 1.0 / r;
        const k1_dphi = vphi * inv_r;
        const g1 = MU * inv_r * inv_r;
        const k1_dvr = vphi * k1_dphi - g1;
        const k1_dvphi = -vr * k1_dphi;
        const k1_dr = vr;

        // k2
        const r_k2 = r + k1_dr * dtHalf;
        const inv_r_k2 = 1.0 / r_k2;
        const vr_k2 = vr + k1_dvr * dtHalf;
        const vphi_k2 = vphi + k1_dvphi * dtHalf;

        const k2_dphi = vphi_k2 * inv_r_k2;
        const g2 = MU * inv_r_k2 * inv_r_k2;
        const k2_dvr = vphi_k2 * k2_dphi - g2;
        const k2_dvphi = -vr_k2 * k2_dphi;
        const k2_dr = vr_k2;

        // k3
        const r_k3 = r + k2_dr * dtHalf;
        const inv_r_k3 = 1.0 / r_k3;
        const vr_k3 = vr + k2_dvr * dtHalf;
        const vphi_k3 = vphi + k2_dvphi * dtHalf;

        const k3_dphi = vphi_k3 * inv_r_k3;
        const g3 = MU * inv_r_k3 * inv_r_k3;
        const k3_dvr = vphi_k3 * k3_dphi - g3;
        const k3_dvphi = -vr_k3 * k3_dphi;
        const k3_dr = vr_k3;

        // k4
        const r_k4 = r + k3_dr * dt;
        const inv_r_k4 = 1.0 / r_k4;
        const vr_k4 = vr + k3_dvr * dt;
        const vphi_k4 = vphi + k3_dvphi * dt;

        const k4_dphi = vphi_k4 * inv_r_k4;
        const g4 = MU * inv_r_k4 * inv_r_k4;
        const k4_dvr = vphi_k4 * k4_dphi - g4;
        const k4_dvphi = -vr_k4 * k4_dphi;
        const k4_dr = vr_k4;

        // Update
        r += (k1_dr + 2 * k2_dr + 2 * k3_dr + k4_dr) * dtSixth;
        phi += (k1_dphi + 2 * k2_dphi + 2 * k3_dphi + k4_dphi) * dtSixth;
        vr += (k1_dvr + 2 * k2_dvr + 2 * k3_dvr + k4_dvr) * dtSixth;
        vphi += (k1_dvphi + 2 * k2_dvphi + 2 * k3_dvphi + k4_dvphi) * dtSixth;
    }

    return { r, phi, vr, vphi };
}

// Baseline
function integrateCurrent(s: SimState, dt: number, steps: number): SimState {
    let r = s.r;
    let phi = s.phi;
    let vr = s.vr;
    let vphi = s.vphi;

    for (let j = 0; j < steps; j++) {
        // k1
        const g1 = MU / (r * r);
        const k1_dvr = (vphi * vphi) / r - g1;
        const k1_dvphi = -(vr * vphi) / r;
        const k1_dr = vr;
        const k1_dphi = vphi / r;

        // k2
        const r_k2 = r + k1_dr * dt * 0.5;
        const vr_k2 = vr + k1_dvr * dt * 0.5;
        const vphi_k2 = vphi + k1_dvphi * dt * 0.5;

        const g2 = MU / (r_k2 * r_k2);
        const k2_dvr = (vphi_k2 * vphi_k2) / r_k2 - g2;
        const k2_dvphi = -(vr_k2 * vphi_k2) / r_k2;
        const k2_dr = vr_k2;
        const k2_dphi = vphi_k2 / r_k2;

        // k3
        const r_k3 = r + k2_dr * dt * 0.5;
        const vr_k3 = vr + k2_dvr * dt * 0.5;
        const vphi_k3 = vphi + k2_dvphi * dt * 0.5;

        const g3 = MU / (r_k3 * r_k3);
        const k3_dvr = (vphi_k3 * vphi_k3) / r_k3 - g3;
        const k3_dvphi = -(vr_k3 * vphi_k3) / r_k3;
        const k3_dr = vr_k3;
        const k3_dphi = vphi_k3 / r_k3;

        // k4
        const r_k4 = r + k3_dr * dt;
        const vr_k4 = vr + k3_dvr * dt;
        const vphi_k4 = vphi + k3_dvphi * dt;

        const g4 = MU / (r_k4 * r_k4);
        const k4_dvr = (vphi_k4 * vphi_k4) / r_k4 - g4;
        const k4_dvphi = -(vr_k4 * vphi_k4) / r_k4;
        const k4_dr = vr_k4;
        const k4_dphi = vphi_k4 / r_k4;

        // Update State
        r += ((k1_dr + 2 * k2_dr + 2 * k3_dr + k4_dr) * dt) / 6;
        phi += ((k1_dphi + 2 * k2_dphi + 2 * k3_dphi + k4_dphi) * dt) / 6;
        vr += ((k1_dvr + 2 * k2_dvr + 2 * k3_dvr + k4_dvr) * dt) / 6;
        vphi += ((k1_dvphi + 2 * k2_dvphi + 2 * k3_dvphi + k4_dvphi) * dt) / 6;
    }
    return { r, phi, vr, vphi };
}

const ellipticalState: SimState = {
    r: R_EARTH + 200000,
    phi: 0,
    vr: 0,
    vphi: 9500 // High velocity
};

console.log("Elliptical Orbit Test (Higher Velocity)");

console.log("Baseline (dt=1.0, 2000 steps):");
const s1 = integrateCurrent(ellipticalState, 1.0, 2000);
console.log(`r: ${s1.r.toFixed(2)}, phi: ${s1.phi.toFixed(4)}`);

console.log("\nLarger Step (dt=5.0, 400 steps):");
const s5 = integrateCurrent(ellipticalState, 5.0, 400);
console.log(`r: ${s5.r.toFixed(2)}, phi: ${s5.phi.toFixed(4)}`);
console.log(`Diff r: ${(s5.r - s1.r).toFixed(2)}`);

console.log("\nOptimized Math (dt=5.0, 400 steps):");
const sOpt5 = integrateInline(ellipticalState, 5.0, 400);
console.log(`r: ${sOpt5.r.toFixed(2)}, phi: ${sOpt5.phi.toFixed(4)}`);
console.log(`Diff r: ${(sOpt5.r - s1.r).toFixed(2)}`);

// Benchmark
const ITERS = 1000;
console.log(`\nBenchmark (${ITERS} iters):`);

const t0 = performance.now();
for(let i=0; i<ITERS; i++) integrateCurrent(ellipticalState, 1.0, 2000);
const t1 = performance.now();
console.log(`Current (dt=1): ${(t1-t0).toFixed(2)}ms`);

const t8 = performance.now();
for(let i=0; i<ITERS; i++) integrateInline(ellipticalState, 5.0, 400);
const t9 = performance.now();
console.log(`Opt Math (dt=5): ${(t9-t8).toFixed(2)}ms`);
