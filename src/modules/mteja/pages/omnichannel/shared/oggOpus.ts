/**
 * WebM (Opus) → Ogg (Opus), without re-encoding.
 *
 * WhatsApp voice notes are Opus audio in an Ogg file. Chrome's MediaRecorder
 * records Opus too, but wrapped in WebM, which WhatsApp won't accept. This
 * reads the Opus packets out of the WebM and writes them into an Ogg file
 * (RFC 7845), so the audio itself is untouched.
 */

// ── WebM (EBML) reading ──────────────────────────────────────────────────────

const ID = {
    EBML: 0x1a45dfa3,
    Segment: 0x18538067,
    Cluster: 0x1f43b675,
    Tracks: 0x1654ae6b,
    TrackEntry: 0xae,
    CodecPrivate: 0x63a2,
    BlockGroup: 0xa0,
    Block: 0xa1,
    SimpleBlock: 0xa3,
};
// Containers we step into rather than skip. Chrome writes Segment/Cluster with
// "unknown" size while recording, so stepping in (not reading their size) is
// what makes a live recording parseable.
const CONTAINERS = new Set([ID.Segment, ID.Cluster, ID.Tracks, ID.TrackEntry, ID.BlockGroup]);

// EBML variable-length integer. For IDs the length marker is kept.
const readVint = (bytes: Uint8Array, pos: number, keepMarker: boolean) => {
    const first = bytes[pos];
    if (first === undefined) return null;
    let length = 1;
    let mask = 0x80;
    while (length <= 8 && !(first & mask)) {
        mask >>= 1;
        length++;
    }
    if (length > 8 || pos + length > bytes.length) return null;
    let value = keepMarker ? first : first & (mask - 1);
    let allOnes = (first & (mask - 1)) === mask - 1;
    for (let i = 1; i < length; i++) {
        value = value * 256 + bytes[pos + i];
        if (bytes[pos + i] !== 0xff) allOnes = false;
    }
    return { value, length, unknown: !keepMarker && allOnes };
};

interface WebmOpus {
    opusHead: Uint8Array | null;
    packets: Uint8Array[];
}

const readWebmOpus = (bytes: Uint8Array): WebmOpus => {
    const packets: Uint8Array[] = [];
    let opusHead: Uint8Array | null = null;
    let pos = 0;
    while (pos < bytes.length) {
        const id = readVint(bytes, pos, true);
        if (!id) break;
        const size = readVint(bytes, pos + id.length, false);
        if (!size) break;
        const dataStart = pos + id.length + size.length;
        if (CONTAINERS.has(id.value)) {
            pos = dataStart; // step inside
            continue;
        }
        if (size.unknown) break; // only containers may have unknown size
        const dataEnd = Math.min(dataStart + size.value, bytes.length);
        if (id.value === ID.CodecPrivate) {
            opusHead = bytes.slice(dataStart, dataEnd);
        } else if (id.value === ID.SimpleBlock || id.value === ID.Block) {
            // track number (vint), timecode (int16), flags, then the frame
            const track = readVint(bytes, dataStart, false);
            if (track) {
                const flags = bytes[dataStart + track.length + 2];
                if (flags & 0x06) throw new Error("Laced WebM blocks aren't supported");
                packets.push(bytes.slice(dataStart + track.length + 3, dataEnd));
            }
        }
        pos = dataEnd;
    }
    return { opusHead, packets };
};

// ── Opus packet duration (RFC 6716 §3.1) ─────────────────────────────────────

// Samples at 48 kHz in one Opus packet, from its TOC byte.
const opusPacketSamples = (packet: Uint8Array) => {
    if (!packet.length) return 0;
    const toc = packet[0];
    const config = toc >> 3;
    let frameMs: number;
    if (config < 12) frameMs = [10, 20, 40, 60][config & 3];
    else if (config < 16) frameMs = [10, 20][config & 1];
    else frameMs = [2.5, 5, 10, 20][config & 3];
    const code = toc & 3;
    const frames = code === 0 ? 1 : code === 3 ? (packet[1] ?? 0) & 0x3f : 2;
    return Math.round(frameMs * 48) * frames;
};

// ── Ogg writing (RFC 3533) ───────────────────────────────────────────────────

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let r = i << 24;
        for (let j = 0; j < 8; j++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
        table[i] = r >>> 0;
    }
    return table;
})();

const oggCrc = (bytes: Uint8Array) => {
    let crc = 0;
    for (let i = 0; i < bytes.length; i++) crc = ((crc << 8) ^ CRC_TABLE[((crc >>> 24) ^ bytes[i]) & 0xff]) >>> 0;
    return crc >>> 0;
};

const lacing = (length: number) => {
    const segments: number[] = [];
    let left = length;
    while (left >= 255) {
        segments.push(255);
        left -= 255;
    }
    segments.push(left); // a final <255 (possibly 0) segment ends the packet
    return segments;
};

const buildPage = (packets: Uint8Array[], granule: number, serial: number, sequence: number, headerType: number) => {
    const segments = packets.flatMap((p) => lacing(p.length));
    const dataLength = packets.reduce((n, p) => n + p.length, 0);
    const page = new Uint8Array(27 + segments.length + dataLength);
    const view = new DataView(page.buffer);
    page.set([0x4f, 0x67, 0x67, 0x53], 0); // "OggS"
    page[4] = 0; // version
    page[5] = headerType;
    view.setUint32(6, granule % 0x100000000, true);
    view.setUint32(10, Math.floor(granule / 0x100000000), true);
    view.setUint32(14, serial, true);
    view.setUint32(18, sequence, true);
    view.setUint32(22, 0, true); // CRC, filled in below
    page[26] = segments.length;
    page.set(segments, 27);
    let offset = 27 + segments.length;
    for (const p of packets) {
        page.set(p, offset);
        offset += p.length;
    }
    view.setUint32(22, oggCrc(page), true);
    return page;
};

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

// Default mono OpusHead, used if the WebM has no CodecPrivate.
const defaultOpusHead = () => {
    const head = new Uint8Array(19);
    const view = new DataView(head.buffer);
    head.set(ascii("OpusHead"), 0);
    head[8] = 1; // version
    head[9] = 1; // channels
    view.setUint16(10, 312, true); // pre-skip
    view.setUint32(12, 48000, true); // original rate (informational)
    view.setInt16(16, 0, true); // gain
    head[18] = 0; // mapping family
    return head;
};

const opusTags = () => {
    const vendor = ascii("Basepoint POS");
    const tags = new Uint8Array(8 + 4 + vendor.length + 4);
    const view = new DataView(tags.buffer);
    tags.set(ascii("OpusTags"), 0);
    view.setUint32(8, vendor.length, true);
    tags.set(vendor, 12);
    view.setUint32(12 + vendor.length, 0, true); // no user comments
    return tags;
};

const isOpusHead = (b: Uint8Array | null): b is Uint8Array =>
    !!b && b.length >= 19 && String.fromCharCode(...b.slice(0, 8)) === "OpusHead";

/** Rewrap Opus audio recorded as WebM into an Ogg file WhatsApp accepts. */
export const webmOpusToOgg = (webm: ArrayBuffer): { ogg: Uint8Array<ArrayBuffer>; durationMs: number } => {
    const { opusHead, packets } = readWebmOpus(new Uint8Array(webm));
    if (!packets.length) throw new Error("The recording has no audio");

    const serial = (Math.random() * 0xffffffff) >>> 0;
    const pages: Uint8Array[] = [];
    let sequence = 0;
    pages.push(buildPage([isOpusHead(opusHead) ? opusHead : defaultOpusHead()], 0, serial, sequence++, 0x02)); // BOS
    pages.push(buildPage([opusTags()], 0, serial, sequence++, 0x00));

    // Audio: whole packets per page, up to 255 lacing segments (~1s of audio).
    let granule = 0;
    let page: Uint8Array[] = [];
    let segmentCount = 0;
    packets.forEach((packet, i) => {
        const segs = lacing(packet.length).length;
        if (page.length && segmentCount + segs > 255) {
            pages.push(buildPage(page, granule, serial, sequence++, 0x00));
            page = [];
            segmentCount = 0;
        }
        page.push(packet);
        segmentCount += segs;
        granule += opusPacketSamples(packet);
        if (i === packets.length - 1) pages.push(buildPage(page, granule, serial, sequence++, 0x04)); // EOS
    });

    const total = pages.reduce((n, p) => n + p.length, 0);
    const ogg = new Uint8Array(total);
    let offset = 0;
    for (const p of pages) {
        ogg.set(p, offset);
        offset += p.length;
    }
    const preSkip = isOpusHead(opusHead) ? new DataView(opusHead.buffer, opusHead.byteOffset).getUint16(10, true) : 312;
    return { ogg, durationMs: Math.max(0, ((granule - preSkip) / 48000) * 1000) };
};
