// The hourglass icon changes with what you're doing (meeting, working, date, break, ready, resting)
// and takes its colours from the current theme

const ICON_PALETTES = {
  feminine: {
    ink: "#a14e67", glass: "#fff", sand: "#e8a87c", lines: "#d77a93", sweat: "#8ecae6",
    bg: { meeting: "#f6eaf5", task: "#fff4ef", project: "#f4eefa", date: "#fff0f3", break: "#fdf3e7" },
    blocks: ["#e8a87c", "#9b6fb5", "#d77a93"],
    briefcase: "#c48b7a", handle: "#8a5a4a", alert: "#d77a93", screen: "#f6d6dc", board: "#9b6fb5",
    blanket: "#e86a92", partnerPink: "#e86a92", partnerBlue: "#7aa6d8", blush: "#f6c1cf",
    night: { bg: "#4a2c3d", ink: "#fdf6f4", glass: "#6b3f57", sand: "#f4c7a1", moon: "#f6d6dc", z: "#f6c1cf" },
  },
  "old-money": {
    ink: "#14213a", glass: "#fffdf8", sand: "#b89b5e", lines: "#b89b5e", sweat: "#8fa9c4",
    bg: { meeting: "#efe8d8", task: "#f3ecdf", project: "#eee9dc", date: "#f7ece8", break: "#ece6d6" },
    blocks: ["#b89b5e", "#6e1f2b", "#2f5d50"],
    briefcase: "#7a4a2a", handle: "#4a2c18", alert: "#6e1f2b", screen: "#d4b876", board: "#6e1f2b",
    blanket: "#6e1f2b", partnerPink: "#c98b8b", partnerBlue: "#4a6fa5", blush: "#e8c4c4",
    night: { bg: "#0f182b", ink: "#f6f1e6", glass: "#22335a", sand: "#d4b876", moon: "#d4b876", z: "#b9c0cf" },
  },
  neutral: {
    ink: "#3a4626", glass: "#fff", sand: "#c2a878", lines: "#6b7d47", sweat: "#7fb7c4",
    bg: { meeting: "#e7ecdc", task: "#f3efe3", project: "#ecefe2", date: "#f5ece6", break: "#f1ecd9" },
    blocks: ["#c2a878", "#8a5a3b", "#6b7d47"],
    briefcase: "#8a5a3b", handle: "#5c3b26", alert: "#8a5a3b", screen: "#a3b18a", board: "#8a5a3b",
    blanket: "#a3b18a", partnerPink: "#d98f8a", partnerBlue: "#6f93a8", blush: "#ecc9c3",
    night: { bg: "#262b1f", ink: "#eef0e2", glass: "#3a4626", sand: "#c2a878", moon: "#e9d8a6", z: "#a3b18a" },
  },
};

function iconPalette() {
  return ICON_PALETTES[document.documentElement.dataset.theme] || ICON_PALETTES.neutral;
}

// The hourglass body, drawn around the centre of a 64x64 square
function hourglass(p, { ink = p.ink, glass = p.glass, sand = p.sand, face = "happy", transform = "" } = {}) {
  const faces = {
    happy: `<circle cx="29" cy="34" r="1.7" fill="${ink}"/><circle cx="35" cy="34" r="1.7" fill="${ink}"/>
            <path d="M29.5 37 q2.5 2.2 5 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`,
    focused: `<path d="M27.5 32 l3 1 M36.5 32 l-3 1" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>
              <circle cx="29.5" cy="34.5" r="1.6" fill="${ink}"/><circle cx="34.5" cy="34.5" r="1.6" fill="${ink}"/>
              <path d="M30.5 37.8 h3" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`,
    love: `<circle cx="29" cy="34" r="1.7" fill="${ink}"/><circle cx="35" cy="34" r="1.7" fill="${ink}"/>
           <circle cx="27" cy="37" r="1.5" fill="${p.blush}"/><circle cx="37" cy="37" r="1.5" fill="${p.blush}"/>
           <path d="M29.5 37 q2.5 2.2 5 0" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`,
    sleepy: `<path d="M27.5 34 q1.5 1.5 3 0 M33.5 34 q1.5 1.5 3 0" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round"/>
             <path d="M31 37.5 q1 0.8 2 0" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>`,
  };
  return `<g transform="${transform}">
    <path d="M24 12 C24 21 31 24 31 28 C31 32 24 35 24 44 H40 C40 35 33 32 33 28 C33 24 40 21 40 12 Z" fill="${glass}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M27 16 H37 C36 21 33 23 32 25.5 C31 23 28 21 27 16 Z" fill="${sand}"/>
    <path d="M32 27 V30.5" stroke="${sand}" stroke-width="1.6"/>
    <path d="M26.5 43 C28 39.5 36 39.5 37.5 43 Z" fill="${sand}"/>
    <rect x="20" y="8" width="24" height="5" rx="2.5" fill="${ink}"/>
    <rect x="20" y="43" width="24" height="5" rx="2.5" fill="${ink}"/>
    ${faces[face]}
  </g>`;
}

const runningLegs = (ink) => `
  <path d="M27 48 L22 55 L17 54" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M37 48 L42 53 L47 51" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;

const speedLines = (color) => `<path d="M5 22 h7 M3 29 h9 M5 36 h7" stroke="${color}" stroke-width="2.6" stroke-linecap="round" opacity="0.55"/>`;

const ICONS = {
  // In a meeting: briefcase in hand
  meeting: {
    label: "In a meeting",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.meeting}"/>${speedLines(p.lines)}
      <path d="M24 27 L17 23 L14 26" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${runningLegs(p.ink)}${hourglass(p)}
      <path d="M40 30 L46 35" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M46.5 33 v-2.5 h5 v2.5" fill="none" stroke="${p.handle}" stroke-width="2"/>
      <rect x="43" y="33" width="12" height="9" rx="2" fill="${p.briefcase}"/>
      <rect x="52" y="6" width="4" height="9" rx="2" fill="${p.alert}"/><circle cx="54" cy="18.5" r="2" fill="${p.alert}"/>`,
  },

  // Working on a task: typing on a laptop
  task: {
    label: "Working on a task",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.task}"/>
      <path d="M28 48 L27 55 L22 56 M36 48 L37 55 L42 56" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${hourglass(p, { face: "focused", transform: "translate(-9 0)" })}
      <path d="M30 29 L38 37 L42 37" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="40" y="26" width="20" height="14" rx="2" fill="${p.ink}"/>
      <rect x="42" y="28" width="16" height="10" rx="1" fill="${p.screen}"/>
      <path d="M44 31 h8 M44 34 h5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M37 41 H63 L60 45 H40 Z" fill="${p.ink}"/>`,
  },

  // Project work: building a tower of blocks
  project: {
    label: "Building a project",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.project}"/>
      <path d="M36 58 H62" stroke="${p.ink}" stroke-width="2" stroke-linecap="round" opacity="0.35"/>
      <path d="M18 48 L17 56 L13 57 M26 48 L27 56 L31 57" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 30 L9 36" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hourglass(p, { face: "focused", transform: "translate(-10 0)" })}
      <rect x="38" y="46" width="11" height="11" rx="2" fill="${p.blocks[0]}"/>
      <rect x="50" y="46" width="11" height="11" rx="2" fill="${p.blocks[1]}"/>
      <rect x="44" y="34" width="11" height="11" rx="2" fill="${p.blocks[2]}"/>
      <path d="M29 27 L38 18" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <rect x="37" y="7" width="11" height="11" rx="2" fill="${p.blocks[0]}" transform="rotate(12 42.5 12.5)"/>
      <path d="M50 26 v4 M48 28 h4" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>`,
  },

  // On a date: two hourglasses, pink and blue, having a picnic
  date: {
    label: "On a date",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.date}"/>
      <path d="M4 50 L60 50 L64 64 L0 64 Z" fill="${p.blanket}"/>
      <path d="M12 50 L9 64 M24 50 L23 64 M36 50 L37 64 M48 50 L51 64 M2 57 H62" stroke="#fff" stroke-width="3" opacity="0.8"/>
      ${hourglass(p, { ink: p.partnerPink, face: "love", transform: "translate(-7 16) scale(0.7)" })}
      ${hourglass(p, { ink: p.partnerBlue, face: "love", transform: "translate(26 16) scale(0.7)" })}
      <path d="M32 16 c-2.5 -3.5 -8 -1.5 -6 3 l6 5 l6 -5 c2 -4.5 -3.5 -6.5 -6 -3 z" fill="${p.partnerPink}"/>`,
  },

  // On a break: cruising on a skateboard
  break: {
    label: "On a break",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.break}"/>
      <path d="M4 26 h6 M3 33 h8 M5 40 h6" stroke="${p.board}" stroke-width="2.6" stroke-linecap="round" opacity="0.5"/>
      <g transform="rotate(-8 32 40)">
        <path d="M24 25 L15 21 M40 25 L49 20 M28 48 L26 53 M36 48 L38 53" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
        ${hourglass(p)}
        <rect x="13" y="52.5" width="38" height="4" rx="2" fill="${p.board}"/>
        <circle cx="20" cy="59" r="2.8" fill="${p.ink}"/><circle cx="44" cy="59" r="2.8" fill="${p.ink}"/>
      </g>`,
  },

  // Birthday: party hat and a cake with a candle
  birthday: {
    label: "Birthday!",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.date}"/>
      <path d="M18 51 L17 58 M24 51 L25 58" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M30 33 L37 40" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hourglass(p, { transform: "translate(-6 10) scale(0.85)" })}
      <path d="M15 17 L21.2 4 L27.4 17 Z" fill="${p.blocks[1]}"/>
      <path d="M17.5 12 L25 12 M19.5 8 L23 8" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
      <circle cx="21.2" cy="4" r="2.6" fill="${p.sand}"/>
      <rect x="35" y="42" width="24" height="14" rx="2" fill="${p.blocks[0]}"/>
      <path d="M35 44 h24 v2 q-3 3 -6 0 q-3 3 -6 0 q-3 3 -6 0 q-3 3 -6 0 z" fill="#fff"/>
      <rect x="45.5" y="32" width="3" height="10" rx="1" fill="${p.blocks[2]}"/>
      <path d="M47 25 c2.5 3 3 5 0 6.5 c-3 -1.5 -2.5 -3.5 0 -6.5 z" fill="${p.sand}"/>
      <circle cx="40" cy="20" r="1.5" fill="${p.blocks[2]}"/><circle cx="56" cy="24" r="1.5" fill="${p.blocks[1]}"/><circle cx="54" cy="12" r="1.3" fill="${p.blocks[0]}"/>`,
  },

  // Shopping: walking with shopping bags
  shopping: {
    label: "Shopping",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.task}"/>
      ${runningLegs(p.ink).replace(/M27 48/, "M19 48").replace(/M37 48/, "M29 48").replace("L22 55 L17 54", "L15 55 L11 54").replace("L42 53 L47 51", "L33 54 L37 54")}
      <path d="M16 27 L10 32" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hourglass(p, { transform: "translate(-8 0)" })}
      <path d="M31 29 L42 33" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 38 q3 -7 6 0" fill="none" stroke="${p.ink}" stroke-width="2"/>
      <rect x="47" y="38" width="12" height="13" rx="2" fill="${p.blocks[0]}"/>
      <path d="M41 33 q3.5 -7 7 0" fill="none" stroke="${p.ink}" stroke-width="2"/>
      <rect x="38" y="33" width="13" height="16" rx="2" fill="${p.blocks[1]}"/>
      <path d="M44.5 38 c-1.5 -2 -4.5 -1 -3.5 1.5 l3.5 3 l3.5 -3 c1 -2.5 -2 -3.5 -3.5 -1.5 z" fill="#fff"/>`,
  },

  // Concert: headphones on, arms up, music in the air
  concert: {
    label: "At a concert",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.project}"/>
      <path d="M24 27 L15 17 M40 27 L49 17" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 48 L25 55 L21 55 M36 48 L40 54 L44 53" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${hourglass(p)}
      <path d="M19 16 Q32 0 45 16" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <rect x="15.5" y="13" width="6" height="10" rx="2.5" fill="${p.blocks[1]}"/>
      <rect x="42.5" y="13" width="6" height="10" rx="2.5" fill="${p.blocks[1]}"/>
      <circle cx="9" cy="40" r="3" fill="${p.blocks[2]}"/><path d="M12 40 V29 l4 2" fill="none" stroke="${p.blocks[2]}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="53" cy="44" r="3" fill="${p.blocks[0]}"/><path d="M56 44 V33 l4 2" fill="none" stroke="${p.blocks[0]}" stroke-width="2" stroke-linecap="round"/>`,
  },

  // Night out: city lights, a cocktail in hand
  nightout: {
    label: "Night out",
    draw: (p) => {
      const n = p.night;
      return `<rect width="64" height="64" rx="14" fill="${n.bg}"/>
      <path d="M0 64 V50 h8 v-8 h7 v12 h6 v-6 h22 v-10 h8 v6 h7 v-4 h6 V64 Z" fill="${n.glass}" opacity="0.9"/>
      <path d="M50 44 h2 M50 48 h2 M10 46 h2 M10 50 h2" stroke="${n.sand}" stroke-width="1.4"/>
      <path d="M53 7 a6 6 0 1 0 3.5 10.5 a4.5 4.5 0 1 1 -3.5 -10.5 z" fill="${n.moon}"/>
      <circle cx="10" cy="12" r="1.1" fill="#fff"/><circle cx="18" cy="6" r="0.9" fill="#fff"/>
      <path d="M24 27 L17 31" stroke="${n.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 48 L26 56 M36 48 L38 56" stroke="${n.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hourglass(p, { ink: n.ink, glass: n.glass, sand: n.sand })}
      <path d="M40 30 L46 28" stroke="${n.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M43 20 H55 L49 28 Z" fill="${p.blocks[2]}" opacity="0.9"/>
      <path d="M43 20 H55 L49 28 Z M49 28 V35 M45.5 35 H52.5" fill="none" stroke="${n.ink}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="51" cy="22.5" r="1.6" fill="${n.moon}"/>`;
    },
  },

  // Party: party hat, disco ball and confetti
  party: {
    label: "Party time",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.break}"/>
      <path d="M52 0 V6" stroke="${p.ink}" stroke-width="1.5"/>
      <circle cx="52" cy="11" r="6" fill="#d9dce3"/>
      <path d="M46 11 h12 M52 5 v12 M47.5 7.5 h9 M47.5 14.5 h9" stroke="#9aa0ad" stroke-width="0.9"/>
      <path d="M24 30 L16 20 M39 30 L47 21" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M27 49 L23 56 L19 55 M35 49 L39 56 L43 55" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${hourglass(p, { transform: "translate(4 8) scale(0.85)" })}
      <path d="M25 15 L31.2 2.5 L37.4 15 Z" fill="${p.blocks[2]}"/>
      <path d="M27.5 10.5 L35 10.5" stroke="#fff" stroke-width="1.5" opacity="0.8"/>
      <circle cx="31.2" cy="2.8" r="2.4" fill="${p.sand}"/>
      <rect x="8" y="10" width="4" height="2.5" rx="1" fill="${p.blocks[0]}" transform="rotate(25 10 11)"/>
      <rect x="12" y="40" width="4" height="2.5" rx="1" fill="${p.blocks[1]}" transform="rotate(-30 14 41)"/>
      <rect x="50" y="34" width="4" height="2.5" rx="1" fill="${p.blocks[2]}" transform="rotate(40 52 35)"/>
      <rect x="6" y="26" width="3.5" height="2.5" rx="1" fill="${p.sand}" transform="rotate(-15 8 27)"/>
      <circle cx="56" cy="46" r="1.6" fill="${p.blocks[0]}"/><circle cx="42" cy="6" r="1.4" fill="${p.blocks[1]}"/>`,
  },

  // Exam: sweating over a test paper
  exam: {
    label: "Exam, good luck!",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.meeting}"/>
      <path d="M18 48 L17 56 L13 57 M26 48 L27 56 L31 57" fill="none" stroke="${p.ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${hourglass(p, { face: "focused", transform: "translate(-10 0)" })}
      <path d="M12 9 c2.5 3.5 3 5.5 0 6.5 c-3 -1 -2.5 -3 0 -6.5 z" fill="${p.sweat}"/>
      <rect x="37" y="14" width="22" height="30" rx="2" fill="#fff" stroke="${p.ink}" stroke-width="1.8"/>
      <text x="40" y="23" font-family="Arial, sans-serif" font-size="8" font-weight="700" fill="${p.alert}">A+</text>
      <path d="M41 28 h14 M41 33 h14 M41 38 h9" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round" opacity="0.6"/>
      <path d="M30 30 L39 42" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M37 50 L48 39 L51 42 L40 53 Z" fill="${p.sand}"/>
      <path d="M37 50 L35.5 54.5 L40 53 Z" fill="${p.ink}"/>
      <path d="M48 39 L50 37 L53 40 L51 42 Z" fill="${p.blocks[1]}"/>`,
  },

  // Classes: graduation cap and an open book
  classes: {
    label: "In class",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.task}"/>
      <path d="M24 34 L18 40 M40 34 L44 38" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hourglass(p, { transform: "translate(3.2 8) scale(0.9)" })}
      <path d="M17 11 L32 4 L47 11 L32 18 Z" fill="${p.ink}"/>
      <path d="M24 14.5 V18 Q32 22 40 18 V14.5" fill="${p.ink}"/>
      <path d="M45 11.5 L46.5 20" stroke="${p.sand}" stroke-width="1.6"/>
      <circle cx="46.6" cy="21" r="1.8" fill="${p.sand}"/>
      <path d="M41 37 L49 34 L57 37 V50 L49 47 L41 50 Z" fill="${p.blocks[0]}"/>
      <path d="M49 34 V47" stroke="#fff" stroke-width="1.4"/>
      <path d="M43.5 40 l3.5 -1.2 M43.5 43.5 l3.5 -1.2 M51 38.8 l3.5 1.2 M51 42.3 l3.5 1.2" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="0.8"/>`,
  },

  // Gym or training: lifting a dumbbell overhead
  gym: {
    label: "Training",
    draw: (p) => `<rect width="64" height="64" rx="14" fill="${p.bg.break}"/>
      <path d="M24.5 30 L16 10 M39.5 30 L48 10" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <path d="M10 9 H54" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      <rect x="5" y="3" width="6" height="12" rx="1.5" fill="${p.blocks[1]}"/>
      <rect x="53" y="3" width="6" height="12" rx="1.5" fill="${p.blocks[1]}"/>
      <path d="M28 49 L22 57 M36 49 L42 57" stroke="${p.ink}" stroke-width="3" stroke-linecap="round"/>
      ${hourglass(p, { face: "focused", transform: "translate(3.2 6) scale(0.9)" })}
      <path d="M12 28 c2 3 2.5 4.5 0 5.5 c-2.5 -1 -2 -2.5 0 -5.5 z M52 30 c2 3 2.5 4.5 0 5.5 c-2.5 -1 -2 -2.5 0 -5.5 z" fill="${p.sweat}"/>`,
  },

  // The default: nothing going on, resting in night mode with a lightning bolt
  rest: {
    label: "Resting",
    draw: (p) => {
      const n = p.night;
      return `<rect width="64" height="64" rx="14" fill="${n.bg}"/>
      ${speedLines(n.sand)}
      ${runningLegs(n.ink)}
      <path d="M24 12 C24 21 31 24 31 28 C31 32 24 35 24 44 H40 C40 35 33 32 33 28 C33 24 40 21 40 12 Z" fill="${n.glass}" stroke="${n.ink}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M35 14 L27 30 H32.5 L29 42 L38 25 H32.5 L36.5 14 Z" fill="${n.sand}"/>
      <rect x="20" y="8" width="24" height="5" rx="2.5" fill="${n.ink}"/>
      <rect x="20" y="43" width="24" height="5" rx="2.5" fill="${n.ink}"/>`;
    },
  },
};

function iconUrl(name, palette = iconPalette()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${ICONS[name].draw(palette)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* Which moment are we in? */

// Words in a description, plan title or "Other" label that reveal what you're doing.
// The first match wins, so the order matters.
const ACTIVITY_WORDS = [
  ["date", /\b(date|dating|romantic)\b/i],
  ["birthday", /\b(birthday|bday|b-day)\b/i],
  ["concert", /\b(concert|gig|festival)\b/i],
  ["party", /\b(party|celebration|celebrate)\b/i],
  ["nightout", /\b(night out|drinks|bar|club|clubbing|pub)\b/i],
  ["shopping", /\b(shopping|shop|groceries|grocery|mall)\b/i],
  ["exam", /\b(exams?|tests?|quiz|midterms?|finals?)\b/i],
  ["classes", /\b(class|classes|lectures?|lessons?|course|school|uni|university|seminar|study|studying)\b/i],
  ["gym", /\b(gym|training|train|workout|work out|exercise|fitness|yoga|pilates|sports?)\b/i],
  ["meeting", /\b(meeting|call|standup|stand-up|interview)\b/i],
];

// These moments beat whatever type the timer is set to
const FREE_TIME = ["date", "birthday", "party", "concert", "nightout", "shopping", "exam", "classes", "gym"];

// Trigger words from every language file (lang/xx.js → words), so "rođendan", "生日" or
// "Geburtstag" work just like "birthday", whatever language the app is set to
// Chinese, Japanese and Korean have no spaces, and Arabic joins little words onto the front
// ("الامتحان" = "the exam"), so in those scripts we look for the word anywhere
const NO_SPACES_SCRIPT = /[؀-ۿ぀-ヿ㐀-鿿가-힯]/;

function wordMatcher(word) {
  if (NO_SPACES_SCRIPT.test(word)) {
    return (text) => text.includes(word);
  }
  // Match at the start of a word, so endings still count (rođendanu, Geburtstags...)
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, "iu");
  return (text) => pattern.test(text);
}

const TRANSLATED_WORDS = {};
for (const language of Object.values(TRANSLATIONS)) {
  for (const [mood, words] of Object.entries(language.words || {})) {
    TRANSLATED_WORDS[mood] = (TRANSLATED_WORDS[mood] || []).concat(words.map(wordMatcher));
  }
}

function moodFromText(...texts) {
  const text = texts.filter(Boolean).join(" ");
  const match = ACTIVITY_WORDS.find(([mood, words]) =>
    words.test(text) || (TRANSLATED_WORDS[mood] || []).some((matches) => matches(text))
  );
  return match ? match[0] : null;
}

function moodForPlan(plan) {
  const fromText = moodFromText(plan.title, plan.otherLabel);
  if (fromText) return fromText;
  if (plan.type === "meeting") return "meeting";
  return plan.projectId ? "project" : "task";
}

function moodForTimer() {
  // A timer started from a calendar plan behaves like that plan
  const plan = running.planId && store.plans.find((item) => item.id === running.planId);
  const fromText = moodFromText(descriptionInput.value, plan?.title, plan?.otherLabel);
  if (FREE_TIME.includes(fromText)) return fromText;
  if (typeSelect.value === "break") return "break";
  if (typeSelect.value === "meeting" || fromText === "meeting" || plan?.type === "meeting") return "meeting";
  if (typeSelect.value === "project") return "project";
  return "task";
}

function currentMood(now = Date.now()) {
  const happening = store.plans.filter((plan) => plan.start <= now && plan.end > now).map(moodForPlan);
  const freeTime = happening.find((mood) => FREE_TIME.includes(mood));
  if (freeTime) return freeTime;
  if (running) return moodForTimer();
  return ["meeting", "project", "task"].find((mood) => happening.includes(mood)) || "rest";
}

const favicon = document.getElementById("favicon");
const moodIcon = document.getElementById("mood-icon");
let shownIcon = null;

function updateMoodIcon() {
  const mood = currentMood();
  const key = `${mood}|${document.documentElement.dataset.theme}`;
  if (key === shownIcon) return;
  shownIcon = key;
  const url = iconUrl(mood);
  favicon.href = url;
  moodIcon.src = url;
  moodIcon.title = t(ICONS[mood].label);
  moodIcon.alt = t(ICONS[mood].label);
}

updateMoodIcon();
setInterval(updateMoodIcon, 3000);
document.addEventListener("entries-changed", updateMoodIcon);
// Change colours straight away when the theme changes
new MutationObserver(updateMoodIcon).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
// React straight away while typing or changing the type
descriptionInput.addEventListener("input", updateMoodIcon);
typeSelect.addEventListener("change", updateMoodIcon);
startStopButton.addEventListener("click", updateMoodIcon);
