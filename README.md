# 🚀 DeltaV Lab - Professional Rocket Launch Simulation (v1.7.0)

Engineering-Grade Spaceflight Simulation. Features accurate physics using RK4 integration, atmospheric modeling, autonomous guidance, telemetry recording, modular vehicle assembly, and Kerbal Space Program-inspired controls.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
![Build](https://img.shields.io/badge/build-esbuild-yellow.svg)

## Features

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

### Controls
| Key | Action |
|-----|--------|
| `SPACE` | Launch / Stage |
| `S` | Force stage separation |
| `←` `→` | Steer (gimbal) |
| `Shift` | Throttle up |
| `Ctrl` | Throttle down |
| `X` | Cut engine |
| `G` | Toggle Flight Computer |
| `F` | Open Script Editor |
| `R` | Toggle Black Box Recording |
| `E` | Export Flight Data (CSV) |
| `A` | Toggle autopilot |
| `M` | Toggle map view |
| `.` `,` | Time warp |
| `1` `2` `3` | Camera modes |

### UI Features
- **Navball** - Attitude indicator with prograde marker
- **Telemetry** - Real-time altitude/velocity graphs
- **Advanced HUD** - Displays AoA, Stability Margin, Skin Temp, and TPS Status
- **Mission Log** - Timestamped event logging
- **Modular VAB** - Build custom rockets from 15+ parts with real-time stats

## Quick Start

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start local server
npm run serve
```

Then open http://localhost:8080

## Project Structure

```
├── src/
│   ├── types/           # TypeScript interfaces
│   │   ├── index.ts     # Core types (Vector2D, Vessel, GameState)
│   │   └── units.ts     # Branded unit types (Meters, Newtons)
│   ├── physics/         # Simulation engine
│   │   ├── Vessel.ts    # Base class with RK4 integration
│   │   ├── RocketComponents.ts  # Stage implementations
│   │   └── Particle.ts  # Visual effects
│   ├── utils/           # Helpers
│   │   ├── PIDController.ts
│   │   ├── SAS.ts       # Stability Assist System
│   │   ├── AudioEngine.ts
│   │   └── AssetLoader.ts
│   ├── ui/              # Interface components
│   ├── core/            # Game loop & input
│   ├── constants.ts     # Physics constants
│   ├── state.ts         # Global state
│   └── main.ts          # Entry point
├── dist/                # Compiled output
├── assets/              # Sprites
├── index.html
├── style.css
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

### Controls
- **G** - Toggle Flight Computer on/off
- **F** - Open Script Editor
- Scripts are saved to localStorage

## Black Box Telemetry Recorder (v1.6.0)

Records all flight variables at 20Hz for post-flight analysis.

### Recorded Data
- Time, Altitude, Velocity (X/Y), Speed
- Acceleration (X/Y), G-Force
- Pitch Angle, Gimbal Angle, Throttle
- Mass, Fuel, Dynamic Pressure (Q), Mach
- Angle of Attack, Skin Temperature, Engine State

### Export Formats
- **CSV** - Standard comma-separated values with headers
- **JSON** - Structured format with flight summary metadata

### Controls
- **R** - Toggle recording manually
- **E** - Export flight data to CSV
- Auto-starts on liftoff, auto-stops on crash

## Type Safety

This project uses **branded types** to prevent unit mixing at compile time:

```typescript
type Meters = number & { readonly __brand: 'meters' };
type Kilograms = number & { readonly __brand: 'kilograms' };

// This would cause a compile error:
const mass: Kilograms = altitude; // Error!
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to bundle |
| `npm run watch` | Watch mode for development |
| `npm run serve` | Start local HTTP server |

## Physics Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Gravity | 9.81 m/s² | Sea level |
| Earth Radius | 6,371,000 m | |
| Scale Height | 8,500 m | Atmospheric |
| Sea Level Density | 1.225 kg/m³ | |

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

Inspired by:
- Kerbal Space Program
- SpaceX landing sequences
- Real orbital mechanics

## Advanced Physics Details

### Aerodynamics & Stability
The simulation now calculates:
- **Center of Pressure (CP)** vs **Center of Mass (CoM)** relation
- **Stability Margin**: Positive when CP is behind CoM (stable), negative when ahead (unstable)
- **Lift & Drag**: Calculated based on Angle of Attack (AoA) and Mach number

### Thermal Protection
Re-entry and high-speed heating modeled via:
- **Sutton-Graves Equation**: Stagnation point heating based on velocity and nose radius
- **Stefan-Boltzmann Law**: Radiative cooling to environment/space
- **Ablation**: Mass loss and heat absorption when shield temperature critical

### Reliability & Failure Modes
- **Bathtub Curve**: Engines have "infant mortality" and "wear-out" phases.
- **Structural Fatigue**: High-G maneuvers accumulate stress, leading to potential structural failure.
- **Sensor Glitches**: Random telemetry noise simulating real-world sensor imperfections.

