/**
 * Pure-JS uinput helper — creates a virtual gamepad via /dev/uinput.
 * No native module required; uses the `ioctl` package + Node fs.
 */
'use strict';

const fs = require('fs');
const ioctl = require('ioctl');

// ── Linux constants ──────────────────────────────────────────────────────────
const EV_SYN = 0x00;
const EV_KEY = 0x01;
const EV_ABS = 0x03;
const SYN_REPORT = 0;

const BTN_SOUTH = 0x130; // A
const BTN_EAST = 0x131;  // B
const BTN_NORTH = 0x133; // X
const BTN_WEST = 0x134;  // Y
const BTN_TL = 0x136;
const BTN_TR = 0x137;
const BTN_TL2 = 0x138;
const BTN_TR2 = 0x139;
const BTN_SELECT = 0x13a;
const BTN_START = 0x13b;
const BTN_MODE = 0x13c;
const BTN_THUMBL = 0x13d;
const BTN_THUMBR = 0x13e;
const BTN_DPAD_UP = 0x220;
const BTN_DPAD_DOWN = 0x221;
const BTN_DPAD_LEFT = 0x222;
const BTN_DPAD_RIGHT = 0x223;

const ABS_X = 0x00;
const ABS_Y = 0x01;
const ABS_Z = 0x02;
const ABS_RX = 0x03;
const ABS_RY = 0x04;
const ABS_RZ = 0x05;

const BUS_USB = 0x03;
const UINPUT_MAX_NAME_SIZE = 80;
const ABS_CNT = 0x40;

// ── uinput ioctl codes ───────────────────────────────────────────────────────
const UI_DEV_CREATE  = 0x5501;
const UI_DEV_DESTROY = 0x5502;
const UI_SET_EVBIT   = 0x40045564;
const UI_SET_KEYBIT  = 0x40045565;
const UI_SET_ABSBIT  = 0x40045567;

const BUTTONS = [
  BTN_SOUTH, BTN_EAST, BTN_NORTH, BTN_WEST,
  BTN_TL, BTN_TR, BTN_TL2, BTN_TR2,
  BTN_SELECT, BTN_START, BTN_MODE,
  BTN_THUMBL, BTN_THUMBR,
  BTN_DPAD_UP, BTN_DPAD_DOWN, BTN_DPAD_LEFT, BTN_DPAD_RIGHT,
];

const AXES = [
  { code: ABS_X,  min: -32768, max: 32767, flat: 128, fuzz: 0 },
  { code: ABS_Y,  min: -32768, max: 32767, flat: 128, fuzz: 0 },
  { code: ABS_RX, min: -32768, max: 32767, flat: 128, fuzz: 0 },
  { code: ABS_RY, min: -32768, max: 32767, flat: 128, fuzz: 0 },
  { code: ABS_Z,  min: 0,      max: 255,   flat: 0,   fuzz: 0 },
  { code: ABS_RZ, min: 0,      max: 255,   flat: 0,   fuzz: 0 },
];

// input_event struct: timeval (8 bytes on 64-bit: tv_sec int64 + tv_usec int64),
// type uint16, code uint16, value int32 — total 24 bytes on 64-bit Linux.
const INPUT_EVENT_SIZE = 24;

function writeEvent(fd, type, code, value) {
  const buf = Buffer.alloc(INPUT_EVENT_SIZE, 0);
  // timeval: leave as 0 (kernel fills it)
  buf.writeUInt16LE(type, 16);
  buf.writeUInt16LE(code, 18);
  buf.writeInt32LE(value, 20);
  fs.writeSync(fd, buf);
}

function sync(fd) {
  writeEvent(fd, EV_SYN, SYN_REPORT, 0);
}

/**
 * Creates a virtual gamepad. Returns { destroy() }.
 * @param {string} name  Device name (max 79 chars)
 */
function createGamepad(name = '8BitDo Ultimate Wireless') {
  const fd = fs.openSync('/dev/uinput', 'w+');

  ioctl(fd, UI_SET_EVBIT, EV_KEY);
  ioctl(fd, UI_SET_EVBIT, EV_ABS);
  for (const btn of BUTTONS) {
    ioctl(fd, UI_SET_KEYBIT, btn);
  }
  for (const ax of AXES) {
    ioctl(fd, UI_SET_ABSBIT, ax.code);
  }

  // uinput_user_dev: name[80] + input_id(8) + ff_effects_max(4) +
  //   absmax[64] + absmin[64] + absfuzz[64] + absflat[64]  (each int32[64])
  const structSize = UINPUT_MAX_NAME_SIZE + 8 + 4 + ABS_CNT * 4 * 4;
  const buf = Buffer.alloc(structSize, 0);

  buf.write(name.slice(0, UINPUT_MAX_NAME_SIZE - 1), 0, 'utf8');

  const idOffset = UINPUT_MAX_NAME_SIZE;
  buf.writeUInt16LE(BUS_USB, idOffset);      // bustype
  buf.writeUInt16LE(0x2dc8, idOffset + 2);   // vendor
  buf.writeUInt16LE(0x3106, idOffset + 4);   // product
  buf.writeUInt16LE(1,      idOffset + 6);   // version

  const absBase = UINPUT_MAX_NAME_SIZE + 8 + 4;
  for (const ax of AXES) {
    buf.writeInt32LE(ax.max,  absBase + ax.code * 4);
    buf.writeInt32LE(ax.min,  absBase + ABS_CNT * 4 + ax.code * 4);
    buf.writeInt32LE(ax.fuzz, absBase + ABS_CNT * 8 + ax.code * 4);
    buf.writeInt32LE(ax.flat, absBase + ABS_CNT * 12 + ax.code * 4);
  }

  fs.writeSync(fd, buf);
  ioctl(fd, UI_DEV_CREATE, 0);

  return {
    pressButton(code) {
      writeEvent(fd, EV_KEY, code, 1);
      sync(fd);
    },
    releaseButton(code) {
      writeEvent(fd, EV_KEY, code, 0);
      sync(fd);
    },
    moveAxis(code, value) {
      writeEvent(fd, EV_ABS, code, value);
      sync(fd);
    },
    destroy() {
      ioctl(fd, UI_DEV_DESTROY, 0);
      fs.closeSync(fd);
    },
  };
}

module.exports = { createGamepad, BTN_SOUTH, BTN_EAST, ABS_X, ABS_Y, ABS_RX, ABS_RY };
