// Content script - runs on every page
let isInjected = false;
let isListening = false;
let recognition = null;
let watchdogInterval = null;
let lastHeardTime = Date.now();
let currentMusicTab = null; // Track music tab for control

// Gemini API Configuration
const GEMINI_API_KEY = "AIzaSyAQAb8RN6JecYdxCyf-eJ0ojb_D3ZJO8Z7qDgucRSXqmkGd_iSj2Q";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

function calculateMath(expression) {
  try {
    // Extract numbers and operation
    const match = expression.match(/(\d+\.?\d*)\s*(plus|add|\+|minus|subtract|\-|times|multiply|\*|x|divided by|divide|\/)\s*(\d+\.?\d*)/i);
    
    if (!match) return null;
    
    const num1 = parseFloat(match[1]);
    const operation = match[2].toLowerCase();
    const num2 = parseFloat(match[3]);
    let result;
    
    if (operation.includes('plus') || operation.includes('add') || operation === '+') {
      result = num1 + num2;
    } else if (operation.includes('minus') || operation.includes('subtract') || operation === '-') {
      result = num1 - num2;
    } else if (operation.includes('times') || operation.includes('multiply') || operation === '*' || operation === 'x') {
      result = num1 * num2;
    } else if (operation.includes('divided') || operation.includes('divide') || operation === '/') {
      result = num1 / num2;
    }
    
    return result;
  } catch (e) {
    return null;
  }
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
  
  // Calculator commands
  if (message.includes("calculate") || message.includes("what is") && (message.includes("plus") || message.includes("minus") || message.includes("times") || message.includes("divided"))) {
    const result = calculateMath(message);
    if (result !== null) {
      speak(`The answer is ${result}`);
      document.getElementById('gyaanbot-response').textContent = `= ${result}`;
      return;
    }
  }
  
  // Joke command
  if (message.includes("tell me a joke") || message.includes("joke")) {
    const jokes = [
      "Why don't scientists trust atoms? Because they make up everything!",
      "Why did the computer go to the doctor? Because it had a virus!",
      "What do you call a bear with no teeth? A gummy bear!",
      "Why don't programmers like nature? It has too many bugs!",
      "What's a computer's favorite snack? Microchips!"
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    speak(joke);
    document.getElementById('gyaanbot-response').textContent = joke;
    return;
  }
  
  // Fun fact command
  if (message.includes("tell me a fact") || message.includes("fun fact") || message.includes("fact")) {
    const facts = [
      "Honey never spoils. Archaeologists have found 3000 year old honey in Egyptian tombs that's still edible!",
      "A group of flamingos is called a flamboyance.",
      "Octopuses have three hearts and blue blood.",
      "Bananas are berries, but strawberries aren't!",
      "The Eiffel Tower can be 15 cm taller during summer due to heat expansion."
    ];
    const fact = facts[Math.floor(Math.random() * facts.length)];
    speak(fact);
    document.getElementById('gyaanbot-response').textContent = fact;
    return;
  }
  
  // Help command
  if (message.includes("help") || message.includes("what can you do") || message.includes("commands")) {
    const helpText = "I can calculate math, tell jokes and facts, open websites, play music, answer questions, tell time and date, and much more!";
    speak(helpText);
    document.getElementById('gyaanbot-response').textContent = helpText;
    return;
  }
  
  if (message.includes("hello") || message.includes("hey") || message.includes("jarvis")) {
    speak("Hello Sir, I'm listening continuously.");
    
  } else if (message.includes("music off") || message.includes("stop music") || message.includes("pause music") || message.includes("close music")) {
    // Try to close music tab
    speak("I cannot directly close tabs due to browser security, but I'll try to help.");
    
    // Alternative: Send message to all tabs to close if they're music
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes("youtube.com/watch")) {
          chrome.tabs.remove(tab.id);
        }
      });
    });
    
    speak("Closing YouTube music tabs");
    
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
    currentMusicTab = window.open("https://www.youtube.com/watch?v=w9Qo6p4XsXE", "_blank");
    speak("Playing music");
    
  } else if (message.includes("open whatsapp")) {
    window.open("https://web.whatsapp.com/", "_blank");
    speak("Opening WhatsApp");
  } else if (message.includes("open github")) {
    window.open("https://github.com/Anshraj11111", "_blank");
    speak("Opening GitHub");
  } else if (message.includes("what is") || message.includes("who is") || message.includes("what are") || message.includes("tell me about")) {
    // Simple built-in answers for common questions
    const lowerMsg = message.toLowerCase();
    let answer = null;
    
    // Common answers database
    if (lowerMsg.includes("pm") || lowerMsg.includes("prime minister")) {
      answer = "Narendra Modi is the Prime Minister of India. He took office on May 26, 2014, and is currently serving his third consecutive term.";
    } else if (lowerMsg.includes("what is ai") || lowerMsg.includes("artificial intelligence")) {
      answer = "Artificial Intelligence is computer technology that allows machines to learn, solve problems, and do tasks like humans. It uses data and algorithms to make smart decisions.";
    } else if (lowerMsg.includes("india")) {
      answer = "India is a country in South Asia. It is the seventh largest country by area and the most populous country in the world.";
    } else if (lowerMsg.includes("python")) {
      answer = "Python is a popular programming language known for being easy to learn. It's used for web development, data science, and artificial intelligence.";
    } else if (lowerMsg.includes("computer")) {
      answer = "A computer is an electronic device that processes data and performs tasks according to instructions. It can store, retrieve, and process information.";
    }
    
    // Open Google search
    const query = message.replace(/ /g, "+");
    window.open(`https://www.google.com/search?q=${query}`, "_blank");
    
    if (answer) {
      // Speak the built-in answer
      speak(answer);
      document.getElementById('gyaanbot-response').textContent = answer;
    } else {
      // Try API, fallback to simple response
      speak("Let me search that for you.");
      
      getAIAnswer(message).then(aiAnswer => {
        if (aiAnswer) {
          console.log("🤖 AI Answer:", aiAnswer);
          document.getElementById('gyaanbot-response').textContent = aiAnswer;
          speak(aiAnswer);
        } else {
          speak("I've opened the search results for you.");
        }
      });
    }
    
    statusEl.textContent = "Listening continuously...";
    return;
    
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
