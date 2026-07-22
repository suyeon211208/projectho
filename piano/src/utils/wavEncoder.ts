/**
 * Encodes audio buffer data or PCM channel arrays into a high quality WAV Blob
 */

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(
  samples: Float32Array,
  format: number,
  sampleRate: number,
  numChannels: number,
  bitDepth: number
): Blob {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataByteLength = samples.length * bytesPerSample;
  const headerByteLength = 44;
  const totalLength = headerByteLength + dataByteLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const dataView = new DataView(arrayBuffer);

  /* RIFF identifier */
  writeString(dataView, 0, 'RIFF');
  /* RIFF chunk length */
  dataView.setUint32(4, 36 + dataByteLength, true);
  /* RIFF type */
  writeString(dataView, 8, 'WAVE');
  /* format chunk identifier */
  writeString(dataView, 12, 'fmt ');
  /* format chunk length */
  dataView.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  dataView.setUint16(20, format, true);
  /* channel count */
  dataView.setUint16(22, numChannels, true);
  /* sample rate */
  dataView.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * blockAlign) */
  dataView.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  dataView.setUint16(32, blockAlign, true);
  /* bits per sample */
  dataView.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(dataView, 36, 'data');
  /* data chunk length */
  dataView.setUint32(40, dataByteLength, true);

  // Write Float32 samples as 16-bit PCM
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([dataView], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Downloads a Blob with a specified filename
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
