/**
 * All wording for the public landing page lives here so it can be edited
 * without touching components. Every claim below is something the app does
 * today; keep it that way (no compliance or hardware promises, and no dollar
 * amounts or plan limits until they are real: pricing is quoted through sales).
 */

import { DEMO_MODE } from "./config";

/**
 * Where the "Open the console" buttons go. With real accounts, visitors who
 * are not signed in would be bounced from /map to /login anyway, so go there
 * directly (a signed-in visitor is forwarded on to /map by the login page).
 * In demo mode there is no sign-in, so go straight to the map.
 */
const CONSOLE_HREF = DEMO_MODE ? "/map" : "/login";

export const siteCopy = {
  consoleHref: CONSOLE_HREF,

  nav: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "The console", href: "/#console" },
    { label: "Why MileWire", href: "/#why" },
    { label: "Pricing", href: "/#pricing" },
  ],

  hero: {
    eyebrow: "Fleet tracking for small and mid-size fleets",
    title: "Fleet tracking without the telematics project.",
    lead: "MileWire turns the phones your drivers already carry into a live fleet map, drive replay and clean mileage reports. No dongles to install, no enterprise rollout, no dashboard you will never open.",
    primary: { label: "Open the console", to: CONSOLE_HREF },
    secondary: { label: "See how it works", to: "#how-it-works" },
  },

  strip: "Live map  ·  Drive replay  ·  Mileage reports  ·  From the phones your drivers already have",

  how: {
    eyebrow: "How it works",
    title: "Set up in three steps",
    lead: "No installers, no hardware orders. A manager and a phone are enough to start.",
    steps: [
      {
        title: "Create your fleet",
        body: "Sign in to the web console and create a fleet. MileWire gives you a join code for your drivers.",
      },
      {
        title: "Drivers join with a code",
        body: "Each driver opens the MileWire app and enters the code. Tracking starts by itself once the vehicle is moving.",
      },
      {
        title: "Watch it live",
        body: "See every driver on one map, replay any drive after the fact, and pull mileage when you need it.",
      },
    ],
  },

  lineup: {
    eyebrow: "Any vehicle",
    title: "Vans, trucks and cars report the same way",
    lead: "Assign a driver to a vehicle and the history follows. MileWire tracks the driver's phone, so a mixed fleet does not need mixed hardware.",
  },

  console: {
    eyebrow: "The console",
    title: "Everything a small fleet actually uses",
    lead: "One console built around the questions fleet owners ask every day: where is everyone, what happened on that trip, and how many miles did each vehicle do?",
    features: [
      { title: "Live map", body: "Every driver on one map, updating as they move." },
      { title: "Drive replay", body: "Play back any drive on the map, at the speed you choose." },
      { title: "3D focus", body: "Follow one driver in 3D, or review a drive from a chase or in-car camera." },
      { title: "Speed and motion", body: "Speed charts and motion-sensor readings, with bumps flagged." },
      { title: "Vehicles", body: "Assign a driver to a vehicle and keep the history straight." },
      { title: "Mileage reports", body: "Odometer-based mileage as CSV, or print straight to PDF." },
      { title: "Fleets and drivers", body: "Your roster, join code and recent activity in one place." },
    ],
    cta: { label: "Open the console", to: CONSOLE_HREF },
    focus: {
      title: "Replay a drive on a real 3D city",
      body: "Scrub any recorded drive in 3D, with the route and bump markers laid over photorealistic city tiles where they are available, and plain terrain where they are not.",
      modes: [
        { name: "Orbit", note: "Circle the vehicle and look from any side." },
        { name: "Chase", note: "Follow from behind, the way a driver sees the road ahead." },
        { name: "In-car", note: "Ride along from the driver's seat." },
      ],
    },
  },

  charts: {
    eyebrow: "Speed and motion",
    title: "See what happened on every drive",
    lead: "Speed, motion-sensor readings and bump markers for each trip, with distance per day across the fleet. These are the console's own charts, drawn from a real drive recorded on a phone in our demo fleet.",
  },

  why: {
    eyebrow: "Why MileWire",
    title: "Built for the fleet you actually run",
    lead: "Enterprise telematics platforms are designed for thousands of vehicles and a team to administer them. MileWire is the lighter option.",
    points: [
      {
        title: "No hardware",
        body: "No telematics boxes, no dash cams, no install appointments. Your drivers' phones record the drive.",
      },
      {
        title: "Just the essentials",
        body: "Live location, trip history and mileage, without the compliance suites and add-on modules built for very large fleets.",
      },
      {
        title: "Respectful of drivers",
        body: "The app records GPS position and motion-sensor readings, nothing else. Drives stay on the phone unless the driver joins your fleet with a code.",
      },
      {
        title: "Run it yourself",
        body: "Set up a fleet, add vehicles and read a mileage report without an implementation team or a training course.",
      },
    ],
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Two ways to run MileWire",
    lead: "Pricing is quoted for your fleet size, so you only pay for the drivers you actually track. Tell us about your fleet and we will come back with a number.",
    plans: [
      {
        id: "fleet",
        name: "Fleet",
        audience: "For a single fleet.",
        price: "Custom quote",
        priceNote: "Based on the number of drivers",
        features: [
          "Live map of every driver",
          "Drive replay at the speed you choose",
          "Mileage reports as CSV or PDF",
          "Speed and motion charts, bumps flagged",
          "Vehicles and driver assignments",
        ],
      },
      {
        id: "multi-fleet",
        name: "Multi-fleet",
        audience: "For operators running several fleets.",
        price: "Custom quote",
        priceNote: "Based on fleets and drivers",
        features: [
          "Everything in Fleet",
          "Several fleets in one console",
          "Switch between fleets without signing out",
          "3D focus on any live driver",
          "Talk to us about rollout and onboarding",
        ],
      },
    ],
    cta: "Contact sales",
  },

  closing: {
    title: "Track your fleet without taking on a telematics project.",
    body: "Create a fleet, share the join code, and see your first drive on the map.",
    primary: { label: "Open the console", to: CONSOLE_HREF },
    secondary: { label: "Sign in", to: "/login" },
  },

  footer: {
    tagline: "Live fleet tracking, drive replay and mileage reports, from the phones your drivers already carry.",
  },
} as const;
