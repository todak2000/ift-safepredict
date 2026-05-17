const DB_NAME = 'IFT-SafePredict'
const DB_VERSION = 2
const PREDICTIONS_STORE = 'predictions'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(PREDICTIONS_STORE)) {
        const store = db.createObjectStore(PREDICTIONS_STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

export async function savePrediction(inputs, result) {
  const db = await openDB()
  const tx = db.transaction(PREDICTIONS_STORE, 'readwrite')
  const store = tx.objectStore(PREDICTIONS_STORE)
  const entry = {
    timestamp: new Date().toISOString(),
    inputs: { ...inputs },
    result: { ...result },
  }
  return new Promise((resolve, reject) => {
    const request = store.add(entry)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getPredictions(limit = 50) {
  const db = await openDB()
  const tx = db.transaction(PREDICTIONS_STORE, 'readonly')
  const store = tx.objectStore(PREDICTIONS_STORE)
  const index = store.index('timestamp')
  const request = index.openCursor(null, 'prev')
  const results = []
  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor && results.length < limit) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    request.onerror = () => reject(request.error)
  })
}

export async function deletePrediction(id) {
  const db = await openDB()
  const tx = db.transaction(PREDICTIONS_STORE, 'readwrite')
  const store = tx.objectStore(PREDICTIONS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearAllPredictions() {
  const db = await openDB()
  const tx = db.transaction(PREDICTIONS_STORE, 'readwrite')
  const store = tx.objectStore(PREDICTIONS_STORE)
  return new Promise((resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
