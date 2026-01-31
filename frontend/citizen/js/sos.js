<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Emergency SOS - Suraksha 360</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo">🛡️ Suraksha 360</div>
        <div class="user-info">
          <span id="userName"></span>
          <button class="btn btn-danger" onclick="window.location.href='dashboard.html'">Dashboard</button>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="nav">
      <ul class="nav-links">
        <li><a href="dashboard.html">Dashboard</a></li>
        <li><a href="sos.html" class="active">SOS Emergency</a></li>
        <li><a href="report.html">Report Crime</a></li>
      </ul>
    </div>

    <div id="alertContainer"></div>

    <!-- SOS Not Active -->
    <div id="sosInactive">
      <div class="card text-center">
        <h2 class="card-title">Emergency SOS System</h2>
        <p style="color: #666; margin-bottom: 2rem;">
          Press the button below to trigger an emergency alert. This will:
        </p>
        <ul style="text-align: left; max-width: 500px; margin: 0 auto 2rem;">
          <li>Send your location to police control room</li>
          <li>Alert your emergency contacts via SMS</li>
          <li>Start automatic evidence recording</li>
          <li>Enable real-time location tracking</li>
        </ul>

        <button class="sos-button" id="sosButton" onclick="triggerSOS()">
          <div>🚨</div>
          <div style="font-size: 1.2rem;">PRESS FOR SOS</div>
        </button>

        <div class="location-info" id="locationInfo">
          <strong>Current Location:</strong>
          <p id="locationText">Detecting location...</p>
        </div>
      </div>
    </div>

    <!-- SOS Active -->
    <div id="sosActive" class="hidden">
      <div class="card text-center">
        <h2 class="card-title" style="color: var(--danger-color);">⚠️ SOS ALERT ACTIVE</h2>
        
        <div class="alert alert-danger">
          <strong>Emergency alert has been triggered!</strong><br>
          Police have been notified. Help is on the way.
        </div>

        <div class="sos-button active">
          <div>🚨</div>
          <div style="font-size: 1.2rem;">SOS ACTIVE</div>
        </div>

        <div class="location-info">
          <strong>Location Sent:</strong>
          <p id="activeLocationText"></p>
        </div>

        <div id="recordingStatus" class="hidden" style="margin: 2rem 0;">
          <div class="recording-indicator">
            <div class="recording-dot"></div>
            <span id="recordingType">Recording Audio</span>
            <span id="recordingDuration">00:00</span>
          </div>
          <p style="margin-top: 1rem; color: #666;">
            Evidence is being recorded for your safety
          </p>
        </div>

        <div style="margin-top: 2rem;">
          <button class="btn btn-warning btn-block" onclick="startVideoRecording()" id="videoBtn">
            📹 Start Video Recording
          </button>
          <button class="btn btn-info btn-block mt-2" onclick="endSOS()">
            End Emergency
          </button>
        </div>
      </div>
    </div>
  </div>

  <div id="offlineIndicator" class="hidden"></div>

  <script src="js/offline.js"></script>
  <script src="js/geolocation.js"></script>
  <script>
    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token) window.location.href = 'login.html';

    document.getElementById('userName').textContent = user.name;

    let activeSOS = null;
    let mediaRecorder = null;
    let audioChunks = [];
    let recordingStartTime = null;
    let recordingInterval = null;
    let currentPosition = null;

    // Show alert
    function showAlert(message, type = 'info') {
      const alertContainer = document.getElementById('alertContainer');
      alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
      setTimeout(() => { alertContainer.innerHTML = ''; }, 5000);
    }

    // Get current location and display
    async function updateLocation() {
      try {
        const position = await getCurrentPosition();
        currentPosition = position;
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode (simplified - in production use proper geocoding API)
        const locationText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        document.getElementById('locationText').textContent = locationText;
        
        return position;
      } catch (error) {
        document.getElementById('locationText').textContent = 'Location unavailable';
        throw error;
      }
    }

    // Trigger SOS
    async function triggerSOS() {
      if (!confirm('Are you sure you want to trigger an emergency SOS alert?')) {
        return;
      }

      try {
        const position = await updateLocation();
        const { latitude, longitude } = position.coords;

        const response = await fetch(`${API_URL}/sos/trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            latitude,
            longitude,
            address: `Location: ${latitude}, ${longitude}`
          })
        });

        const data = await response.json();

        if (response.ok) {
          activeSOS = data;
          localStorage.setItem('activeSOS', JSON.stringify(data));
          
          showAlert('SOS Alert Triggered! Emergency contacts notified.', 'success');
          
          document.getElementById('sosInactive').classList.add('hidden');
          document.getElementById('sosActive').classList.remove('hidden');
          document.getElementById('activeLocationText').textContent = 
            document.getElementById('locationText').textContent;

          // Start audio recording
          setTimeout(startAudioRecording, 1000);
        } else {
          showAlert(data.error || 'Failed to trigger SOS', 'danger');
        }
      } catch (error) {
        showAlert('Error triggering SOS. Please try again.', 'danger');
      }
    }

    // Start audio recording
    async function startAudioRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          uploadEvidence(audioBlob, 'audio');
        };

        mediaRecorder.start();
        
        document.getElementById('recordingStatus').classList.remove('hidden');
        document.getElementById('recordingType').textContent = 'Recording Audio';
        
        recordingStartTime = Date.now();
        recordingInterval = setInterval(updateRecordingDuration, 1000);

      } catch (error) {
        console.error('Error starting audio recording:', error);
        showAlert('Could not start audio recording', 'warning');
      }
    }

    // Start video recording
    async function startVideoRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        if (mediaRecorder) {
          mediaRecorder.stop();
        }

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const videoBlob = new Blob(audioChunks, { type: 'video/webm' });
          uploadEvidence(videoBlob, 'video');
        };

        mediaRecorder.start();
        
        document.getElementById('recordingType').textContent = 'Recording Video';
        document.getElementById('videoBtn').disabled = true;
        document.getElementById('videoBtn').textContent = '📹 Video Recording Active';
        
        showAlert('Video recording started', 'success');

      } catch (error) {
        console.error('Error starting video recording:', error);
        showAlert('Could not start video recording', 'warning');
      }
    }

    // Update recording duration
    function updateRecordingDuration() {
      if (!recordingStartTime) return;
      
      const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      
      document.getElementById('recordingDuration').textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Upload evidence
    async function uploadEvidence(blob, type) {
      if (!activeSOS) return;

      const formData = new FormData();
      formData.append('file', blob, `evidence-${Date.now()}.webm`);
      formData.append('evidenceType', type);
      if (currentPosition) {
        formData.append('latitude', currentPosition.coords.latitude);
        formData.append('longitude', currentPosition.coords.longitude);
      }
      formData.append('duration', Math.floor((Date.now() - recordingStartTime) / 1000));

      try {
        const response = await fetch(`${API_URL}/sos/evidence/${activeSOS.sosId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          console.log('Evidence uploaded successfully');
        }
      } catch (error) {
        console.error('Error uploading evidence:', error);
      }
    }

    // End SOS
    function endSOS() {
      if (!confirm('Are you sure you want to end the emergency alert?')) {
        return;
      }

      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }

      if (recordingInterval) {
        clearInterval(recordingInterval);
      }

      localStorage.removeItem('activeSOS');
      activeSOS = null;

      showAlert('Emergency alert ended', 'info');
      
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    }

    // Check if there's an active SOS
    const savedSOS = localStorage.getItem('activeSOS');
    if (savedSOS) {
      activeSOS = JSON.parse(savedSOS);
      document.getElementById('sosInactive').classList.add('hidden');
      document.getElementById('sosActive').classList.remove('hidden');
      updateLocation();
    } else {
      updateLocation();
    }
  </script>
</body>
</html>