export const saidGuides = [
  {
    slug: "first-boot",
    title: "First boot, first board",
    blurb:
      "Install Said and Done., point it at your notes, pick its face, and land on a working board — in about three minutes.",
    sections: [
      { id: "install", label: "Install" },
      { id: "notes", label: "Point it at your notes" },
      { id: "face", label: "Pick its face" },
      { id: "questions", label: "One honest question" },
      { id: "first-card", label: "The first card" },
    ],
  },
  {
    slug: "the-keyboard",
    title: "The keyboard is the desk",
    blurb:
      "Every flow without the mouse: moving between cards, opening them, filing them, finding them.",
    sections: [
      { id: "one-rule", label: "The one rule" },
      { id: "moving", label: "Moving around" },
      { id: "making", label: "Making and moving" },
      { id: "finding", label: "Finding" },
    ],
  },
  {
    slug: "agents-at-the-desk",
    title: "Let your agent in",
    blurb:
      "Connect an MCP agent to your desk and watch it file its own work under its own name.",
    sections: [
      { id: "connect", label: "Connect" },
      { id: "real-work", label: "Ask for something real" },
      { id: "together", label: "Work a card together" },
      { id: "limits", label: "What it can't do" },
    ],
  },
  {
    slug: "tunnel-cloudflared",
    title: "A road home: cloudflared",
    blurb:
      "Put your desk behind a Cloudflare Tunnel — a throwaway URL in one command, or a hostname of your own that survives reboots.",
    sections: [
      { id: "arm", label: "Arm the Remote Client" },
      { id: "quick", label: "The one-command road" },
      { id: "named", label: "A road with your name on it" },
      { id: "phone", label: "From your phone" },
    ],
  },
  {
    slug: "tunnel-ngrok",
    title: "A road home: ngrok",
    blurb:
      "The fastest way to hand your desk a public URL — one command after a one-time token.",
    sections: [
      { id: "arm", label: "Arm the Remote Client" },
      { id: "tunnel", label: "Open the road" },
      { id: "phone", label: "From your phone" },
    ],
  },
  {
    slug: "tunnel-tailscale",
    title: "A road home: Tailscale",
    blurb:
      "The private road — your desk reachable from your own devices only, no public URL at all unless you ask for one.",
    sections: [
      { id: "arm", label: "Arm the Remote Client" },
      { id: "serve", label: "Your devices only" },
      { id: "funnel", label: "Or the public road" },
      { id: "phone", label: "From your phone" },
    ],
  },
];
