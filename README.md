# Soft Paws — Physics Core 🐾

**Squishy 2D bodies, silhouette-derived contours and deformable image meshes, written in dependency-free JavaScript.**

This repository contains the technical core behind [Soft Paws](https://cats.trydoq.com/), a cozy mobile-friendly cat-merging game. It explores how a flat image can feel soft: compressing on impact, settling into a pile and reshaping under pressure while keeping a recognizable silhouette.

**[Play the complete game](https://cats.trydoq.com/)** · **[Browse the simulation](dist/physics.js)** · **[Explore mesh deformation](dist/warp.js)**

> This is a focused source-code repository with runnable tests, not the complete browser application. Photographic cats, sound recordings, environment artwork, account services and production configuration are not included. The game link requires email verification and provides five free new rounds per Pacific calendar day.

## Why this exists

The original interaction started with a simple idea: cats are very good at fitting into small spaces.

Making that idea playable introduced several technical challenges. A body should visibly deform without collapsing, neighboring outlines should separate instead of becoming tangled, and an image should follow the simulated boundary without exposing gaps or flipping its texture triangles.

This repository isolates those parts from the game's media and deployment setup. It provides a smaller codebase for reviewing the simulation, following the implementation and running repeatable procedural checks.

## What's included

### Particle-ring soft bodies

Each body uses a perimeter of **32 collision particles** rather than a full volumetric mesh. The solver combines skin, area and internal brace constraints to balance softness with shape retention.

The simulation includes particle-to-edge contacts, overlap recovery, support handling and sleeping bodies. These mechanisms help the pile settle and reduce unnecessary work once bodies are resting.

### Silhouette-derived geometry

The silhouette module derives a usable boundary from image alpha data, then prepares the contour and collision geometry.

Tests supply synthetic alpha images, so the geometry pipeline can be checked without shipping any third-party photographs or requiring a browser canvas.

### Image-mesh deformation

The deformation module creates a texture mesh and maps its vertices through a changing boundary. It also contains face-region protection and triangle-stabilization helpers used by the complete game.

This repository provides the geometry calculations. The full game's Canvas/WebGL renderer and image assets are outside this export.

### Merge rules

The game module combines matching body levels, calculates a mass-weighted merge position and velocity, tracks score and upcoming levels, and detects sustained overflow.

The named levels retain identifiers from Soft Paws. No corresponding photographs or recordings are bundled.

### Safe preference storage

The storage adapter allows preference access to fail gracefully when browser storage is unavailable. Session persistence exposes errors so a consuming application can handle an unsaved board explicitly.

## Architecture

| Module | Responsibility |
| --- | --- |
| [physics.js](dist/physics.js) | Body creation, constraint solving, contacts, resting and overlap recovery |
| [silhouette.js](dist/silhouette.js) | Alpha-contour extraction and bead geometry |
| [warp.js](dist/warp.js) | Mesh construction, boundary-driven deformation and stabilization |
| [game.js](dist/game.js) | Merge progression, scoring and round rules |
| [storage.js](dist/storage.js) | Safe access to browser preferences and session storage |

The modules use ES imports and exports. There are no npm runtime dependencies and no framework-specific components.

## Getting started

Use **Node.js 22.5 or later**.

```bash
git clone https://github.com/Helen123/soft-paws-physics.git
cd soft-paws-physics
npm test
```

No package installation is required to run the included checks.

There is no `npm start` server in this repository. For the complete interactive experience, use the [hosted game](https://cats.trydoq.com/).

### A minimal simulation

From a JavaScript module in the repository root:

```js
import { SoftWorld, center } from './dist/physics.js';

const world = new SoftWorld();
world.setBounds({ left: 12, right: 428, floor: 640 });

const body = world.spawn(0, 180, 70);

// Advance three seconds at a fixed timestep.
for (let frame = 0; frame < 180; frame++) {
  world.step(1 / 60);
}

console.log(center(body));
```

A browser application can connect these particle positions to its own renderer. The shape and texture helpers provide the next stage of that integration.

## Tests

The publication snapshot passes **34 Node.js tests** across seven test files.

The checks cover:

- Collision beads, constraints, area response and contour geometry.
- Resting contacts and sleeping behavior.
- Separation of overlapping body boundaries.
- Dense stacks and stability regressions.
- Synthetic alpha-image silhouette extraction.
- Local and non-affine texture deformation.
- Mesh stabilization under challenging poses.

All fixtures are procedural or numerical. No cat photos, recordings or environment images are required.

A passing test suite is evidence for the cases covered; it does not establish performance or correctness under every possible impact or on every device.

## Project layout

```text
soft-paws-physics/
├── dist/
│   ├── physics.js
│   ├── silhouette.js
│   ├── warp.js
│   ├── game.js
│   └── storage.js
├── tests/
│   ├── physics.test.js
│   ├── beads.test.js
│   ├── silhouette.test.js
│   ├── warp.test.js
│   ├── rest.test.js
│   ├── contact.test.js
│   ├── stability.test.js
│   └── fixtures/
│       └── former-softest.json
└── package.json
```

`dist/` contains the authored modules in this snapshot, not a generated framework bundle.

## Scope and limitations

This is a lightweight custom approximation of 2D soft-body behavior. It is not a general-purpose physics engine and does not implement continuous collision detection. Extreme speeds, compression or unusually dense configurations may require further validation and tuning.

The complete application has additional rendering, interface, audio, authentication, local-save and network-recovery systems. Those systems are intentionally excluded from this focused repository; their presence in the hosted game should not be confused with the contents of this code export.

No media files, account database, email keys, production deployment configuration or private repository history are included. This repository begins with a fresh source-only history.

## License

**No open-source license has been selected for the project code.** The source is publicly visible for review; that visibility does not itself grant a general license to copy, modify or redistribute it. No project-wide reuse license is granted here.

The `private` field in `package.json` prevents accidental npm publication; it does not make this GitHub repository private.

## About Soft Paws

Soft Paws combines photographic cats, soft-body deformation, natural material environments and rain-and-snoring ambience into a small interactive game. This repository focuses on the simulation and image-deformation work behind that experience.

[Try Soft Paws →](https://cats.trydoq.com/)
