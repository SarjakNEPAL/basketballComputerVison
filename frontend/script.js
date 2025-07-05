import { analyzeShot } from './coach.js';

const video = document.getElementById('input_video');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const feedbackBox = document.getElementById('feedback');

let recorder, chunks = [];
let lastSpoken = "";
let lastSpokenTime = 0;

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

const hands = new window.Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7 });

const pose = new window.Pose({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.7 });

hands.onResults(draw);
pose.onResults(draw);

const camera = new window.Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
    await pose.send({ image: video });
  },
  width: 640,
  height: 480
});
camera.start();

let model;
(async () => {
  model = await cocoSsd.load();
  setInterval(() => detectBall(video), 1000);
})();

async function detectBall(video) {
  const predictions = await model.detect(video);
  const ball = predictions.find(p => p.class === 'sports ball');
  if (ball) {
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 2;
    ctx.strokeRect(ball.bbox[0], ball.bbox[1], ball.bbox[2], ball.bbox[3]);
  }
}

function startRecording() {
  const stream = canvas.captureStream(30);
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    document.getElementById('recorded').src = URL.createObjectURL(blob);
    chunks = [];
  };
  recorder.start();
}

function stopRecording() {
  if (recorder && recorder.state !== 'inactive') recorder.stop();
}

function analyzeUploadedVideo() {
  const fileInput = document.getElementById('videoUpload');
  const file = fileInput.files[0];
  if (!file) return alert("Please select a video file.");

  const preview = document.getElementById("uploadedPreview");
  preview.src = URL.createObjectURL(file);

  displayFeedback(["📊 Uploaded video preview loaded. AI analysis placeholder triggered."]);
}

window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.analyzeUploadedVideo = analyzeUploadedVideo;
