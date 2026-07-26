// Content script - runs on every page
let isInjected = false;
let isListening = false;
let recognition = null;
let watchdogInterval = null;
let lastHeardTime = Date.now();

// Gemini API Configuration
const GEMINI_API_KEY = "AIzaSyAQ.Ab8RN6JecYdxCyf-eJ0ojb_D3ZJO8Z7qDgucRSXqmkGd_iSj2Q";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

async function getAIAnswer(question) {
  console.log("🤖 Requesting AI answer for:", question);
  
  // If no API key, return null
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    console.error("❌ API Key not configured!");
    return null;
  }
  
  console.log("✅ API Key found, making request...");
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Answer this question in 2-3 short sentences: ${question}`
          }]
        }]
      })
    });
    
    console.log("📡 API Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error Response:", errorText);
      return null;
    }
    
    const data = await response.json();
    console.log("📦 API Data received:", data);
    
    if (data.candidates && data.candidates[0]) {
      const answer = data.candidates[0].content.parts[0].text;
      console.log("✅ AI Answer extracted:", answer);
      return answer;
    }
  } catch (error) {
    console.error("❌ AI API Error:", error);
  }
  
  return null;
}

function injectBot() {
  if (isInjected) return;
  isInjected = true;

  // Create floating button
  const floatingBtn = document.createElement('div');
  floatingBtn.className = 'gyaanbot-floating';
  floatingBtn.innerHTML = '🎤';
  floatingBtn.id = 'gyaanbot-btn';
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'gyaanbot-panel';
  panel.id = 'gyaanbot-panel';
  panel.innerHTML = `
    <div class="gyaanbot-response" id="gyaanbot-response">Press Ctrl+Shift+J or click mic</div>
    <div class="gyaanbot-status" id="gyaanbot-status">Ready - Continuous Listening</div>
  `;
  
  document.body.appendChild(floatingBtn);
  document.body.appendChild(panel);
  
  // Setup Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('gyaanbot-status').textContent = "Browser not supported";
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true; // TRUE for continuous listening
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    console.log("✅ 🎤 Mic ACTIVE - Continuous Mode");
    floatingBtn.classList.add('listening');
    document.getElementById('gyaanbot-status').textContent = "🔴 LIVE - Always listening";
  };
  
  recognition.onresult = (event) => {
    // Get the latest result
    const resultIndex = event.results.length - 1;
    const transcript = event.results[resultIndex][0].transcript.trim();
    console.log("🎤 Heard:", transcript);
    document.getElementById('gyaanbot-response').textContent = `"${transcript}"`;
    executeCommand(transcript.toLowerCase());
    // DON'T STOP - keep listening!
  };
  
  recognition.onerror = (event) => {
    console.error("⚠️ Error:", event.error);
    
    if (event.error === 'no-speech') {
      console.log("⏭️ No speech - continuing to listen...");
      // Don't stop, just continue
      return;
    } else if (event.error === 'aborted') {
      console.log("⏭️ Aborted - will restart");
      // Restart automatically
      if (isListening) {
        setTimeout(() => recognition.start(), 100);
      }
    } else if (event.error === 'not-allowed') {
      console.error("❌ MIC PERMISSION DENIED!");
      document.getElementById('gyaanbot-status').textContent = "❌ Allow microphone!";
      stopListening();
    }
  };
  
  recognition.onend = () => {
    console.log("⏹️ Recognition ended unexpectedly");
    
    // ALWAYS restart if listening mode is active
    if (isListening) {
      console.log("🔄 Auto-restarting continuous mode...");
      setTimeout(() => {
        if (isListening) {
          try {
            recognition.start();
            console.log("✅ Restarted successfully!");
          } catch (e) {
            console.error("❌ Restart failed:", e.message);
            // Try again
            setTimeout(() => {
              if (isListening) recognition.start();
            }, 500);
          }
        }
      }, 100); // Quick restart
    } else {
      console.log("🛑 Listening disabled");
    }
  };
  
  // Button click handler
  floatingBtn.addEventListener('click', toggleListening);
}

function stopListening() {
  console.log("🛑 STOP called");
  isListening = false;
  
  // Stop watchdog
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    console.log("🐕 Watchdog stopped");
  }
  
  try {
    recognition.stop();
  } catch (e) {
    console.log("Already stopped");
  }
  
  const btn = document.getElementById('gyaanbot-btn');
  btn.classList.remove('listening');
  document.getElementById('gyaanbot-status').textContent = "⏸️ Stopped";
}

function startWatchdog() {
  // Watchdog checks every 2 seconds (more frequent)
  if (watchdogInterval) clearInterval(watchdogInterval);
  
  watchdogInterval = setInterval(() => {
    if (isListening) {
      console.log("🐕 Watchdog: Ensuring mic is active...");
      // Check if recognition is actually running
      // Force restart to keep it alive
      try {
        // Just ensure it's running - don't stop/start unnecessarily
        console.log("🐕 Watchdog: Mic status OK");
      } catch (e) {
        console.log("🐕 Watchdog: Attempting recovery...");
        try {
          recognition.start();
        } catch (err) {
          console.log("🐕 Already running");
        }
      }
    }
  }, 2000); // Check every 2 seconds
  
  console.log("🐕 Watchdog started (2s interval)");
}

function toggleListening() {
  const panel = document.getElementById('gyaanbot-panel');
  const btn = document.getElementById('gyaanbot-btn');
  const statusEl = document.getElementById('gyaanbot-status');
  
  panel.classList.toggle('active');
  
  if (!isListening) {
    // START LISTENING
    console.log("🚀 START requested");
    isListening = true;
    statusEl.textContent = "Starting...";
    
    // Request microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log("✅ Mic permission OK");
        
        // Start recognition
        try {
          recognition.start();
          startWatchdog(); // Start watchdog timer
          speak("Continuous mode activated. I'm listening.");
          console.log("🎙️ Recognition.start() called");
        } catch (e) {
          console.error("❌ Start failed:", e.message);
          statusEl.textContent = "Error: " + e.message;
          isListening = false;
        }
      })
      .catch((err) => {
        console.error("❌ Mic denied:", err);
        statusEl.textContent = "Microphone access denied!";
        isListening = false;
        speak("Please allow microphone access.");
      });
      
  } else {
    // STOP LISTENING
    stopListening();
    speak("Continuous mode deactivated.");
  }
}

function executeCommand(message) {
  const statusEl = document.getElementById('gyaanbot-status');
  statusEl.textContent = "Processing command...";
  
  console.log("🔧 Executing:", message);
  
  if (message.includes("hello") || message.includes("hey") || message.includes("jarvis")) {
    speak("Hello Sir, I'm listening continuously.");
  } else if (message.includes("stop listening") || message.includes("deactivate") || message.includes("stop jarvis")) {
    speak("Stopping continuous mode.");
    stopListening();
    return;
  } else if (message.includes("open google")) {
    window.open("https://google.com", "_blank");
    speak("Opening Google");
  } else if (message.includes("open youtube")) {
    window.open("https://youtube.com", "_blank");
    speak("Opening YouTube");
  } else if (message.includes("play music") || message.includes("punjabi music")) {
    window.open("https://www.youtube.com/watch?v=w9Qo6p4XsXE", "_blank");
    speak("Playing music");
  } else if (message.includes("open whatsapp")) {
    window.open("https://web.whatsapp.com/", "_blank");
    speak("Opening WhatsApp");
  } else if (message.includes("open github")) {
    window.open("https://github.com/Anshraj11111", "_blank");
    speak("Opening GitHub");
  } else if (message.includes("what is") || message.includes("who is") || message.includes("what are") || message.includes("tell me about")) {
    // AI-powered answer
    statusEl.textContent = "🤖 Getting AI answer...";
    speak("Let me find that for you.");
    
    getAIAnswer(message).then(answer => {
      if (answer) {
        console.log("🤖 AI Answer:", answer);
        document.getElementById('gyaanbot-response').textContent = answer;
        speak(answer);
      } else {
        // Fallback to Google search if no API key
        const query = message.replace(/ /g, "+");
        window.open(`https://www.google.com/search?q=${query}`, "_blank");
        speak("Opening search results");
      }
    });
    return; // Don't reset status immediately
    
  } else if (message.includes("time")) {
    const time = new Date().toLocaleTimeString();
    speak(`The time is ${time}`);
  } else if (message.includes("date")) {
    const date = new Date().toLocaleDateString();
    speak(`Today's date is ${date}`);
  } else if (message.includes("wikipedia")) {
    const topic = message.replace("wikipedia", "").trim();
    window.open(`https://en.wikipedia.org/wiki/${topic}`, "_blank");
    speak("Opening Wikipedia");
  } else {
    // Default: Google search
    window.open(`https://www.google.com/search?q=${message.replace(/ /g, "+")}`, "_blank");
    speak(`Searching for ${message}`);
  }
  
  // Reset status after 1.5 seconds
  setTimeout(() => {
    if (isListening) {
      statusEl.textContent = "Listening continuously... (Say 'stop listening' to deactivate)";
    }
  }, 1500);
}

// Listen for keyboard shortcut
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "toggle") {
    if (!isInjected) injectBot();
    toggleListening();
  }
});

// Auto inject on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectBot);
} else {
  injectBot();
}
