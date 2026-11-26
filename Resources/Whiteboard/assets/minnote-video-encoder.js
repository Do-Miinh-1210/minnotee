/*
 * =============================================================================
 * BẢN QUYỀN SỞ HỮU TRÍ TUỆ — ĐỖ MIINH MATH (MINNOTE PROPRIETARY)
 * Copyright (c) 2026 Đỗ Miinh Math. All Rights Reserved.
 * DM-COPYRIGHT-OWNER: DoMiinhMath
 * SPDX-License-Identifier: LicenseRef-Proprietary-DoMiinhMath
 * TDM-Reservation: 1
 * -----------------------------------------------------------------------------
 * Đây là bản quyền thuộc sở hữu độc quyền của Đỗ Miinh Math (MinNote).
 * Nghiêm cấm sao chép, phân phối lại, dịch ngược (reverse engineering),
 * giải biên dịch (decompilation), tách thuật toán hoặc sử dụng công cụ AI/LLM
 * tự động trích xuất, tái tạo, huấn luyện trên mã nguồn này khi chưa có sự
 * đồng ý bằng văn bản từ Đỗ Miinh Math.
 * Proprietary & Confidential. Reverse engineering, decompilation, and automated
 * AI/LLM extraction, reconstruction, or training are strictly prohibited.
 * =============================================================================
 */
/**
 * MinNote — Xuất video MP4 theo DẤU THỜI GIAN (WebCodecs), không phụ thuộc đồng hồ.
 *
 * MediaRecorder gắn thời điểm theo lúc khung tới: máy vẽ / mã hoá 4K không kịp 60 FPS → khung trễ → video khựng.
 * Ở đây khung i mang đúng thời điểm i/FPS và chỉ vẽ khung kế khi bộ mã hoá sẵn sàng → video mượt tuyệt đối,
 * máy chậm chỉ làm thời gian xuất lâu hơn. Đóng gói MP4 (ISO BMFF: ftyp · mdat · moov) không cần thư viện ngoài.
 * Trả về null khi trình duyệt không mã hoá được khổ hình → exporter dùng lại MediaRecorder như cũ.
 */
(function () {
  'use strict';

  const KEYFRAME_SECONDS = 2;
  const MAX_QUEUE = 4;               // khung chờ mã hoá tối đa (giữ bộ nhớ thấp khi 4K)
  // H.264 High profile, level tăng dần: 4.0, 4.2, 5.0, 5.1, 5.2, 6.0, 6.1, 6.2 → chọn level thấp nhất mã hoá được.
  const AVC_CODECS = ['avc1.640028', 'avc1.64002a', 'avc1.640032', 'avc1.640033', 'avc1.640034', 'avc1.64003c', 'avc1.64003d', 'avc1.64003e'];

  async function pickConfig(width, height, fps, bitrate) {
    const VE = typeof VideoEncoder !== 'undefined' ? VideoEncoder : null;
    if (!VE || typeof VideoFrame === 'undefined') return null;
    if (width % 2 || height % 2) return null; // H.264 4:2:0 cần khổ chẵn
    for (const codec of AVC_CODECS) {
      const cfg = { codec, width, height, framerate: fps, bitrate, bitrateMode: 'variable', latencyMode: 'quality', avc: { format: 'avc' } };
      try {
        const res = await VE.isConfigSupported(cfg);
        if (res && res.supported) return cfg;
      } catch (_) { /* cấu hình không hợp lệ với trình duyệt này → thử level kế */ }
    }
    return null;
  }

  // Bộ mã hoá H.264 của Chromium/WebView2 nhận tối đa 36864 macroblock/khung (≈ 4096×2304) ở mọi level.
  const MAX_MACROBLOCKS = 36864;
  const even = (n) => Math.max(2, Math.floor(n / 2) * 2);
  const macroblocks = (w, h) => Math.ceil(w / 16) * Math.ceil(h / 16);

  /**
   * Khổ lớn nhất (≤ khổ yêu cầu, giữ tỉ lệ, chẵn) mà trình duyệt mã hoá được → { width, height, codec } | null.
   * Hình cao ở chất lượng 4K (vd. 3712×2890) vượt giới hạn → thu về 3472×2704 thay vì bỏ hẳn đường mã hoá mượt.
   */
  async function fitSize(width, height, fps, bitrate) {
    let w = even(width);
    let h = even(height);
    if (macroblocks(w, h) > MAX_MACROBLOCKS) {
      const f = Math.sqrt((MAX_MACROBLOCKS * 256) / (w * h));
      w = even(w * f);
      h = even(h * f);
    }
    for (let tries = 0; tries < 6; tries += 1) {
      while (macroblocks(w, h) > MAX_MACROBLOCKS) { w = even(w * 0.99); h = even(h * 0.99); }
      const cfg = await pickConfig(w, h, fps, bitrate);
      if (cfg) return { width: w, height: h, codec: cfg.codec };
      w = even(w * 0.9);
      h = even(h * 0.9);
    }
    return null;
  }

  const cancelled = (sig) => !!(sig && sig.cancelled);

  async function waitQueue(encoder) {
    while (encoder.encodeQueueSize > MAX_QUEUE) await new Promise((r) => setTimeout(r, 0));
  }

  /**
   * opts: { width, height, fps, bitrate, frameCount, drawFrame(i) → CanvasImageSource, onFrame?(i), cancelSignal? }
   * → { bytes: Uint8Array (MP4), mimeType: 'video/mp4', codec } | null nếu không hỗ trợ.
   */
  async function encodeFrames(opts) {
    const { width, height, fps, bitrate, frameCount, drawFrame } = opts;
    const cfg = await pickConfig(width, height, fps, bitrate);
    if (!cfg) return null;
    const samples = [];
    let avcC = null;
    let failure = null;
    const encoder = new VideoEncoder({
      output(chunk, meta) {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        samples.push({ data, key: chunk.type === 'key' });
        if (!avcC && meta && meta.decoderConfig && meta.decoderConfig.description) {
          avcC = new Uint8Array(meta.decoderConfig.description.slice ? meta.decoderConfig.description.slice(0) : meta.decoderConfig.description);
        }
      },
      error(e) { failure = e; },
    });
    encoder.configure(cfg);
    const usPerFrame = 1e6 / fps;
    const keyEvery = Math.max(1, Math.round(fps * KEYFRAME_SECONDS));
    try {
      for (let i = 0; i < frameCount; i += 1) {
        if (cancelled(opts.cancelSignal)) throw new Error('Đã hủy xuất Video.');
        if (failure) throw failure;
        const source = drawFrame(i);
        const frame = new VideoFrame(source, { timestamp: Math.round(i * usPerFrame), duration: Math.round(usPerFrame) });
        try {
          encoder.encode(frame, { keyFrame: i % keyEvery === 0 });
        } finally {
          frame.close();
        }
        if (opts.onFrame) opts.onFrame(i);
        await waitQueue(encoder);
      }
      await encoder.flush();
    } finally {
      try { encoder.close(); } catch (_) { /* đã đóng */ }
    }
    if (failure) throw failure;
    if (!avcC || !samples.length) return null;
    return { bytes: muxMp4({ width, height, fps, avcC, samples }), mimeType: 'video/mp4', codec: cfg.codec };
  }

  // ---------------- Đóng gói MP4 (ISO/IEC 14496-12 + 14496-15) ----------------
  function u8(n) { return [n & 0xff]; }
  function u16(n) { return [(n >>> 8) & 0xff, n & 0xff]; }
  function u32(n) { return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]; }
  function str(s) { return Array.from(s, (c) => c.charCodeAt(0)); }
  function concat(parts) {
    const len = parts.reduce((a, p) => a + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function box(type, ...parts) {
    const body = concat(parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p))));
    return concat([Uint8Array.from([...u32(body.length + 8), ...str(type)]), body]);
  }
  const fullBox = (type, version, flags, ...parts) => box(type, [version, (flags >>> 16) & 0xff, (flags >>> 8) & 0xff, flags & 0xff], ...parts);
  const MATRIX = [...u32(0x00010000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x00010000), ...u32(0), ...u32(0), ...u32(0), ...u32(0x40000000)];

  function sampleTable(w, h, avcC, samples, delta, dataOffset) {
    const avc1 = box('avc1',
      [0, 0, 0, 0, 0, 0], u16(1), u16(0), u16(0), u32(0), u32(0), u32(0), u16(w), u16(h),
      u32(0x00480000), u32(0x00480000), u32(0), u16(1), new Uint8Array(32), u16(0x0018), u16(0xffff),
      box('avcC', avcC));
    const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
    return box('stbl',
      fullBox('stsd', 0, 0, u32(1), avc1),
      fullBox('stts', 0, 0, u32(1), u32(samples.length), u32(delta)),
      fullBox('stss', 0, 0, u32(keys.length), ...keys.map(u32)),
      fullBox('stsc', 0, 0, u32(1), u32(1), u32(samples.length), u32(1)),
      fullBox('stsz', 0, 0, u32(0), u32(samples.length), ...samples.map((s) => u32(s.data.length))),
      fullBox('stco', 0, 0, u32(1), u32(dataOffset)));
  }

  function moovBox(w, h, fps, avcC, samples, dataOffset) {
    const timescale = Math.round(fps * 1000);
    const delta = 1000;
    const duration = samples.length * delta;
    const mvhd = fullBox('mvhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u32(0x00010000), u16(0x0100),
      new Uint8Array(10), MATRIX, new Uint8Array(24), u32(2));
    const tkhd = fullBox('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(duration), new Uint8Array(8), u16(0), u16(0),
      u16(0), u16(0), MATRIX, u32(w * 0x10000), u32(h * 0x10000));
    const mdhd = fullBox('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(duration), u16(0x55c4), u16(0));
    const hdlr = fullBox('hdlr', 0, 0, u32(0), str('vide'), new Uint8Array(12), str('VideoHandler'), u8(0));
    const minf = box('minf',
      fullBox('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)),
      box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1))),
      sampleTable(w, h, avcC, samples, delta, dataOffset));
    return box('moov', mvhd, box('trak', tkhd, box('mdia', mdhd, hdlr, minf)));
  }

  /** { width, height, fps, avcC: Uint8Array, samples: [{ data: Uint8Array, key: bool }] } → Uint8Array MP4 (không B-frame). */
  function muxMp4({ width, height, fps, avcC, samples }) {
    const ftyp = box('ftyp', str('isom'), u32(0x200), str('isom'), str('iso2'), str('avc1'), str('mp41'));
    const payloadLen = samples.reduce((a, s) => a + s.data.length, 0);
    if (payloadLen + 8 > 0xffffffff) throw new Error('Video quá lớn (> 4 GB) — hãy giảm chất lượng hoặc FPS.');
    const mdatHead = Uint8Array.from([...u32(payloadLen + 8), ...str('mdat')]);
    const dataOffset = ftyp.length + mdatHead.length;
    return concat([ftyp, mdatHead, ...samples.map((s) => s.data), moovBox(width, height, fps, avcC, samples, dataOffset)]);
  }

  window.MinNoteVideoEncoder = { pickConfig, fitSize, encodeFrames, muxMp4 };
})();
/* [DM-COPYRIGHT-CORE: DoMiinhMath] Copyright (c) 2026 Đỗ Miinh Math — MinNote Proprietary (TDM-Reservation: 1). */
