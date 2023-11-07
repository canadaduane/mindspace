/*+
type Point = {
  x: number,
  y: number
}
*/

export function calcDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function doesLineIntersectLine(
  a /*: Point */,
  b /*: Point */,
  c /*: Point */,
  d /*: Point */
) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  const numerator1 = (a.y - c.y) * (d.x - c.x) - (a.x - c.x) * (d.y - c.y);
  const numerator2 = (a.y - c.y) * (b.x - a.x) - (a.x - c.x) * (b.y - a.y);

  // Detect coincident lines (has a problem, read below)
  if (denominator == 0) return numerator1 == 0 && numerator2 == 0;

  const r = numerator1 / denominator;
  const s = numerator2 / denominator;

  return r >= 0 && r <= 1 && s >= 0 && s <= 1;
}

function closestPointOnALineToPoint(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const t =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
    (dx * dx + dy * dy);
  // Ensure t is within [0, 1] to stay within segment bounds.
  const tt = Math.min(1, Math.max(0, t));
  return {
    x: lineStart.x + tt * dx,
    y: lineStart.y + tt * dy,
  };
}

export function distanceFromPointToLine({ x, y }, lineStart, lineEnd) {
  const { x: x1, y: y1 } = lineStart;
  const { x: x2, y: y2 } = lineEnd;
  // If the line is a point, return the Euclidean distance.
  if (x1 === x2 && y1 === y2) {
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }

  const numerator = Math.abs((x2 - x1) * (y1 - y) - (x1 - x) * (y2 - y1));
  const denominator = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  return numerator / denominator;
}

function distanceBetweenPoints(point1, point2) {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function doesLineIntersectCircle(a, b, c, r) {
  // Find the closest point on the line segment to the circle's center
  const closest = closestPointOnALineToPoint(c, a, b);

  // Check whether this point is within a bounding box defined by the segment endpoints.
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const withinBounds =
    closest.x >= minX &&
    closest.x <= maxX &&
    closest.y >= minY &&
    closest.y <= maxY;

  if (!withinBounds) {
    return distanceBetweenPoints(c, a) <= r || distanceBetweenPoints(c, b) <= r;
  }

  // Calculate the distance from the closest point to the circle's center
  const distance = distanceBetweenPoints(closest, c);

  // If the distance is less than or equal to the radius, the segment intersects the circle
  return distance <= r;
}

export function normalizedOrthogonalVectorToPointOnLine(P, lineStart, lineEnd) {
  const { x: Px, y: Py } = P;
  const { x: x1, y: y1 } = lineStart;
  const { x: x2, y: y2 } = lineEnd;

  // Vectors AB and AP
  let ABx = x2 - x1;
  let ABy = y2 - y1;

  let APx = Px - x1;
  let APy = Py - y1;

  // Calculate dot products
  let dot_AP_AB = APx * ABx + APy * ABy;
  let dot_AB_AB = ABx * ABx + ABy * ABy;

  // Compute the projection of P onto AB
  let factor = dot_AP_AB / dot_AB_AB;
  let projPx = x1 + factor * ABx;
  let projPy = y1 + factor * ABy;

  // Orthogonal vector from P to the projection
  let Ox = projPx - Px;
  let Oy = projPy - Py;

  // Normalize the orthogonal vector
  let magnitude = Math.sqrt(Ox * Ox + Oy * Oy);
  let normalizedOx = Ox / magnitude;
  let normalizedOy = Oy / magnitude;

  return { x: normalizedOx, y: normalizedOy };
}
