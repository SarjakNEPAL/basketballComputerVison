import { analyzeShot } from './coach.js';

const video = document.getElementById('input_video');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const feedbackBox = document.getElementById('feedback');

let recorder, chunks = [];
let lastSpoken = "";
let lastSpokenTime = 0;
let model;

function speak(text) {
  const now = Date.now();
  if (!text || text === lastSpoken || now - lastSpokenTime < 5000) return;
  lastSpoken = text;
  lastSpokenTime = now;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  speechSynthesis.speak(utterance);
}

function displayFeedback(feedback) {
  feedbackBox.innerHTML = feedback.map(f => `<li>${f}</li>`).join('');
  speak(feedback.join('. '));
}

function draw(results) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
  drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

  const feedback = analyzeShot(results.poseLandmarks, results.multiHandLandmarks);
  displayFeedback(feedback);
}

const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7 });
hands.onResults(draw);

const pose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.7 });
pose.onResults(draw);

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
    await pose.send({ image: video });
    detectBall(video);
    detectBasket(); // Placeholder for basket detection logic
  },
  width: 640,
  height: 480
});
camera.start();

async function detectBall(video) {
  if (!model) return;
  const predictions = await model.detect(video);
  const ball = predictions.find(p => p.class === 'sports ball');
  if (ball) {
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.strokeRect(ball.bbox[0], ball.bbox[1], ball.bbox[2], ball.bbox[3]);
  }
}

function detectBasket() {
  // Placeholder: manually define basket region or integrate custom model
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.strokeRect(500, 50, 60, 40); // Example basket position
}
function stopApplication() {
  camera.stop(); // Stop MediaPipe camera loop

  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop()); // Stop webcam
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastSpoken = "";
  lastSpokenTime = 0;
  feedbackBox.innerHTML = "";

  if (recorder && recorder.state !== 'inactive') recorder.stop();

  // Optional: mute voice, hide canvas/video
  video.style.display = "none";
  canvas.style.display = "none";

  // Visual cue
  alert("AI coaching session stopped.");
}


window.startRecording = () => {
  const stream = canvas.captureStream(30);
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' }); // WebM; use ffmpeg.wasm for MP4
    document.getElementById('recorded').src = URL.createObjectURL(blob);
    chunks = [];
  };
  recorder.start();
};

window.stopRecording = () => {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
};

window.resetSession = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  lastSpoken = "";
  lastSpokenTime = 0;
  feedbackBox.innerHTML = "";
};

(async () => {
  model = await cocoSsd.load();
})();
window.stopApplication = stopApplication;
