# Enable coop in xcloud

This function needs to be patched to not reassign all the the 0's with t
which is the gamepadIndex for the event.

The entire file is available at: 8128.d3ba2d55.chunk.js

## Stack trace for function being run

On game start:

```
onGamepadChanged (8128.d3ba2d55.chunk.js:1)
onGamepadChanged (8128.d3ba2d55.chunk.js:1)
addGamepad (web-rtc-stream.7d144366.chunk.js:1)
start (web-rtc-stream.7d144366.chunk.js:1)
connectAsync (web-rtc-stream.7d144366.chunk.js:1)
await in connectAsync
doConnectAsync (8128.d3ba2d55.chunk.js:1)
await in doConnectAsync
connectAsync (8128.d3ba2d55.chunk.js:1)
connectToSession (game-stream.6690d895.chunk.js:1)
await in connectToSession
cloudConnect (game-stream.6690d895.chunk.js:1)
```

On gamepad connect:

```
onGamepadChanged (8128.d3ba2d55.chunk.js:1)
onGamepadChanged (8128.d3ba2d55.chunk.js:1)
addGamepad (web-rtc-stream.7d144366.chunk.js:1)
onGamepadConnected (web-rtc-stream.7d144366.chunk.js:1)
(anonymous) (web-rtc-stream.7d144366.chunk.js:1)
n (6297.d92ec800.js:2)
enable (gamepad-simulator.ts.js:129)
activate (input-processor.ts.js:354)
applyPendingConfig (main-world.ts.js:21)
(anonymous) (main-world.ts.js:165)
```

## Functions to be patched

All `0`s in this need to change to `t`, so that each gamepad gets its own key
in `gamepadStates`.

```javascript
onGamepadChanged(e, t, i) {
    const n = e + t;
    let o = this.gamepadStates.get(0);
    if (i) {
      const e = { mapping: s()(s()({}, b.iz), {}, { GamepadIndex: 0 }) };
      (o ||
        (this.inputSink.onGamepadChanged(0, i),
        (o = {
          lastGamepadMapping: s()(s()({}, b.iz), {}, { GamepadIndex: 0 }),
          sources: new Map(),
        }),
        this.gamepadStates.set(0, o),
        this.gamepadMappingsToSend.push(
          s()(s()({}, b.iz), {}, { GamepadIndex: 0 })
        )),
        o.sources.set(n, e));
    } else {
      if (!o || !o.sources.has(n)) return;
      if (1 === o.sources.size) {
        (this.inputSink.onGamepadChanged(0, i), this.gamepadStates.delete(0));
        const e = this.gamepadMappingsToSend.findIndex(
          (e) => 0 === e.GamepadIndex
        );
        -1 !== e && this.gamepadMappingsToSend.splice(e, 1);
      } else o.sources.delete(n);
    }
  }
```

`this.gamepadStates.get(i)`: needs to change
to `this.gamepadStates.get(u.GamepadIndex)` to make inputs fan out to the
`gamepadStates` we made in the Changed function.

```javascript
onGamepadInput(e, t, i, n) {
    for (const u of i) {
      const t = e + u.GamepadIndex,
        i = 0,
        n = this.gamepadStates.get(i),
        s = null === n || void 0 === n ? void 0 : n.sources.get(t);
      s
        ? this.copyGamepadMapping(u, s.mapping)
        : this.inputSourceErrorLogged.has(e + u.GamepadIndex) ||
          (this.logger.error(
            `The input source ${e} for the gamepad ${u.GamepadIndex} was never connected but is trying to send input.`
          ),
          this.inputSourceErrorLogged.add(e + u.GamepadIndex));
    }
    if (n) {
      for (const [e, i] of this.gamepadStates) {
        let n = null;
        for (const t of this.gamepadMappingsToSend)
          t.GamepadIndex === e && (n = t);
        if (n) {
          if (
            ((n.Dirty = !1),
            this.mergeGamepadMappings(i.sources, n),
            this.nexusButtonHandler)
          )
            if (1 === n.Nexus) {
              var s, o, r, a;
              if (this.firstNexusPressDownTimestampMs) {
                if (t - this.firstNexusPressDownTimestampMs >= 500)
                  null ===
                    (s = (o = this.nexusButtonHandler).onNexusLongPress) ||
                    void 0 === s ||
                    s.call(o);
              } else
                ((this.firstNexusPressDownTimestampMs = t),
                  null === (r = (a = this.nexusButtonHandler).onNexusDown) ||
                    void 0 === r ||
                    r.call(a));
              n.Nexus = 0;
            } else if (this.firstNexusPressDownTimestampMs) {
              var l, d, c, h;
              if (
                (null === (l = (d = this.nexusButtonHandler).onNexusUp) ||
                  void 0 === l ||
                  l.call(d),
                t - this.firstNexusPressDownTimestampMs < 500)
              )
                null === (c = (h = this.nexusButtonHandler).onNexusPress) ||
                  void 0 === c ||
                  c.call(h);
              this.firstNexusPressDownTimestampMs = void 0;
            }
          this.areGamepadMappingsEqual(i.lastGamepadMapping, n) ||
            ((n.Dirty = !0), this.copyGamepadMapping(n, i.lastGamepadMapping));
        }
      }
      this.inputSink.onGamepadInput(t, this.gamepadMappingsToSend);
    }
  }
```

## Class for the function

```javascript
class lt {
  constructor(e, t) {
    (r()(this, 'inputSink', void 0),
      r()(this, 'gamepadStates', void 0),
      r()(this, 'inputSourceErrorLogged', void 0),
      r()(this, 'logger', h.r.Instance),
      r()(this, 'gamepadMappingsToSend', void 0),
      r()(this, 'inputFeedbackHandlers', void 0),
      r()(this, 'nexusButtonHandler', void 0),
      r()(this, 'firstNexusPressDownTimestampMs', void 0),
      r()(this, 'onVibration', (e, t) => {
        const i = this.gamepadStates.get(e);
        if (i)
          for (const n of i.sources) {
            const i = n[0].substring(0, n[0].length - e.toString().length),
              s = this.inputFeedbackHandlers.get(i),
              o = n[0].substring(i.length),
              r = parseInt(o, 10);
            s && s.onVibration(r, t);
          }
      }),
      (this.inputSink = e),
      (this.gamepadStates = new Map()),
      (this.inputSourceErrorLogged = new Set()),
      (this.gamepadMappingsToSend = []),
      (this.inputFeedbackHandlers = new Map()),
      (this.nexusButtonHandler = t),
      this.inputSink.setInputFeedbackHandler({
        stop: () => this.onInputFeedbackHandlerStop(),
        onVibration: this.onVibration,
      }));
  }
  start(e, t) {
    this.inputSink.start(e, t);
  }
  onGamepadChanged(e, t, i) {
    const n = e + t;
    let o = this.gamepadStates.get(0);
    if (i) {
      const e = { mapping: s()(s()({}, b.iz), {}, { GamepadIndex: 0 }) };
      (o ||
        (this.inputSink.onGamepadChanged(0, i),
        (o = {
          lastGamepadMapping: s()(s()({}, b.iz), {}, { GamepadIndex: 0 }),
          sources: new Map(),
        }),
        this.gamepadStates.set(0, o),
        this.gamepadMappingsToSend.push(
          s()(s()({}, b.iz), {}, { GamepadIndex: 0 })
        )),
        o.sources.set(n, e));
    } else {
      if (!o || !o.sources.has(n)) return;
      if (1 === o.sources.size) {
        (this.inputSink.onGamepadChanged(0, i), this.gamepadStates.delete(0));
        const e = this.gamepadMappingsToSend.findIndex(
          (e) => 0 === e.GamepadIndex
        );
        -1 !== e && this.gamepadMappingsToSend.splice(e, 1);
      } else o.sources.delete(n);
    }
  }
  onKeyboardInput(e) {
    this.inputSink.onKeyboardInput(e);
  }
  onPointerInput(e, t, i) {
    this.inputSink.onPointerInput(t, i);
  }
  onSensorInput(e) {
    this.inputSink.onSensorInput(e);
  }
  onFlushMetadataRequest() {
    this.inputSink.onFlushMetadataRequest();
  }
  onGamepadInput(e, t, i, n) {
    for (const u of i) {
      const t = e + u.GamepadIndex,
        i = 0,
        n = this.gamepadStates.get(i),
        s = null === n || void 0 === n ? void 0 : n.sources.get(t);
      s
        ? this.copyGamepadMapping(u, s.mapping)
        : this.inputSourceErrorLogged.has(e + u.GamepadIndex) ||
          (this.logger.error(
            `The input source ${e} for the gamepad ${u.GamepadIndex} was never connected but is trying to send input.`
          ),
          this.inputSourceErrorLogged.add(e + u.GamepadIndex));
    }
    if (n) {
      for (const [e, i] of this.gamepadStates) {
        let n = null;
        for (const t of this.gamepadMappingsToSend)
          t.GamepadIndex === e && (n = t);
        if (n) {
          if (
            ((n.Dirty = !1),
            this.mergeGamepadMappings(i.sources, n),
            this.nexusButtonHandler)
          )
            if (1 === n.Nexus) {
              var s, o, r, a;
              if (this.firstNexusPressDownTimestampMs) {
                if (t - this.firstNexusPressDownTimestampMs >= 500)
                  null ===
                    (s = (o = this.nexusButtonHandler).onNexusLongPress) ||
                    void 0 === s ||
                    s.call(o);
              } else
                ((this.firstNexusPressDownTimestampMs = t),
                  null === (r = (a = this.nexusButtonHandler).onNexusDown) ||
                    void 0 === r ||
                    r.call(a));
              n.Nexus = 0;
            } else if (this.firstNexusPressDownTimestampMs) {
              var l, d, c, h;
              if (
                (null === (l = (d = this.nexusButtonHandler).onNexusUp) ||
                  void 0 === l ||
                  l.call(d),
                t - this.firstNexusPressDownTimestampMs < 500)
              )
                null === (c = (h = this.nexusButtonHandler).onNexusPress) ||
                  void 0 === c ||
                  c.call(h);
              this.firstNexusPressDownTimestampMs = void 0;
            }
          this.areGamepadMappingsEqual(i.lastGamepadMapping, n) ||
            ((n.Dirty = !0), this.copyGamepadMapping(n, i.lastGamepadMapping));
        }
      }
      this.inputSink.onGamepadInput(t, this.gamepadMappingsToSend);
    }
  }
  sendKeepAliveGamepadInput() {
    let e = !1;
    for (const i of this.gamepadMappingsToSend)
      if (((i.Dirty = !1), 0 === i.GamepadIndex)) {
        var t;
        ((e = !0),
          (i.Dirty = !0),
          (i.Virtual = !0),
          i.LeftThumbXAxis > 0.9
            ? (i.LeftThumbXAxis = i.LeftThumbXAxis - 0.1)
            : (i.LeftThumbXAxis = i.LeftThumbXAxis + 0.1));
        const n =
          null === (t = this.gamepadStates.get(0)) || void 0 === t
            ? void 0
            : t.lastGamepadMapping;
        n && (n.LeftThumbXAxis = i.LeftThumbXAxis);
      }
    e &&
      this.inputSink.onGamepadInput(
        performance.now(),
        this.gamepadMappingsToSend
      );
  }
  setInputFeedbackHandler(e, t) {
    t
      ? this.inputFeedbackHandlers.set(e, t)
      : this.inputFeedbackHandlers.delete(e);
  }
  syncLockKeysState(e) {
    this.inputSink.syncLockKeysState(e);
  }
  onInputFeedbackHandlerStop() {
    for (const e of this.inputFeedbackHandlers) e[1].stop();
  }
  areGamepadMappingsEqual(e, t) {
    return (
      e.A === t.A &&
      e.B === t.B &&
      e.X === t.X &&
      e.Y === t.Y &&
      e.LeftShoulder === t.LeftShoulder &&
      e.RightShoulder === t.RightShoulder &&
      e.LeftTrigger === t.LeftTrigger &&
      e.RightTrigger === t.RightTrigger &&
      e.View === t.View &&
      e.Menu === t.Menu &&
      e.LeftThumb === t.LeftThumb &&
      e.RightThumb === t.RightThumb &&
      e.DPadUp === t.DPadUp &&
      e.DPadDown === t.DPadDown &&
      e.DPadLeft === t.DPadLeft &&
      e.DPadRight === t.DPadRight &&
      e.Nexus === t.Nexus &&
      e.LeftThumbXAxis === t.LeftThumbXAxis &&
      e.LeftThumbYAxis === t.LeftThumbYAxis &&
      e.RightThumbXAxis === t.RightThumbXAxis &&
      e.RightThumbYAxis === t.RightThumbYAxis
    );
  }
  copyGamepadMapping(e, t) {
    ((t.A = e.A),
      (t.B = e.B),
      (t.X = e.X),
      (t.Y = e.Y),
      (t.LeftShoulder = e.LeftShoulder),
      (t.RightShoulder = e.RightShoulder),
      (t.LeftTrigger = e.LeftTrigger),
      (t.RightTrigger = e.RightTrigger),
      (t.View = e.View),
      (t.Menu = e.Menu),
      (t.LeftThumb = e.LeftThumb),
      (t.RightThumb = e.RightThumb),
      (t.DPadUp = e.DPadUp),
      (t.DPadDown = e.DPadDown),
      (t.DPadLeft = e.DPadLeft),
      (t.DPadRight = e.DPadRight),
      (t.Nexus = e.Nexus),
      (t.LeftThumbXAxis = e.LeftThumbXAxis),
      (t.LeftThumbYAxis = e.LeftThumbYAxis),
      (t.RightThumbXAxis = e.RightThumbXAxis),
      (t.RightThumbYAxis = e.RightThumbYAxis),
      (t.PhysicalPhysicality = e.PhysicalPhysicality),
      (t.VirtualPhysicality = e.VirtualPhysicality),
      (t.Dirty = e.Dirty));
  }
  onMouseInput(e) {
    this.inputSink.onMouseInput(e);
  }
  clampAnalog(e, t = -1, i = 1) {
    return Math.max(t, Math.min(i, e));
  }
  mergeGamepadMappings(e, t) {
    this.copyGamepadMapping(b.iz, t);
    for (const i of e.values())
      ((t.A |= i.mapping.A),
        (t.B |= i.mapping.B),
        (t.X |= i.mapping.X),
        (t.Y |= i.mapping.Y),
        (t.LeftShoulder |= i.mapping.LeftShoulder),
        (t.RightShoulder |= i.mapping.RightShoulder),
        (t.LeftTrigger += i.mapping.LeftTrigger),
        (t.RightTrigger += i.mapping.RightTrigger),
        (t.View |= i.mapping.View),
        (t.Menu |= i.mapping.Menu),
        (t.LeftThumb += i.mapping.LeftThumb),
        (t.RightThumb += i.mapping.RightThumb),
        (t.DPadUp |= i.mapping.DPadUp),
        (t.DPadDown |= i.mapping.DPadDown),
        (t.DPadLeft |= i.mapping.DPadLeft),
        (t.DPadRight |= i.mapping.DPadRight),
        (t.Nexus |= i.mapping.Nexus),
        (t.LeftThumbXAxis += i.mapping.LeftThumbXAxis),
        (t.LeftThumbYAxis += i.mapping.LeftThumbYAxis),
        (t.RightThumbXAxis += i.mapping.RightThumbXAxis),
        (t.RightThumbYAxis += i.mapping.RightThumbYAxis),
        (t.PhysicalPhysicality |= i.mapping.PhysicalPhysicality),
        (t.VirtualPhysicality |= i.mapping.VirtualPhysicality));
    ((t.LeftTrigger = this.clampAnalog(t.LeftTrigger, 0)),
      (t.RightTrigger = this.clampAnalog(t.RightTrigger, 0)),
      (t.LeftThumb = this.clampAnalog(t.LeftThumb)),
      (t.RightThumb = this.clampAnalog(t.RightThumb)),
      (t.LeftThumbXAxis = this.clampAnalog(t.LeftThumbXAxis)),
      (t.LeftThumbYAxis = this.clampAnalog(t.LeftThumbYAxis)),
      (t.RightThumbXAxis = this.clampAnalog(t.RightThumbXAxis)),
      (t.RightThumbYAxis = this.clampAnalog(t.RightThumbYAxis)));
  }
}
```
