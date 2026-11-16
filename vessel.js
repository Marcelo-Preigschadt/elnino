export const vessel = Object.freeze({
  top: -158,
  bottom: -10,
  topRadius: 75,
  bottomRadius: 67,
  fullMl: 290,
  lipX: 75,
  lipY: -158,
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(min, max, value) {
  const fraction = clamp((value - min) / (max - min), 0, 1);
  return fraction * fraction * (3 - 2 * fraction);
}

const height = vessel.bottom - vessel.top;
const taper = vessel.topRadius - vessel.bottomRadius;
const toRadians = Math.PI / 180;
const volumeIntegral = (fraction) => (
  vessel.bottomRadius ** 2 * fraction
  + vessel.bottomRadius * taper * fraction ** 2
  + taper ** 2 * fraction ** 3 / 3
);
const fullIntegral = volumeIntegral(1);

// At an incline, integrate the wet circular segment at each height of the tapered beaker.
const sliceCount = 48;
const slices = Array.from({ length: sliceCount }, (_, index) => {
  const fraction = (index + .5) / sliceCount;
  const radius = vessel.bottomRadius + taper * fraction;
  return { y: vessel.bottom - fraction * height, radius, areaWeight: radius ** 2 / (fullIntegral * sliceCount) };
});

export function rotatePoint(x, y, angle) {
  const radians = angle * toRadians;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return { x: x * cosine - y * sine, y: x * sine + y * cosine };
}

export function projection(angle) {
  return [
    rotatePoint(-vessel.topRadius, vessel.top, angle),
    rotatePoint(vessel.topRadius, vessel.top, angle),
    rotatePoint(vessel.bottomRadius, vessel.bottom, angle),
    rotatePoint(-vessel.bottomRadius, vessel.bottom, angle),
  ];
}

export function spanAt(outline, level) {
  const points = [];
  for (let index = 0; index < outline.length; index++) {
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    if (Math.min(start.y, end.y) <= level && level < Math.max(start.y, end.y)) {
      points.push(start.x + (end.x - start.x) * (level - start.y) / (end.y - start.y));
    }
  }
  if (points.length < 2) return null;
  return [Math.min(...points), Math.max(...points)];
}

function volumeBelow(level, sine, cosine) {
  if (sine === 0) {
    const fraction = clamp((vessel.bottom - level) / height, 0, 1);
    return vessel.fullMl * volumeIntegral(fraction) / fullIntegral;
  }

  let fraction = 0;
  for (const { y, radius, areaWeight } of slices) {
    const cut = (level - y * cosine) / (radius * sine);
    if (cut >= 1) continue;
    const segment = cut <= -1 ? 1 : (Math.acos(cut) - cut * Math.sqrt(1 - cut ** 2)) / Math.PI;
    fraction += segment * areaWeight;
  }
  return vessel.fullMl * fraction;
}

export function capacityAtLip(angle) {
  if (angle < .01) return vessel.fullMl;
  const radians = angle * toRadians;
  const sine = Math.sin(radians);
  const cosine = Math.cos(radians);
  return volumeBelow(vessel.lipX * sine + vessel.lipY * cosine, sine, cosine);
}

export function liquidLevel(volumeMl, angle, outline = projection(angle)) {
  const radians = angle * toRadians;
  const sine = angle < .01 ? 0 : Math.sin(radians);
  const cosine = Math.cos(radians);
  let top = Math.min(...outline.map((point) => point.y));
  let bottom = Math.max(...outline.map((point) => point.y));

  // The free surface is horizontal in the world frame, including while pouring.
  for (let iteration = 0; iteration < 12; iteration++) {
    const middle = (top + bottom) / 2;
    if (volumeBelow(middle, sine, cosine) > volumeMl) top = middle;
    else bottom = middle;
  }
  return (top + bottom) / 2;
}
