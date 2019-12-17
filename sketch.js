/** FINAL Responsive Spiky Blob Visualization 

Project by Sana Sharma as part of SCI 6338: Introduction to Computational Design

Inpsiration and reference code:

  ML-assisted pitch recognition -- 
  https://thecodingtrain.com/CodingChallenges/151-ukulele-tuner.html

  Visualizations with Perlin noise --
  https://thecodingtrain.com/CodingChallenges/036-blobby.html

  Algorithmic composition + fractal pattern generation --
  https://junshern.github.io/algorithmic-music-tutorial/part1.html
  
**/

// global variables
const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
let mic, recorder, ftt, button, pitch, filter, distortion, freqinterval;
var freq = 0;
var state = 0;
var yoff = 0;
var inputNotes = [];

// defining notes for pitch detection
let notes = [
  {note: 'C', freq: 16.35},
  {note: 'C#/Db', freq: 17.32},
  {note: 'D', freq: 18.35},
  {note: 'D#/Eb', freq: 19.45},
  {note: 'E', freq: 20.60},
  {note: 'F', freq: 21.83},
  {note: 'F#/Gb', freq: 23.12},
  {note: 'G', freq: 24.50},
  {note: 'G#/Ab', freq: 25.96},
  {note: 'A', freq: 27.50},
  {note: 'A#/Bb', freq: 29.14},
  {note: 'B', freq: 30.87}, 
  {note: 'C1', freq: 32.70}
];

// variables for transposition of pitch input
var Cmin = 16.35; // value of C
var Cmax = 32.70; // value of C1

//Rules for fractal composition method
var rules = {
  "A": ["A", "G", "D"],
  "A#/Bb": ["D", "E"],
  "B": ["C", "D"],
  "C": ["E", "G", "A"],
  "C#/Db": ["D", "A"],
  "D": ["E", "G"],
  "D#/Eb": ["A", "E"],
  "E": ["E", "G"],
  "F": ["D", "E"],
  "F#/Gb": ["E", "G"],
  "G": ["A", "D"],
  "G#/Ab": ["A", "G"]
};

// variables for composition creation
var initSeq = [];
var sequences = [initSeq, []];

// one time setup
function setup() {
  createCanvas(1920, 800);
  //pixelDensity(3.0);
  background(0,225);
  audioContext = getAudioContext();

  // create an audio in, reference listening() function when starting mic!
  mic = new p5.AudioIn();
  mic.start(listening);

  // fft components for draw function
  fft = new p5.FFT(0.85, 1024);  
  
  // a little distortion for return output
  distortion = new p5.Distortion(0.5);
  
  // amplitude components for draw function
  amplitude = new p5.Amplitude();
  amplitude.setInput(mic);

  // synth for audio generation
  // CHECK OUT: new p5.PolySynth([synthVoice], [maxVoices])
  synth = new p5.PolySynth();
  fft.setInput(synth);
  synth.connect(distortion);

  // button to control record and play
  button = createButton("Select here to start.");
  button.mousePressed(toggle);
}

// listening function calls ML5 pitch detection
function listening() {
  console.log('listening');
  pitch = ml5.pitchDetection(
    model_url,
    audioContext,
    mic.stream,
    modelLoaded
  );
}

// Main Draw funtion: continuous loop
function draw() {
  background(0,30);
  
  // draw visualizations via function
  for (var f = 1; f < 5; f++) {
    drawVis(f);
  }
}


function drawVis(f) {
  
  // transposes frequency for visualization 
  var visfreq = freq;
  while (visfreq > Cmax) {
    visfreq = visfreq / 2.0;
  }

  // associates frequency range with each entity
  var upper = [20, 24, 28, 32];
  var lower = [16, 19, 23, 27];

  // overall visualization rules
  var radius = 80;
  let amp, specamp, offset, specoffset, r, x, y, xoff;
  var spectrum = fft.analyze();
  strokeWeight(0.03);
  push();
  translate(384*f, 380);

  beginShape();
  xoff = 0 + f;
  for (var i = 0; i < spectrum.length; i++) {
    // visualization for when audio is being played back
    if (state === 2) {

      var color = map(visfreq,lower[f-1], upper[f-1], 10, 250);  
      amp = noise(xoff, yoff);
      offset = map(amp, 0, 1, -25, 25);

        if (visfreq >= lower[f-1] && visfreq <= upper[f-1]) {
          specamp = spectrum[i];
          specoffset = map(specamp, 0, 1024, 20, 100);
          r = radius + offset + (specoffset * 2);
          fill(color,255,255-color); 
        }
        else {
          r = radius + offset;
          fill(255, 255, 255);
        }
    }
    // visualization for when idle
    else if (state === 0){
      amp = noise(xoff, yoff);
      offset = map(amp, 0, 1, -25, 25);
      r = radius + offset;
    }
    // visualization for when recording
    else {
        amp = noise(xoff, yoff);
        offset = map(amp, 0, 1, -25, 25);
        var color = map(visfreq,lower[f-1], upper[f-1], 10, 250);

        if (visfreq >= lower[f-1] && visfreq <= upper[f-1]) {
          level = amplitude.getLevel();
          r = radius + offset + level * 50;
          fill(color,255,255); 
        }
        else {
          r = radius + offset;
          fill(255, 255, 255);
        }
    }
    //each animation is created by defining verticies
    x = r * cos(i);
    y = r * sin(i);
    vertex(x, y);
    xoff += 0.1;
  }
  endShape();
  yoff += 0.01 * f;
  pop();
}

// Toggle button controls to record input and play output
function toggle() {

  if (state === 0) {
    button.html('Listening... Select to stop.');
    // use setInterval function to call another function that occurs every second
    freqinterval = setInterval(recordFreq, 500);
    // increment state
    state++;
  }

  else if (state === 1) {
    // stop collecting frequencies
    clearInterval(freqinterval);
    button.html('Performing... Select to reset.');
    //trigger synth loop function
    sequences = inputNotes;
    var newSeq = [];

    // convert collected notes into the rules for the system
    for (var i = 0; i < sequences.length; i++) {
      var token = sequences[i];
      var new_token = rules[token];
      //random number generation for which notes are played
      var rand_idx = Math.floor(Math.random() * new_token.length);
      newSeq = newSeq.concat(new_token[rand_idx]);
    }
    // convert notes into synth pitches, assign beats and play
    var tt = 0;
    for (var i = 0; i < newSeq.length; i++) {
      var pitch = newSeq[i] + "4";
      var velocity = 0.1;
      var beatSeconds = 0.5; // Define 1 beat as half a second
      var duration = random([beatSeconds, beatSeconds / 2, beatSeconds / 2]);
      tt = tt + duration  + 0.5;
      this.interval = duration;
      synth.play(pitch, velocity, tt, duration);
    }
    state++;
  }
  else {
    // Stops previous loop
    initSeq = [];
    sequences = [initSeq];
    // change button text
    button.html('Select here to start.');
    state = 0;
    inputNotes = [];
  } 
}

// function to convert freq into notes while recording and store in array
function recordFreq() {
  let inputNote = -1;
  let recordDiff = Infinity;
  while (freq > Cmax) {
    freq = freq / 2.0;
  }
  if (freq < Cmin) {
    inputNote = [];
  }
  else {
    for (let i = 0; i < notes.length; i++) {
      let diff = freq - notes[i].freq;
      if (abs(diff) < abs(recordDiff)) {
        inputNote = notes[i];
        recordDiff = diff;
      }
    }
    if (inputNote.note === "C1") {
      inputNote = notes[0];
    }
    append(inputNotes, inputNote.note);
    console.log(inputNotes);
  }
}

// function to load model
function modelLoaded() {
  console.log('model loaded');
  pitch.getPitch(gotPitch);
}

// pitch detection function -- can add for pitch identification and error rates
function gotPitch(error, frequency) {
  if (error) {
    console.error(error);
  } else {
    if (frequency) {
      freq = frequency;
    }
    pitch.getPitch(gotPitch);
  }
}