export function analyzeShot(poseLandmarks, handLandmarks) {
  const feedback = [];

  if (!poseLandmarks) return ["Waiting for player..."];

  const elbow = poseLandmarks[13];
  const shoulder = poseLandmarks[11];
  if (elbow.y > shoulder.y) feedback.push("Raise your elbow during release.");

  if (handLandmarks && handLandmarks[0]) {
    const wrist = handLandmarks[0][9];
    const indexTip = handLandmarks[0][8];
    if (indexTip.y > wrist.y) feedback.push("Add wrist flick for better spin.");
  }

  const knee = poseLandmarks[25];
  const hip = poseLandmarks[23];
  if (knee.y < hip.y - 0.1) feedback.push("Good knee bend.");
  else feedback.push("Bend knees more before jumping.");

  return feedback;
}
