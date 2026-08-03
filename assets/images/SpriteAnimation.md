You are a senior React, Vite, TypeScript and animation engineer.

You are working on an existing production Vite PWA.

DO NOT change existing business logic.

DO NOT modify existing layouts.

DO NOT introduce breaking changes.

Your ONLY responsibility is implementing performant sprite animations.

Use the supplied sprite sheets.

The application is already responsive.

The animations must remain responsive.

General Requirements

Create a reusable Sprite Animation system.

Use

requestAnimationFrame()

instead of timers whenever possible.

Animations must pause automatically when

tab hidden
browser minimized

Use

IntersectionObserver

so off-screen animations stop rendering.

Use

transform: translate3d()

instead of changing left/top.

Never create unnecessary React rerenders.

Animation state must live outside React rendering whenever possible.

Target

60fps

Assets

Each sprite sheet contains numbered frames.

Frame dimensions must be calculated automatically.

Never hardcode frame sizes.

Support arbitrary sprite counts.

Build a reusable component

Create

<SpriteAnimator />

Props

image

frames

fps

loop

autoplay

reverse

scale

speed

direction

pauseWhenHidden

pauseWhenOffscreen

onFinished

Support

Idle

Walk

Run

Jump

Sit

Sleep

Tail Wag

Money Float

Money Spin

Money Drift

Car Idle

Car Driving

Car Brake

Headlights On

Headlights Off

Door Open

Door Close

Hood Open

Hood Close

Medicine Bottle Standing

Bottle Falling

Cap Flying

Pills Pouring

Pills Scattering

Pills Settling

Bernese Mountain Dog

Use the dog animation inside

Dashboard

Loading screens

Sidebar

Empty states

Background decorations

Hover events

Idle animation

Randomly choose

Walk

Sit

Tail wag

Jump

Sleep

The dog should occasionally walk across the screen.

Never block UI interaction.

Dollar Bills

Bills should

Float

Rotate

Bend

Drift

Randomly spawn

Fade away

Maximum

6 visible

Never overlap important UI.

Seat Ateca

Use only when appropriate.

Driving animation

Appears

Stops

Doors open

Driver exits

Doors close

Headlights blink

Hood opens

Hood closes

May occasionally drive across background.

Pills

Bottle begins standing.

Random event

Bottle tips over.

Cap pops off.

Pills spill naturally.

Pills bounce.

Roll.

Stop.

Remain on screen briefly.

Fade away.

Randomize

rotation

velocity

timing

starting position

Performance

Lazy load animations.

Tree shake unused assets.

Do not render animations until needed.

Support reduced motion.

Respect

prefers-reduced-motion
Accessibility

Animations must never interfere with keyboard navigation.

Animations should be aria-hidden.

Decorative only.

Reusability

Everything must be configurable.

Adding another sprite sheet should require only

< SpriteAnimator
image="..."
frames={35}
fps={14}
/>

No duplicated code.

Code Quality

TypeScript only.

Strict mode.

ESLint clean.

Reusable hooks.

No memory leaks.

No unnecessary React state.

Use modern browser APIs.

Deliverables

Produce

SpriteAnimator.tsx

useSpriteAnimation.ts

spriteUtils.ts

animations.ts

animationTypes.ts

README.md

Include comments explaining every important decision.

Where to place each animation in your app

Since I remember your app structure from this conversation, I'd suggest:

App Area	Animation
Dashboard	Bernese dog idle/walking
Loading screens	Bernese dog running
Shift pages	Money drifting occasionally
Statistics/Finance	Floating $100 bills
Vehicle/Field Operations (if applicable)	SEAT Ateca driving
Medication/Medical modules	Pill bottle spill animation
Empty states	Dog sitting or sleeping
Notifications	Small tail wag or money flutter
About page	Dog walking across the footer