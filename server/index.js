const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// FFmpeg paths
ffmpeg.setFfmpegPath('C:\\ffmpeg\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\ffmpeg\\ffprobe.exe');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

// Test route
app.get('/', (req, res) => {
  res.send('AudioForge Backend is running!');
});

// Upload + Analyze
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;

  ffmpeg.ffprobe(filePath, (err, metadata) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to analyze audio' });
    }

    const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

    const info = {
      filename: req.file.originalname,
      savedAs: req.file.filename,
      size: req.file.size,
      duration: metadata.format.duration,
      bitrate: metadata.format.bit_rate,
      codec: audioStream ? audioStream.codec_name : 'unknown',
      sampleRate: audioStream ? audioStream.sample_rate : null,
      channels: audioStream ? audioStream.channels : null,
      format: metadata.format.format_name
    };

    res.json({
      message: 'File uploaded and analyzed successfully',
      file: info
    });
  });
});

// Convert to FLAC
app.post('/convert', express.json(), (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const inputPath = path.join(__dirname, 'uploads', filename);
  const outputFilename = filename.replace(path.extname(filename), '') + '.flac';
  const outputPath = path.join(__dirname, 'output', outputFilename);

  if (!fs.existsSync(inputPath)) {
    return res.status(404).json({ error: 'Original file not found' });
  }

  ffmpeg(inputPath)
    .audioCodec('flac')
    .on('end', () => {
      res.json({
        message: 'Conversion successful',
        downloadUrl: `http://localhost:5000/download/${outputFilename}`,
        filename: outputFilename
      });
    })
    .on('error', (err) => {
      console.error(err);
      res.status(500).json({ error: 'Conversion failed' });
    })
    .save(outputPath);
});

// Download converted file
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'output', req.params.filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath);
});

// Start server
app.listen(PORT, () => {
  console.log(`AudioForge server running on http://localhost:${PORT}`);
});