import { analyzeShot } from './coach.js';

const video = document.getElementById('input_video');
const canvas = document.getElementById('output_canvas');
const recorded = document.getElementById('recorded');
const ctx = canvas.getContext('2d');
const feedbackBox = document.getElementById('feedback');

let recorder, chunks = [], model;
let lastSpoken = "", lastSpokenTime = 0, appRunning = false;

const hoopBox = { x: 500, y: 50, width: 60, height: 40 };

function speak(text) {
  const now = Date.now();
  const cooldown = 5000; // Initial cooldown to avoid rapid repeat

  if (!text || text === lastSpoken || now - lastSpokenTime < cooldown) return;

  lastSpoken = text;
  lastSpokenTime = now;

  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);

  // Schedule one repeat after a longer delay
  setTimeout(() => {
    if (lastSpoken === text) {
      const repeatUtterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(repeatUtterance);
    }
  }, 15000); // Repeat after 15 seconds
}


function displayFeedback(feedback) {
  feedbackBox.innerHTML = feedback.map(f => `<li>${f}</li>`).join('');
  speak(feedback.join('. '));
}

function resetSession() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  feedbackBox.innerHTML = "";
  lastSpoken = "";
  lastSpokenTime = 0;
}

function checkScore(ballBox) {
  const [bx, by, bw, bh] = ballBox;
  const overlap =
    bx < hoopBox.x + hoopBox.width &&
    bx + bw > hoopBox.x &&
    by < hoopBox.y + hoopBox.height &&
    by + bh > hoopBox.y;
  if (overlap) {
    displayFeedback(["✅ Nice! Ball entered the hoop."]);
  }
}

async function detectBall() {
  const bitmap = await createImageBitmap(canvas);
  const predictions = await model.detect(bitmap);
  const ball = predictions.find(p => p.class === 'sports ball');
  if (ball) {
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.strokeRect(...ball.bbox);
    checkScore(ball.bbox);
  }
}

function detectBasket() {
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.strokeRect(hoopBox.x, hoopBox.y, hoopBox.width, hoopBox.height);
}

async function draw(results) {
  if (!appRunning) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
  drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: 'lime', lineWidth: 2 });
  drawLandmarks(ctx, results.poseLandmarks, { color: 'red', lineWidth: 2 });
  const feedback = await analyzeShot(results.poseLandmarks);
  displayFeedback(feedback);
  detectBasket();
  await detectBall();
}

const pose = new Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.7 });
pose.onResults(draw);

const camera = new Camera(video, {
  onFrame: async () => {
    if (appRunning) await pose.send({ image: video });
  },
  width: 640,
  height: 480
});

camera.start();

function startApplication() {
  appRunning = true;
  video.style.display = "block";
  canvas.style.display = "block";
  recorded.style.display = "none";
  resetSession();
  recorded.src = "";
}

function stopApplication() {
  appRunning = false;
  camera.stop();
  video.srcObject?.getTracks().forEach(track => track.stop());
  video.style.display = "none";
  canvas.style.display = "none";
  recorded.style.display = "block";
  resetSession();
  recorder?.state !== 'inactive' && recorder.stop();
}

function startRecording() {
  const stream = canvas.captureStream(30);
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    recorded.src = URL.createObjectURL(blob);
    recorded.style.display = "block";
    stopApplication();
    chunks = [];
  };
  recorder.start();
}

function stopRecording() {
  recorder?.state !== 'inactive' && recorder.stop();
}

window.startApplication = startApplication;
window.stopApplication = stopApplication;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.resetSession = resetSession;

(async () => {
  model = await cocoSsd.load();
})();
