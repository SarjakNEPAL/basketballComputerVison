import { analyzeShot } from './coach.js';

const video = document.getElementById('uploadedVideo');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const feedbackBox = document.getElementById('feedback');

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
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

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

window.analyzeUploadedVideo = () => {
  const file = document.getElementById('videoUpload').files[0];
  if (!file) return alert("Please select a video file.");
  video.src = URL.createObjectURL(file);
  video.play();

  const interval = setInterval(() => {
    if (!video.paused && !video.ended) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      hands.send({ image: canvas });
      pose.send({ image: canvas });
      detectBall(video);
      detectBasket(); // same placeholder
    } else {
      clearInterval(interval);
    }
  }, 100);
};

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
  ctx.strokeStyle = 'blue';
  ctx.lineWidth = 2;
  ctx.strokeRect(500, 50, 60, 40); // Simulated basket
}

(async () => {
  model = await cocoSsd.load();
})();
