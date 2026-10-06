let score = 0;
let sessionEpoch = 5;
const capturedEpoch = sessionEpoch;

system.runTimeout(() => {
  if (capturedEpoch !== sessionEpoch) return;
  score++;
}, 20);
