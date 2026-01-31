// Offline functionality for Suraksha 360

// Monitor online/offline status
let isOnline = navigator.onLine;
let offlineIndicator = null;

function initOfflineMonitor() {
  offlineIndicator = document.getElementById('offlineIndicator');
  
  updateOnlineStatus();

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

function updateOnlineStatus() {
  isOnline = navigator.onLine;
  
  if (!offlineIndicator) return;

  if (isOnline) {
    offlineIndicator.textContent = '✅ Online';
    offlineIndicator.className = 'online-indicator';
    // Hide after 3 seconds
    setTimeout(() => {
      offlineIndicator.classList.add('hidden');
    }, 3000);
  } else {
    offlineIndicator.textContent = '⚠️ Offline Mode';
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.classList.remove('hidden');
  }
}

function handleOnline() {
  console.log('Connection restored');
  updateOnlineStatus();
  
  // Try to sync offline data
  syncOfflineData();
}

function handleOffline() {
  console.log('Connection lost - entering offline mode');
  updateOnlineStatus();
}

// Sync offline data when connection is restored
function syncOfflineData() {
  // Sync offline reports
  const offlineReports = localStorage.getItem('offlineReports');
  if (offlineReports) {
    const reports = JSON.parse(offlineReports);
    if (reports.length > 0) {
      console.log(`Found ${reports.length} offline reports to sync`);
      // Trigger sync (implementation depends on the page)
      if (typeof syncOfflineReports === 'function') {
        syncOfflineReports();
      }
    }
  }

  // Sync other offline data as needed
  syncSyncQueue();
}

// Sync queue for offline operations
function syncSyncQueue() {
  const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} queued operations`);

  queue.forEach(async (operation, index) => {
    try {
      // Process each operation
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: operation.headers,
        body: operation.body
      });

      if (response.ok) {
        // Remove from queue
        queue.splice(index, 1);
        localStorage.setItem('syncQueue', JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Sync failed for operation:', operation, error);
    }
  });
}

// Add operation to sync queue
function addToSyncQueue(url, method, headers, body) {
  const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
  
  queue.push({
    url,
    method,
    headers,
    body,
    timestamp: new Date().toISOString()
  });

  localStorage.setItem('syncQueue', JSON.stringify(queue));
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOfflineMonitor);
} else {
  initOfflineMonitor();
}

// Service Worker registration (for advanced offline support)
if ('serviceWorker' in navigator) {
  // Uncomment to enable service worker
  // navigator.serviceWorker.register('/sw.js')
  //   .then(reg => console.log('Service Worker registered'))
  //   .catch(err => console.log('Service Worker registration failed:', err));
}