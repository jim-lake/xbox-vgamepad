(function() {
	//#region src/tools/log.ts
	var g_logger = null;
	var g_enabled = typeof localStorage !== "undefined" && localStorage.getItem("xvg-enableLogging") !== "false";
	function setLoggingEnabled(enabled) {
		g_enabled = enabled;
	}
	function log(...args) {
		if (!g_enabled) return;
		console.log(...args);
	}
	function debugLog(...args) {
		console.log(...args);
		if (g_logger) g_logger(...args);
	}
	//#endregion
	//#region src/injected/coop-patch.ts
	var TAG = "[COOP-PATCH]";
	function extractMethod(src, methodName, paramCount) {
		const re = new RegExp("(?<!\\.)" + methodName + "\\s*\\(([^)]+)\\)\\s*\\{", "g");
		let m;
		while ((m = re.exec(src)) !== null) {
			if (!m[1]) continue;
			const params = m[1].split(",").map((p) => p.trim());
			if (params.length !== paramCount) continue;
			let braceCount = 0;
			let methodEnd = -1;
			const bodyStart = src.indexOf("{", m.index + m[0].length - 1);
			for (let i = bodyStart; i < src.length; i++) if (src[i] === "{") braceCount++;
			else if (src[i] === "}") {
				braceCount--;
				if (braceCount === 0) {
					methodEnd = i + 1;
					break;
				}
			}
			if (methodEnd === -1) continue;
			return {
				start: m.index,
				end: methodEnd,
				body: src.slice(m.index, methodEnd),
				params
			};
		}
		return null;
	}
	function patchOnGamepadChanged(method, params) {
		const [sourceParam, indexParam, connectedParam] = params;
		let patched = method;
		const sigEnd = patched.indexOf("{");
		if (sigEnd !== -1) patched = patched.slice(0, sigEnd + 1) + `if(!self.__XBVG__coopClass_prototype__){self.__XBVG__coopClass_prototype__=Object.getPrototypeOf(this);}console.log("[COOP-PATCH] onGamepadChanged intercepted: source="+${sourceParam}+", index="+${indexParam}+", connected="+${connectedParam});` + patched.slice(sigEnd + 1);
		patched = patched.replace(/this\.gamepadStates\.get\(\d+\)/g, `this.gamepadStates.get(${indexParam})`);
		patched = patched.replace(/this\.gamepadStates\.set\(\d+,/g, `this.gamepadStates.set(${indexParam},`);
		patched = patched.replace(/this\.gamepadStates\.delete\(\d+\)/g, `this.gamepadStates.delete(${indexParam})`);
		patched = patched.replace(/GamepadIndex:\s*\d+/g, `GamepadIndex:${indexParam}`);
		patched = patched.replace(/this\.inputSink\.onGamepadChanged\(\d+,/g, `this.inputSink.onGamepadChanged(${indexParam},`);
		patched = patched.replace(/\d+\s*===\s*(\w+)\.GamepadIndex/g, `${indexParam}===$1.GamepadIndex`);
		patched = patched.replace(/(\w+)\.GamepadIndex\s*===\s*\d+/g, `$1.GamepadIndex===${indexParam}`);
		return patched;
	}
	function patchOnGamepadInput(method, params) {
		const [sourceParam] = params;
		let patched = method;
		const re = new RegExp("(\\w)\\s*=\\s*" + escapeRegExp(sourceParam) + "\\s*\\+\\s*(\\w)\\.GamepadIndex\\s*,\\s*(\\w)\\s*=\\s*\\d+\\s*,\\s*(\\w)\\s*=\\s*this\\.gamepadStates\\.get\\(\\3\\)", "g");
		patched = patched.replace(re, `$1=${sourceParam}+$2.GamepadIndex,$3=$2.GamepadIndex,$4=this.gamepadStates.get($3)`);
		return patched;
	}
	function escapeRegExp(s) {
		return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
	function patchModuleSource(src) {
		const changed = extractMethod(src, "onGamepadChanged", 3);
		if (!changed) {
			log(TAG, "could not find onGamepadChanged(3) signature");
			return null;
		}
		const patchedChanged = patchOnGamepadChanged(changed.body, changed.params);
		let result = src.slice(0, changed.start) + patchedChanged + src.slice(changed.end);
		log(TAG, "Patching onGamepadChanged params:", changed.params.join(","));
		const input = extractMethod(result, "onGamepadInput", 4);
		if (input) {
			const patchedInput = patchOnGamepadInput(input.body, input.params);
			result = result.slice(0, input.start) + patchedInput + result.slice(input.end);
			log(TAG, "onGamepadInput patched");
		} else log(TAG, "WARNING: could not find onGamepadInput signature");
		return stripFunctionWrapper(result);
	}
	function stripFunctionWrapper(src) {
		const firstBrace = src.indexOf("{");
		if (firstBrace === -1) return src;
		return src.slice(firstBrace + 1, src.lastIndexOf("}"));
	}
	function scanAndPatchModules(modules) {
		for (const key of Object.keys(modules)) {
			const mod = modules[key];
			if (typeof mod !== "function") continue;
			const modSrc = mod.toString();
			if (modSrc.includes("gamepadMappingsToSend") && modSrc.includes("onGamepadChanged")) {
				log(TAG, "FOUND target module at key:", key, "len:", String(modSrc.length));
				const patched = patchModuleSource(modSrc);
				if (patched) try {
					modules[key] = new Function("e", "t", "i", patched);
					log(TAG, "module", key, "REPLACED successfully");
					return true;
				} catch (err) {
					log(TAG, "ERROR creating patched function:", err);
				}
				return false;
			}
		}
		return false;
	}
	if (localStorage.getItem("xvg-patchRemoteMultigamepad") === "false") log(TAG, "patch disabled via settings (reload required to re-enable)");
	else {
		log(TAG, "installing interceptor");
		const g = self;
		let patchApplied = false;
		let realArray = g["__LOADABLE_LOADED_CHUNKS__"] ?? [];
		function processChunks(args) {
			for (const chunk of args) {
				if (patchApplied) break;
				if (!Array.isArray(chunk) || chunk.length < 2) continue;
				const modules = chunk[1];
				if (!modules || typeof modules !== "object") continue;
				const count = Object.keys(modules).length;
				log(TAG, "chunk has", String(count), "modules");
				patchApplied = scanAndPatchModules(modules);
			}
		}
		function installPushTrap(arr) {
			const nativePush = arr.push.bind(arr);
			let currentPush = (...args) => nativePush(...args);
			Object.defineProperty(arr, "push", {
				configurable: true,
				enumerable: false,
				get() {
					return currentPush;
				},
				set(newPush) {
					log(TAG, ".push overwritten, wrapping");
					const theirPush = newPush;
					currentPush = function(...args) {
						if (!patchApplied) processChunks(args);
						return theirPush.apply(arr, args);
					};
				}
			});
		}
		installPushTrap(realArray);
		Object.defineProperty(g, "__LOADABLE_LOADED_CHUNKS__", {
			configurable: true,
			get() {
				return realArray;
			},
			set(newVal) {
				if (Array.isArray(newVal)) {
					realArray = newVal;
					if (!patchApplied) {
						processChunks(realArray);
						installPushTrap(realArray);
					}
				}
			}
		});
		processChunks(realArray);
		log(TAG, "interceptor installed, patchApplied:", String(patchApplied));
	}
	//#endregion
	//#region src/types/messages.ts
	var MSG_SOURCE = "xbox-vgamepad-content-script";
	function isExtensionMessage(data) {
		return data !== null && typeof data === "object" && data.source === "xbox-vgamepad-content-script";
	}
	//#endregion
	//#region src/injected/game-detection.ts
	function detectGame() {
		if (!location.hostname.includes("xbox.com")) return true;
		const h1 = document.querySelector("h1");
		const closeBtn = document.querySelector("[data-id='ui-container'] [aria-label='Close']");
		const streamDiv = document.getElementById("game-stream");
		return !h1 && !closeBtn && !!streamDiv;
	}
	function getGameName() {
		const parts = document.title.split(/\s+\|/);
		if (parts.length === 2) return parts[0]?.trim() ?? null;
		return null;
	}
	//#endregion
	//#region src/injected/gamepad-simulator.ts
	var GAMEPAD_ID = "Xbox 360 Controller (XInput STANDARD GAMEPAD)";
	var AxisDirection = {
		UP: 0,
		DOWN: 1,
		LEFT: 2,
		RIGHT: 3
	};
	var directionMeta = {
		[AxisDirection.UP]: {
			position: 1,
			value: -1,
			opposite: AxisDirection.DOWN
		},
		[AxisDirection.DOWN]: {
			position: 1,
			value: 1,
			opposite: AxisDirection.UP
		},
		[AxisDirection.LEFT]: {
			position: 0,
			value: -1,
			opposite: AxisDirection.RIGHT
		},
		[AxisDirection.RIGHT]: {
			position: 0,
			value: 1,
			opposite: AxisDirection.LEFT
		}
	};
	function createButton() {
		return {
			pressed: false,
			touched: false,
			value: 0
		};
	}
	function padToPlain(pad, overrides) {
		return {
			id: pad.id,
			index: overrides?.index ?? pad.index,
			mapping: pad.mapping,
			connected: pad.connected,
			buttons: Array.from(pad.buttons).map((b) => ({
				pressed: b.pressed,
				touched: b.touched,
				value: b.value
			})),
			axes: Array.from(pad.axes),
			timestamp: pad.timestamp,
			hapticActuators: [],
			vibrationActuator: null
		};
	}
	var GamepadSimulator = class {
		buttons = Array.from({ length: 17 }, createButton);
		axes = [
			0,
			0,
			0,
			0
		];
		timestamp = performance.now();
		connected = false;
		enabled = false;
		index = -1;
		dirPressed = [[
			0,
			0,
			0,
			0
		], [
			0,
			0,
			0,
			0
		]];
		buttonPressCount = Array.from({ length: 17 }).fill(0);
		snapshot(index) {
			return {
				id: GAMEPAD_ID,
				index,
				mapping: "standard",
				connected: this.connected,
				buttons: this.buttons.map((b) => ({ ...b })),
				axes: [...this.axes],
				timestamp: this.timestamp,
				hapticActuators: [],
				vibrationActuator: null
			};
		}
		reset() {
			for (const btn of this.buttons) {
				btn.pressed = false;
				btn.touched = false;
				btn.value = 0;
			}
			this.axes = [
				0,
				0,
				0,
				0
			];
			this.dirPressed = [[
				0,
				0,
				0,
				0
			], [
				0,
				0,
				0,
				0
			]];
			this.buttonPressCount = Array.from({ length: 17 }).fill(0);
		}
		enable(index) {
			if (this.enabled) return;
			this.reset();
			this.enabled = true;
			this.connected = true;
			this.index = index;
			this.timestamp = performance.now();
			debugLog("[gamepad] connected", index);
			const evt = new Event("gamepadconnected");
			evt["gamepad"] = this.snapshot(index);
			window.dispatchEvent(evt);
		}
		disable(index) {
			if (!this.enabled) return;
			this.connected = false;
			this.timestamp = performance.now();
			debugLog("[gamepad] disconnected", index);
			const evt = new Event("gamepaddisconnected");
			evt["gamepad"] = this.snapshot(index);
			window.dispatchEvent(evt);
			this.enabled = false;
			this.reset();
		}
		isEnabled() {
			return this.enabled;
		}
		resetState() {
			this.reset();
			this.timestamp = performance.now();
		}
		pressButton(index) {
			const btn = this.buttons[index];
			if (btn) {
				this.buttonPressCount[index] = (this.buttonPressCount[index] ?? 0) + 1;
				btn.pressed = true;
				btn.touched = true;
				btn.value = 1;
				this.timestamp = performance.now();
				debugLog("[gamepad] button down", index, "pad", this.index);
			}
		}
		unpressButton(index) {
			const btn = this.buttons[index];
			if (btn) {
				const count = (this.buttonPressCount[index] ?? 1) - 1;
				this.buttonPressCount[index] = Math.max(0, count);
				if (this.buttonPressCount[index] === 0) {
					btn.pressed = false;
					btn.touched = false;
					btn.value = 0;
					this.timestamp = performance.now();
					debugLog("[gamepad] button up", index, "pad", this.index);
				}
			}
		}
		pressDirection(stick, direction) {
			const meta = directionMeta[direction];
			const dirArr = this.dirPressed[stick];
			if (!dirArr) return;
			dirArr[direction] = (dirArr[direction] ?? 0) + 1;
			const oppMeta = directionMeta[meta.opposite];
			const axisIndex = stick * 2 + meta.position;
			const value = meta.value + ((dirArr[meta.opposite] ?? 0) > 0 ? oppMeta.value : 0);
			this.axes[axisIndex] = value;
			this.timestamp = performance.now();
			debugLog("[gamepad] axis down stick", stick, "dir", direction, "axis", axisIndex, "=", value, "pad", this.index);
		}
		unpressDirection(stick, direction) {
			const meta = directionMeta[direction];
			const dirArr = this.dirPressed[stick];
			if (!dirArr) return;
			dirArr[direction] = Math.max(0, (dirArr[direction] ?? 1) - 1);
			const axisIndex = stick * 2 + meta.position;
			const thisHeld = dirArr[direction] > 0;
			const oppHeld = (dirArr[meta.opposite] ?? 0) > 0;
			if (thisHeld && oppHeld) this.axes[axisIndex] = 0;
			else if (thisHeld) this.axes[axisIndex] = meta.value;
			else if (oppHeld) this.axes[axisIndex] = directionMeta[meta.opposite].value;
			else this.axes[axisIndex] = 0;
			this.timestamp = performance.now();
			debugLog("[gamepad] axis up stick", stick, "dir", direction, "axis", axisIndex, "=", this.axes[axisIndex], "pad", this.index);
		}
		moveStick(stick, x, y) {
			this.axes[stick * 2] = x;
			this.axes[stick * 2 + 1] = y;
			this.timestamp = performance.now();
			debugLog("[gamepad] axis move stick", stick, "x =", x, "y =", y, "pad", this.index);
		}
	};
	var g_simulators = /* @__PURE__ */ new Map();
	var g_originalGetGamepads = navigator.getGamepads.bind(navigator);
	var g_virtualSlots = /* @__PURE__ */ new Set();
	var g_physicalSlots = /* @__PURE__ */ new Map();
	var g_mode = "separate";
	function getSimulator(index) {
		let sim = g_simulators.get(index);
		if (!sim) {
			sim = new GamepadSimulator();
			g_simulators.set(index, sim);
		}
		return sim;
	}
	function assignPhysicalSlot(padId) {
		const existing = g_physicalSlots.get(padId);
		if (existing !== void 0 && !g_virtualSlots.has(existing)) return existing;
		const usedByPhysical = new Set(g_physicalSlots.values());
		for (let i = 0; i < 4; i++) if (!g_virtualSlots.has(i) && !usedByPhysical.has(i)) {
			g_physicalSlots.set(padId, i);
			return i;
		}
		return -1;
	}
	function dispatchGamepadEvent(name, pad, slot) {
		const evt = new Event(name);
		evt["gamepad"] = padToPlain(pad, { index: slot });
		window.dispatchEvent(evt);
	}
	window.addEventListener("gamepadconnected", (e) => {
		const pad = e["gamepad"];
		if (!pad || pad.id === GAMEPAD_ID) return;
		if (g_mode === "combine") {
			if (g_virtualSlots.has(pad.index)) e.stopImmediatePropagation();
			return;
		}
		e.stopImmediatePropagation();
		const slot = assignPhysicalSlot(pad.id);
		if (slot >= 0) dispatchGamepadEvent("gamepadconnected", pad, slot);
	}, true);
	window.addEventListener("gamepaddisconnected", (e) => {
		const pad = e["gamepad"];
		if (!pad || pad.id === GAMEPAD_ID) return;
		if (g_mode === "combine") {
			if (g_virtualSlots.has(pad.index)) e.stopImmediatePropagation();
			return;
		}
		e.stopImmediatePropagation();
		const slot = g_physicalSlots.get(pad.id);
		g_physicalSlots.delete(pad.id);
		if (slot !== void 0) dispatchGamepadEvent("gamepaddisconnected", pad, slot);
	}, true);
	function updateVirtualSlots(newVirtualSlots) {
		g_virtualSlots = newVirtualSlots;
		if (g_mode === "combine") return;
		const real = g_originalGetGamepads();
		const realPads = Array.from(real).filter((p) => p !== null);
		for (const pad of realPads) {
			const currentSlot = g_physicalSlots.get(pad.id);
			if (currentSlot === void 0) if (!g_virtualSlots.has(pad.index)) g_physicalSlots.set(pad.id, pad.index);
			else {
				const newSlot = assignPhysicalSlot(pad.id);
				if (newSlot >= 0) dispatchGamepadEvent("gamepadconnected", pad, newSlot);
			}
			else if (g_virtualSlots.has(currentSlot)) {
				dispatchGamepadEvent("gamepaddisconnected", pad, currentSlot);
				g_physicalSlots.delete(pad.id);
				const newSlot = assignPhysicalSlot(pad.id);
				if (newSlot >= 0) dispatchGamepadEvent("gamepadconnected", pad, newSlot);
			}
		}
	}
	navigator.getGamepads = () => {
		const real = g_originalGetGamepads();
		if (Array.from(g_simulators.entries()).filter(([, s]) => s.isEnabled()).length === 0) return real;
		if (g_mode === "combine") {
			const result = [
				null,
				null,
				null,
				null
			];
			for (const [idx, sim] of g_simulators.entries()) {
				if (!sim.isEnabled() || idx >= 4) continue;
				const virtualSnap = sim.snapshot(idx);
				const physicalPad = real[idx] ?? null;
				if (!physicalPad) {
					result[idx] = padToPlain(virtualSnap, { index: idx });
					continue;
				}
				const mergedButtons = virtualSnap.buttons.map((vb, i) => {
					const pb = physicalPad.buttons[i];
					const pressed = vb.pressed || (pb?.pressed ?? false);
					return {
						pressed,
						touched: pressed,
						value: pressed ? 1 : 0
					};
				});
				const mergedAxes = virtualSnap.axes.map((va, i) => va !== 0 ? va : physicalPad.axes[i] ?? 0);
				result[idx] = {
					id: virtualSnap.id,
					index: idx,
					mapping: virtualSnap.mapping,
					connected: virtualSnap.connected,
					buttons: mergedButtons,
					axes: mergedAxes,
					timestamp: virtualSnap.timestamp,
					hapticActuators: [],
					vibrationActuator: null
				};
			}
			for (let i = 0; i < 4; i++) if (!g_virtualSlots.has(i)) result[i] = real[i] ?? null;
			return result;
		} else {
			const result = [
				null,
				null,
				null,
				null
			];
			for (const [idx, sim] of g_simulators.entries()) if (sim.isEnabled() && idx < 4) result[idx] = padToPlain(sim.snapshot(idx), { index: idx });
			const realPads = Array.from(real).filter((p) => p !== null);
			for (const pad of realPads) {
				const slot = g_physicalSlots.get(pad.id);
				if (slot !== void 0 && slot < 4) result[slot] = padToPlain(pad, { index: slot });
			}
			return result;
		}
	};
	function setMode(mode) {
		g_mode = mode ?? "separate";
	}
	//#endregion
	//#region src/types/gamepad.ts
	var BUTTON_MAP = {
		a: 0,
		b: 1,
		x: 2,
		y: 3,
		leftShoulder: 4,
		rightShoulder: 5,
		leftTrigger: 6,
		rightTrigger: 7,
		select: 8,
		start: 9,
		leftStickPressed: 10,
		rightStickPressed: 11,
		dpadUp: 12,
		dpadDown: 13,
		dpadLeft: 14,
		dpadRight: 15,
		home: 16
	};
	var Direction = {
		UP: "UP",
		DOWN: "DOWN",
		LEFT: "LEFT",
		RIGHT: "RIGHT"
	};
	//#endregion
	//#region src/injected/script-actions.ts
	var AXIS_ACTION_MAP = {
		leftStickUp: {
			stick: 0,
			direction: Direction.UP
		},
		leftStickDown: {
			stick: 0,
			direction: Direction.DOWN
		},
		leftStickLeft: {
			stick: 0,
			direction: Direction.LEFT
		},
		leftStickRight: {
			stick: 0,
			direction: Direction.RIGHT
		},
		rightStickUp: {
			stick: 1,
			direction: Direction.UP
		},
		rightStickDown: {
			stick: 1,
			direction: Direction.DOWN
		},
		rightStickLeft: {
			stick: 1,
			direction: Direction.LEFT
		},
		rightStickRight: {
			stick: 1,
			direction: Direction.RIGHT
		}
	};
	var directionToAxis = {
		[Direction.UP]: AxisDirection.UP,
		[Direction.DOWN]: AxisDirection.DOWN,
		[Direction.LEFT]: AxisDirection.LEFT,
		[Direction.RIGHT]: AxisDirection.RIGHT
	};
	function executePress(action) {
		const sim = getSimulator(action.gamepadIndex);
		const buttonIndex = BUTTON_MAP[action.action];
		if (buttonIndex !== void 0) {
			sim.pressButton(buttonIndex);
			return;
		}
		const axisInfo = AXIS_ACTION_MAP[action.action];
		if (axisInfo) sim.pressDirection(axisInfo.stick, directionToAxis[axisInfo.direction]);
	}
	function executeUnpress(action) {
		const sim = getSimulator(action.gamepadIndex);
		const buttonIndex = BUTTON_MAP[action.action];
		if (buttonIndex !== void 0) {
			sim.unpressButton(buttonIndex);
			return;
		}
		const axisInfo = AXIS_ACTION_MAP[action.action];
		if (axisInfo) sim.unpressDirection(axisInfo.stick, directionToAxis[axisInfo.direction]);
	}
	//#endregion
	//#region src/tools/sweep.ts
	function calcSweepMag(pos) {
		return {
			angle: Math.atan2(pos.y, pos.x),
			magnitude: Math.max(Math.abs(pos.x), Math.abs(pos.y))
		};
	}
	var TAU = Math.PI * 2;
	/**
	* @param t - Interpolation factor in [0, 1], where 0 returns start and 1 returns end
	*/
	function calcSweepPos(start, end, clockwise, t) {
		let delta = end.angle - start.angle;
		if (clockwise && delta > 0) delta -= TAU;
		else if (!clockwise && delta < 0) delta += TAU;
		const angle = start.angle + delta * t;
		const mag = start.magnitude + (end.magnitude - start.magnitude) * t;
		let x = Math.cos(angle);
		let y = Math.sin(angle);
		const s = 1 / Math.max(Math.abs(x), Math.abs(y));
		x *= s;
		y *= s;
		return {
			x: x * mag,
			y: y * mag
		};
	}
	//#endregion
	//#region src/injected/script-runner.ts
	var FPS_MS = 1e3 / 60;
	function runScript(script) {
		const state = { cancelled: false };
		const held = [];
		const pointedSticks = [];
		const rotationTimeouts = [];
		const rotationPromises = [];
		const startTime = Date.now();
		let scheduledMs = 0;
		function pressAction(action) {
			executePress(action);
			held.push(action);
		}
		function releaseAction(action) {
			executeUnpress(action);
			const idx = held.findIndex((h) => h.gamepadIndex === action.gamepadIndex && h.action === action.action);
			if (idx !== -1) held.splice(idx, 1);
		}
		function releaseAll() {
			for (const action of [...held].reverse()) executeUnpress(action);
			held.length = 0;
			for (const p of pointedSticks) getSimulator(p.gamepadIndex).moveStick(p.stick, 0, 0);
			pointedSticks.length = 0;
			for (const tid of rotationTimeouts) clearTimeout(tid);
			rotationTimeouts.length = 0;
		}
		function stickIndex(stick) {
			return stick === "left" ? 0 : 1;
		}
		function executeRotate(step) {
			const sIdx = stickIndex(step.stick);
			const sim = getSimulator(step.gamepadIndex);
			const rotIdx = rotationTimeouts.length;
			rotationTimeouts.push(void 0);
			pointedSticks.push({
				gamepadIndex: step.gamepadIndex,
				stick: sIdx
			});
			const cw = !step.clockwise;
			return new Promise((resolve) => {
				if (step.directions === "infinite") {
					const startAM = calcSweepMag({
						x: step.startX,
						y: step.startY
					});
					let endAM = calcSweepMag({
						x: step.endX,
						y: step.endY
					});
					if (step.startX === step.endX && step.startY === step.endY) {
						const delta = cw ? -Math.PI * 2 : Math.PI * 2;
						endAM = {
							angle: startAM.angle + delta,
							magnitude: endAM.magnitude
						};
					}
					const t0 = Date.now();
					sim.moveStick(sIdx, step.startX, step.startY);
					function tick() {
						if (state.cancelled) {
							resolve();
							return;
						}
						const t = (Date.now() - t0) / step.rotateMs;
						if (t >= 1) {
							sim.moveStick(sIdx, step.endX, step.endY);
							resolve();
							return;
						}
						const pos = calcSweepPos(startAM, endAM, cw, t);
						sim.moveStick(sIdx, pos.x, pos.y);
						rotationTimeouts[rotIdx] = setTimeout(tick, FPS_MS);
					}
					rotationTimeouts[rotIdx] = setTimeout(tick, FPS_MS);
				} else {
					const n = step.directions;
					const startAngle = Math.atan2(step.startY, step.startX);
					let delta = Math.atan2(step.endY, step.endX) - startAngle;
					if (cw && delta > 0) delta -= Math.PI * 2;
					if (!cw && delta < 0) delta += Math.PI * 2;
					if (step.startX === step.endX && step.startY === step.endY) delta = cw ? -Math.PI * 2 : Math.PI * 2;
					const snapStep = Math.PI * 2 / n;
					const positions = [{
						x: step.startX,
						y: step.startY
					}];
					const dir = cw ? -1 : 1;
					let firstSnap;
					if (cw) {
						firstSnap = Math.floor(startAngle / snapStep) * snapStep;
						if (firstSnap >= startAngle) firstSnap -= snapStep;
					} else {
						firstSnap = Math.ceil(startAngle / snapStep) * snapStep;
						if (firstSnap <= startAngle) firstSnap += snapStep;
					}
					let current = firstSnap;
					const absTotal = Math.abs(delta);
					while (true) {
						if (Math.abs(current - startAngle) >= absTotal - 1e-4) break;
						const mag = 1;
						const cos = Math.cos(current);
						const sin = Math.sin(current);
						const s = 1 / Math.max(Math.abs(cos), Math.abs(sin));
						positions.push({
							x: Math.round(cos * s * mag * 1e3) / 1e3,
							y: Math.round(sin * s * mag * 1e3) / 1e3
						});
						current += dir * snapStep;
					}
					positions.push({
						x: step.endX,
						y: step.endY
					});
					const stepInterval = step.rotateMs / (positions.length - 1);
					let posIdx = 0;
					const first = positions[0];
					if (first) sim.moveStick(sIdx, first.x, first.y);
					function tick() {
						if (state.cancelled) {
							resolve();
							return;
						}
						posIdx++;
						if (posIdx >= positions.length) {
							resolve();
							return;
						}
						const p = positions[posIdx];
						if (p) sim.moveStick(sIdx, p.x, p.y);
						if (posIdx < positions.length - 1) rotationTimeouts[rotIdx] = setTimeout(tick, stepInterval);
						else resolve();
					}
					if (positions.length > 1) rotationTimeouts[rotIdx] = setTimeout(tick, stepInterval);
					else resolve();
				}
			});
		}
		async function runActions(actions) {
			for (const step of actions) {
				if (state.cancelled) return;
				switch (step.type) {
					case "down":
						for (const btn of step.buttons) pressAction(btn);
						break;
					case "up":
						for (const btn of step.buttons) releaseAction(btn);
						break;
					case "delay": {
						if (step.durationMs === "infinite") {
							await new Promise(() => {});
							return;
						}
						scheduledMs += step.durationMs;
						const remaining = startTime + scheduledMs - Date.now();
						if (remaining > 0) await delay(remaining);
						break;
					}
					case "point": {
						const sIdx = stickIndex(step.stick);
						getSimulator(step.gamepadIndex).moveStick(sIdx, step.x, step.y);
						pointedSticks.push({
							gamepadIndex: step.gamepadIndex,
							stick: sIdx
						});
						break;
					}
					case "rotate":
						rotationPromises.push(executeRotate(step));
						break;
					case "loop":
						if (step.count === "infinite") while (!state.cancelled) await runActions(step.actions);
						else for (let i = 0; i < step.count; i++) {
							if (state.cancelled) break;
							await runActions(step.actions);
						}
						break;
				}
			}
		}
		const handle = {
			onDone: void 0,
			cancel() {
				if (state.cancelled) return;
				state.cancelled = true;
				releaseAll();
			}
		};
		runActions(script.actions).then(async () => {
			if (!state.cancelled && rotationPromises.length > 0) await Promise.all(rotationPromises);
			if (!state.cancelled) {
				releaseAll();
				state.cancelled = true;
				handle.onDone?.();
			}
		});
		return handle;
	}
	function delay(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	var ScriptManager = class {
		running = /* @__PURE__ */ new Map();
		toggleActive = /* @__PURE__ */ new Set();
		onCountChange;
		constructor(onCountChange) {
			this.onCountChange = onCountChange;
		}
		notifyCount() {
			this.onCountChange?.(this.running.size);
		}
		onKeyDown(key, script) {
			switch (script.activationType) {
				case "on_down": {
					this.running.get(key)?.cancel();
					const handle = runScript(script);
					this.running.set(key, handle);
					this.notifyCount();
					handle.onDone = () => {
						this.running.delete(key);
						this.notifyCount();
					};
					break;
				}
				case "toggle":
					if (this.toggleActive.has(key)) {
						this.running.get(key)?.cancel();
						this.running.delete(key);
						this.toggleActive.delete(key);
						this.notifyCount();
					} else {
						const handle = runScript(script);
						this.running.set(key, handle);
						this.toggleActive.add(key);
						this.notifyCount();
						handle.onDone = () => {
							this.running.delete(key);
							this.toggleActive.delete(key);
							this.notifyCount();
						};
					}
					break;
				case "held": {
					this.running.get(key)?.cancel();
					const handle = runScript(script);
					this.running.set(key, handle);
					this.notifyCount();
					handle.onDone = () => {
						this.running.delete(key);
						this.notifyCount();
					};
					break;
				}
				case "on_up": break;
			}
		}
		onKeyUp(key, script) {
			switch (script.activationType) {
				case "on_up": {
					this.running.get(key)?.cancel();
					const handle = runScript(script);
					this.running.set(key, handle);
					this.notifyCount();
					handle.onDone = () => {
						this.running.delete(key);
						this.notifyCount();
					};
					break;
				}
				case "held":
					this.running.get(key)?.cancel();
					this.running.delete(key);
					this.notifyCount();
					break;
				case "on_down":
				case "toggle": break;
			}
		}
		cancelAll() {
			for (const handle of this.running.values()) handle.cancel();
			this.running.clear();
			this.toggleActive.clear();
			this.notifyCount();
		}
	};
	//#endregion
	//#region src/injected/css-to-string.ts
	function cssToString(styles) {
		return Object.entries(styles).map(([k, v]) => `${k}:${String(v)}`).join(";");
	}
	//#endregion
	//#region src/injected/overlay.ts
	var g_overlay = null;
	var g_minimizedBtn = null;
	var g_minimizedDismissed = false;
	var g_overlayMinimized = false;
	function getGameContainer$1() {
		return document.getElementById("game-stream") ?? document.body;
	}
	function requestPointerLock() {
		const c = getGameContainer$1();
		if (c) {
			c.requestPointerLock();
			const stream = document.getElementById("game-stream");
			if (stream) stream.focus();
		}
	}
	function removeOverlay() {
		if (g_overlay) {
			g_overlay.remove();
			g_overlay = null;
		}
	}
	function removeMinimized() {
		if (g_minimizedBtn) {
			g_minimizedBtn.remove();
			g_minimizedBtn = null;
		}
	}
	function setOverlayMinimized(val) {
		g_overlayMinimized = val;
	}
	function setMinimizedDismissed(val) {
		g_minimizedDismissed = val;
	}
	function restoreIfDismissed() {
		if (!g_minimizedDismissed || g_overlay || g_minimizedBtn) return false;
		g_minimizedDismissed = false;
		g_overlayMinimized = true;
		showMinimizedBtn(getGameContainer$1() ?? document.body);
		return true;
	}
	function showMinimizedBtn(_container) {
		if (g_minimizedBtn || g_minimizedDismissed) return;
		g_minimizedBtn = document.createElement("div");
		g_minimizedBtn.id = "xvg-pointer-minimized";
		g_minimizedBtn.style.cssText = cssToString({
			position: "fixed",
			top: "8px",
			right: "8px",
			display: "flex",
			"align-items": "center",
			background: "rgba(0,0,0,0.7)",
			color: "#fff",
			"font-size": "12px",
			"font-weight": "500",
			"border-radius": "8px",
			cursor: "pointer",
			"user-select": "none",
			"z-index": "2147483646"
		});
		const label = document.createElement("span");
		label.textContent = "Enable Mouse";
		label.title = "Click to enable mouse control";
		label.style.cssText = cssToString({
			cursor: "pointer",
			padding: "8px 2px 8px 8px"
		});
		label.addEventListener("click", () => {
			removeMinimized();
			requestPointerLock();
		});
		g_minimizedBtn.appendChild(label);
		const closeBtn = document.createElement("span");
		closeBtn.textContent = "✕";
		closeBtn.style.cssText = cssToString({
			cursor: "pointer",
			padding: "8px 8px 8px 8px"
		});
		closeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			g_minimizedDismissed = true;
			removeMinimized();
		});
		g_minimizedBtn.appendChild(closeBtn);
		document.body.appendChild(g_minimizedBtn);
	}
	function minimizeOverlay(container) {
		g_overlayMinimized = true;
		window.postMessage({
			source: MSG_SOURCE,
			type: "SET_OVERLAY_MINIMIZED",
			minimized: true
		}, "*");
		removeOverlay();
		showMinimizedBtn(container);
	}
	function showOverlay(container) {
		if (g_overlay) return;
		if (g_minimizedDismissed) return;
		if (g_overlayMinimized) {
			showMinimizedBtn(container);
			return;
		}
		g_overlay = document.createElement("div");
		g_overlay.id = "xvg-pointer-overlay";
		g_overlay.style.cssText = cssToString({
			position: "fixed",
			top: "0",
			left: "0",
			right: "0",
			bottom: "0",
			display: "flex",
			"align-items": "center",
			"justify-content": "center",
			background: "rgba(0,0,0,0.5)",
			color: "#fff",
			"font-size": "18px",
			cursor: "pointer",
			"z-index": "2147483646"
		});
		const text = document.createElement("span");
		text.textContent = "Click to enable mouse control";
		g_overlay.appendChild(text);
		const minimizeBtn = document.createElement("span");
		minimizeBtn.textContent = "—";
		minimizeBtn.style.cssText = cssToString({
			position: "absolute",
			top: "8px",
			right: "8px",
			width: "24px",
			height: "24px",
			display: "flex",
			"align-items": "center",
			"justify-content": "center",
			background: "rgba(255,255,255,0.2)",
			"border-radius": "4px",
			"font-size": "14px",
			cursor: "pointer"
		});
		minimizeBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			minimizeOverlay(container);
		});
		g_overlay.appendChild(minimizeBtn);
		g_overlay.addEventListener("click", () => {
			requestPointerLock();
		});
		document.body.appendChild(g_overlay);
	}
	//#endregion
	//#region src/injected/input-processor.ts
	var MOUSE_THROTTLE_MS = 40;
	var MOUSE_STOP_MS = 50;
	var SCROLL_UNPRESS_MS = 20;
	function onScriptCountChange(count) {
		window.postMessage({
			source: MSG_SOURCE,
			type: "SCRIPT_COUNT",
			count
		}, "*");
	}
	var TOGGLE_ACTIONS = new Set([
		"toggleGamepad",
		"toggleAllGamepads",
		"toggleExtension"
	]);
	function buildKeyMap(config) {
		const keyMap = /* @__PURE__ */ new Map();
		const scriptMap = /* @__PURE__ */ new Map();
		for (const [code, entries] of Object.entries(config.keyboardConfig)) {
			if (code === "Escape") continue;
			const actions = [];
			const scripts = [];
			for (const entry of entries) if (entry.type === "script") scripts.push(entry);
			else if (!TOGGLE_ACTIONS.has(entry.action)) actions.push(entry);
			if (actions.length > 0) keyMap.set(code, actions);
			if (scripts.length > 0) scriptMap.set(code, scripts);
		}
		return {
			keyMap,
			scriptMap
		};
	}
	function collectScriptIndices(actions, indices) {
		for (const step of actions) if (step.type === "down" || step.type === "up") for (const btn of step.buttons) indices.add(btn.gamepadIndex);
		else if (step.type === "point" || step.type === "rotate") indices.add(step.gamepadIndex);
		else if (step.type === "loop") collectScriptIndices(step.actions, indices);
	}
	function getActiveGamepadIndices(config) {
		const indices = /* @__PURE__ */ new Set();
		for (const entries of Object.values(config.keyboardConfig)) for (const entry of entries) if (entry.type === "action" && !TOGGLE_ACTIONS.has(entry.action)) indices.add(entry.gamepadIndex);
		else if (entry.type === "script") collectScriptIndices(entry.actions, indices);
		for (const mc of config.mouseConfig.mouseControls) indices.add(mc.gamepadIndex);
		return indices;
	}
	var g_keyMap = /* @__PURE__ */ new Map();
	var g_scriptMap = /* @__PURE__ */ new Map();
	var g_scriptManager = new ScriptManager(onScriptCountChange);
	var g_mouseTarget = null;
	var g_sensitivity = 10;
	var g_active = false;
	var g_config = null;
	var g_activeIndices = /* @__PURE__ */ new Set();
	var g_onKeyDown = null;
	var g_onKeyUp = null;
	var g_onMouseDown = null;
	var g_onMouseUp = null;
	var g_onWheel = null;
	var g_onMouseMove = null;
	var g_onPointerLockChange = null;
	var g_accX = 0;
	var g_accY = 0;
	var g_moveTimer = null;
	var g_stopTimer = null;
	var g_lastMoveProcess = 0;
	var g_scrollTimer = null;
	var g_scrollActions = null;
	function clearTimers() {
		if (g_scrollTimer !== null) {
			clearTimeout(g_scrollTimer);
			g_scrollTimer = null;
		}
		if (g_moveTimer !== null) {
			clearTimeout(g_moveTimer);
			g_moveTimer = null;
		}
		if (g_stopTimer !== null) {
			clearTimeout(g_stopTimer);
			g_stopTimer = null;
		}
	}
	function getGameContainer() {
		return document.getElementById("game-stream") ?? document.body;
	}
	function processMouseMovement() {
		g_lastMoveProcess = performance.now();
		if (g_stopTimer !== null) clearTimeout(g_stopTimer);
		g_stopTimer = setTimeout(() => {
			if (g_mouseTarget !== null) getSimulator(g_mouseTarget.gamepadIndex).moveStick(g_mouseTarget.stick, 0, 0);
			g_stopTimer = null;
		}, MOUSE_STOP_MS);
		const x = Math.max(-1, Math.min(1, g_accX / g_sensitivity));
		const y = Math.max(-1, Math.min(1, g_accY / g_sensitivity));
		g_accX = 0;
		g_accY = 0;
		if (g_mouseTarget !== null) getSimulator(g_mouseTarget.gamepadIndex).moveStick(g_mouseTarget.stick, x, y);
	}
	function startMouseListening() {
		g_onMouseMove = (e) => {
			g_accX += e.movementX;
			g_accY += e.movementY;
			const now = performance.now();
			if (now - g_lastMoveProcess >= MOUSE_THROTTLE_MS) processMouseMovement();
			else if (g_moveTimer === null) g_moveTimer = setTimeout(() => {
				g_moveTimer = null;
				processMouseMovement();
			}, MOUSE_THROTTLE_MS - (now - g_lastMoveProcess));
		};
		document.addEventListener("mousemove", g_onMouseMove);
	}
	function stopMouseListening() {
		if (g_onMouseMove) {
			document.removeEventListener("mousemove", g_onMouseMove);
			g_onMouseMove = null;
		}
	}
	function exitPointerLock() {
		if (document.pointerLockElement) document.exitPointerLock();
	}
	function attachMouseMovement() {
		const container = getGameContainer();
		if (!container) return;
		showOverlay(container);
		g_onPointerLockChange = () => {
			if (document.pointerLockElement === getGameContainer()) {
				removeOverlay();
				removeMinimized();
				startMouseListening();
			} else {
				stopMouseListening();
				const c = getGameContainer();
				if (c) showOverlay(c);
			}
		};
		document.addEventListener("pointerlockchange", g_onPointerLockChange);
	}
	function attachMouseButtons() {
		const hasClick = g_keyMap.has("Click");
		const hasRightClick = g_keyMap.has("RightClick");
		const hasScroll = g_keyMap.has("Scroll");
		const container = getGameContainer();
		if (!container) return;
		if (hasClick || hasRightClick) {
			g_onMouseDown = (e) => {
				const code = e.button === 0 ? "Click" : e.button === 2 ? "RightClick" : null;
				if (!code) return;
				const actions = g_keyMap.get(code);
				if (actions) for (const action of actions) executePress(action);
			};
			g_onMouseUp = (e) => {
				const code = e.button === 0 ? "Click" : e.button === 2 ? "RightClick" : null;
				if (!code) return;
				const actions = g_keyMap.get(code);
				if (actions) for (const action of actions) executeUnpress(action);
			};
			container.addEventListener("mousedown", g_onMouseDown, true);
			container.addEventListener("mouseup", g_onMouseUp, true);
		}
		if (hasScroll) {
			g_scrollActions = g_keyMap.get("Scroll") ?? null;
			g_onWheel = (e) => {
				if (!g_scrollActions) return;
				for (const action of g_scrollActions) executePress(action);
				if (g_scrollTimer !== null) clearTimeout(g_scrollTimer);
				g_scrollTimer = setTimeout(() => {
					if (g_scrollActions) for (const action of g_scrollActions) executeUnpress(action);
					g_scrollTimer = null;
				}, SCROLL_UNPRESS_MS);
				if (e.cancelable) e.preventDefault();
			};
			container.addEventListener("wheel", g_onWheel, {
				capture: true,
				passive: false
			});
		}
	}
	function attachKeyboard() {
		g_onKeyDown = (e) => {
			if (e.repeat) return;
			const actions = g_keyMap.get(e.code);
			if (actions) for (const action of actions) executePress(action);
			const scripts = g_scriptMap.get(e.code);
			if (scripts) for (let i = 0; i < scripts.length; i++) {
				const script = scripts[i];
				if (script) g_scriptManager.onKeyDown(`${e.code}:${String(i)}`, script);
			}
			if ((actions ?? scripts) && e.cancelable) e.preventDefault();
		};
		g_onKeyUp = (e) => {
			const actions = g_keyMap.get(e.code);
			if (actions) for (const action of actions) executeUnpress(action);
			const scripts = g_scriptMap.get(e.code);
			if (scripts) for (let i = 0; i < scripts.length; i++) {
				const script = scripts[i];
				if (script) g_scriptManager.onKeyUp(`${e.code}:${String(i)}`, script);
			}
		};
		document.addEventListener("keydown", g_onKeyDown, true);
		document.addEventListener("keyup", g_onKeyUp, true);
	}
	function removeListeners() {
		if (g_onKeyDown) {
			document.removeEventListener("keydown", g_onKeyDown, true);
			g_onKeyDown = null;
		}
		if (g_onKeyUp) {
			document.removeEventListener("keyup", g_onKeyUp, true);
			g_onKeyUp = null;
		}
		const container = getGameContainer();
		if (container) {
			if (g_onMouseDown) container.removeEventListener("mousedown", g_onMouseDown, true);
			if (g_onMouseUp) container.removeEventListener("mouseup", g_onMouseUp, true);
			if (g_onWheel) container.removeEventListener("wheel", g_onWheel, true);
		}
		g_onMouseDown = null;
		g_onMouseUp = null;
		g_onWheel = null;
		if (g_onPointerLockChange) {
			document.removeEventListener("pointerlockchange", g_onPointerLockChange);
			g_onPointerLockChange = null;
		}
		stopMouseListening();
	}
	function activate(config, opts) {
		g_config = config;
		if (opts?.overlayMinimized !== void 0) setOverlayMinimized(opts.overlayMinimized);
		if (opts?.resetDismissed) setMinimizedDismissed(false);
		const prevMouseTarget = g_mouseTarget;
		const mouseTarget = config.mouseConfig.mouseControls[0] ?? null;
		g_sensitivity = mouseTarget?.sensitivity ?? 10;
		g_mouseTarget = mouseTarget ? {
			stick: mouseTarget.stick === "left" ? 0 : 1,
			gamepadIndex: mouseTarget.gamepadIndex
		} : null;
		if (g_active) {
			const hadMouse = prevMouseTarget !== null;
			removeListeners();
			clearTimers();
			const newIndices = getActiveGamepadIndices(config);
			setMode(config.otherGamepadMode);
			updateVirtualSlots(newIndices);
			for (const idx of g_activeIndices) if (!newIndices.has(idx)) getSimulator(idx).disable(idx);
			else getSimulator(idx).resetState();
			for (const idx of newIndices) if (!g_activeIndices.has(idx)) getSimulator(idx).enable(idx);
			g_scriptManager.cancelAll();
			const built = buildKeyMap(config);
			g_keyMap = built.keyMap;
			g_scriptMap = built.scriptMap;
			g_scriptManager = new ScriptManager(onScriptCountChange);
			g_activeIndices = newIndices;
			attachKeyboard();
			attachMouseButtons();
			if (g_mouseTarget !== null) attachMouseMovement();
			else if (hadMouse) {
				exitPointerLock();
				removeOverlay();
				removeMinimized();
			}
			return;
		}
		const built = buildKeyMap(config);
		g_keyMap = built.keyMap;
		g_scriptMap = built.scriptMap;
		g_scriptManager = new ScriptManager(onScriptCountChange);
		g_activeIndices = getActiveGamepadIndices(config);
		g_active = true;
		setMode(config.otherGamepadMode);
		updateVirtualSlots(g_activeIndices);
		attachKeyboard();
		attachMouseButtons();
		if (g_mouseTarget !== null) attachMouseMovement();
		for (const idx of g_activeIndices) getSimulator(idx).enable(idx);
	}
	function deactivate() {
		if (!g_active) return;
		g_scriptManager.cancelAll();
		removeListeners();
		exitPointerLock();
		removeOverlay();
		removeMinimized();
		for (const idx of g_activeIndices) getSimulator(idx).disable(idx);
		updateVirtualSlots(/* @__PURE__ */ new Set());
		g_active = false;
		g_keyMap.clear();
		g_scriptMap.clear();
		g_activeIndices.clear();
		clearTimers();
	}
	function isActive() {
		return g_active;
	}
	function restoreOverlayIfDismissed() {
		if (g_active && g_mouseTarget !== null) restoreIfDismissed();
	}
	function suspend() {
		if (!g_active) return;
		g_scriptManager.cancelAll();
		removeListeners();
		exitPointerLock();
		removeOverlay();
		removeMinimized();
		for (const idx of g_activeIndices) getSimulator(idx).resetState();
		clearTimers();
	}
	function resume() {
		if (!g_active || !g_config) return;
		activate(g_config);
	}
	function toggleGamepadIndex(index) {
		const sim = getSimulator(index);
		if (sim.isEnabled()) {
			sim.disable(index);
			g_activeIndices.delete(index);
		} else {
			sim.enable(index);
			g_activeIndices.add(index);
		}
	}
	function getConnectedStatus() {
		return [
			getSimulator(0).isEnabled(),
			getSimulator(1).isEnabled(),
			getSimulator(2).isEnabled(),
			getSimulator(3).isEnabled()
		];
	}
	function toggleAllGamepads() {
		if (Array.from(g_activeIndices).some((i) => getSimulator(i).isEnabled())) for (const idx of g_activeIndices) getSimulator(idx).disable(idx);
		else if (g_config) for (const idx of g_activeIndices) getSimulator(idx).enable(idx);
	}
	//#endregion
	//#region src/injected/toast.ts
	var toastEl = null;
	var toastTimer = null;
	function showToast(message) {
		if (!toastEl) {
			toastEl = document.createElement("div");
			toastEl.id = "xvg-toast";
			toastEl.style.cssText = cssToString({
				position: "fixed",
				top: "20px",
				left: "50%",
				transform: "translateX(-50%)",
				background: "rgba(0,0,0,0.85)",
				color: "#fff",
				padding: "12px 24px",
				"border-radius": "8px",
				"font-size": "14px",
				"z-index": "2147483647",
				opacity: "0",
				transition: "opacity 0.5s",
				"pointer-events": "none"
			});
			document.body.appendChild(toastEl);
		}
		toastEl.textContent = message;
		toastEl.style.opacity = "1";
		if (toastTimer !== null) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => {
			if (toastEl) toastEl.style.opacity = "0";
			toastTimer = null;
		}, 3e3);
	}
	//#endregion
	//#region src/injected/main-world.ts
	var g_disableBlur = false;
	var g_autoSuspendOnInput = true;
	window.addEventListener("blur", (e) => {
		if (g_disableBlur) {
			e.stopImmediatePropagation();
			e.preventDefault();
		}
	}, true);
	var g_fakeFullscreen = false;
	var realRequestFullscreen = Element.prototype.requestFullscreen;
	var realExitFullscreen = () => Document.prototype.exitFullscreen.call(document);
	Element.prototype.requestFullscreen = function(options) {
		if (g_fakeFullscreen) {
			log("[gamepad]: requestFullscreen intercepted (blocked/faked)");
			Object.defineProperty(document, "fullscreenElement", {
				value: this,
				writable: true,
				configurable: true
			});
			document.dispatchEvent(new Event("fullscreenchange"));
			return Promise.resolve();
		}
		log("[gamepad]: requestFullscreen passthrough");
		return realRequestFullscreen.call(this, options);
	};
	document.exitFullscreen = function() {
		if (g_fakeFullscreen) {
			log("[gamepad]: exitFullscreen intercepted (blocked/faked)");
			Object.defineProperty(document, "fullscreenElement", {
				value: null,
				writable: true,
				configurable: true
			});
			document.dispatchEvent(new Event("fullscreenchange"));
			return Promise.resolve();
		}
		log("[gamepad]: exitFullscreen passthrough");
		return realExitFullscreen();
	};
	var g_gameActive = false;
	function handleSettingsChanged(msg) {
		setLoggingEnabled(msg.enableLogging);
		localStorage.setItem("xvg-enableLogging", msg.enableLogging ? "true" : "false");
		g_disableBlur = msg.disableBlur;
		localStorage.setItem("xvg-patchRemoteMultigamepad", msg.patchRemoteMultigamepad ? "true" : "false");
		g_autoSuspendOnInput = msg.autoSuspendOnInput;
	}
	window.addEventListener("message", (event) => {
		const data = event.data;
		if (!isExtensionMessage(data)) return;
		if (data.type === "SETTINGS_CHANGED") handleSettingsChanged(data);
		else handleGameMessage(data);
	});
	debugLog("[gamepad]: Load main-world, logging enabled:", String(localStorage.getItem("xvg-enableLogging")));
	var POLL_INTERVAL = 1e3;
	var pollTimer = null;
	var pendingConfig = null;
	var g_activePresetName = "default";
	function sendMessage(msg) {
		window.postMessage(msg, "*");
	}
	function sendGamepadStatus() {
		sendMessage({
			source: MSG_SOURCE,
			type: "GAMEPAD_STATUS",
			connected: getConnectedStatus(),
			enabled: isActive(),
			activeConfig: g_activePresetName,
			gameName: getGameName(),
			suspended: g_autoDisabled
		});
	}
	function applyPendingConfig() {
		if (!pendingConfig) return;
		const { name, gamepadConfig } = pendingConfig;
		pendingConfig = null;
		g_activePresetName = name;
		updateToggleCodes(gamepadConfig);
		showToast(`'${name}' preset activated`);
		activate(gamepadConfig, { resetDismissed: true });
	}
	function handleMessage(msg) {
		if (msg.type === "ACTIVATE_GAMEPAD_CONFIG") {
			const activateMsg = msg;
			g_activePresetName = activateMsg.name;
			g_fakeFullscreen = activateMsg.gamepadConfig.fakeFullscreen === true;
			updateToggleCodes(activateMsg.gamepadConfig);
			showToast(`'${activateMsg.name}' preset activated`);
			activate(activateMsg.gamepadConfig, activateMsg.overlayMinimized !== void 0 ? { overlayMinimized: activateMsg.overlayMinimized } : void 0);
		} else if (msg.type === "CONFIG_CHANGED") {
			pendingConfig = {
				name: msg.name,
				gamepadConfig: msg.gamepadConfig
			};
			g_fakeFullscreen = msg.gamepadConfig.fakeFullscreen === true;
			if (document.hasFocus()) applyPendingConfig();
		} else if (msg.type === "DISABLE_GAMEPAD") {
			g_fakeFullscreen = false;
			if (isActive()) showToast("Mouse/keyboard disabled");
			deactivate();
		}
	}
	var toggleCodes = new Set(["F9"]);
	var toggleCodeActions = /* @__PURE__ */ new Map();
	function updateToggleCodes(config) {
		const codeActions = /* @__PURE__ */ new Map();
		for (const [code, entries] of Object.entries(config.keyboardConfig)) for (const e of entries) if (e.type === "action" && (e.action === "toggleGamepad" || e.action === "toggleAllGamepads" || e.action === "toggleExtension")) {
			let set = codeActions.get(code);
			if (!set) {
				set = /* @__PURE__ */ new Set();
				codeActions.set(code, set);
			}
			set.add(e.action === "toggleGamepad" ? `toggleGamepad:${String(e.gamepadIndex)}` : e.action);
		}
		toggleCodes = new Set(codeActions.keys());
		toggleCodeActions = codeActions;
	}
	document.addEventListener("keydown", (e) => {
		if (e.repeat || !toggleCodes.has(e.code)) return;
		const actions = toggleCodeActions.get(e.code);
		if (actions) {
			for (const action of actions) if (action === "toggleAllGamepads") toggleAllGamepads();
			else if (action === "toggleExtension") sendMessage({
				source: MSG_SOURCE,
				type: "TOGGLE_ENABLED",
				enabled: !isActive()
			});
			else if (action.startsWith("toggleGamepad:")) toggleGamepadIndex(Number(action.slice(14)));
			sendGamepadStatus();
		}
		if (e.cancelable) e.preventDefault();
	}, true);
	function initialize() {
		if (pollTimer !== null) clearInterval(pollTimer);
		const gameName = getGameName();
		g_gameActive = detectGame();
		sendMessage({
			source: MSG_SOURCE,
			type: "INITIALIZED",
			gameName
		});
		let currentGameName = gameName;
		let wasGameActive = g_gameActive;
		pollTimer = setInterval(() => {
			g_gameActive = detectGame();
			const newGameName = getGameName();
			if (wasGameActive && !g_gameActive) sendMessage({
				source: MSG_SOURCE,
				type: "GAME_CHANGED",
				gameName: null
			});
			else if (newGameName !== currentGameName) {
				currentGameName = newGameName;
				sendMessage({
					source: MSG_SOURCE,
					type: "GAME_CHANGED",
					gameName: newGameName
				});
			}
			wasGameActive = g_gameActive;
		}, POLL_INTERVAL);
	}
	function handleGameMessage(msg) {
		if (msg.type === "ACTIVATE_GAMEPAD_CONFIG" || msg.type === "CONFIG_CHANGED" || msg.type === "DISABLE_GAMEPAD") handleMessage(msg);
		else if (msg.type === "POPUP_OPENED") {
			if (g_autoDisabled) {
				g_autoDisabled = false;
				g_suspendSuppressed = true;
				resume();
				sendMessage({
					source: MSG_SOURCE,
					type: "INPUT_SUSPENDED",
					suspended: false
				});
				showToast(`'${g_activePresetName}' resumed`);
			}
			restoreOverlayIfDismissed();
			sendGamepadStatus();
		} else if (msg.type === "TOGGLE_GAMEPAD") {
			toggleGamepadIndex(msg.gamepadIndex);
			sendGamepadStatus();
		} else if (msg.type === "CONTENT_READY") sendMessage({
			source: MSG_SOURCE,
			type: "INITIALIZED",
			gameName: getGameName()
		});
	}
	var TEXT_INPUT_SELECTOR = "input:not([type=\"hidden\"]):not([type=\"radio\"]):not([type=\"checkbox\"]):not([type=\"submit\"]):not([type=\"button\"]), textarea, [contenteditable=\"true\"], [role=\"textbox\"]";
	var g_autoDisabled = false;
	var g_suspendSuppressed = false;
	function findVisibleTextInput() {
		return Array.from(document.querySelectorAll(TEXT_INPUT_SELECTOR)).find((el) => el.offsetWidth > 0 && el.offsetHeight > 0 && window.getComputedStyle(el).visibility !== "hidden" && window.getComputedStyle(el).display !== "none") || null;
	}
	function checkTextInputState() {
		if (!g_autoSuspendOnInput) return;
		const visible = findVisibleTextInput();
		if (visible && !g_autoDisabled && !g_suspendSuppressed && isActive()) {
			g_autoDisabled = true;
			suspend();
			sendMessage({
				source: MSG_SOURCE,
				type: "INPUT_SUSPENDED",
				suspended: true
			});
			showToast("Keyboard/Mouse suspended for text input");
			log("[gamepad]: Auto-disabled — text input detected");
		} else if (!visible && g_autoDisabled) {
			g_autoDisabled = false;
			resume();
			sendMessage({
				source: MSG_SOURCE,
				type: "INPUT_SUSPENDED",
				suspended: false
			});
			showToast(`'${g_activePresetName}' resumed`);
			log("[gamepad]: Auto-re-enabled — text input removed");
		} else if (!visible && g_suspendSuppressed) g_suspendSuppressed = false;
	}
	new MutationObserver(checkTextInputState).observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [
			"style",
			"class",
			"type",
			"hidden",
			"contenteditable",
			"role"
		]
	});
	window.addEventListener("pageshow", () => {
		initialize();
	});
	window.addEventListener("focus", () => {
		applyPendingConfig();
	});
	initialize();
	//#endregion
})();

//# sourceMappingURL=main-world.js.map