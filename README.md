# 🚀 DeltaV Lab AKA Professional Rocket Launch Simulation

Engineering-Grade Spaceflight Simulation. Features accurate physics using RK4 integration, atmospheric modeling, and Kerbal Space Program-inspired controls.

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
| `A` | Toggle autopilot |
| `M` | Toggle map view |
| `.` `,` | Time warp |
| `1` `2` `3` | Camera modes |

### UI Features
- **Navball** - Attitude indicator with prograde marker
- **Telemetry** - Real-time altitude/velocity graphs
- **Advanced HUD** - Displays AoA, Stability Margin, Skin Temp, and TPS Status
- **Mission Log** - Timestamped event logging
- **VAB** - Configure rocket before launch (fuel, thrust, drag)

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

