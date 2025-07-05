import { analyzeShot } from './coach.js';

const video = document.getElementById('uploadedVideo');
const canvas = document.getElementById('output_canvas');
const recorded = document.getElementById('recorded');
const ctx = canvas.getContext('2d');
const feedbackBox = document.getElementById('feedback');

let model, analysisInterval;
let lastSpoken = "", lastSpokenTime = 0;

const hoopBox = { x: 500, y: 50, width: 60, height: 40 };

function speak(text) {
  const now = Date.now();
  if (!text || text === lastSpoken || now - lastSpokenTime < 5000) return;
  lastSpoken = text;
  lastSpokenTime = now;
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function displayFeedback(feedback) {
  feedbackBox.innerHTML = feedback.map(f => `<li>${f}</li>`).join('');
  speak(feedback.join('. '));
}

function resetSession() {
  clearInterval(analysisInterval);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  feedbackBox.innerHTML = "";
  lastSpoken = "";
  lastSpokenTime = 0;
  video.pause();
  video.currentTime = 0;
  video.src = "";
}

function checkScore(ballBox) {
  const [bx, by, bw, bh] = ballBox;
  const overlap =
    bx < hoopBox.x + hoopBox.width &&
    bx + bw > hoopBox.x &&
    by < hoopBox.y + hoopBox.height &&
    by + bh > hoopBox.y;
  if (overlap) displayFeedback(["✅ Nice! Ball entered the hoop."]);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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

function analyzeUploadedVideo() {
  const file = document.getElementById('videoUpload').files[0];
  if (!file) return alert("Please select a video file.");

  video.src = URL.createObjectURL(file);
  video.play();

  video.onplay = () => {
    analysisInterval = setInterval(async () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const bitmap = await createImageBitmap(canvas);
        await pose.send({ image: bitmap });
      } else {
        clearInterval(analysisInterval);
      }
    }, 100);
  };
}

window.analyzeUploadedVideo = analyzeUploadedVideo;
window.resetSession = resetSession;

(async () => {
  model = await cocoSsd.load();
})();
