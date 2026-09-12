import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [convertedName, setConvertedName] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setAnalysis(null)
      setError(null)
      setDownloadUrl(null)
      setConvertedName(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setAnalysis(null)
      setError(null)
      setDownloadUrl(null)
      setConvertedName(null)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const analyzeFile = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setDownloadUrl(null)

    const formData = new FormData()
    formData.append('audio', file)

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setAnalysis(data.file)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const convertFile = async () => {
    if (!analysis) return

    setConverting(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:5000/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename: analysis.savedAs })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Conversion failed')
      }

      setDownloadUrl(data.downloadUrl)
      setConvertedName(data.filename)
    } catch (err) {
      setError(err.message)
    } finally {
      setConverting(false)
    }
  }

  const getRecommendation = (info) => {
    if (!info) return null

    const bitrate = info.bitrate ? Math.round(info.bitrate / 1000) : 0
    const codec = (info.codec || '').toLowerCase()

    if (codec.includes('flac') || codec.includes('wav') || codec.includes('pcm') || codec.includes('alac')) {
      return {
        format: 'Keep Original (Already Lossless)',
        reason: 'This file is already lossless. No conversion is needed.',
        warning: null,
        canConvert: false
      }
    }

    if (bitrate >= 256) {
      return {
        format: 'FLAC',
        reason: 'High bitrate source detected. Converting to FLAC preserves the decoded audio without another lossy compression step.',
        warning: 'FLAC cannot restore information already lost during MP3 encoding.',
        canConvert: true
      }
    }

    return {
      format: 'FLAC (Archival)',
      reason: 'Recommended for archival. This stores the decoded audio in a lossless format.',
      warning: 'This will not improve the original quality. Information lost in the MP3 cannot be recovered.',
      canConvert: true
    }
  }

  const recommendation = getRecommendation(analysis)

  return (
    <div className="app">
      <header>
        <h1>AUDIOFORGE</h1>
        <p>Honest audio conversion • No fake quality claims</p>
      </header>

      <main>
        <div 
          className="dropzone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="dropzone-content">
            <div className="icon">🎵</div>
            <p>Drop your MP3 / audio file here</p>
            <p className="or">or</p>
            <label className="browse-btn">
              Browse files
              <input 
                type="file" 
                accept="audio/*" 
                onChange={handleFileChange}
                hidden 
              />
            </label>
          </div>
        </div>

        {file && (
          <div className="file-info">
            <p><strong>Selected:</strong> {file.name}</p>
            <button onClick={analyzeFile} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze Audio'}
            </button>
          </div>
        )}

        {error && (
          <div className="error">
            ❌ {error}
          </div>
        )}

        {analysis && (
          <div className="results">
            <h2>Analysis Results</h2>
            <div className="info-grid">
              <div><span>Filename</span> {analysis.filename}</div>
              <div><span>Codec</span> {analysis.codec}</div>
              <div><span>Bitrate</span> {analysis.bitrate ? Math.round(analysis.bitrate / 1000) + ' kbps' : 'N/A'}</div>
              <div><span>Sample Rate</span> {analysis.sampleRate ? analysis.sampleRate + ' Hz' : 'N/A'}</div>
              <div><span>Channels</span> {analysis.channels || 'N/A'}</div>
              <div><span>Duration</span> {analysis.duration ? Number(analysis.duration).toFixed(2) + ' s' : 'N/A'}</div>
            </div>

            {recommendation && (
              <div className="recommendation">
                <h3>⭐ Recommended</h3>
                <p className="format">{recommendation.format}</p>
                <p className="reason">{recommendation.reason}</p>
                {recommendation.warning && (
                  <p className="warning">⚠️ {recommendation.warning}</p>
                )}

                {recommendation.canConvert && !downloadUrl && (
                  <button 
                    className="convert-btn" 
                    onClick={convertFile} 
                    disabled={converting}
                  >
                    {converting ? 'Converting...' : 'Convert to FLAC'}
                  </button>
                )}
              </div>
            )}

            {downloadUrl && (
              <div className="download-box">
                <p>✅ Conversion complete</p>
                <a 
                  href={downloadUrl} 
                  className="download-btn"
                  download={convertedName}
                >
                  Download FLAC
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App