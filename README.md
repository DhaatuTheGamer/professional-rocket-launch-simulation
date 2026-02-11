# 🚀 DeltaV Lab - Professional Rocket Launch Simulation (v3.1.0)

Engineering-Grade Spaceflight Simulation. Features accurate physics using RK4 integration, atmospheric modeling, environmental hazards, autonomous guidance, telemetry recording, modular vehicle assembly, and Kerbal Space Program-inspired controls.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![Build](https://img.shields.io/badge/build-esbuild-yellow.svg)
![Tests](https://img.shields.io/badge/tests-vitest-green.svg)

## Features

### Mission Operations & analysis (v3.0.0)
- **Remote Telemetry** - Broadcast live flight data to a second monitor or device via `telemetry.html`.
- **Post-Flight Analysis** - Replay missions with `analysis.html`, featuring synchronized data charts, time scrubbing, and 3D replay.
- **Flight Data Recorder** - Import/Export flight logs in CSV/JSON formats for external analysis.
- **Advanced Visualization** - Visual wind vectors, safe flight corridors, and thermal heatmaps.

### Safety Systems (v2.7.0)
New professional-grade safety features for training and operations:
- **Flight Termination System (FTS)** - Independent system with SAFE, ARM, and DESTRUCT modes. Automatically triggers if the rocket breaches the safety corridor.
- **Launch Checklist** - Interactive Go/No-Go checklist that gates the launch sequence.
- **Fault Injection System (FIS)** - Instructor tool to inject failures (Engine Flameout, Gimbal Lock, Sensor Glitch, Fuel Leak) for emergency training.

### Engineering Improvements (v2.7.0)
- **Deterministic Physics** - Physics loop runs in a Web Worker for consistent 50Hz simulation independent of frame rate.
- **Vitest Testing** - Comprehensive unit test suite covering physics, safety logic, and state management.
- **Strict State Management** - Redux-like store pattern for predictable state updates.

### Mission Control & Orbital Planning
- **Orbital Maneuver Planner** - Calculate burns for Circularization and Hohmann Transfers.
- **Ground Track Visualization** - Mercator map projection of rocket path and impact zone.
- **Spherical Physics** - Accurate latitude/longitude calculation based on downrange distance.

### Physics Engine
- **RK4 Integration** - 4th order Runge-Kutta for accurate orbital mechanics
- **Advanced Aerodynamics** - Lift/Drag calculation based on Angle of Attack (AoA) & Center of Pressure (CP)
- **Thermal Protection System** - Skin temperature simulation with ablation & radiative cooling
- **Atmospheric Drag** - Transonic effects with Mach-dependent drag coefficient
- **Inverse-Square Gravity** - Realistic orbital mechanics
- **Pressure-Dependent Isp** - Engine efficiency varies with altitude
- **Component Reliability** - Probabilistic failure modes (engine flameout, structural fatigue, sensor glitches)

### Modular Vehicle Assembly (v1.7.0)
Build custom rockets from modular parts in the VAB:

**Parts Catalog:**
| Category | Parts |
|----------|-------|
| Engines | Merlin 1D, Merlin Vacuum, Raptor 2, RL-10 |
| Tanks | Small (5t), Medium (15t), Large (30t), Jumbo (50t) |
| Avionics | Basic (SAS), Advanced (SAS + RCS) |
| Structure | Payload Fairings (S/L), Stage Decouplers |
| Boosters | SRBs (Small, Large) |

**Features:**
- Drag-and-drop part stacking
- Multi-stage configuration with decouplers
- Real-time Delta-V and TWR calculation
- Save/Load blueprints to localStorage
- Preset rockets (Falcon 9, Simple Rocket)

### Rocket Stages
| Stage | Description |
|-------|-------------|
| **FullStack** | Initial combined rocket |
| **Booster** | First stage with landing autopilot |
| **UpperStage** | Second stage with payload fairing |
| **Payload** | Deployable satellite |

## 🎮 How to Fly: Controls & Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `SPACE` | **Launch** / **Stage** | Pre-launch / In-flight |
| `S` | Force Staging | Separation override |
| `Shift` | Throttle Up | Increments of 10% |
| `Ctrl` | Throttle Down | Decrements of 10% |
| `X` | Cut Engine | Instant 0% throttle |
| `←` `→` | Steer (Yaw) | Vectoring |
| `A` | Toggle Autopilot | Landing / Ascent modes |
| `G` | Toggle Flight Computer | Activates programmed script |
| `F` | Open Script Editor | Edit mission scripts |
| `C` | Toggle Checklist | View Launch Checklist |
| `T` | Arm/Disarm FTS | Safety system |
| `R` | Toggle Black Box | Start/Stop recording |
| `E` | Export Data | Download CSV telemetry |
| `M` | Toggle Map View | Ground track & orbit |
| `Ctrl+I` | Toggle Fault Injector | Instructor Panel |
| `.` `,` | Time Warp | Speed up / Slow down |
| `1`-`3` | Camera Modes | 1:Fixed, 2:Follow, 3:Onboard |

## 📋 Mission Walkthrough: Step-by-Step

**1. Pre-Launch Configuration**
- Open the **VAB** and select "Falcon 9" preset.
- Click "Go to Pad".
- Press `C` to open the **Launch Checklist**.
- Verify Wind Conditions on HUD (< 15 m/s).
- Click "Verify" on all checklist items until Launch Status is **GO**.

**2. Liftoff**
- Press `SPACE` to ignite engines.
- Monitor TWR on the HUD; ensure it > 1.0.
- Rocket will clear the tower.

**3. Gravity Turn**
- At **1,000m** altitude, tap `→` (Right Arrow) to tilt the rocket slightly (pitch ~85°).
- The rocket will naturally follow the prograde marker due to aerodynamics.
- Keep aerodynamic stress (Max Q) in check by throttling down if necessary around 10km.

**4. Staging**
- Monitor Fuel Gauge.
- When First Stage fuel runs out (or manually), press `SPACE` to **Stage**.
- The booster will separate, and the Second Stage engine will ignite.

**5. Orbital Insertion**
- Pitch down to ~0° (parallel to horizon) once above 60km.
- Accelerate until Velocity > **7,500 m/s**.
- Press `X` to cut engines once Perigee > 150km.

**6. Safety & Emergencies**
- If the rocket deviates from course, press `T` to **ARM** the Flight Termination System.
- Click the red **DESTRUCT** button in the FTS panel to terminate the flight safely.

## Quick Start

```bash
# Install dependencies
npm install

# Run Tests (New!)
npm test

# Build & Start local server
npm run dev
```

Then open http://localhost:8080

## Project Structure

```
├── src/
│   ├── types/           # TypeScript interfaces (Units, GameState)
│   ├── physics/         # Core Engine (RK4, Aerodynamics)
│   ├── core/            # Game Loop, PhysicsWorker, SimulationStore
│   ├── safety/          # FTS, Checklist, FaultInjector
│   ├── guidance/        # FlightComputer, Scripts
│   ├── ui/              # HUD, Editors, Panels
│   ├── telemetry/       # BlackBox, Exporter
│   └── main.ts          # Entry point
├── tests/               # Vitest Unit Tests
├── dist/                # Compiled output
└── package.json
```

## Flight Computer (v1.5.0)

Autonomous guidance system with a custom DSL for mission scripts.

### DSL Syntax
```
WHEN <condition> THEN <action>
WHEN <condition> AND <condition> THEN <action>
```

**Conditions:** `ALTITUDE`, `VELOCITY`, `APOGEE`, `FUEL`, `TIME`  
**Operators:** `>`, `<`, `>=`, `<=`, `==`  
**Actions:** `PITCH <degrees>`, `THROTTLE <0-100>`, `STAGE`, `SAS <OFF|STABILITY|PROGRADE|RETROGRADE>`

### Example Script
```
# Gravity Turn to Orbit
WHEN ALTITUDE > 1000 THEN PITCH 80
WHEN ALTITUDE > 10000 THEN PITCH 60
WHEN ALTITUDE > 30000 THEN PITCH 45
WHEN APOGEE > 100000 THEN THROTTLE 0
```

## Advanced Physics Details

### Aerodynamics & Stability
The simulation now calculates:
- **Center of Pressure (CP)** vs **Center of Mass (CoM)** relation
- **Stability Margin**: Positive when CP is behind CoM (stable), negative when ahead (unstable)
- **Lift & Drag**: Calculated based on Angle of Attack (AoA) and Mach number

### Thermal Protection
- **Sutton-Graves Equation**: Stagnation point heating based on velocity and nose radius
- **Ablation**: Mass loss and heat absorption when shield temperature critical

### Reliability & Failure Modes
- **Bathtub Curve**: Engines have "infant mortality" and "wear-out" phases.
- **Sensor Glitches**: Random telemetry noise simulating real-world sensor imperfections.

### Environmental Hazards (v1.8.0)
- **Wind Shear Layers**: Altitude-based wind profiles.
- **Gusts & Turbulence**: Dryden-style turbulence model.
- **Go/No-Go Launch Conditions**: Real-time evaluation based on surface wind limits.

## License

MIT License - See [LICENSE](LICENSE) for details.

