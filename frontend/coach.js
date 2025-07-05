export function analyzeShot(poseLandmarks) {
  const feedback = [];

  if (!poseLandmarks) return ["Waiting for player to enter frame..."];

  const elbow = poseLandmarks[13];
  const shoulder = poseLandmarks[11];
  const knee = poseLandmarks[25];
  const hip = poseLandmarks[23];

  if (elbow.y > shoulder.y) feedback.push("Raise your elbow higher during release.");
  if (knee.y < hip.y - 0.1) feedback.push("Good knee bend for shot power.");
  else feedback.push("Try bending knees more before jumping.");

  feedback.push("🏀 Tip: Focus on consistent elbow elevation and wrist release.");
  return feedback;
}
