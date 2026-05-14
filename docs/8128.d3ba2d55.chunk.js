'use strict';
(self.__LOADABLE_LOADED_CHUNKS__ = self.__LOADABLE_LOADED_CHUNKS__ || []).push([
  [8128],
  {
    1911(e, t, i) {
      i.d(t, { N: () => r, X: () => a });
      var n = i(53677),
        s = i(11442),
        o = i(60899);
      function r() {
        return (0, n.d4)(o.aO);
      }
      function a() {
        var e;
        return null !== (e = r()) && void 0 !== e ? e : s.ne;
      }
    },
    31622(e, t, i) {
      i.d(t, { r: () => c });
      var n,
        s = i(58212),
        o = i.n(s),
        r = (i(10865), i(81045), i(84915), i(47010), i(56188)),
        a = i(70622),
        l = i(84048),
        d = i(74687);
      !(function (e) {
        ((e[(e.Verbose = 0)] = 'Verbose'),
          (e[(e.Info = 1)] = 'Info'),
          (e[(e.Warning = 2)] = 'Warning'),
          (e[(e.Error = 3)] = 'Error'));
      })(n || (n = {}));
      class c {
        constructor(e, t) {
          (o()(this, 'subTag', void 0),
            o()(this, 'tag', void 0),
            (this.subTag = t),
            (this.tag = `GameStreamingSDK${e ? `|${e}` : ''}: `));
        }
        static get Instance() {
          return (this.instance || (this.instance = new c('')), this.instance);
        }
        static setConsoleLogging(e) {
          this.consoleLoggingEnabled = e;
        }
        static isConsoleLoggingAllowed() {
          return this.consoleLoggingEnabled;
        }
        static async getLogs() {
          try {
            return c.logHandler && (0, l.k)(c.logHandler)
              ? await c.logHandler.getCurrentLogArray()
              : (c.Instance.warning(
                  'No StreamClientLogHandler found to get logs'
                ),
                ['No StreamClientLogHandler found to get logs']);
          } catch (e) {
            return (
              c.Instance.error('Failed to retrieve GameStream logs', e),
              ['Failed to retrieve GameStream logs']
            );
          }
        }
        log(e, ...t) {
          var i;
          if (!c.isConsoleLoggingAllowed()) return;
          const s = t.map((e) => (0, d.A)(e)),
            o = `${this.tag}${null !== (i = this.subTag) && void 0 !== i ? i : ''}${s}`;
          switch (e) {
            case n.Verbose:
              console.debug(o);
              break;
            case n.Info:
              console.log(o);
              break;
            case n.Warning:
              console.warn(o);
              break;
            case n.Error:
              console.error(o);
          }
        }
        verbose(...e) {
          var t;
          (this.log(n.Verbose, ...e),
            null === (t = c.logHandler) ||
              void 0 === t ||
              t.onVerbose(this.tag, ...e));
        }
        info(...e) {
          var t;
          (this.log(n.Info, ...e),
            null === (t = c.logHandler) ||
              void 0 === t ||
              t.onInfo(this.tag, ...e));
        }
        warning(...e) {
          var t;
          (this.log(n.Warning, ...e),
            a.H.Instance.trackEvent({
              event: a.X.SdkWarning,
              message: (0, d.A)(e),
            }),
            null === (t = c.logHandler) ||
              void 0 === t ||
              t.onWarning(this.tag, ...e));
        }
        error(...e) {
          var t;
          (this.log(n.Error, ...e),
            a.H.Instance.trackEvent({
              event: a.X.SdkError,
              message: e.map(d.A).join('; '),
            }),
            null === (t = c.logHandler) ||
              void 0 === t ||
              t.onError(this.tag, ...e));
        }
        throw(e, t) {
          const i = new r.F(e, t);
          throw (this.error(i), i);
        }
        reject(e, t, i) {
          const n = new r.F(e, t);
          (this.error(n), i(n));
        }
        rejectWithError(e, t) {
          (this.error(e), t(e));
        }
        rejectWithWarning(e, t, i) {
          this.warning(e);
          i(new r.F(e, t));
        }
      }
      (o()(c, 'instance', void 0),
        o()(c, 'consoleLoggingEnabled', !0),
        o()(c, 'logHandler', void 0));
    },
    34041(e, t, i) {
      i.d(t, { FI: () => l, K$: () => a, ul: () => r });
      var n = i(78911),
        s = i(88262),
        o = i(69607);
      function r(e) {
        var t;
        return null !== (t = (0, o.UI)(e)[n.pA]) && void 0 !== t
          ? t
          : s.LCE_NOT_REQUESTED;
      }
      function a(e) {
        return (0, s.getDataOrPrevious)(r(e));
      }
      function l(e) {
        var t;
        return null === (t = (0, s.getDataOrPrevious)(r(e))) ||
          void 0 === t ||
          null === (t = t.sessionRequest) ||
          void 0 === t ||
          null === (t = t.titleInfo) ||
          void 0 === t
          ? void 0
          : t.details.productId;
      }
    },
    37837(e, t, i) {
      i.d(t, { g: () => s });
      (i(97107), i(10568));
      var n = i(74687);
      function s(e) {
        if (e instanceof Error) return e;
        if (null == e) return new Error('Unknown error');
        if ('string' === typeof e.name && 'string' === typeof e.message)
          return e;
        if ('string' === typeof e) return new Error(e);
        try {
          return new Error((0, n.A)(e));
        } catch (t) {
          return new Error(e.toString() || 'Unknown error');
        }
      }
    },
    43245(e, t, i) {
      var n, s, o, r, a, l;
      (i.d(t, {
        EO: () => o,
        RS: () => r,
        Tu: () => a,
        g$: () => s,
        if: () => l,
        kc: () => n,
      }),
        (function (e) {
          ((e[(e.Excellent = 0)] = 'Excellent'),
            (e[(e.Good = 1)] = 'Good'),
            (e[(e.Ok = 2)] = 'Ok'),
            (e[(e.Poor = 3)] = 'Poor'),
            (e[(e.Unknown = 4)] = 'Unknown'));
        })(n || (n = {})),
        (function (e) {
          ((e.Disconnected = 'Disconnected'),
            (e.Connecting = 'Connecting'),
            (e.Connected = 'Connected'),
            (e.Reconnecting = 'Reconnecting'));
        })(s || (s = {})),
        (function (e) {
          ((e.Requested = 'Requested'),
            (e.Enabled = 'Enabled'),
            (e.Muted = 'Muted'),
            (e.NotAllowed = 'NotAllowed'),
            (e.NotFound = 'NotFound'));
        })(o || (o = {})),
        (function (e) {
          ((e.ConnectingFailed = 'ConnectingFailed'),
            (e.CleanDisconnect = 'CleanDisconnect'),
            (e.CleanShutdown = 'CleanShutdown'),
            (e.TransportError = 'TransportError'),
            (e.ServerKickByNewSession = 'KickByNewSession'),
            (e.ServerKickForClosedGame = 'KickForClosedGame'),
            (e.ServerKickForBeingIdle = 'KickForBeingIdle'),
            (e.ServerKickForSignOut = 'KickForSignOut'),
            (e.ServerKickForServerShutdown = 'KickForServerShutdown'),
            (e.ServerKickForStopCommand = 'KickForStopCommand'),
            (e.ServerKickForAppError = 'KickForAppError'),
            (e.ServerKickForNoClientConnection = 'KickForNoClientConnection'),
            (e.ServerKickForOutOfStreamingTime = 'KickForOutOfStreamingTime'),
            (e.BrowserUnsupported = 'BrowserUnsupported'));
        })(r || (r = {})),
        (function (e) {
          ((e.Cloud = 'Cloud'),
            (e.Direct = 'Direct'),
            (e.Home = 'Home'),
            (e.ManagedDevkit = 'ManagedDevkit'));
        })(a || (a = {})),
        (function (e) {
          ((e[(e.Invite = 0)] = 'Invite'),
            (e[(e.Join = 1)] = 'Join'),
            (e[(e.TitleActivation = 2)] = 'TitleActivation'));
        })(l || (l = {})));
    },
    44552(e, t, i) {
      i.d(t, {
        $E: () => F,
        A: () => D,
        Ad: () => L,
        Bq: () => a,
        Cw: () => z,
        DV: () => h,
        Dp: () => B,
        Dw: () => J,
        EE: () => f,
        JZ: () => v,
        K8: () => G,
        KW: () => k,
        Mj: () => l,
        My: () => H,
        Nr: () => W,
        PU: () => ee,
        Pz: () => b,
        Q$: () => x,
        Qm: () => X,
        R2: () => _,
        R7: () => u,
        RE: () => R,
        RY: () => P,
        Tk: () => N,
        Ux: () => Q,
        VB: () => S,
        Vy: () => j,
        Yo: () => s,
        Yx: () => q,
        Zz: () => d,
        _C: () => Y,
        _b: () => p,
        _j: () => r,
        bH: () => y,
        c9: () => M,
        dF: () => I,
        eA: () => T,
        ec: () => A,
        fb: () => V,
        g_: () => m,
        ib: () => o,
        kM: () => g,
        lL: () => $,
        nX: () => C,
        sN: () => E,
        vO: () => w,
        vj: () => O,
        w3: () => U,
        xl: () => c,
        yH: () => Z,
        zu: () => n,
      });
      (i(98376), i(46929));
      function n(e = 'en-us') {
        return `https://privacy.microsoft.com/${e}/privacystatement`;
      }
      function s(e = 'en-us') {
        return `${a}/${e}/xbox-game-pass/cloud-gaming`;
      }
      const o = 'https://aka.ms/webpreview',
        r = 'https://aka.ms/accountservices',
        a = 'https://www.xbox.com',
        l = 'https://www.xbox.com/play',
        d = 'https://aka.ms/cloud-gaming/supported-browsers',
        c = 'https://aka.ms/xboxprivacysettings',
        h = 'https://aka.ms/cloud-gaming/supported-controllers',
        u =
          'https://support.xbox.com/help/hardware-network/controller/connect-xbox-wireless-controller-to-pc',
        g = 'https://aka.ms/cloud-gaming/touch-controls/screen-too-small',
        m = 'https://redeem.microsoft.com',
        p =
          'https://support.xbox.com/help/family-online-safety/online-safety/photosensitive-seizure-warning',
        v = 'https://www.xbox.com/regions',
        S =
          'https://support.xbox.com/help/games-apps/cloud-gaming/guide-to-cloud-gaming',
        f = 'https://aka.ms/XboxA11y';
      const y = 'https://www.xbox.com/legal/community-standards',
        w = 'https://www.xbox.com/xbox-game-pass',
        C = 'https://go.microsoft.com/fwlink/?LinkId=521839',
        T = 'https://aka.ms/privacy',
        b = 'https://go.microsoft.com/fwlink/?LinkID=206977',
        k = 'https://www.xbox.com/legal/legal-notices',
        I = 'https://www.xbox.com/smart-tv-help',
        A = 'https://xbox.com/smart-tv-pair',
        x = 'https://xbox.com/buycontroller',
        E = 'https://www.xbox.com/gptv',
        M = 'https://www.xbox.com/gptv1',
        P = 'https://www.xbox.com/gptv2',
        D = 'https://www.xbox.com/gptv3',
        R = 'https://www.xbox.com/gptv4',
        L =
          'https://support.xbox.com/help/family-online-safety/online-safety/manage-online-safety-and-privacy-settings-xbox-one',
        F = 'https://aka.ms/xcloudforum',
        N = 'https://aka.ms/xboxenforcement',
        U = 'https://aka.ms/xcgbuycontroller',
        $ = 'https://aka.ms/YourCaliforniaPrivacyChoices',
        V = 'https://www.xbox.com/apps/xbox-app-for-mobile',
        B = 'https://aka.ms/XboxFamilyInfo',
        G = 'http://aka.ms/XboxFamilyApp',
        H = 'https://aka.ms/GamertagChange',
        O = 'https://aka.ms/GamertagHelp',
        K = [
          {
            regex:
              /^https:\/\/account\.xbox\.com\/.*\/settings\?rtc=1&activetab=main%3aprivacytab/i,
            shortUrl: 'https://aka.ms/xbox-privacy',
          },
          {
            regex:
              /^https:\/\/support\.xbox\.com\/help\/family-online-safety\/online-safety\/photosensitive-seizure-warning/i,
            shortUrl: 'https://aka.ms/xbox-pssw',
          },
          {
            regex: /^https:\/\/www\.xbox\.com\/.*\/legal\/legal-notices/i,
            shortUrl: 'https://aka.ms/xbox-tpn',
          },
          {
            regex: /^https:\/\/www\.xbox\.com\/legal\/community-standards/i,
            shortUrl: 'https://aka.ms/xbox-cs',
          },
          {
            regex:
              /^https:\/\/www\.microsoft\.com\/.*\/store.*\/terms-of-sale/i,
            shortUrl: 'https://aka.ms/xbox-tos',
          },
          {
            regex: /^https?:\/\/www\.xbox\.com\/.*\/legal\/codeofconduct/i,
            shortUrl: 'https://aka.ms/xbox-coc',
          },
        ],
        q = 'http://tizen.org/feature/network.bluetooth',
        _ = 'http://tizen.org/appcontrol/operation/default';
      function X(e) {
        var t;
        const i = K.find((t) =>
          null === t || void 0 === t ? void 0 : t.regex.test(e)
        );
        return null !==
          (t = null === i || void 0 === i ? void 0 : i.shortUrl) && void 0 !== t
          ? t
          : e;
      }
      const W = 'https://aka.ms/usercontentmanagement',
        z = 'https://aka.ms/ucm360support',
        Y = 'https://social.xbox.com/changegamertag',
        j = 'https://aka.ms/accsSetup',
        Q = 'https://aka.ms/fire-stick-setup',
        J = 'https://aka.ms/FrenchDecreeLink',
        Z = 'https://aka.ms/caccssetup',
        ee =
          'https://support.xbox.com/help/games-apps/game-setup-and-play/how-to-set-up-remote-play';
    },
    51879(e, t, i) {
      (i.r(t),
        i.d(t, {
          AudioMode: () => C.w,
          AuthRoutingService: () => y,
          AuthenticationClient: () => ae,
          CloudStreamSessionRequest: () => Et,
          ComputedStreamStatistic: () => N,
          ConsolePowerState: () => W,
          CorrelationVector: () => T.W,
          CursorStyle: () => b.SE,
          EndpointSettings: () => me,
          GameInviteType: () => ct.if,
          GameStreamError: () => d.F,
          GameStreamErrorCode: () => c.ws,
          GamepadButtonId: () => b.t,
          GamepadInputPhysicality: () => V.J,
          GamepadMappingAxisCount: () => b.Sl,
          GamepadMappingButtonCount: () => b.TZ,
          GsServicesErrorDetailsErrorInterceptor: () => ie,
          GsServicesErrorDetailsResponseInterceptor: () => te,
          HighContrastMode: () => z,
          HomeConsoleStreamSessionRequest: () => Mt,
          HttpEnvironment: () => le,
          InputMessageTypeFlags: () => b.$B,
          InputPollingType: () => b.mb,
          LockKeysState: () => b.dr,
          ManagedDevkitStreamSessionRequest: () => Pt,
          ManagedDevkitStreamUser: () => f,
          MessageModalOptions: () => Je,
          MicrophoneState: () => ct.EO,
          MouseButtonBrowserId: () => b.RE,
          MouseButtonIndex: () => b.sl,
          MouseReadingType: () => b.W8,
          NetworkQualityIndicatorType: () => gi.L,
          ReleaseChannel: () => Se,
          ResolutionAlias: () => $,
          ScanCodeToHidMap: () => b.pu,
          SdkTelemetryEvents: () => u.X,
          SensorAccuracy: () => b.WT,
          ServerAllocationPollingConfiguration: () => x,
          StateDiscriminator: () => b.yB,
          StreamClient: () => jt,
          StreamClientLogHandler: () => Ft,
          StreamLogger: () => h.r,
          StreamSession: () => ht,
          StreamSessionConnectionState: () => ct.g$,
          StreamSessionConnectionType: () => ct.Tu,
          StreamSessionDisconnectReason: () => ct.RS,
          StreamSessionQualityLevel: () => ct.kc,
          StreamSessionRequest: () => At,
          StreamSessionRequestInternal: () => xt,
          StreamSessionRequestState: () => It,
          StreamStatistics: () => U,
          StreamType: () => D.P,
          StreamUser: () => v,
          StreamUserType: () => w,
          StreamingRegion: () => p,
          SupportedInputTypeEnum: () => Qt,
          SystemUiType: () => je,
          TitleManager: () => Yt,
          TitleState: () => Ce,
          UnreliableGamepadFrame: () => b.yy,
          UnreliableInputFrame: () => b.Fg,
          UnreliableInputFrameTracker: () => b.NP,
          UnreliableKeyboardFrame: () => b.Yu,
          UnreliableKeyboardFrameTracker: () => b.Cv,
          UnreliableMouseFrame: () => b.ot,
          UnreliablePointerFrame: () => b.qb,
          UnreliablePointerStateType: () => b.Qs,
          UserContentType: () => Y,
          VibrationType: () => b.VU,
          VirtualKeyboardInputScope: () => Qe,
          WheelEventDeltaMode: () => b.pY,
          XCloudStreamUser: () => S,
          areRectsEqual: () => H,
          blankGamepadMapping: () => b.iz,
          blankSensorReading: () => b.Lh,
          calculateGamepadPhysicality: () => V.Z,
          getAudioModeString: () => pe,
          getModernizr: () => li,
          getPerfTrackerProfileString: () => we,
          getProtocolString: () => ve,
          getReleaseChannelString: () => fe,
          getStreamTypeString: () => ye,
          isFeatureSupported: () => hi,
          isGamepadTitle: () => ei,
          isMouseAndKeyboardTitle: () => ii,
          isNativeSensorsTitle: () => si,
          isNativeTouchTitle: () => ti,
          isPersistentHandler: () => Te.k,
          isStateSharePrototypeData: () => Dt,
          isSupportedTabsTitle: () => ni,
          mergeStreamSessionConfigurations: () => ft,
          sanitizeConfigurationForTelemetry: () => yt,
          serviceConfigurationPropertyBlocklist: () => vt,
          supportedFeatureTestKeys: () => ri,
          trackMediaSourceSupport: () => ci,
          trackUnsupportedFeatures: () => di,
          validateAudioConfiguration: () => C.F,
          validateClientStreamingConfigOverrides: () => Ct,
          validateInputConfiguration: () => A,
          validateStatisticsConfiguration: () => M,
          validateVideoConfiguration: () => K,
        }));
      var n = i(41506),
        s = i.n(n),
        o = i(58212),
        r = i.n(o),
        a =
          (i(97107),
          i(62234),
          i(69375),
          i(33975),
          i(64727),
          i(10865),
          i(47748),
          i(81045),
          i(45950),
          i(5350),
          i(47010),
          i(90692)),
        l = i(28985);
      var d = i(56188),
        c = i(76753),
        h = i(31622),
        u = i(70622),
        g = i(37837),
        m = i(74687);
      class p {
        constructor(e, t, i, n, s) {
          (r()(this, 'friendlyName', void 0),
            r()(this, 'domain', void 0),
            r()(this, 'networkTestEndpoint', void 0),
            r()(this, 'systemUpdateGroups', void 0),
            r()(this, 'user', void 0),
            (this.friendlyName = e),
            (this.domain = t),
            (this.networkTestEndpoint = i),
            (this.systemUpdateGroups = null !== s && void 0 !== s ? s : []),
            (this.user = n),
            '' !== this.systemUpdateGroups[0] &&
              this.systemUpdateGroups.unshift(''));
        }
      }
      class v extends l.EventEmitter {
        constructor(e, t, i, n) {
          (super(),
            r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            r()(this, 'timerId', void 0),
            r()(this, 'lastRefreshScheduleTime', 0),
            r()(this, 'instanceId', ++v.instances),
            r()(this, 'identity', void 0),
            r()(this, 'cv', void 0),
            r()(this, 'networkTestEndpoint', ''),
            r()(this, 'currentRegion', void 0),
            r()(this, 'regions', []),
            r()(this, 'fallbackRegionNames', []),
            r()(this, 'market', ''),
            r()(this, 'offeringId', void 0),
            r()(this, 'endpointSettings', void 0),
            (this.identity = e),
            (this.cv = i.extend()),
            (this.endpointSettings = n),
            'string' === typeof t
              ? (this.offeringId = t)
              : ((this.offeringId = t.id),
                this.endpointSettings.setDomain(t.fqdn)),
            (this.logger = new h.r('StreamUser', `(${this.instanceId})`)),
            (this.telemetry = u.H.Instance));
        }
        setStreamingRegion(e) {
          (e.user !== this &&
            this.logger.throw(
              'The region has to be for this user - not somebody else',
              c.ws.InvalidArgument
            ),
            this.endpointSettings.setDomain(e.domain),
            (this.networkTestEndpoint = e.networkTestEndpoint),
            (this.currentRegion = e));
        }
        validateSystemUpdateGroup(e) {
          return this.currentRegion &&
            this.currentRegion.systemUpdateGroups.includes(e)
            ? (this.logger.info(
                `StreamSessionRequest: Using system update group ${e}.`
              ),
              e)
            : (this.logger.warning(
                `StreamSessionRequest: System update group ${e} not found, using default.`
              ),
              '');
        }
        async updateIdentity(e) {
          const { token: t } = this.identity;
          ((this.identity = s()(s()({}, this.identity), e)),
            this.identity.token &&
              t !== this.identity.token &&
              (await this.refresh()));
        }
        cancelScheduledTokenRefresh() {
          this.timerId && (clearTimeout(this.timerId), (this.timerId = void 0));
        }
        scheduleTokenRefresh(e) {
          {
            const t = Date.now(),
              i = 3e5,
              n = t - this.lastRefreshScheduleTime;
            (n < i &&
              ((e = i),
              this.logger.info(
                `Auth: gstoken refresh last attempted only ${n / 1e3} seconds ago, throttling.`
              )),
              (this.lastRefreshScheduleTime = t),
              this.logger.info(
                `Auth: set gstoken refresh timer for ${e / 1e3} seconds from now`
              ),
              this.cancelScheduledTokenRefresh(),
              (this.timerId = setTimeout(() => {
                this.refresh();
              }, e)));
          }
        }
        async refresh() {
          this.logger.info('Auth: refreshing gstoken');
          const e = Date.now();
          let t,
            i = !1;
          try {
            (await this.updateToken(),
              (i = !0),
              this.logger.info('Auth: gstoken refreshed'));
          } catch (n) {
            const e = (0, g.g)(n);
            if (
              (this.logger.error(
                `Auth: User gstoken refresh failed: ${(0, m.A)(e)}`
              ),
              e instanceof d.F)
            )
              switch (e.code) {
                case c.ws.AuthUnauthorized:
                case c.ws.AuthExpiredToken:
                case c.ws.AuthBadToken: {
                  this.logger.error(
                    `Auth: User gstoken refresh failed ${e.code}, firing UserTokenInvalidated event`
                  );
                  const t = { reason: e.code };
                  this.invokeTokenInvalidated(t);
                  break;
                }
                default:
                  (this.logger.error(
                    `Auth: User gstoken refresh failed ${e.code}, retrying in 60 seconds`
                  ),
                    (t = 6e4));
              }
            else
              e instanceof a.HttpError
                ? (this.logger.error(
                    `Auth: User gstoken refresh failed ${e.response.status}, retrying in 60 seconds`
                  ),
                  (t = 6e4))
                : (this.logger.info(
                    `Auth: User gstoken refresh failed ${e.message}, retrying in 30 seconds`
                  ),
                  (t = 3e4));
          }
          (t && this.scheduleTokenRefresh(t),
            this.telemetry.trackEvent({
              event: u.X.AuthUserTokenRefreshed,
              cV: this.cv.getValue(),
              latencyMs: Date.now() - e,
              success: i,
            }));
        }
        invokeTokenInvalidated(e) {
          this.emit('identityTokenInvalidated', { args: e, sender: this });
        }
      }
      r()(v, 'instances', 0);
      class S extends v {
        static deserialize(e, t, i, n, s, o) {
          const r = JSON.parse(e),
            a = new S(t, i, n, s, o);
          return (a.hydrate(r), a);
        }
        constructor(e, t, i, n, s) {
          (super(e, i, n, s),
            r()(this, 'hydratableUserAuthResponse', void 0),
            r()(this, 'authClient', void 0),
            r()(this, 'gsToken', void 0),
            (this.authClient = t));
        }
        serialize() {
          if (this.hydratableUserAuthResponse)
            return JSON.stringify(this.hydratableUserAuthResponse);
          this.logger.warning(
            "Attempted to serialize a StreamUser which hasn't been authenticated yet"
          );
        }
        applyHydratableUserString(e) {
          this.hydrate(JSON.parse(e));
        }
        hasToken() {
          return !!this.gsToken;
        }
        getToken() {
          return Promise.resolve(this.gsToken);
        }
        getAuthorizationHeader() {
          return Promise.resolve(
            this.hasToken() ? `Bearer ${this.gsToken}` : ''
          );
        }
        async updateToken() {
          if (
            (this.cv.increment(),
            this.logger.info(`Updating gs token cv: ${this.cv.getValue()}`),
            this.identity.expires)
          ) {
            new Date(this.identity.expires).getTime() < Date.now() &&
              this.logger.throw(
                'User token has expired',
                c.ws.AuthExpiredToken
              );
          }
          this.identity.token ||
            this.logger.throw('User token cannot be empty', c.ws.AuthBadToken);
          const e = { token: this.identity.token, offeringId: this.offeringId },
            [t] = await this.authClient.loginUser(this, e);
          ((this.hydratableUserAuthResponse = t),
            this.hydrate(this.hydratableUserAuthResponse));
        }
        hydrate(e) {
          let t = e.durationInSeconds;
          if (e.retrievedAtTimestamp) {
            const i = Math.max(0, Date.now() - e.retrievedAtTimestamp),
              n = 1e3 * e.durationInSeconds;
            t = Math.floor(Math.max(0, n - i) / 1e3);
          } else
            this.logger.warning(
              `Auth response did not include a retrieved timestamp - Falling back to existing duration value of ${t}s`
            );
          (t <= 0 &&
            this.logger.throw(
              'Expired token passed to hydrate',
              c.ws.AuthExpiredToken
            ),
            this.logger.info(`Gstoken done, length = ${e.gsToken.length}`));
          const i = e.offeringSettings.regions,
            n = new Array();
          if (e.offeringSettings.allowRegionSelection)
            i.forEach((e) => {
              var t;
              const i = new p(
                e.name,
                e.baseUri,
                e.networkTestHostname,
                this,
                null === (t = e.systemUpdateGroups) || void 0 === t
                  ? void 0
                  : t.slice()
              );
              e.isDefault ? n.unshift(i) : n.push(i);
            });
          else {
            var s;
            const e = i.find((e) => e.isDefault);
            (e ||
              this.logger.throw(
                'The default region should always be there',
                c.ws.NotFound
              ),
              n.push(
                new p(
                  e.name,
                  e.baseUri,
                  e.networkTestHostname,
                  this,
                  null === (s = e.systemUpdateGroups) || void 0 === s
                    ? void 0
                    : s.slice()
                )
              ));
          }
          const o = new Array();
          if (
            (i
              .slice()
              .sort((e, t) => e.fallbackPriority - t.fallbackPriority)
              .forEach((e) => {
                e.isDefault || -1 === e.fallbackPriority || o.push(e.name);
              }),
            (this.gsToken = e.gsToken),
            (this.regions = n),
            (this.fallbackRegionNames = o),
            (this.market = e.market),
            this.regions[0] && this.setStreamingRegion(this.regions[0]),
            t < 300)
          )
            (this.logger.info(
              'Token will expire in less than 5 minutes - scheduling an immediate refresh'
            ),
              this.scheduleTokenRefresh(0));
          else {
            const t = 1e3 * e.durationInSeconds;
            this.scheduleTokenRefresh(t / 2);
          }
        }
      }
      class f extends v {
        constructor(e, t, i, n) {
          super(e, t, i, n);
        }
        serialize() {
          throw new Error('Not implemented');
        }
        hasToken() {
          return !!this.identity.getToken;
        }
        async getToken() {
          if (!this.identity.getToken) return;
          return (await this.identity.getToken()).token;
        }
        async getAuthorizationHeader() {
          if (!this.identity.getToken) return '';
          const e = await this.identity.getToken();
          return `XBL3.0 x=${(t = e).userHash || 0};${t.token}`;
          var t;
        }
        updateToken() {
          return Promise.resolve();
        }
      }
      var y, w;
      (!(function (e) {
        ((e.AzureFrontDoor = 'AFD'), (e.AzureTrafficManager = 'ATM'));
      })(y || (y = {})),
        (function (e) {
          ((e[(e.XCloud = 0)] = 'XCloud'),
            (e[(e.ManagedDevkit = 1)] = 'ManagedDevkit'));
        })(w || (w = {})));
      var C = i(79406),
        T = i(90507),
        b = i(97406),
        k = i(76203);
      const I = {
          enableGamepadInput: k.Lm,
          enableMouseInput: k.Lm,
          enableAbsoluteMouse: k.Lm,
          enableKeyboardInput: k.Lm,
          enableTouchInput: k.Lm,
          enableExperimentalSensorInput: k.Lm,
          enableSensorInput: k.Lm,
          sensorInputPollingRateInHz: k.Bf,
          enableVibration: k.Lm,
          useNexusPressWorkaround: k.Lm,
          useIntervalWorkerThreadForInput: k.Lm,
          inputChannelMaxVersion: k.Bf,
          gamepadTransformer: k.Tn,
          maxTouchPoints: k.Bf,
          useUnreliableInput: k.Lm,
          enableClientRenderedCursor: k.Lm,
          minTimeBetweenInputFramesMs: k.Bf,
          pollGamepadsIntervalMs: k.Bf,
          unreliableInputFrameRetransmissionIntervalMs: k.Bf,
        },
        A = (0, k.yy)(I, {
          name: 'validateInputConfiguration',
          ignoreNullish: !0,
          throwErrors: !0,
        });
      class x {
        constructor(e) {
          (r()(this, 'queuePollingIntervalMs', 1e4),
            r()(this, 'provisioningPollingIntervalMs', 2e3),
            r()(this, 'retryPollingIntervalMs', 2e3),
            r()(this, 'useRetryAfterHeader', !1),
            r()(this, 'onRetryAfterUpdate', (e) => {
              if (!this.useRetryAfterHeader) return;
              if (!e || isNaN(e))
                throw new Error('Invalid value provided by Retry-After header');
              const t = 1e3 * e;
              ((this.queuePollingIntervalMs = t),
                (this.provisioningPollingIntervalMs = t));
            }),
            (this.useRetryAfterHeader = e));
        }
      }
      const E = {
          statsCollectionSizeSec: k.Bf,
          statsPollingIntervalMs: k.Bf,
          statsEventFrequencySec: k.Bf,
          numberOfStatsEventsToStore: k.Bf,
          stringifyStatUponCollect: k.Lm,
          enableMemoryStatsCollection: k.Lm,
        },
        M = (0, k.yy)(E, {
          name: 'validateStatisticsConfiguration',
          ignoreNullish: !0,
          throwErrors: !0,
        });
      (i(30163),
        i(73118),
        i(90374),
        i(72252),
        i(38124),
        i(70889),
        i(98788),
        i(46826),
        i(65949),
        i(9402),
        i(84035),
        i(14419),
        i(20629),
        i(90029),
        i(21019),
        i(65478),
        i(55976));
      var P = i(91211),
        D = i(59306);
      const R = 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
        L = 'getVideoPlaybackQuality' in HTMLVideoElement.prototype;
      var F;
      !(function (e) {
        ((e.requestAnimationFrame = 'rAF'),
          (e.requestVideoFrameCallback = 'rVFC'),
          (e.getVideoPlaybackQuality = 'gVPQ'),
          (e.unavailable = 'unavailable'));
      })(F || (F = {}));
      class N {
        constructor(e) {
          (r()(this, 'webRtcQualityMetrics', void 0),
            r()(this, 'streamType', void 0),
            r()(this, 'processedFPS', 0),
            r()(this, 'renderedFPS', 0),
            r()(this, 'timeStamp', 0),
            r()(this, 'statAsJsonString', ''),
            r()(this, 'renderedFPSMethod', void 0),
            (this.streamType = e),
            (this.renderedFPSMethod = R
              ? F.requestVideoFrameCallback
              : L
                ? F.getVideoPlaybackQuality
                : F.unavailable));
        }
      }
      class U {
        constructor(e, t, i, n) {
          if (
            (r()(this, 'logger', void 0),
            r()(this, 'telemetryContext', void 0),
            r()(this, 'cv', void 0),
            r()(this, 'stream', void 0),
            r()(this, 'ongoingAudioVideoStatsCollection', void 0),
            r()(this, 'intervalMs', 0),
            r()(this, 'previousVideoPlaybackQuality', void 0),
            r()(this, 'previousVideoPlaybackQualityRenderedFrames', 0),
            r()(this, 'previousVideoFrameMetadata', void 0),
            r()(this, 'currentComputedStats', void 0),
            r()(this, 'finalStatsLists', void 0),
            r()(this, 'shouldCollectStats', !1),
            r()(this, 'requestVideoFrameCallbackId', void 0),
            r()(this, 'totalStatsCollectedCount', 0),
            r()(this, 'totalStatsEventsSentCount', 0),
            r()(this, 'originalLightweightTelemetryState', !1),
            r()(this, 'videoStatsCollectionSizeSec', 0),
            r()(this, 'statsTelemetryEventIntervalSec', 0),
            r()(this, 'numberOfEventsToStore', 1),
            r()(this, 'stringifyStatUponCollect', !1),
            r()(this, 'lastTelemetryEventEmittedTimestamp', 0),
            r()(this, 'currentPausedSources', new Set()),
            r()(
              this,
              'StreamAppVisibilityPauseSourceName',
              'Stream App Visibility'
            ),
            r()(this, 'collectionBegan', !1),
            r()(this, 'mediaElement', null),
            r()(this, 'onStreamVisibilityChanged', (e) => {
              e
                ? this.removePause(this.StreamAppVisibilityPauseSourceName)
                : this.addPause(this.StreamAppVisibilityPauseSourceName);
            }),
            r()(this, 'onNewAudioVideoStatsAvailable', (e) => {
              if (
                this.ongoingAudioVideoStatsCollection &&
                !(this.currentPausedSources.size > 0)
              ) {
                if (!this.stream || !this.stream.isStreamActive())
                  return (
                    this.logger.info(
                      '[Stream Statistics] Stream is no longer active, stopping stats collection.'
                    ),
                    null != this.requestVideoFrameCallbackId &&
                      this.mediaElement instanceof HTMLVideoElement &&
                      (this.mediaElement.cancelVideoFrameCallback(
                        this.requestVideoFrameCallbackId
                      ),
                      (this.requestVideoFrameCallbackId = void 0)),
                    (this.currentComputedStats = void 0),
                    (this.previousVideoFrameMetadata = void 0),
                    (this.previousVideoPlaybackQuality = void 0),
                    void (this.previousVideoPlaybackQualityRenderedFrames = 0)
                  );
                ((this.currentComputedStats =
                  this.ongoingAudioVideoStatsCollection.getNextAvailableElem()),
                  (this.currentComputedStats.timeStamp = performance.now()),
                  (this.currentComputedStats.streamType =
                    this.stream.getStreamType()),
                  (this.currentComputedStats.processedFPS = 0),
                  (this.currentComputedStats.renderedFPS = 0),
                  this.collectPlaybackStats(this.currentComputedStats),
                  this.stream.getStreamType() == D.P.WebRTCV1 &&
                    (this.currentComputedStats.webRtcQualityMetrics = e),
                  this.totalStatsCollectedCount++,
                  this.stringifyStatUponCollect &&
                    (this.currentComputedStats.statAsJsonString =
                      JSON.stringify(this.currentComputedStats, (e, t) => {
                        if ('statAsJsonString' != e) return t;
                      })),
                  this.shouldFireMidSessionEvent() &&
                    (this.sendStreamingStatisticsEvent(),
                    1 != this.numberOfEventsToStore &&
                      this.ongoingAudioVideoStatsCollection.reset()));
              }
            }),
            r()(
              this,
              'calculateVideoElementPlaybackQualityStats',
              (e, t, i) => {
                t.renderedFPSMethod = F.getVideoPlaybackQuality;
                const n =
                    null === i || void 0 === i
                      ? void 0
                      : i.getVideoPlaybackQuality(),
                  s = n.totalVideoFrames - n.droppedVideoFrames;
                if (
                  this.previousVideoPlaybackQuality &&
                  this.previousVideoPlaybackQualityRenderedFrames
                ) {
                  var o;
                  let i;
                  if (
                    (null === (o = this.previousVideoPlaybackQuality) ||
                    void 0 === o
                      ? void 0
                      : o.totalVideoFrames) > n.totalVideoFrames
                  ) {
                    i = s / ((e - n.creationTime) / 1e3);
                  } else {
                    const e =
                      n.creationTime -
                      this.previousVideoPlaybackQuality.creationTime;
                    i =
                      (s - this.previousVideoPlaybackQualityRenderedFrames) /
                      (e / 1e3);
                  }
                  t.renderedFPS = ((100 * i) | 0) / 100;
                }
                ((this.previousVideoPlaybackQuality = n),
                  (this.previousVideoPlaybackQualityRenderedFrames = s));
              }
            ),
            r()(this, 'updateStateOnVideoFrame', (e, t) => {
              if (
                ((this.requestVideoFrameCallbackId = void 0),
                this.currentComputedStats && this.previousVideoFrameMetadata)
              ) {
                const e =
                  t.expectedDisplayTime -
                  this.previousVideoFrameMetadata.expectedDisplayTime;
                let i;
                i =
                  t.presentedFrames >
                  this.previousVideoFrameMetadata.presentedFrames
                    ? t.presentedFrames -
                      this.previousVideoFrameMetadata.presentedFrames
                    : t.presentedFrames;
                const n = i / (e / 1e3);
                this.currentComputedStats.renderedFPS = ((100 * n) | 0) / 100;
              }
              this.previousVideoFrameMetadata = t;
            }),
            r()(this, 'addPause', (e) => {
              (this.logger.info(
                `[Stream Statistics] New source is pausing collection. Source = ${e}`
              ),
                this.currentPausedSources.add(e));
            }),
            r()(this, 'removePause', (e) => {
              (this.currentPausedSources.delete(e)
                ? this.logger.info(
                    `[Stream Statistics] Source = ${e} was released from pausing collection.`
                  )
                : this.logger.info(
                    `[Stream Statistics] Source = ${e} attempted to remove pause, but could not be found in the current list of sources.`
                  ),
                this.currentPausedSources.size > 0
                  ? (this.logger.info(
                      `[Stream Statistics] ${this.currentPausedSources.size} Pause sources remaining: `
                    ),
                    this.currentPausedSources.forEach((e) => {
                      this.logger.info(`[Stream Statistics] -> ${e}`);
                    }))
                  : this.logger.info(
                      '[Stream Statistics] collection resuming'
                    ));
            }),
            (this.stream = e),
            (this.telemetryContext = i),
            (this.cv = n),
            (this.logger = h.r.Instance),
            (this.originalLightweightTelemetryState =
              u.H.Instance.isLightweightTelemetryEnabled()),
            u.H.Instance.setEnableLightweightTelemetry(!0),
            (this.finalStatsLists = { empty: Object.freeze([]) }),
            this.validateStatsConfig(t),
            t.statsCollectionSizeSec && t.statsCollectionSizeSec > 0)
          ) {
            var s, o, a;
            if (
              ((this.videoStatsCollectionSizeSec = t.statsCollectionSizeSec),
              (this.intervalMs =
                null !== (s = t.statsPollingIntervalMs) && void 0 !== s
                  ? s
                  : 1e3),
              t.statsEventFrequencySec && t.statsEventFrequencySec > 0)
            )
              ((this.statsTelemetryEventIntervalSec = t.statsEventFrequencySec),
                (this.numberOfEventsToStore =
                  null !== (o = t.numberOfStatsEventsToStore) && void 0 !== o
                    ? o
                    : 1),
                (this.stringifyStatUponCollect =
                  null !== (a = t.stringifyStatUponCollect) &&
                  void 0 !== a &&
                  a));
            this.shouldCollectStats = !0;
            const e =
              (1e3 * this.videoStatsCollectionSizeSec) / this.intervalMs;
            ((this.finalStatsLists.filled = Array(e)),
              (this.ongoingAudioVideoStatsCollection = new P.CircularBuffer(e)),
              this.ongoingAudioVideoStatsCollection.initialize(
                new N(this.stream.getStreamType())
              ),
              this.logger.info('[Stream Statistics] Stats object created.'));
          } else
            ((this.shouldCollectStats = !1),
              this.logger.info(
                '[Stream Statistics] Collection window was not set, so no collection will occur'
              ));
        }
        validateStatsConfig({
          statsPollingIntervalMs: e,
          statsCollectionSizeSec: t,
          statsEventFrequencySec: i,
          numberOfStatsEventsToStore: n,
        }) {
          (void 0 !== e &&
            e < 100 &&
            this.logger.throw(
              'Stats collection interval is not within bounds',
              c.ws.Bounds
            ),
            void 0 !== t &&
              (t < 0 || t > 300) &&
              this.logger.throw(
                'Stats collection window out of bounds',
                c.ws.Bounds
              ),
            0 != i &&
              0 === n &&
              this.logger.throw(
                'Invalid numberOfEventsToStore, cannot be 0 when one or more telemetry events are being sent',
                c.ws.Bounds
              ),
            void 0 !== i &&
              void 0 !== t &&
              i > t &&
              this.logger.throw(
                'Invalid Stats telemetry frequency. statsEventFrequencySec cannot be larger than the statsCollectionSizeSec or it will lead to data loss',
                c.ws.Bounds
              ),
            void 0 !== n &&
              1 != n &&
              i != t &&
              this.logger.throw(
                'numberOfEventsToStore != 1, and statsTelemetryEventIntervalSec != videoStatsCollectionSizeSec, which can create duplicate data.',
                c.ws.Bounds
              ));
        }
        startAudioVideoStatsCollection() {
          var e, t, i, n, s;
          this.shouldCollectStats
            ? null !== (e = this.stream) &&
              void 0 !== e &&
              e.isStatsCollectionSupported()
              ? null !== (t = this.stream) && void 0 !== t && t.isStreamActive()
                ? ((this.collectionBegan = !0),
                  (this.mediaElement = this.stream.getRenderTarget()),
                  this.lastTelemetryEventEmittedTimestamp <= 0 &&
                    (this.lastTelemetryEventEmittedTimestamp =
                      performance.now()),
                  this.mediaElement instanceof HTMLVideoElement &&
                    (R
                      ? (this.requestVideoFrameCallbackId =
                          this.mediaElement.requestVideoFrameCallback(
                            this.updateStateOnVideoFrame
                          ))
                      : L
                        ? (this.previousVideoPlaybackQuality =
                            this.mediaElement.getVideoPlaybackQuality())
                        : this.logger.warning(
                            'renderedFPSMethod is unavailable'
                          )),
                  (this.currentPausedSources = new Set()),
                  null === (i = this.stream) ||
                    void 0 === i ||
                    i.addListener(
                      'qualityReportReady',
                      this.onNewAudioVideoStatsAvailable
                    ),
                  null === (n = this.stream) ||
                    void 0 === n ||
                    n.addListener(
                      'documentVisibilityChanged',
                      this.onStreamVisibilityChanged
                    ),
                  null === (s = this.stream) ||
                    void 0 === s ||
                    s.startStreamStatisticsReporting(this.intervalMs),
                  this.logger.info(
                    '[Stream Statistics] Successfully registered to collect stats from Stream upon availability'
                  ))
                : this.logger.warning(
                    'startAudioVideoStatsCollection() was called but stream is not ready yet'
                  )
              : this.logger.warning(
                  "startAudioVideoStatsCollection() was called but stream doesn't support Stats collection."
                )
            : this.logger.warning(
                'startAudioVideoStatsCollection() was called but collection was set to FALSE'
              );
        }
        collectPlaybackStats(e) {
          this.mediaElement instanceof HTMLVideoElement
            ? R
              ? ((e.renderedFPSMethod = F.requestVideoFrameCallback),
                null == this.requestVideoFrameCallbackId &&
                  (this.requestVideoFrameCallbackId =
                    this.mediaElement.requestVideoFrameCallback(
                      this.updateStateOnVideoFrame
                    )))
              : L &&
                this.calculateVideoElementPlaybackQualityStats(
                  e.timeStamp,
                  e,
                  this.mediaElement
                )
            : this.mediaElement instanceof HTMLCanvasElement &&
              (e.renderedFPSMethod = F.requestAnimationFrame);
        }
        shutdown() {
          ((this.ongoingAudioVideoStatsCollection = void 0),
            (this.totalStatsEventsSentCount = 0),
            (this.totalStatsCollectedCount = 0),
            this.stream.removeListener('qualityReportReady'),
            this.stream.removeListener('documentVisibilityChanged'),
            u.H.Instance.setEnableLightweightTelemetry(
              this.originalLightweightTelemetryState
            ));
        }
        isStatsCollectionSupported() {
          return this.stream.isStatsCollectionSupported();
        }
        shouldFireDisconnectEvent() {
          return !!this.ongoingAudioVideoStatsCollection;
        }
        shouldFireMidSessionEvent() {
          return (
            !!this.ongoingAudioVideoStatsCollection &&
            !!this.currentComputedStats &&
            this.statsTelemetryEventIntervalSec > 0 &&
            (this.currentComputedStats.timeStamp -
              this.lastTelemetryEventEmittedTimestamp) /
              1e3 >=
              this.statsTelemetryEventIntervalSec
          );
        }
        getAllCollectedAudioVideoStats() {
          if (
            this.shouldCollectStats &&
            this.finalStatsLists.filled &&
            this.ongoingAudioVideoStatsCollection
          ) {
            this.finalStatsLists.filled.length =
              this.ongoingAudioVideoStatsCollection.length;
            for (
              let e = 0;
              e < this.ongoingAudioVideoStatsCollection.length &&
              e < this.finalStatsLists.filled.length;
              e++
            )
              this.finalStatsLists.filled[e] =
                this.ongoingAudioVideoStatsCollection.getElemAtIndex(e);
            return this.finalStatsLists.filled;
          }
          return (
            this.logger.warning(
              "startAudioVideoStatsCollection() was called but stream doesn't support Stats collection."
            ),
            this.finalStatsLists.empty
          );
        }
        concatStringifiedStats(e) {
          let t = '[',
            i = 0;
          for (const n of e)
            n && (i > 0 && (t += ','), (t += n.statAsJsonString), i++);
          return ((t += ']'), [t, i]);
        }
        sendStreamingStatisticsEvent() {
          const e = this.getAllCollectedAudioVideoStats();
          let t = '',
            i = 0;
          if (this.stringifyStatUponCollect)
            [t, i] = this.concatStringifiedStats(e);
          else {
            const n = e.filter((e) => !!e);
            ((i = n.length), (t = JSON.stringify(n)));
          }
          (u.H.Instance.trackEvent(
            s()(
              {
                event: u.X.StreamStatistics,
                order: this.totalStatsEventsSentCount++,
                currentStatsCount: i,
                sessionTotalStatsCount: this.totalStatsCollectedCount,
                numberOfEventsToSave: this.numberOfEventsToStore,
                statsTelemetryEventIntervalSec:
                  this.statsTelemetryEventIntervalSec,
                statsCollectionSizeSec: this.videoStatsCollectionSizeSec,
                storeLastEventOnly: this.numberOfEventsToStore > 0,
                statsSchemaVersion: 3,
                streamType: this.stream.getStreamType(),
                statistics: t,
              },
              this.telemetryContext.getProps(this.cv)
            ),
            !0
          ),
            this.currentComputedStats &&
              (this.lastTelemetryEventEmittedTimestamp =
                this.currentComputedStats.timeStamp));
        }
      }
      var $,
        V = i(82361),
        B = (i(87050), i(29142));
      !(function (e) {
        ((e.Auto = 'Auto'),
          (e.Resolution720 = '720'),
          (e.Resolution720HQ = '720HQ'),
          (e.Resolution1080 = '1080'),
          (e.Resolution1080HQ = '1080HQ'),
          (e.Resolution1440 = '1440'));
      })($ || ($ = {}));
      const G = (0, k.yy)(
        { left: k.Bf, top: k.Bf, right: k.Bf, bottom: k.Bf },
        { name: 'isPartialRect', ignoreNullish: !0, throwErrors: !0 }
      );
      function H(e, t) {
        return (
          e === t ||
          !(
            !e ||
            !t ||
            e.left !== t.left ||
            e.top !== t.top ||
            e.right !== t.right ||
            e.bottom !== t.bottom
          )
        );
      }
      const O = {
          showStreamStatisticsOverlay: k.Lm,
          videoDecoderType: (0, k.y$)(B.RainwayVideoDecoder, {
            name: 'isRainwayVideoDecoderValue',
          }),
          enableHevc: k.Lm,
          videoProcessingAttribute: k.Kg,
          perfTrackerProfile: (0, k.y$)(B.PerfTrackerProfile, {
            name: 'isPerfTrackerProfileValue',
          }),
          remove78FPSHack: k.Lm,
          safeAreaInsets: Object.assign((e) => null == e || G(e), {
            toString: () => 'isPartialRectOrNullish',
          }),
          latencyPreset: (0, k.y$)(B.LatencyPreset, {
            name: 'isLatencyPresetValue',
          }),
          setCodecPreferences: k.Lm,
          useTizenH264MainSdpHack: k.Lm,
          enableFEC: k.Lm,
          preferMainH264Profile: k.Lm,
          emitStreamStatisticsSimplifiedEvent: k.Lm,
          enableNetworkQualityIndicator: k.Lm,
          videoElementAriaLabel: k.Kg,
          userRequestedResolutionAlias: (0, k.y$)($, {
            name: 'isResolutionAliasValue',
          }),
          useCombinedAudioVideoStream: k.Lm,
        },
        K = (0, k.yy)(O, {
          name: 'validateVideoConfiguration',
          ignoreNullish: !0,
          throwErrors: !0,
        });
      i(1402);
      var q,
        _,
        X,
        W,
        z,
        Y,
        j = i(89263);
      class Q {
        constructor() {
          (r()(this, 'priority', 0),
            r()(this, 'intercept', async (e) =>
              a.InterceptedRequest.fromRequest(e, {
                additionalHeaders: {
                  'Content-Type': 'application/json; charset=utf-8',
                },
              })
            ));
        }
      }
      function J(e) {
        return !!e.code || !!e.message;
      }
      function Z(e) {
        const t = e;
        if (null == e) return c.ws.Unknown;
        switch (t) {
          case X.NoEntitlement:
            return c.ws.NoEntitlement;
          case X.ContentInUse:
            return c.ws.TitleIdInUse;
          case X.ContentOffline:
            return c.ws.TitleOffline;
          case X.GamePassExpired:
            return c.ws.GamePassExpired;
          case X.XboxLiveAccountCurfew:
            return c.ws.XboxLiveAccountCurfew;
          case X.BlockedByParentalControls:
            return c.ws.BlockedByParentalControls;
          case X.BlockedByScreenTime:
            return c.ws.BlockedByScreenTime;
          case X.BlockedByAppTime:
            return c.ws.BlockedByAppTime;
          case X.TransferTokenMicrosoftAccountUnfamiliarLocation:
            return c.ws.TransferTokenMicrosoftAccountUnfamiliarLocation;
          case X.TransferTokenMicrosoftAccountProofUp:
            return c.ws.TransferTokenMicrosoftAccountProofUp;
          case X.KickForSignOut:
            return c.ws.AccessDenied;
          case X.ManagedDevkitUnauthorized:
            return c.ws.ManagedDevkitUnauthorized;
          case X.ManagedDevkitAccessToAccountDenied:
            return c.ws.ManagedDevkitAccessToAccountDenied;
          case X.ManagedDevkitInvalidRedeemCode:
            return c.ws.ManagedDevkitInvalidRedeemCode;
          case X.ManagedDevkitAccountDoesNotExist:
            return c.ws.ManagedDevkitAccountDoesNotExist;
          case X.ManagedDevkitSessionDoesNotExist:
            return c.ws.ManagedDevkitSessionDoesNotExist;
          case X.ManagedDevkitStreamingSessionDoesNotExist:
            return c.ws.ManagedDevkitStreamingSessionDoesNotExist;
          case X.ManagedDevkitStreamingSessionNotInExpectedState:
            return c.ws.ManagedDevkitStreamingSessionNotInExpectedState;
          case X.ManagedDevkitStreamingSessionNoValidPassword:
            return c.ws.ManagedDevkitStreamingSessionNoValidPassword;
          case X.ManagedDevkitAccessToSessionDenied:
            return c.ws.ManagedDevkitAccessToSessionDenied;
          case X.TrialTimeExpired:
            return c.ws.TrialTimeExpired;
          case X.MonthlyLimitExceeded:
            return c.ws.MonthlyLimitExceeded;
          case X.ServiceInternalError:
            return c.ws.ServiceInternalError;
          default:
            return c.ws.ServiceSpecificError;
        }
      }
      (!(function (e) {
        ((e[(e.Uninitialized = 0)] = 'Uninitialized'),
          (e[(e.Continue = 100)] = 'Continue'),
          (e[(e.SwitchingProtocols = 101)] = 'SwitchingProtocols'),
          (e[(e.Processing = 102)] = 'Processing'),
          (e[(e.OK = 200)] = 'OK'),
          (e[(e.Created = 201)] = 'Created'),
          (e[(e.Accepted = 202)] = 'Accepted'),
          (e[(e.NonAuthoritativeInformation = 203)] =
            'NonAuthoritativeInformation'),
          (e[(e.NoContent = 204)] = 'NoContent'),
          (e[(e.ResetContent = 205)] = 'ResetContent'),
          (e[(e.PartialContent = 206)] = 'PartialContent'),
          (e[(e.MultiStatus = 207)] = 'MultiStatus'),
          (e[(e.AlreadyReported = 208)] = 'AlreadyReported'),
          (e[(e.ImUsed = 226)] = 'ImUsed'),
          (e[(e.MultipleChoices = 300)] = 'MultipleChoices'),
          (e[(e.Ambiguous = 300)] = 'Ambiguous'),
          (e[(e.MovedPermanently = 301)] = 'MovedPermanently'),
          (e[(e.Moved = 301)] = 'Moved'),
          (e[(e.Found = 302)] = 'Found'),
          (e[(e.Redirect = 302)] = 'Redirect'),
          (e[(e.SeeOther = 303)] = 'SeeOther'),
          (e[(e.RedirectMethod = 303)] = 'RedirectMethod'),
          (e[(e.NotModified = 304)] = 'NotModified'),
          (e[(e.UseProxy = 305)] = 'UseProxy'),
          (e[(e.Unused = 306)] = 'Unused'),
          (e[(e.TemporaryRedirect = 307)] = 'TemporaryRedirect'),
          (e[(e.RedirectKeepVerb = 307)] = 'RedirectKeepVerb'),
          (e[(e.PermanentRedirect = 308)] = 'PermanentRedirect'),
          (e[(e.BadRequest = 400)] = 'BadRequest'),
          (e[(e.Unauthorized = 401)] = 'Unauthorized'),
          (e[(e.PaymentRequired = 402)] = 'PaymentRequired'),
          (e[(e.Forbidden = 403)] = 'Forbidden'),
          (e[(e.NotFound = 404)] = 'NotFound'),
          (e[(e.MethodNotAllowed = 405)] = 'MethodNotAllowed'),
          (e[(e.NotAcceptable = 406)] = 'NotAcceptable'),
          (e[(e.ProxyAuthenticationRequired = 407)] =
            'ProxyAuthenticationRequired'),
          (e[(e.RequestTimeout = 408)] = 'RequestTimeout'),
          (e[(e.Conflict = 409)] = 'Conflict'),
          (e[(e.Gone = 410)] = 'Gone'),
          (e[(e.LengthRequired = 411)] = 'LengthRequired'),
          (e[(e.PreconditionFailed = 412)] = 'PreconditionFailed'),
          (e[(e.RequestEntityTooLarge = 413)] = 'RequestEntityTooLarge'),
          (e[(e.RequestUriTooLong = 414)] = 'RequestUriTooLong'),
          (e[(e.UnsupportedMediaType = 415)] = 'UnsupportedMediaType'),
          (e[(e.RequestedRangeNotSatisfiable = 416)] =
            'RequestedRangeNotSatisfiable'),
          (e[(e.ExpectationFailed = 417)] = 'ExpectationFailed'),
          (e[(e.IAmATeapot = 418)] = 'IAmATeapot'),
          (e[(e.MisdirectedRequest = 421)] = 'MisdirectedRequest'),
          (e[(e.UnprocessableEntity = 422)] = 'UnprocessableEntity'),
          (e[(e.Locked = 423)] = 'Locked'),
          (e[(e.FailedDependency = 424)] = 'FailedDependency'),
          (e[(e.UpgradeRequired = 426)] = 'UpgradeRequired'),
          (e[(e.TooManyRequests = 429)] = 'TooManyRequests'),
          (e[(e.PreconditionRequired = 428)] = 'PreconditionRequired'),
          (e[(e.RequestHeaderFieldsTooLarge = 431)] =
            'RequestHeaderFieldsTooLarge'),
          (e[(e.UnavailableForLegalReasons = 451)] =
            'UnavailableForLegalReasons'),
          (e[(e.InternalServerError = 500)] = 'InternalServerError'),
          (e[(e.NotImplemented = 501)] = 'NotImplemented'),
          (e[(e.BadGateway = 502)] = 'BadGateway'),
          (e[(e.ServiceUnavailable = 503)] = 'ServiceUnavailable'),
          (e[(e.GatewayTimeout = 504)] = 'GatewayTimeout'),
          (e[(e.HttpVersionNotSupported = 505)] = 'HttpVersionNotSupported'),
          (e[(e.VariantAlsoNegotiates = 506)] = 'VariantAlsoNegotiates'),
          (e[(e.InsufficientStorage = 507)] = 'InsufficientStorage'),
          (e[(e.LoopDetected = 508)] = 'LoopDetected'),
          (e[(e.NotExtended = 510)] = 'NotExtended'),
          (e[(e.NetworkAuthenticationRequired = 511)] =
            'NetworkAuthenticationRequired'));
      })(q || (q = {})),
        (function (e) {
          ((e.WaitingForResources = 'WaitingForResources'),
            (e.ReadyToConnect = 'ReadyToConnect'),
            (e.Provisioning = 'Provisioning'),
            (e.Provisioned = 'Provisioned'),
            (e.Failed = 'Failed'));
        })(_ || (_ = {})),
        (function (e) {
          ((e.NoEntitlement = 'NoEntitlement'),
            (e.ContentInUse = 'ContentInUse'),
            (e.ContentOffline = 'ContentOffline'),
            (e.GamePassExpired = 'GamePassExpired'),
            (e.XboxLiveAccountCurfew = 'XboxLiveAccountCurfew'),
            (e.BlockedByParentalControls = 'BlockedByParentalControls'),
            (e.BlockedByScreenTime = 'BlockedByScreenTime'),
            (e.BlockedByAppTime = 'BlockedByAppTime'),
            (e.TransferTokenMicrosoftAccountUnfamiliarLocation =
              'TransferTokenMicrosoftAccountUnfamiliarLocation'),
            (e.TransferTokenMicrosoftAccountProofUp =
              'TransferTokenMicrosoftAccountProofUp'),
            (e.KickForSignOut = 'KickForSignOut'),
            (e.TrialTimeExpired = 'TrialTimeExpired'),
            (e.TrialAccessDenied = 'TrialAccessDenied'),
            (e.ManagedDevkitUnauthorized = 'ManagedDevkitUnauthorized'),
            (e.ManagedDevkitAccessToAccountDenied =
              'https://greenbelt.com/probs/access-to-account-denied'),
            (e.ManagedDevkitInvalidRedeemCode =
              'https://greenbelt.com/probs/invalid-redeem-code'),
            (e.ManagedDevkitAccountDoesNotExist =
              'https://greenbelt.com/probs/account-does-not-exist'),
            (e.ManagedDevkitSessionDoesNotExist =
              'https://greenbelt.com/probs/session-does-not-exist'),
            (e.ManagedDevkitStreamingSessionDoesNotExist =
              'https://greenbelt.com/probs/streaming-session-does-not-exist'),
            (e.ManagedDevkitStreamingSessionNotInExpectedState =
              'https://greenbelt.com/probs/streaming-session-not-in-expected-state'),
            (e.ManagedDevkitStreamingSessionNoValidPassword =
              'https://greenbelt.com/probs/streaming-session-no-valid-password'),
            (e.ManagedDevkitAccessToSessionDenied =
              'https://greenbelt.com/probs/access-to-session-denied'),
            (e.MonthlyLimitExceeded = 'MonthlyLimitExceeded'),
            (e.ServiceInternalError = 'InternalError'));
        })(X || (X = {})),
        (function (e) {
          ((e.ConnectedStandby = 'ConnectedStandby'),
            (e.On = 'On'),
            (e.Off = 'Off'),
            (e.Unknown = 'Unknown'),
            (e.SystemUpdate = 'SystemUpdate'));
        })(W || (W = {})),
        (function (e) {
          ((e[(e.Off = 0)] = 'Off'),
            (e[(e.White = 1)] = 'White'),
            (e[(e.Black = 2)] = 'Black'));
        })(z || (z = {})),
        (function (e) {
          ((e.ConnectedStorage = 'ConnectedStorage'),
            (e.PersistentLocalStorage = 'PersistentLocalStorage'),
            (e.SharedLocalStorage = 'SharedLocalStorage'),
            (e.QuickResume = 'QuickResume'));
        })(Y || (Y = {})));
      const ee = async (e, t) => {
        const i = await t.text();
        if (!i) return;
        let n;
        try {
          n = JSON.parse(i);
        } catch (s) {}
        if (n) {
          const i = n;
          i &&
            J(i) &&
            e.throw(
              `ServiceErrorDetails issue detected. Code:${i.code}, Message:${i.message}, Status:${t.status}`,
              Z(i.code)
            );
          const s = n.errorDetails;
          s &&
            J(s) &&
            e.throw(
              `ServiceErrorDetails issue detected. Code:${s.code}, Message:${s.message}, Status:${t.status}`,
              Z(s.code)
            );
        }
        t.ok || e.error(`Failing body unprocessed: ${i}`);
      };
      class te {
        constructor(e) {
          (r()(this, 'logger', void 0),
            r()(this, 'priority', 0),
            r()(this, 'intercept', async (e, t) => {
              const i = t.clone();
              return (await ee(this.logger, i), t);
            }),
            (this.logger = e));
        }
      }
      class ie {
        constructor(e) {
          (r()(this, 'logger', void 0),
            r()(this, 'priority', 0),
            r()(this, 'intercept', async (e, t) => {
              if (
                ('Network request failed' === t.message
                  ? this.logger.throw(
                      'The network request failed',
                      c.ws.NoNetwork
                    )
                  : 'Failed to fetch' === t.message
                    ? this.logger.throw('Failed to fetch', c.ws.NoNetwork)
                    : 'Timeout' === t.message &&
                      this.logger.throw(
                        'The operation timed out',
                        c.ws.Timeout
                      ),
                !(t instanceof a.HttpError))
              )
                throw t;
              const i = t.response.clone();
              switch ((await ee(this.logger, i), i.status)) {
                case q.Forbidden:
                  this.logger.throw('Forbidden', c.ws.AuthUnauthorized);
                case q.Unauthorized:
                  this.logger.throw('Unauthorized', c.ws.AuthUnauthorized);
                case q.Conflict:
                  this.logger.throw(
                    'A resource is already in use by the current user. Please try again',
                    c.ws.Conflict
                  );
                case q.NotFound:
                  this.logger.throw('Not Found', c.ws.NotFound);
                case q.Gone:
                  this.logger.throw('The session is gone', c.ws.Gone);
              }
              throw t;
            }),
            (this.logger = e));
        }
      }
      class ne {
        constructor(e) {
          (r()(this, 'headers', void 0),
            r()(this, 'priority', 0),
            r()(this, 'intercept', async (e) =>
              this.headers
                ? a.InterceptedRequest.fromRequest(e, {
                    additionalHeaders: this.headers,
                  })
                : e
            ),
            (this.headers = e));
        }
      }
      class se {
        constructor(e) {
          (r()(this, 'user', void 0),
            r()(this, 'priority', 0),
            r()(this, 'intercept', async (e) => {
              const t = await this.user.getAuthorizationHeader();
              return a.InterceptedRequest.fromRequest(e, {
                additionalHeaders: { Authorization: t },
              });
            }),
            (this.user = e));
        }
      }
      function oe(e, t, i) {
        const n = [new se(t), new ne(i)];
        return (0, a.createInterceptedFetch)(e, { request: n });
      }
      const re = (e, t) => {
        if (t instanceof a.HttpError) {
          if (t.response.status === q.Conflict) return !0;
          if (t.response.status === q.BadGateway) return !0;
        } else if (t instanceof d.F)
          return (
            t.code === c.ws.Conflict ||
            t.code === c.ws.ServiceInternalError ||
            !(t.code !== c.ws.NoNetwork && !c.ws.Timeout)
          );
        return (0, a.DEFAULT_RETRY_PREDICATE)(e, t);
      };
      class ae {
        constructor(e = new T.W(), t = globalThis.fetch) {
          (r()(this, 'cv', void 0),
            r()(this, 'logger', void 0),
            r()(this, 'playFetch', void 0),
            (this.cv = e),
            (this.logger = h.r.Instance));
          this.playFetch = (0, a.createInterceptedFetch)(t, {
            request: [
              new Q(),
              new j.CorrelationVectorInterceptor(async () =>
                this.cv.increment().getValue()
              ),
            ],
            error: [new ie(this.logger)],
          });
        }
        setSessionCv(e) {
          this.cv = e;
        }
        async loginUser(e, t) {
          const i = e.endpointSettings.getHeaders();
          let n = `${e.endpointSettings.getDomain()}/v2/login/user`;
          null !== i &&
            void 0 !== i &&
            i.get('Forwarded') &&
            (n += '/delegated');
          const s = oe(this.playFetch, e, i),
            o = await s(n, { method: 'POST', body: (0, m.A)(t) }),
            r = await o.json();
          return ((r.retrievedAtTimestamp = Date.now()), [r, o]);
        }
        async getOfferings(e, t) {
          const i = `${t.getDomain()}/v1/offerings/user`,
            n = (0, a.createInterceptedFetch)(this.playFetch, {
              request: [new ne(t.getHeaders())],
            }),
            s = { authenticationType: 'Xbox', token: e },
            o = await n(i, { method: 'POST', body: (0, m.A)(s) }),
            r = await o.text(),
            l = JSON.parse(r);
          return (
            this.logger.info(
              `retrieved ${l.offerings.length} offerings for user`
            ),
            l.offerings
          );
        }
      }
      var le;
      (i(8697), i(8096), i(98376), i(46929), i(10568), i(14293));
      !(function (e) {
        ((e.Production = 'prod'),
          (e.Test = 'test'),
          (e.Integration = 'int'),
          (e.Default = 'unset-http-environment'));
      })(le || (le = {}));
      const de = '{httpEnv}',
        ce = '{prefix}',
        he = `https://gssv-play-${de}.xboxlive.com`,
        ue = `https://${ce}.gssv-play-${de}.xboxlive.com`,
        ge = new RegExp('^[a-zA-Z0-9]{1,30}$');
      class me {
        constructor(e, t, i) {
          (r()(this, 'sdkInstallId', void 0),
            r()(this, 'domainName', void 0),
            r()(this, 'domainNameWithPrefix', void 0),
            r()(this, 'headers', new Headers()),
            r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            (this.sdkInstallId = t),
            (this.logger = h.r.Instance),
            (this.telemetry = u.H.Instance),
            Object.values(le).includes(e) ||
              this.logger.throw(
                `Invalid http environment provided: ${e}`,
                c.ws.InvalidArgument
              ),
            (this.domainName = he.replace(de, e)),
            (this.domainNameWithPrefix = ue.replace(de, e)),
            i &&
              Object.entries(i).forEach(([e, t]) => {
                var i;
                return null === (i = this.headers) || void 0 === i
                  ? void 0
                  : i.append(e, t);
              }));
        }
        clone() {
          const e = new me(le.Default, this.sdkInstallId);
          return (
            (e.domainName = this.domainName),
            (e.domainNameWithPrefix = this.domainNameWithPrefix),
            this.headers.forEach((t, i) => e.headers.append(i, t)),
            e
          );
        }
        setDomain(e, t = !1) {
          e.includes('://') || (e = `https://${e}`);
          const i = new RegExp(
            '^https:\\/\\/(([a-zA-Z0-9]{1,30})\\.)*[\\-a-zA-Z]+\\.xboxlive\\.com$'
          );
          (t ||
            i.test(e) ||
            this.logger.throw(
              `Invalid domain name provided: ${e}`,
              c.ws.InvalidServicesDomain
            ),
            this.logger.info(
              `EndpointSettings replacing domain ${this.domainName} with new domain ${e}`
            ));
          const n = i.exec(e),
            s =
              3 === (null === n || void 0 === n ? void 0 : n.length)
                ? n[2]
                : '';
          (this.telemetry.trackEvent({
            event: u.X.ServicesDomainChanged,
            oldDomain: this.domainName,
            newDomain: e,
            region: s,
          }),
            (this.domainName = e));
        }
        getDomain() {
          return this.domainName;
        }
        getDomainWithPrefix(e) {
          return ge.test(e)
            ? this.domainNameWithPrefix.replace(ce, e)
            : (this.logger.error(`Invalid DNS prefix provided: ${e}`),
              this.domainName);
        }
        getDomainForAuth(e, t) {
          if (e === y.AzureFrontDoor)
            return t ? this.getDomainWithPrefix(t) : this.getDomain();
          if (e === y.AzureTrafficManager)
            return this.getDomainWithPrefix('atm');
          throw new Error(`Unhandled AuthRoutingService type specified: ${e}`);
        }
        getHeaders() {
          return this.headers;
        }
        getSdkInstallId() {
          return this.sdkInstallId;
        }
      }
      const pe = (e) => {
          switch (e) {
            case C.w.Stereo:
              return 'Stereo';
            case C.w.Mono:
              return 'Mono';
            default:
              return h.r.Instance.throw(
                `Unknown audio mode: ${e}`,
                c.ws.InvalidArgument
              );
          }
        },
        ve = (e) =>
          e === D.P.WebRTCV1
            ? 'V3;WebrtcTransport.dll'
            : h.r.Instance.throw(
                `Unknown stream type: ${e}`,
                c.ws.InvalidArgument
              );
      var Se;
      !(function (e) {
        ((e[(e.Release = 0)] = 'Release'), (e[(e.Next = 1)] = 'Next'));
      })(Se || (Se = {}));
      const fe = (e) => {
          switch (e) {
            case Se.Release:
              return 'Release';
            case Se.Next:
              return 'Next';
            default:
              return h.r.Instance.throw(
                `Unknown release channel: ${e}`,
                c.ws.InvalidArgument
              );
          }
        },
        ye = (e) =>
          e === D.P.WebRTCV1
            ? 'WebRTCV1'
            : h.r.Instance.throw(
                `Unknown streamType: ${e}`,
                c.ws.InvalidArgument
              ),
        we = (e) => {
          switch (e) {
            case B.PerfTrackerProfile.Default:
              return 'Default';
            case B.PerfTrackerProfile.LowerMaxBufferLimit:
              return 'LowerMaxBufferLimit';
            case B.PerfTrackerProfile.DirectCapture30FPS:
              return 'DirectCapture30FPS';
            default:
              return h.r.Instance.throw(
                `Unknown perfTrackerProfile: ${e}`,
                c.ws.InvalidArgument
              );
          }
        };
      var Ce,
        Te = i(84048);
      !(function (e) {
        ((e[(e.Closed = 0)] = 'Closed'),
          (e[(e.Inactive = 1)] = 'Inactive'),
          (e[(e.Obscured = 2)] = 'Obscured'),
          (e[(e.Visible = 3)] = 'Visible'),
          (e[(e.Active = 4)] = 'Active'));
      })(Ce || (Ce = {}));
      (i(31759),
        i(84915),
        i(75604),
        i(41532),
        i(32950),
        i(73599),
        i(64770),
        i(62080),
        i(97012),
        i(31274),
        i(29548),
        i(47342),
        i(14825),
        i(92467),
        i(67497),
        i(88236));
      var be,
        ke = i(48227),
        Ie = i(20938),
        Ae = i(38216);
      class xe {
        constructor() {
          (r()(this, 'scope', '/streaming/debug/messages'),
            r()(this, 'logger', void 0),
            (this.logger = h.r.Instance));
        }
        onMessage(e, t) {
          const i = JSON.parse(t);
          this.logger.log(i.logLevel, `Game Sent : ${i.message}`);
        }
        onTransaction(e, t, i) {
          (this.logger.verbose(`Received transaction message ${t}`),
            i.complete(''));
        }
      }
      class Ee {
        constructor(e, t) {
          (r()(this, 'playClient', void 0),
            r()(this, 'userSession', void 0),
            r()(this, 'logger', void 0),
            r()(this, 'isShutdown', !1),
            r()(this, 'instanceId', ++Ee.instances),
            (this.playClient = e),
            (this.userSession = t),
            (this.logger = new h.r(
              'StreamConnectionSignaler',
              `(${this.instanceId})`
            )));
        }
        async sdpExchange(e) {
          const t = { Data: e };
          await this.playClient.sendSdp(
            this.userSession.user,
            this.userSession.endpointSettings,
            this.userSession.sessionPath,
            t
          );
          const i = await this.continueWithSdpPolling(),
            n = (0, m.A)(i);
          return (
            this.logger.info(`Received Sdp response ${n}`),
            null !== n && void 0 !== n ? n : ''
          );
        }
        async iceExchange(e) {
          const t = { Data: e };
          await this.playClient.sendIce(
            this.userSession.user,
            this.userSession.endpointSettings,
            this.userSession.sessionPath,
            t
          );
          const i = (await this.continueWithIcePolling()).map((e) =>
            (0, m.A)(e)
          );
          return (
            this.logger.info(`Received Ice response ${(0, m.A)(i)}`),
            null !== i && void 0 !== i ? i : ''
          );
        }
        shutdown() {
          this.isShutdown = !0;
        }
        async continueWithSdpPolling() {
          this.logger.info('Polling for Sdp response...');
          const e = await this.playClient.getSdp(
            this.userSession.user,
            this.userSession.endpointSettings,
            this.userSession.sessionPath
          );
          return (
            e ||
            new Promise((e, t) => {
              this.isShutdown
                ? this.logger.rejectWithWarning(
                    'Sdp polling shut down.',
                    c.ws.Cancelled,
                    t
                  )
                : setTimeout(() => {
                    e(this.continueWithSdpPolling());
                  }, 100);
            })
          );
        }
        async continueWithIcePolling() {
          this.logger.info('Polling for Ice response...');
          const e = await this.playClient.getIce(
            this.userSession.user,
            this.userSession.endpointSettings,
            this.userSession.sessionPath
          );
          return (
            e ||
            new Promise((e, t) => {
              this.isShutdown
                ? this.logger.rejectWithWarning(
                    'Ice polling shut down.',
                    c.ws.Cancelled,
                    t
                  )
                : setTimeout(() => {
                    e(this.continueWithIcePolling());
                  }, 100);
            })
          );
        }
      }
      (r()(Ee, 'instances', 0),
        (function (e) {
          ((e[(e.Landscape = 0)] = 'Landscape'),
            (e[(e.Portrait = 1)] = 'Portrait'));
        })(be || (be = {})));
      i(86741);
      class Me {
        constructor(e) {
          var t;
          (r()(this, 'orientation', void 0),
            r()(this, 'handler', void 0),
            r()(this, 'onScreenOrientationChanged', () => {
              const e = this.getScreenOrientation();
              e !== this.orientation &&
                ((this.orientation = e), this.handler(this.orientation));
            }),
            r()(this, 'onWindowOrientationChanged', () => {
              const e = this.getWindowOrientation();
              e !== this.orientation &&
                ((this.orientation = e), this.handler(this.orientation));
            }),
            (this.handler = e),
            null !== (t = window.screen) &&
            void 0 !== t &&
            t.orientation &&
            'onchange' in window.screen.orientation
              ? (window.screen.orientation.addEventListener(
                  'change',
                  this.onScreenOrientationChanged
                ),
                (this.orientation = this.getScreenOrientation()))
              : 'onorientationchange' in window &&
                (window.addEventListener(
                  'orientationchange',
                  this.onWindowOrientationChanged
                ),
                (this.orientation = this.getWindowOrientation())),
            void 0 !== this.orientation && this.handler(this.orientation));
        }
        stop() {
          var e;
          null !== (e = window.screen) &&
          void 0 !== e &&
          e.orientation &&
          'onchange' in window.screen.orientation
            ? window.screen.orientation.removeEventListener(
                'change',
                this.onScreenOrientationChanged
              )
            : 'onorientationchange' in window &&
              window.removeEventListener(
                'orientationchange',
                this.onWindowOrientationChanged
              );
        }
        getScreenOrientation() {
          return window.screen.orientation.type.startsWith('portrait')
            ? be.Portrait
            : be.Landscape;
        }
        getWindowOrientation() {
          return 0 === window.orientation || 180 === window.orientation
            ? be.Portrait
            : be.Landscape;
        }
      }
      i(93510);
      const Pe = '/streaming/prototypes/stateshare/',
        De = `${Pe}ShowShareDialog`,
        Re = `${Pe}activate`,
        Le = '/streaming/systemUi/messages/',
        Fe = `${Le}ShowApplication`,
        Ne = `${Le}ShowMessageDialog`,
        Ue = `${Le}ShowPurchase`,
        $e = `${Le}ShowVirtualKeyboard`,
        Ve = `${Le}ShowTimerExtension`,
        Be = `${Le}ShowFeedback`,
        Ge = `${Le}ShowMicrophoneSettings`,
        He = `${Le}ToggleMute`,
        Oe = `${Le}ShowPrivilegeBlocked`,
        Ke = `${Le}ShowSendInvites`,
        qe = `${Le}ShowStateShare`,
        _e = `${Le}ShowPeoplePicker`,
        Xe = `${Le}ShowLaunchParty`,
        We = `${Le}__ShowShareDialog`,
        ze = `${Le}ShowGameTimeNotification`;
      class Ye {
        constructor(e, t) {
          (r()(this, 'handler', void 0),
            r()(this, 'systemUiAdapter', void 0),
            r()(this, 'scope', Pe),
            r()(this, 'logger', h.r.Instance),
            (this.handler = e),
            (this.systemUiAdapter = t));
        }
        onMessage(e, t) {
          if (this.systemUiAdapter && this.handler)
            try {
              let i, n;
              switch (e) {
                case De: {
                  const e = JSON.parse(t),
                    s = this.handler.createEncapsulatedStateShareUrl(e);
                  i = We;
                  const o = { Url: s, Title: e.title, Text: e.description };
                  n = JSON.stringify(o);
                  break;
                }
                default:
                  this.logger.warning(
                    `Wrong state share message ${t} received from target ${e}`
                  );
              }
              i && n && this.systemUiAdapter.onMessage(i, n);
            } catch (i) {
              this.logger.error(
                `Failed to handle state share message ${t} for target ${e}: ${(0, m.A)(i)}`
              );
            }
        }
        onTransaction(e, t, i) {
          if (this.systemUiAdapter)
            try {
              e.substr(this.scope.length);
              this.logger.warning(
                `Wrong state share message ${t} received from target ${e}`
              );
            } catch (n) {
              this.logger.error(
                `Failed to handle state share message ${t} for target ${e}: ${(0, m.A)(n)}`
              );
            }
        }
      }
      var je, Qe, Je;
      (!(function (e) {
        ((e[(e.ShowSendInvites = 8)] = 'ShowSendInvites'),
          (e[(e.ShowVirtualKeyboard = 10)] = 'ShowVirtualKeyboard'),
          (e[(e.ShowPeoplePicker = 13)] = 'ShowPeoplePicker'),
          (e[(e.ShowLaunchParty = 15)] = 'ShowLaunchParty'),
          (e[(e.ShowMessageDialog = 19)] = 'ShowMessageDialog'),
          (e[(e.ShowPurchase = 27)] = 'ShowPurchase'),
          (e[(e.ShowApplication = 31)] = 'ShowApplication'),
          (e[(e.ShowTimerExtension = 32)] = 'ShowTimerExtension'),
          (e[(e.BlockGuide = 33)] = 'BlockGuide'),
          (e[(e.ShowFeedback = 37)] = 'ShowFeedback'),
          (e[(e.ShowMicrophoneSettings = 38)] = 'ShowMicrophoneSettings'),
          (e[(e.ToggleMute = 39)] = 'ToggleMute'),
          (e[(e.ShowPrivilegeBlockedAddFriend = 40)] =
            'ShowPrivilegeBlockedAddFriend'),
          (e[(e.ShowPrivilegeBlockedMultiplayer = 41)] =
            'ShowPrivilegeBlockedMultiplayer'),
          (e[(e.ShowGameTimeNotification = 42)] = 'ShowGameTimeNotification'),
          (e[(e.ShowStateShare = 43)] = 'ShowStateShare'),
          (e[(e.ShowUpgradeLightweightUser = 44)] =
            'ShowUpgradeLightweightUser'),
          (e[(e.ShowPrivilegeBlocked = -43)] = 'ShowPrivilegeBlocked'),
          (e[(e.ShowShareDialog = -44)] = 'ShowShareDialog'));
      })(je || (je = {})),
        (function (e) {
          ((e[(e.Default = 0)] = 'Default'),
            (e[(e.Url = 1)] = 'Url'),
            (e[(e.EmailSmtpAddress = 5)] = 'EmailSmtpAddress'),
            (e[(e.Number = 29)] = 'Number'),
            (e[(e.Password = 31)] = 'Password'),
            (e[(e.TelephoneNumber = 32)] = 'TelephoneNumber'),
            (e[(e.Search = 50)] = 'Search'));
        })(Qe || (Qe = {})),
        (function (e) {
          ((e[(e.None = 0)] = 'None'),
            (e[(e.AcceptUserInputAfterDelay = 1)] =
              'AcceptUserInputAfterDelay'));
        })(Je || (Je = {})));
      const Ze = (e) => {
        switch (e) {
          case Fe:
            return je.ShowApplication;
          case Ne:
            return je.ShowMessageDialog;
          case Ue:
            return je.ShowPurchase;
          case $e:
            return je.ShowVirtualKeyboard;
          case Ve:
            return je.ShowTimerExtension;
          case Be:
            return je.ShowFeedback;
          case Ge:
            return je.ShowMicrophoneSettings;
          case He:
            return je.ToggleMute;
          case We:
            return je.ShowShareDialog;
          case Oe:
            return je.ShowPrivilegeBlocked;
          case Ke:
            return je.ShowSendInvites;
          case qe:
            return je.ShowStateShare;
          case _e:
            return je.ShowPeoplePicker;
          case Xe:
            return je.ShowLaunchParty;
          case ze:
            return je.ShowGameTimeNotification;
          default:
            return h.r.Instance.throw('Unknown system ui type', c.ws.NotFound);
        }
      };
      class et {
        constructor(e) {
          (r()(this, 'scope', Le),
            r()(this, 'systemUiHandler', void 0),
            r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            (this.systemUiHandler = e),
            (this.logger = h.r.Instance),
            (this.telemetry = u.H.Instance));
        }
        onMessage(e, t) {
          try {
            const i = Ze(e),
              n = (0, Ie.A)();
            (this.logger.info(
              `Received system ui for target ${e} with message: ${t} and id ${(0, m.A)(n)}`
            ),
              this.systemUiHandler.onShowSystemUi({
                id: n,
                message: t,
                type: i,
                cancel: () => {
                  this.telemetry.trackEvent({
                    event: u.X.SystemUiCancel,
                    systemUiType: je[i],
                  });
                },
                complete: (e) => {
                  this.telemetry.trackEvent({
                    event: u.X.SystemUiCompleted,
                    systemUiType: je[i],
                  });
                },
              }),
              this.telemetry.trackEvent({
                event: u.X.SystemUiShow,
                systemUiType: je[i],
              }));
          } catch (i) {
            this.logger.error(
              `Failed to show system ui for target ${e}: ${(0, m.A)(i)}`
            );
          }
        }
        onTransaction(e, t, i) {
          try {
            const n = Ze(e),
              s = (0, Ie.A)();
            (this.logger.info(
              `Received system ui transaction for target ${e} with message: ${t} and id ${(0, m.A)(s)}`
            ),
              i.setOnRemoteCancellation(() => {
                try {
                  (this.telemetry.trackEvent({
                    event: u.X.SystemUiRemoteCancellation,
                    systemUiType: je[n],
                  }),
                    this.systemUiHandler.onHideSystemUi({ id: s, type: n }));
                } catch (e) {
                  this.logger.error(
                    `Error when trying to hide system ui ${n} with id ${s}: ${(0, m.A)(e)}`
                  );
                }
              }),
              this.systemUiHandler.onShowSystemUi({
                id: s,
                message: t,
                type: n,
                cancel: () => {
                  (this.telemetry.trackEvent({
                    event: u.X.SystemUiCancel,
                    systemUiType: je[n],
                  }),
                    i.cancel());
                },
                complete: (e) => {
                  (this.telemetry.trackEvent({
                    event: u.X.SystemUiCompleted,
                    systemUiType: je[n],
                  }),
                    i.complete(e));
                },
              }),
              this.telemetry.trackEvent({
                event: u.X.SystemUiShow,
                systemUiType: je[n],
              }));
          } catch (n) {
            (this.logger.error(
              `Failed to show system ui for target ${e}: ${(0, m.A)(n)}`
            ),
              i.cancel());
          }
        }
      }
      function tt(e, t, i, n) {
        if (!(t in e))
          return (
            h.r.Instance.error(
              `The message for target '${n}' is missing the '${t}' field.`
            ),
            u.H.Instance.trackEvent({
              event: u.X.MessageMissingField,
              target: n,
              field: t,
            }),
            !1
          );
        if (typeof e[t] !== i) {
          const s = typeof e[t];
          return (
            h.r.Instance.error(
              `The message for target '${n}' has a type mismatch of the '${t}' field. The expected type is '${i}' but was '${s}.'`
            ),
            u.H.Instance.trackEvent({
              event: u.X.MessageMismatchFieldType,
              target: n,
              field: t,
              expectedType: i,
              actualType: s,
            }),
            !1
          );
        }
        return !0;
      }
      class it {
        constructor(e) {
          (r()(this, 'scope', '/streaming/touchcontrols'),
            r()(this, 'touchControlHandler', void 0),
            r()(this, 'logger', void 0),
            (this.touchControlHandler = e),
            (this.logger = h.r.Instance));
        }
        onMessage(e, t) {
          if (this.touchControlHandler)
            try {
              switch (e.substr(this.scope.length)) {
                case '/hide':
                  this.touchControlHandler.onHideTouchControls();
                  break;
                case '/patchstate': {
                  const i = JSON.parse(t);
                  if (!tt(i, 'patch', 'string', e)) return;
                  this.touchControlHandler.onUpdateTouchControlState({
                    patch: i.patch,
                  });
                  break;
                }
                case '/showlayout':
                  this.touchControlHandler.onShowTouchControlLayoutV2({
                    layout: t,
                  });
                  break;
                case '/showlayoutv2': {
                  const i = JSON.parse(t);
                  if (!tt(i, 'layoutId', 'string', e)) return;
                  this.touchControlHandler.onShowTouchControlLayoutV2({
                    layout: i.layoutId,
                    patch: i.patch,
                  });
                  break;
                }
                case '/showtitledefault':
                  this.touchControlHandler.onShowTitleDefaultLayout();
                  break;
                default:
                  this.logger.warning(
                    `Wrong touch control message ${t} received from target ${e}`
                  );
              }
            } catch (i) {
              this.logger.error(
                `Failed to handle touch control message ${t} for target ${e}: ${(0, m.A)(i)}`
              );
            }
        }
        onTransaction(e, t, i) {
          (this.logger.info(
            `Canceled touch control transaction message ${t} for target ${e} because transactions are not expected.`
          ),
            i.cancel());
        }
      }
      function nt(e) {
        return (
          e instanceof HTMLVideoElement &&
          'function' === typeof e.msGetVideoProcessingTypes
        );
      }
      class st {
        constructor(e) {
          (r()(this, 'throttleDurationSeconds', void 0),
            r()(this, 'lastUnthrottledTimestamp', void 0),
            (this.throttleDurationSeconds = e));
        }
        shouldThrottleStrictly() {
          const e = Date.now();
          if (!this.lastUnthrottledTimestamp)
            return ((this.lastUnthrottledTimestamp = e), !1);
          const t = 1e3 * this.throttleDurationSeconds;
          return (
            !(e - this.lastUnthrottledTimestamp >= t) ||
            ((this.lastUnthrottledTimestamp = e), !1)
          );
        }
      }
      class ot {
        constructor(e, t) {
          (r()(this, 'eventThresholdSeconds', void 0),
            r()(this, 'throttler', void 0),
            r()(this, 'eventThresholdMet', !1),
            (this.eventThresholdSeconds = t),
            (this.throttler = new st(e)));
        }
        shouldEmitEvent(e) {
          return (
            !this.eventThresholdMet &&
            (e <= this.eventThresholdSeconds
              ? ((this.eventThresholdMet = !0), !0)
              : !this.throttler.shouldThrottleStrictly())
          );
        }
      }
      class rt extends l.EventEmitter {
        constructor(e, t) {
          (super(),
            r()(this, 'userSession', void 0),
            r()(this, 'timerHandle', void 0),
            r()(this, 'playClient', void 0),
            r()(this, 'disconnectEventThrottler', void 0),
            (this.playClient = e),
            (this.userSession = t),
            (this.disconnectEventThrottler = new ot(900, 180)),
            this.userSession.correlationVector.increment(),
            this.start());
        }
        start() {
          this.stop();
          const e = 1e3 * this.userSession.keepAlivePulseInSeconds;
          this.timerHandle = window.setInterval(() => {
            this.heartBeatSession();
          }, e);
        }
        stop() {
          this.timerHandle &&
            (window.clearInterval(this.timerHandle),
            (this.timerHandle = void 0));
        }
        sendServiceShutdown() {
          return (
            this.stop(),
            this.playClient.deleteSession(
              this.userSession.user,
              this.userSession.endpointSettings,
              this.userSession.sessionPath
            )
          );
        }
        async heartBeatSession() {
          try {
            const e = await this.playClient.sendSessionKeepAlive(
              this.userSession.user,
              this.userSession.endpointSettings,
              this.userSession.sessionPath
            );
            e.reason &&
              e.aliveSeconds &&
              this.disconnectEventThrottler.shouldEmitEvent(e.aliveSeconds) &&
              this.emit('sessionDisconnectWarning', {
                reason: e.reason,
                timeUntilDisconnectSeconds: e.aliveSeconds,
              });
          } catch (e) {
            if (e instanceof d.F)
              switch (e.code) {
                case c.ws.NotFound:
                case c.ws.Gone:
                  return (
                    h.r.Instance.warning(
                      'Session is gone. Stopping Keep Alive Heart'
                    ),
                    void this.stop()
                  );
              }
            h.r.Instance.warning(
              `heartBeatSession error detected, but will continue retrying ${e}`
            );
          }
        }
      }
      class at {
        constructor() {
          (r()(this, 'controlChannel', null),
            r()(this, 'inputChannel', null),
            r()(this, 'logger', h.r.Instance),
            r()(this, 'queuedGamepadConnections', new Set()),
            r()(this, 'inputFeedbackHandler', void 0));
        }
        start(e, t) {
          var i;
          ((this.controlChannel = e),
            (this.inputChannel = t),
            this.queuedGamepadConnections.forEach((e) => {
              this.sendGamepadChangedMessage(e, !0);
            }),
            this.queuedGamepadConnections.clear(),
            null === (i = this.inputChannel) ||
              void 0 === i ||
              i.setInputFeedbackHandler(this.inputFeedbackHandler));
        }
        onGamepadChanged(e, t) {
          if (!this.controlChannel)
            return (
              this.logger.warning(
                'Received gamepad changed event without a control channel to report it on.'
              ),
              void (t
                ? this.queuedGamepadConnections.add(e)
                : this.queuedGamepadConnections.delete(e))
            );
          this.sendGamepadChangedMessage(e, t);
        }
        onGamepadInput(e, t) {
          var i;
          null === (i = this.inputChannel) ||
            void 0 === i ||
            i.sendGamepadInput(e, t);
        }
        onKeyboardInput(e) {
          var t;
          null === (t = this.inputChannel) ||
            void 0 === t ||
            t.sendKeyboardInput(e);
        }
        onPointerInput(e, t) {
          var i;
          null === (i = this.inputChannel) ||
            void 0 === i ||
            i.queuePointerInput(e, [t]);
        }
        onMouseInput(e) {
          var t;
          null === (t = this.inputChannel) ||
            void 0 === t ||
            t.queueMouseInput(e);
        }
        onSensorInput(e) {
          var t;
          null === (t = this.inputChannel) ||
            void 0 === t ||
            t.sendSensorInput(e);
        }
        sendGamepadChangedMessage(e, t) {
          var i, n;
          (this.logger.info(
            `Sending gamepad changed; index:${e} wasAdded: ${t}.`
          ),
            null === (i = this.controlChannel) ||
              void 0 === i ||
              i.sendGamepadChangedMessage(e, t),
            null === (n = this.inputChannel) ||
              void 0 === n ||
              n.updateGamepads(e, t));
        }
        onFlushMetadataRequest() {
          var e;
          null === (e = this.inputChannel) || void 0 === e || e.sendMetadata();
        }
        setInputFeedbackHandler(e) {
          var t;
          ((this.inputFeedbackHandler = e),
            null === (t = this.inputChannel) ||
              void 0 === t ||
              t.setInputFeedbackHandler(e));
        }
        syncLockKeysState(e) {
          var t;
          null === (t = this.inputChannel) ||
            void 0 === t ||
            t.syncLockKeysState(e);
        }
      }
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
                  const i = n[0].substring(
                      0,
                      n[0].length - e.toString().length
                    ),
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
              (this.inputSink.onGamepadChanged(0, i),
                this.gamepadStates.delete(0));
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
                          (s = (o = this.nexusButtonHandler)
                            .onNexusLongPress) ||
                          void 0 === s ||
                          s.call(o);
                    } else
                      ((this.firstNexusPressDownTimestampMs = t),
                        null ===
                          (r = (a = this.nexusButtonHandler).onNexusDown) ||
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
                      null ===
                        (c = (h = this.nexusButtonHandler).onNexusPress) ||
                        void 0 === c ||
                        c.call(h);
                    this.firstNexusPressDownTimestampMs = void 0;
                  }
                this.areGamepadMappingsEqual(i.lastGamepadMapping, n) ||
                  ((n.Dirty = !0),
                  this.copyGamepadMapping(n, i.lastGamepadMapping));
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
      class dt extends l.EventEmitter {
        constructor(e, t, i = !0) {
          (super(),
            r()(this, 'inputSource', void 0),
            r()(this, 'inputSink', void 0),
            r()(this, 'sendGamepadInput', void 0),
            r()(this, 'connectedGamepads', void 0),
            (this.inputSource = e),
            (this.inputSink = t),
            (this.sendGamepadInput = i),
            (this.inputSource = e),
            (this.inputSink = t),
            (this.sendGamepadInput = i),
            (this.connectedGamepads = new Set()));
        }
        start(e, t) {
          this.inputSink.start(e, t);
        }
        onGamepadChanged(e, t) {
          (this.inputSink.onGamepadChanged(this.inputSource, e, t),
            t
              ? this.connectedGamepads.add(e)
              : (this.connectedGamepads.delete(e),
                0 === this.connectedGamepads.size &&
                  this.emit('physicalGamepadDisconnect', {})));
        }
        onGamepadInput(e, t) {
          this.inputSink.onGamepadInput(
            this.inputSource,
            e,
            t,
            this.sendGamepadInput
          );
          let i = !1;
          for (const n of t)
            if (!n.Virtual && n.Dirty) {
              i = !0;
              break;
            }
          i && this.emit('physicalGamepadInput', {});
        }
        onKeyboardInput(e) {
          this.inputSink.onKeyboardInput(e);
        }
        onPointerInput(e, t) {
          this.inputSink.onPointerInput(this.inputSource, e, t);
        }
        onMouseInput(e) {
          this.inputSink.onMouseInput(e);
        }
        onSensorInput(e) {
          this.inputSink.onSensorInput(e);
        }
        onFlushMetadataRequest() {
          this.inputSink.onFlushMetadataRequest();
        }
        setInputFeedbackHandler(e) {
          this.inputSink.setInputFeedbackHandler(this.inputSource, e);
        }
        syncLockKeysState(e) {
          this.inputSink.syncLockKeysState(e);
        }
      }
      var ct = i(43245);
      class ht extends l.EventEmitter {
        get configuration() {
          return this._configuration;
        }
        get connectionState() {
          return this._connectionState;
        }
        get isShutdown() {
          return null != this._shutdownTime;
        }
        get initialConnectionTime() {
          var e;
          return null !== (e = this._initialConnectionTime) && void 0 !== e
            ? e
            : void 0;
        }
        get connectionType() {
          return this._connectionType;
        }
        get shutdownTime() {
          var e;
          return null !== (e = this._shutdownTime) && void 0 !== e ? e : void 0;
        }
        get microphoneState() {
          return this._microphoneState;
        }
        get paused() {
          return this._paused;
        }
        get duration() {
          return null == this._initialConnectionTime
            ? NaN
            : null == this._shutdownTime
              ? Date.now() - this._initialConnectionTime.getTime()
              : this._shutdownTime.getTime() -
                this._initialConnectionTime.getTime();
        }
        get isPlayStreamGestureRequired() {
          var e;
          return (
            !1 !== this.configuration.options.requestPlayStreamGesture &&
            ((null === (e = this.stream) || void 0 === e
              ? void 0
              : e.isPlayStreamGestureRequired) ||
              this.isPlayStreamGestureRequiredByAudioContext)
          );
        }
        get isPlayStreamGestureRequiredByAudioContext() {
          return ['suspended', 'interrupted'].includes(this.audioContext.state);
        }
        get videoWidth() {
          return this._videoWidth;
        }
        get videoHeight() {
          return this._videoHeight;
        }
        get streamGameTimeData() {
          return this._gameTimeData;
        }
        get additionalContextForGame() {
          return this._additionalContextForGame;
        }
        constructor(e, t, i, n, o, a, l, d) {
          (super(),
            r()(this, 'cv', void 0),
            r()(this, '_configuration', void 0),
            r()(this, 'serverInfo', void 0),
            r()(this, 'instanceId', ++ht.instances),
            r()(this, 'logger', void 0),
            r()(this, '_connectionState', ct.g$.Disconnected),
            r()(this, 'sourceManagedInputSink', null),
            r()(this, 'physicalInputSink', null),
            r()(this, 'messageChannel', null),
            r()(this, 'chatManager', null),
            r()(this, 'audioContext', void 0),
            r()(this, 'userSession', void 0),
            r()(this, 'playClient', void 0),
            r()(this, 'stream', null),
            r()(this, 'orientationListener', null),
            r()(this, 'streamType', void 0),
            r()(this, 'sessionHeartBeat', null),
            r()(this, 'measurementElement', null),
            r()(this, 'renderTargetResizeObserver', null),
            r()(this, '_initialConnectionTime', null),
            r()(this, '_shutdownTime', null),
            r()(this, 'containerElement', void 0),
            r()(this, 'isTryReconnectInProgress', !1),
            r()(this, '_microphoneState', ct.EO.Muted),
            r()(this, 'deviceInformation', void 0),
            r()(this, 'streamStats', null),
            r()(this, '_connectionType', void 0),
            r()(this, 'telemetryContext', void 0),
            r()(this, '_renderTargetWidth', 0),
            r()(this, '_renderTargetHeight', 0),
            r()(this, '_videoWidth', 0),
            r()(this, '_videoHeight', 0),
            r()(this, '_debounceTimeoutId', void 0),
            r()(this, '_paused', !1),
            r()(this, 'kickedByNewSession', !1),
            r()(this, '_gameTimeData', null),
            r()(this, '_additionalContextForGame', null),
            r()(this, 'tryEnableChatAsync', async (e) => {
              var t, i;
              e
                ? await (null === (t = this.chatManager) || void 0 === t
                    ? void 0
                    : t.enable())
                : null === (i = this.chatManager) ||
                  void 0 === i ||
                  i.disable();
            }),
            r()(this, 'expectedDisconnectReason', void 0),
            r()(this, 'expectedDisconnectErrorCode', void 0),
            r()(this, 'setMicrophoneState', (e) => {
              switch (((this._microphoneState = e), e)) {
                case ct.EO.Enabled:
                  u.H.Instance.trackEvent(
                    s()(
                      { event: u.X.MicrophoneEnable },
                      this.telemetryContext.getProps(this.cv)
                    )
                  );
                  break;
                case ct.EO.Muted:
                case ct.EO.NotAllowed:
                case ct.EO.NotFound:
                  u.H.Instance.trackEvent(
                    s()(
                      { event: u.X.MicrophoneDisable, reason: e },
                      this.telemetryContext.getProps(this.cv)
                    )
                  );
              }
              this.emit('microphoneStateChanged', {});
            }),
            r()(this, 'onStreamDisconnectThenReconnect', () => {
              this.expectedDisconnectReason
                ? (this.logger.info('StreamSession transport disconnected.'),
                  this.doDisconnect())
                : this.tryReconnect();
            }),
            r()(this, 'queueDimensionsMessage', () => {
              (this._debounceTimeoutId && clearTimeout(this._debounceTimeoutId),
                (this._debounceTimeoutId = setTimeout(() => {
                  this.sendDimensionsMessage();
                }, 300)));
            }),
            r()(this, 'onPhysicalGamepadDisconnect', () => {
              this.emit('physicalGamepadDisconnect', {});
            }),
            r()(this, 'onPhysicalGamepadInput', () => {
              this.emit('physicalGamepadInput', {});
            }),
            r()(this, 'logStreamDisconnected', () => {
              this.logger.info('Old StreamSession transport disconnected.');
            }),
            r()(this, 'onStreamQualityLevelChanged', (e) => {
              this.emit('sessionQualityLevelChanged', {
                session: this,
                level: e.level,
              });
            }),
            r()(this, 'onVideoMediaStreamChanged', (e) => {
              this.emit('videoMediaStreamChanged', e);
            }),
            r()(this, 'onNetworkQualityIndicatorEventReceived', (e) => {
              this.emit('networkQualityIndicatorUpdate', e);
            }),
            r()(this, 'onStreamStatsEventReceived', (e) => {
              this.emit('streamStatsUpdate', e);
            }),
            r()(this, 'onAudioMediaStreamChanged', (e) => {
              this.emit('audioMediaStreamChanged', e);
            }),
            r()(this, 'onVideoResized', () => {
              this.updateDimensions();
            }),
            r()(this, 'emitPlayStreamGestureRequiredChangedEvent', () => {
              const { isPlayStreamGestureRequired: e } = this;
              this.emit('playStreamGestureRequiredChanged', {
                isPlayStreamGestureRequired: e,
              });
            }),
            r()(this, 'sendPartyChatConfigurationMessage', async (e) => {
              if (!this.messageChannel)
                return void this.logger.warning(
                  'Could not send a party chat configuration message because the message channel does not exist.'
                );
              this.logger.info('Sending party chat configuration message');
              const t = await this.messageChannel.sendTransaction(
                  '/streaming/social/partyChatAudioCoordination/setPartyChatActive',
                  (0, m.A)({ partyChatActive: !e })
                ),
                i = JSON.parse(t);
              'Error' === i.status
                ? this.logger.throw(
                    'Server indicates an error when we sent a party chat configuration message',
                    i.code
                  )
                : this.logger.verbose(
                    'Successfully sent party chat configuration message.'
                  );
            }),
            r()(this, 'onCursorChanged', (e) => {
              const t = JSON.parse(e);
              this.emit('cursorChanged', { cursor: t.cursor });
            }),
            (this.cv = i),
            (this._configuration = e),
            (this.serverInfo = t),
            (this.streamType = n),
            (this._connectionType = o),
            (this.audioContext = a),
            (this.telemetryContext = l),
            (this.logger = new h.r('StreamSession', `(${this.instanceId})`)),
            this.logger.info(
              'StreamSession created.',
              (0, m.A)(Ae.A.browserDetails.version),
              (0, m.A)(this.serverInfo)
            ),
            (this.deviceInformation =
              null !== d && void 0 !== d ? d : new ke.P6()));
        }
        getMessageChannel() {
          return this.messageChannel;
        }
        getSessionTelemetryProperties() {
          return this.telemetryContext.getProps(this.cv);
        }
        getControlChannel() {
          var e, t;
          return null !==
            (e =
              null === (t = this.stream) || void 0 === t
                ? void 0
                : t.getControlChannel()) && void 0 !== e
            ? e
            : null;
        }
        setPlayClient(e) {
          this.playClient = e;
        }
        setUserSession(e) {
          this.userSession = e;
        }
        async connectAsync(e) {
          (this.isShutdown &&
            this.logger.throw(
              'StreamSession already shutdown.',
              c.ws.InvalidState
            ),
            this._connectionState !== ct.g$.Disconnected &&
              this.logger.throw(
                'Disconnect the StreamSession before trying to connect.',
                c.ws.BadConfiguration
              ));
          'blocked' === this.deviceInformation.capabilities.streamReadiness
            ? ((this.expectedDisconnectReason = ct.RS.BrowserUnsupported),
              this.doDisconnect(),
              this.logger.throw(
                'Disconnected due to incompatible browser',
                c.ws.Unsupported
              ))
            : this.logger.info('Valid browser detected');
          (this.playClient &&
            this.userSession &&
            ((this.sessionHeartBeat = new rt(
              this.playClient,
              this.userSession
            )),
            this.sessionHeartBeat.addListener(
              'sessionDisconnectWarning',
              (e) => {
                this.emit('sessionDisconnectWarning', e);
              }
            )),
            (this.measurementElement = document.createElement('div')),
            (this.measurementElement.style.position = 'fixed'),
            (this.measurementElement.style.top = '0'),
            (this.measurementElement.style.left = '0'),
            (this.measurementElement.style.width = '1cm'),
            (this.measurementElement.style.height = '1cm'),
            (this.measurementElement.style.visibility = 'hidden'),
            (this.measurementElement.style.pointerEvents = 'none'),
            e.appendChild(this.measurementElement));
          try {
            (await this.doConnectAsync(e),
              this.emitPlayStreamGestureRequiredChangedEvent());
          } catch (t) {
            const e = (0, g.g)(t);
            throw (
              this.logger.error(`Failed to connect to stream: ${(0, m.A)(e)}`),
              (this.expectedDisconnectReason = ct.RS.ConnectingFailed),
              e.message.includes('timed out')
                ? (this.expectedDisconnectErrorCode = c.ws.Timeout)
                : (this.expectedDisconnectErrorCode = c.ws.Unknown),
              this.doDisconnect(),
              e
            );
          }
        }
        async doConnectAsync(e, t = !1) {
          var n, o, r, a;
          const l = Date.now();
          if (
            (null === (n = this.stream) ||
              void 0 === n ||
              n.addListener('streamDisconnected', this.logStreamDisconnected),
            null === (o = this.stream) || void 0 === o || o.shutdown(),
            this.streamType === D.P.WebRTCV1)
          ) {
            this.configuration.options.releaseChannel !== Se.Release &&
              this.logger.warning(
                `Unknown release channel for WebRtcStreamV1. Release Channel: ${this.configuration.options.releaseChannel}`
              );
            const { WebRtcStreamV1: e } = await Promise.all([
                i.e(6488),
                i.e(3638),
              ]).then(i.bind(i, 49856)),
              t =
                this.playClient && this.userSession
                  ? new Ee(this.playClient, this.userSession)
                  : void 0;
            this.stream = new e(
              this.serverInfo,
              this.cv.extend(),
              this.deviceInformation,
              this.audioContext,
              this.configuration.inputConfiguration,
              this.configuration.videoConfiguration,
              this.configuration.audioConfiguration,
              this.configuration.networkConfiguration,
              this.configuration.nqiConfiguration,
              this.configuration.statisticsConfiguration,
              t
            );
          } else
            this.logger.throw(
              `Unknown stream type: ${this.streamType}`,
              c.ws.InvalidArgument
            );
          (this.stream.addListener(
            'videoMediaStreamChanged',
            this.onVideoMediaStreamChanged
          ),
            this.stream.addListener(
              'audioMediaStreamChanged',
              this.onAudioMediaStreamChanged
            ),
            this.stream.addListener(
              'streamDisconnected',
              this.onStreamDisconnectThenReconnect
            ),
            this.stream.addListener(
              'streamQualityLevelChanged',
              this.onStreamQualityLevelChanged
            ),
            this.stream.addListener('videoResized', this.onVideoResized),
            this.stream.addListener(
              'playStreamGestureRequiredChanged',
              this.emitPlayStreamGestureRequiredChangedEvent
            ),
            this.stream.addListener(
              'networkQualityIndicatorUpdate',
              this.onNetworkQualityIndicatorEventReceived
            ),
            this.stream.addListener(
              'streamStatsUpdate',
              this.onStreamStatsEventReceived
            ),
            (this.sourceManagedInputSink = new lt(
              new at(),
              this.configuration.nexusButtonHandler
            )),
            (this.physicalInputSink = new dt(
              'physical',
              this.sourceManagedInputSink,
              !0
            )),
            this.physicalInputSink.addListener(
              'physicalGamepadDisconnect',
              this.onPhysicalGamepadDisconnect
            ),
            this.physicalInputSink.addListener(
              'physicalGamepadInput',
              this.onPhysicalGamepadInput
            ),
            this.connectionState !== ct.g$.Reconnecting &&
              this.setConnectionState(ct.g$.Connecting));
          const d = new et(this.configuration.systemUiHandler),
            h = [
              d,
              new ht.ServerInitiatedDisconnectHandler(this),
              new ht.TitleInfoHandler(this),
              new it(this.configuration.touchControlHandler),
              new Ye(this.configuration.stateSharePrototypeHandler, d),
              new ht.GameTimeHandler(this),
              new ht.AdditionalContextForGameHandler(this),
            ];
          (this._configuration.options.enableDebugMessageHandler &&
            h.push(new xe()),
            this.configuration.inputConfiguration.enableAbsoluteMouse &&
              h.push(new ht.MouseModeAdapter(this)),
            await this.stream.connectAsync(e, this.physicalInputSink, h),
            (this.containerElement = e));
          (null === (r = this.stream.getControlChannel()) ||
            void 0 === r ||
            r.sendAuthorizationMessage('4BDB3609-C1F1-4195-9B37-FEFF45DA8B8E'),
            (this.messageChannel = this.stream.getMessageChannel()),
            this.messageChannel
              ? this.messageChannel.setOnReady(() => {
                  var e, t, i, n;
                  const s = {
                    version: [0, 2, 0],
                    systemUis:
                      this.configuration.systemUiHandler.getSupportedSystemUis(),
                  };
                  (this.logger.info('Sending system ui configuration message'),
                    null === (e = this.messageChannel) ||
                      void 0 === e ||
                      e.sendMessage('/streaming/systemUi/configuration', s));
                  const o = { clientAppInstallId: this.getOrCreateUniqueId() };
                  (null === (t = this.messageChannel) ||
                    void 0 === t ||
                    t.sendMessage(
                      '/streaming/properties/clientappinstallidchanged',
                      o
                    ),
                    (this.orientationListener = new Me((e) => {
                      const t = { orientation: e };
                      try {
                        var i;
                        null === (i = this.messageChannel) ||
                          void 0 === i ||
                          i.sendMessage(
                            '/streaming/characteristics/orientationchanged',
                            t
                          );
                      } catch (n) {
                        this.logger.warning(
                          `Error sending orientation change through message channel. Error: ${n}`
                        );
                      }
                    })),
                    this.sendTouchInputEnabledMessage(
                      this.configuration.inputConfiguration.enableTouchInput
                    ));
                  const r =
                    null === (i = this.stream) || void 0 === i
                      ? void 0
                      : i.getRenderTarget();
                  (r
                    ? ((this.renderTargetResizeObserver = new ResizeObserver(
                        (e) => {
                          this.updateDimensions();
                        }
                      )),
                      this.renderTargetResizeObserver.observe(r),
                      this.updateDimensions(!0, !0))
                    : this.logger.warning(
                        'Unable to listen for resize events because no render target was returned'
                      ),
                    this.sendClientDeviceCapabilitiesMessage(
                      this.configuration.clientDeviceCapabilities
                    ));
                  (null === (n = this.messageChannel) ||
                    void 0 === n ||
                    null ===
                      (n = n.sendTransaction('/streaming/title/constrain', {
                        constrain: !1,
                      })) ||
                    void 0 === n ||
                    n.catch((e) => {
                      this.logger.error(
                        `Error un-constraining title on connect: ${(0, m.A)(e)}`
                      );
                    }),
                    null !=
                      this._configuration.audioConfiguration.enableGameChat &&
                      this.sendPartyChatConfigurationMessage(
                        this._configuration.audioConfiguration.enableGameChat
                      ).catch((e) => {
                        const t = (0, g.g)(e);
                        this.logger.warning(
                          `Error when sending party chat configuration message: ${(0, m.A)(t)}`
                        );
                      }),
                    this.sendAbsoluteMouseCapableMessage(
                      this.configuration.inputConfiguration.enableAbsoluteMouse
                    ));
                })
              : this.logger.warning(
                  'Message channel does not exist on stream.'
                ),
            (this.chatManager = this.stream.getChatManager()),
            null === (a = this.chatManager) ||
              void 0 === a ||
              a.setUpdateMicrophoneState(this.setMicrophoneState),
            this.chatManager
              ? this.configuration.audioConfiguration.enableMicrophone &&
                (await this.tryEnableChatAsync(!0))
              : this.logger.warning('Chat channel does not exist on stream.'),
            u.H.Instance.trackEvent(
              s()(
                {
                  event: u.X.SessionConnect,
                  durationInMs: Date.now() - l,
                  isRetry: t,
                },
                this.telemetryContext.getProps(this.cv)
              )
            ),
            this.logger.info('Successfully connected.'),
            this.setConnectionState(ct.g$.Connected),
            null == this._initialConnectionTime &&
              (this._initialConnectionTime = new Date()),
            (this.streamStats = new U(
              this.stream,
              this.configuration.statisticsConfiguration,
              this.telemetryContext,
              this.cv
            )),
            this.streamStats.startAudioVideoStatsCollection(),
            this.emitPlayStreamGestureRequiredChangedEvent(),
            this.audioContext.addEventListener(
              'statechange',
              this.emitPlayStreamGestureRequiredChangedEvent
            ));
        }
        isRecoverableConnectionError(e) {
          if (e instanceof d.F) {
            const t = e;
            return (
              t.code == c.ws.NoNetwork ||
              t.code == c.ws.Failed ||
              t.code == c.ws.Timeout
            );
          }
          return !1;
        }
        async tryReconnect() {
          this.isTryReconnectInProgress ||
            (this.logger.info('Transport error; reconnecting...'),
            (this.isTryReconnectInProgress = !0),
            this.setConnectionState(ct.g$.Reconnecting),
            await this.tryReconnectInternal(),
            (this.isTryReconnectInProgress = !1));
        }
        async tryReconnectInternal() {
          for (let t = 0; t < 20; t++) {
            if (
              (await new Promise((e) => setTimeout(e, 1e3)),
              this._connectionState !== ct.g$.Reconnecting &&
                this._connectionState !== ct.g$.Connecting)
            ) {
              this.logger.info(
                `Aborting reconnect; connection state is ${this._connectionState}`
              );
              break;
            }
            try {
              if (this.containerElement)
                return (
                  u.H.Instance.trackEvent(
                    s()(
                      {
                        event: u.X.SessionReconnect,
                        retryAttempt: t + 1,
                        durationInMs: this.duration,
                      },
                      this.telemetryContext.getProps(this.cv)
                    )
                  ),
                  this.logger.info(`Reconnect attempt #${t + 1}`),
                  void (await this.doConnectAsync(this.containerElement, !0))
                );
              this.logger.info(
                `Reconnect cancelled; state: ${ct.g$.Reconnecting}.`
              );
            } catch (e) {
              const i = (0, g.g)(e);
              if (!this.isRecoverableConnectionError(i)) {
                this.logger.info(
                  `Reconnect attempt ${t + 1} failed: ${(0, m.A)(i)}; aborting.`
                );
                break;
              }
              this.logger.info(
                `Reconnect attempt ${t + 1} failed: ${(0, m.A)(i)}; retrying...`
              );
            }
          }
          this.expectedDisconnectReason ||
            ((this.expectedDisconnectReason = ct.RS.TransportError),
            (this.expectedDisconnectErrorCode = c.ws.NoNetwork),
            this.logger.info('Failed to reconnect.'),
            this.doDisconnect());
        }
        doDisconnect() {
          var e, t, i, n, o, r, a, l, d, h, g, m, p, v, S, f, y, w, C, T, b;
          (this.logger.info(
            `StreamSession disconnecting; reason:${this.expectedDisconnectReason}, errorCode:${this.expectedDisconnectErrorCode}`
          ),
            u.H.Instance.trackEvent(
              s()(
                {
                  event: u.X.SessionDisconnect,
                  durationInMs: this.duration,
                  disconnectReason:
                    null !== (e = this.expectedDisconnectReason) && void 0 !== e
                      ? e
                      : '',
                  disconnectErrorCode:
                    null !== (t = this.expectedDisconnectErrorCode) &&
                    void 0 !== t
                      ? t
                      : '',
                },
                this.telemetryContext.getProps(this.cv)
              )
            ),
            this.streamStats &&
              this.streamStats.collectionBegan &&
              this.streamStats.shouldFireDisconnectEvent() &&
              this.streamStats.sendStreamingStatisticsEvent(),
            this.audioContext.removeEventListener(
              'statechanged',
              this.emitPlayStreamGestureRequiredChangedEvent
            ),
            null === (i = this.physicalInputSink) ||
              void 0 === i ||
              i.removeListener(
                'physicalGamepadDisconnect',
                this.onPhysicalGamepadDisconnect
              ),
            null === (n = this.physicalInputSink) ||
              void 0 === n ||
              n.removeListener(
                'physicalGamepadInput',
                this.onPhysicalGamepadInput
              ),
            (this.physicalInputSink = null),
            null === (o = this.stream) ||
              void 0 === o ||
              o.removeListener(
                'streamDisconnected',
                this.logStreamDisconnected
              ),
            null === (r = this.stream) ||
              void 0 === r ||
              r.removeListener(
                'streamDisconnected',
                this.onStreamDisconnectThenReconnect
              ),
            null === (a = this.stream) ||
              void 0 === a ||
              a.removeListener(
                'streamQualityLevelChanged',
                this.onStreamQualityLevelChanged
              ),
            null === (l = this.stream) ||
              void 0 === l ||
              l.removeListener(
                'videoMediaStreamChanged',
                this.onVideoMediaStreamChanged
              ),
            null === (d = this.stream) ||
              void 0 === d ||
              d.removeListener(
                'audioMediaStreamChanged',
                this.onAudioMediaStreamChanged
              ),
            null === (h = this.stream) ||
              void 0 === h ||
              h.removeListener('videoResized', this.onVideoResized),
            null === (g = this.stream) ||
              void 0 === g ||
              g.removeListener(
                'playStreamGestureRequiredChanged',
                this.emitPlayStreamGestureRequiredChangedEvent
              ),
            null === (m = this.stream) ||
              void 0 === m ||
              m.removeListener(
                'networkQualityIndicatorUpdate',
                this.onNetworkQualityIndicatorEventReceived
              ),
            null === (p = this.stream) ||
              void 0 === p ||
              p.removeListener(
                'streamStatsUpdate',
                this.onStreamStatsEventReceived
              ),
            null === (v = this.sessionHeartBeat) ||
              void 0 === v ||
              v.removeAllListeners('sessionDisconnectWarning'),
            (this.containerElement = void 0),
            null === (S = this.renderTargetResizeObserver) ||
              void 0 === S ||
              S.disconnect(),
            (this.renderTargetResizeObserver = null),
            null === (f = this.orientationListener) || void 0 === f || f.stop(),
            (this.orientationListener = null),
            null === (y = this.streamStats) || void 0 === y || y.shutdown(),
            null === (w = this.stream) || void 0 === w || w.shutdown(),
            (this.stream = null),
            null === (C = this.sessionHeartBeat) || void 0 === C || C.stop(),
            (this.messageChannel = null),
            (this.chatManager = null),
            [this.measurementElement].forEach((e) => {
              null != e && e.parentNode && e.parentNode.removeChild(e);
            }),
            (this.measurementElement = null),
            (this._gameTimeData = null),
            (this._additionalContextForGame = null),
            this.setConnectionState(ct.g$.Disconnected),
            this.emit('sessionDisconnected', {
              reason:
                null !== (T = this.expectedDisconnectReason) && void 0 !== T
                  ? T
                  : ct.RS.TransportError,
              errorCode:
                null !== (b = this.expectedDisconnectErrorCode) && void 0 !== b
                  ? b
                  : c.ws.Failed,
            }),
            (this.expectedDisconnectReason = void 0),
            (this.expectedDisconnectErrorCode = void 0));
        }
        disconnect() {
          ((this.expectedDisconnectReason = ct.RS.CleanDisconnect),
            (this.expectedDisconnectErrorCode = c.ws.Success),
            this.logger.info('StreamSession disconnect().'),
            this.doDisconnect());
        }
        shutdown() {
          if (
            (this._debounceTimeoutId && clearTimeout(this._debounceTimeoutId),
            this.isShutdown)
          )
            this.logger.warning('StreamSession already shutdown.');
          else {
            var e, t;
            if (
              ('closed' !== this.audioContext.state &&
                this.audioContext.close(),
              (this.expectedDisconnectReason = ct.RS.CleanShutdown),
              (this.expectedDisconnectErrorCode = c.ws.Success),
              this.logger.info('StreamSession shutdown().'),
              this.doDisconnect(),
              this.kickedByNewSession)
            )
              (null === (e = this.sessionHeartBeat) || void 0 === e || e.stop(),
                (this.kickedByNewSession = !1));
            else
              null === (t = this.sessionHeartBeat) ||
                void 0 === t ||
                t.sendServiceShutdown();
            ((this.sessionHeartBeat = null),
              (this._shutdownTime = new Date()),
              u.H.Instance.trackEvent(
                s()(
                  { event: u.X.SessionShutdown, durationInMs: this.duration },
                  this.telemetryContext.getProps(this.cv)
                )
              ));
          }
        }
        pause() {
          var e;
          if (
            ((this._paused = !0),
            null === (e = this.stream) ||
              void 0 === e ||
              e.pauseInputProcessing(),
            this.setCollectStatisticsState(
              !this._paused,
              ht.StreamSessionPauseSourceName
            ),
            this._configuration.options.constrainTitleOnPause &&
              this._connectionState === ct.g$.Connected)
          ) {
            var t;
            const e = { constrain: !0 };
            null === (t = this.messageChannel) ||
              void 0 === t ||
              t.sendTransaction('/streaming/title/constrain', e).catch((e) => {
                this._connectionState === ct.g$.Connected
                  ? this.logger.error(
                      `Error constraining title on pause: ${(0, m.A)(e)}`
                    )
                  : this.logger.verbose(
                      `[${this._connectionState}] Ignoring expected error constraining title on pause: ${(0, m.A)(e)}`
                    );
              });
          }
        }
        resume() {
          var e;
          if (
            ((this._paused = !1),
            null === (e = this.stream) ||
              void 0 === e ||
              e.resumeInputProcessing(),
            this.setCollectStatisticsState(
              !this._paused,
              ht.StreamSessionPauseSourceName
            ),
            this._configuration.options.constrainTitleOnPause &&
              this._connectionState === ct.g$.Connected)
          ) {
            var t;
            const e = { constrain: !1 };
            null === (t = this.messageChannel) ||
              void 0 === t ||
              t.sendTransaction('/streaming/title/constrain', e).catch((e) => {
                this._connectionState === ct.g$.Connected
                  ? this.logger.error(
                      `Error un-constraining title on resume: ${(0, m.A)(e)}`
                    )
                  : this.logger.verbose(
                      `[${this._connectionState}] Ignoring expected error un-constraining title on resume: ${(0, m.A)(e)}`
                    );
              });
          }
        }
        releaseHeldMouseButtonsAndKeyboardKeys() {
          var e;
          null === (e = this.stream) ||
            void 0 === e ||
            e.releaseHeldMouseButtonsAndKeyboardKeys();
        }
        setMouseManagerPointerEventHandler(e) {
          var t;
          null === (t = this.stream) ||
            void 0 === t ||
            t.setMouseManagerPointerEventHandler(e);
        }
        setServerRequestedCursorStyle(e) {
          var t;
          null === (t = this.stream) ||
            void 0 === t ||
            t.setServerRequestedCursorStyle(e);
        }
        updateSessionConfigurationOptions(e) {
          this.setConfiguration({
            options: s()(s()({}, this._configuration.options), e),
          });
        }
        async updateAudioConfigurationAsync(e) {
          const t = this._configuration.audioConfiguration,
            i = s()(s()({}, t), e);
          try {
            var n;
            (this.setConfiguration({ audioConfiguration: i }),
              await (null === (n = this.stream) || void 0 === n
                ? void 0
                : n.updateAudioConfiguration(i)),
              null != i.enableMicrophone &&
                t.enableMicrophone !== i.enableMicrophone &&
                (await this.tryEnableChatAsync(i.enableMicrophone)),
              null != i.enableGameChat &&
                t.enableGameChat !== i.enableGameChat &&
                (await this.sendPartyChatConfigurationMessage(
                  i.enableGameChat
                )));
          } catch (o) {
            throw (
              this.setConfiguration({ audioConfiguration: t }),
              this.logger.error(
                `Updating audio configuration failed: ${(0, m.A)(o)}`
              ),
              o
            );
          }
        }
        async updateInputConfigurationAsync(e) {
          const t = this._configuration.inputConfiguration,
            i = s()(s()({}, t), e);
          try {
            var n;
            (this.setConfiguration({ inputConfiguration: i }),
              null === (n = this.stream) ||
                void 0 === n ||
                n.updateInputConfiguration(i),
              t.enableTouchInput !== i.enableTouchInput &&
                this.sendTouchInputEnabledMessage(i.enableTouchInput),
              t.enableAbsoluteMouse !== i.enableAbsoluteMouse &&
                this.sendAbsoluteMouseCapableMessage(i.enableAbsoluteMouse));
          } catch (o) {
            throw (this.setConfiguration({ inputConfiguration: t }), o);
          }
        }
        async updateVideoConfigurationAsync(e) {
          const t = this._configuration.videoConfiguration,
            i = s()(s()({}, t), e);
          try {
            var n, o;
            (this.setConfiguration({ videoConfiguration: i }),
              null === (n = this.stream) ||
                void 0 === n ||
                n.updateVideoConfiguration(i));
            const e =
              null === (o = this.stream) || void 0 === o
                ? void 0
                : o.getRenderTarget();
            (nt(e) &&
              (i.videoProcessingAttribute
                ? (e.msVideoProcessing = i.videoProcessingAttribute)
                : (e.msVideoProcessing = void 0)),
              H(t.safeAreaInsets, i.safeAreaInsets) ||
                this.queueDimensionsMessage(),
              u.H.Instance.trackEvent(
                s()(
                  { event: u.X.VideoConfigurationUpdated, configuration: i },
                  this.telemetryContext.getProps(this.cv)
                )
              ));
          } catch (r) {
            throw (this.setConfiguration({ videoConfiguration: t }), r);
          }
        }
        async updateClientDeviceCapabilitiesAsync(e) {
          const t = this._configuration.clientDeviceCapabilities,
            i = s()(s()({}, t), e);
          try {
            this.setConfiguration({ clientDeviceCapabilities: i });
            (t.maxTouchBundleLayoutVersion !== i.maxTouchBundleLayoutVersion ||
              t.maxTouchBundleManifestVersion !==
                i.maxTouchBundleManifestVersion) &&
              this.sendClientDeviceCapabilitiesMessage(i);
          } catch (n) {
            throw (this.setConfiguration({ clientDeviceCapabilities: t }), n);
          }
        }
        getCorrelationVector() {
          return this.cv;
        }
        getOrCreateUniqueId() {
          const e = 'Microsoft.GameStreaming.UniqueId',
            t = localStorage.getItem(e);
          if (null !== t) return t;
          const i = (0, Ie.A)().toString();
          try {
            localStorage.setItem(e, i);
          } catch (n) {}
          return i;
        }
        setCollectStatisticsState(e, t) {
          var i, n;
          e
            ? null === (i = this.streamStats) ||
              void 0 === i ||
              i.removePause(t)
            : null === (n = this.streamStats) || void 0 === n || n.addPause(t);
        }
        async fileABug(e, t) {
          if (
            (this.logger.info('executing StreamSession.fileABug()'),
            this.userSession && this.playClient)
          ) {
            this.logger.info(
              'StreamSession.fileABug() - Found userSession and playClient'
            );
            const n = this.userSession;
            try {
              return (
                await this.playClient.sendSessionFileABug(
                  n.user,
                  n.sessionPath,
                  { alias: e, description: t }
                ),
                this.logger.info('StreamSession.fileABug() was successful'),
                !0
              );
            } catch (i) {
              const e = (0, g.g)(i);
              return (
                this.logger.error(
                  `StreamSession.fileABug() failed - ${e.message}`
                ),
                !1
              );
            }
          }
          return (
            this.logger.warning(
              'StreamSession.fileABug() failed - userSession or playClient was undefined'
            ),
            !1
          );
        }
        async acceptGameInviteAsync(e, t) {
          (this.logger.info(
            `Accept Game Invite for titleId: ${e}, invite type: ${t.type}`
          ),
            this.messageChannel ||
              this.logger.throw(
                'Unable to accept game invite; is the stream connected?',
                c.ws.InvalidState
              ),
            u.H.Instance.trackEvent(
              s()(
                {
                  event: u.X.GameInviteAccepted,
                  requestedTitleId: e,
                  inviteType: t.type,
                },
                this.telemetryContext.getProps(this.cv)
              )
            ));
          let i = '',
            n = '';
          switch (t.type) {
            case ct.if.Invite:
              ((i = '/streaming/social/acceptGameInvite'),
                (n = (0, m.A)({ invitePayload: t.jsonPayload })));
              break;
            case ct.if.Join:
              ((i = '/streaming/social/joinGameSession'),
                (n = (0, m.A)({ joinPayload: t.jsonPayload })));
              break;
            case ct.if.TitleActivation:
              ((i = '/streaming/social/rawActivation'),
                (n = (0, m.A)({ activationUri: t.jsonPayload })));
          }
          await this.messageChannel.sendTransaction(i, n);
        }
        async sendStateSharePrototypeAsync(e) {
          (this.logger.info(
            `Sending debug state share data for productId: ${e.productId}`,
            e.payload
          ),
            this.messageChannel ||
              this.logger.throw(
                'Unable to send state share data; is the stream connected?',
                c.ws.InvalidState
              ),
            u.H.Instance.trackEvent(
              s()(
                {
                  event: u.X.StateSharePrototypeInitiated,
                  shareProductId: e.productId,
                  shareTitle: e.title,
                  shareCreator: e.creator,
                },
                this.telemetryContext.getProps(this.cv)
              )
            ),
            this.messageChannel.sendMessage(Re, (0, m.A)(e)));
        }
        async acceptStateShareAsync(e) {
          (this.logger.info('Accept state share'),
            this.messageChannel ||
              this.logger.throw(
                'Unable to accept state share; is the stream connected?',
                c.ws.InvalidState
              ));
          const t = (0, m.A)(e);
          this.messageChannel.sendTransaction(
            '/streaming/social/acceptStateShare',
            (0, m.A)({ stateSharePayload: t })
          );
        }
        sendKeepAlive() {
          var e, t;
          (
            null === (e = this.stream) || void 0 === e
              ? void 0
              : e.getInputChannel()
          )
            ? (this.onVirtualGamepadChanged('keepalive', 0, !0),
              null === (t = this.sourceManagedInputSink) ||
                void 0 === t ||
                t.sendKeepAliveGamepadInput(),
              this.onVirtualGamepadChanged('keepalive', 0, !1))
            : this.logger.warning(
                'Failed to send keep alive, presumably the stream is gone'
              );
        }
        getSupportedVideoProcessingAttributes() {
          var e;
          const t =
            null === (e = this.stream) || void 0 === e
              ? void 0
              : e.getRenderTarget();
          return nt(t) ? t.msGetVideoProcessingTypes() : [];
        }
        sendTouchInputEnabledMessage(e) {
          var t;
          const i = { touchInputEnabled: null !== e && void 0 !== e && e };
          null === (t = this.messageChannel) ||
            void 0 === t ||
            t.queueMessage(
              '/streaming/characteristics/touchinputenabledchanged',
              i
            );
        }
        sendClientDeviceCapabilitiesMessage(e) {
          var t;
          const i = {};
          (e.maxTouchBundleLayoutVersion &&
            e.maxTouchBundleManifestVersion &&
            ((i.maxTouchBundleLayoutVersion = e.maxTouchBundleLayoutVersion),
            (i.maxTouchBundleManifestVersion =
              e.maxTouchBundleManifestVersion)),
            null === (t = this.messageChannel) ||
              void 0 === t ||
              t.queueMessage(
                '/streaming/characteristics/clientdevicecapabilities',
                i
              ));
        }
        sendAbsoluteMouseCapableMessage(e) {
          var t;
          e &&
            (null === (t = this.messageChannel) ||
              void 0 === t ||
              t.queueMessage(
                '/streaming/mouse/clientAbsoluteMouseCapable',
                {}
              ));
        }
        calculateVideoDimensionsFromRenderTargetDimensions(e, t) {
          var i;
          const n =
            null === (i = this.stream) || void 0 === i
              ? void 0
              : i.getAspectRatio();
          return n && isFinite(n)
            ? e / n <= t
              ? { width: e, height: e / n }
              : { width: t * n, height: t }
            : { width: e, height: t };
        }
        updateDimensions(e = !1, t = !1) {
          var i;
          const n =
            null === (i = this.stream) || void 0 === i
              ? void 0
              : i.getRenderTarget();
          if (n) {
            const { width: i, height: s } =
              this.calculateVideoDimensionsFromRenderTargetDimensions(
                n.scrollWidth,
                n.scrollHeight
              );
            (t ||
              this._renderTargetWidth !== n.scrollWidth ||
              this._renderTargetHeight !== n.scrollHeight ||
              this._videoWidth !== i ||
              this._videoHeight !== s) &&
              ((this._renderTargetWidth = n.scrollWidth),
              (this._renderTargetHeight = n.scrollHeight),
              (this._videoWidth = i),
              (this._videoHeight = s),
              this.emit('videoResized', { width: i, height: s }),
              e
                ? (this._debounceTimeoutId &&
                    (clearTimeout(this._debounceTimeoutId),
                    (this._debounceTimeoutId = void 0)),
                  this.sendDimensionsMessage())
                : this.queueDimensionsMessage());
          }
        }
        sendDimensionsMessage() {
          var e, t, i, n, s, o, r, a;
          if (!this.messageChannel)
            return void this.logger.warning(
              'Unable to publish dimensions - Cannot acquire a reference to the message channel'
            );
          const l = Math.trunc(
              (this._videoWidth / this.measurementElement.scrollWidth) * 10
            ),
            h = Math.trunc(
              (this._videoHeight / this.measurementElement.scrollHeight) * 10
            );
          if (isNaN(h) || isNaN(l))
            return void this.logger.error(
              'Unable to calculate video height or width in millimeters - Aborting publish'
            );
          const u = window.devicePixelRatio,
            g = Math.round(this._renderTargetWidth * u),
            m = Math.round(this._renderTargetHeight * window.devicePixelRatio),
            p = Math.round(
              (null !==
                (e =
                  null ===
                    (t =
                      this.configuration.videoConfiguration.safeAreaInsets) ||
                  void 0 === t
                    ? void 0
                    : t.left) && void 0 !== e
                ? e
                : 0) * window.devicePixelRatio
            ),
            v = Math.round(
              (null !==
                (i =
                  null ===
                    (n =
                      this.configuration.videoConfiguration.safeAreaInsets) ||
                  void 0 === n
                    ? void 0
                    : n.top) && void 0 !== i
                ? i
                : 0) * window.devicePixelRatio
            ),
            S = Math.round(
              (null !==
                (s =
                  null ===
                    (o =
                      this.configuration.videoConfiguration.safeAreaInsets) ||
                  void 0 === o
                    ? void 0
                    : o.right) && void 0 !== s
                ? s
                : 0) * window.devicePixelRatio
            ),
            f = Math.round(
              (null !==
                (r =
                  null ===
                    (a =
                      this.configuration.videoConfiguration.safeAreaInsets) ||
                  void 0 === a
                    ? void 0
                    : a.bottom) && void 0 !== r
                ? r
                : 0) * window.devicePixelRatio
            ),
            y = Math.min(g, Math.max(0, p)),
            w = Math.min(m, Math.max(0, v)),
            C = Math.max(y, Math.min(g, g - S)),
            T = Math.max(w, Math.min(m, m - f));
          try {
            this.messageChannel.sendMessage(
              '/streaming/characteristics/dimensionschanged',
              {
                horizontal: l,
                vertical: h,
                preferredWidth: g,
                preferredHeight: m,
                safeAreaLeft: y,
                safeAreaTop: w,
                safeAreaRight: C,
                safeAreaBottom: T,
                supportsCustomResolution: !0,
              }
            );
          } catch (b) {
            if (!(b instanceof d.F && b.code == c.ws.InvalidState)) throw b;
            this.logger.verbose(
              `Error sending a 'dimensionschanged' message. Stream State = ${this._connectionState}`
            );
          }
        }
        setConnectionState(e) {
          this._connectionState !== e &&
            ((this._connectionState = e),
            this.emit('sessionConnectionStateChanged', { state: e }));
        }
        setConfiguration(e) {
          ((this._configuration = s()(s()({}, this.configuration), e)),
            this.emit('sessionConfigurationChanged', {
              configuration: this._configuration,
            }));
        }
        onServerDisconnectMessage(e) {
          const t = JSON.parse(e);
          let i;
          !(function (e) {
            ((e.KickByNewSession = 'KickByNewSession'),
              (e.KickForClosedGame = 'KickForClosedGame'),
              (e.KickForBeingIdle = 'KickForBeingIdle'),
              (e.KickForSignOut = 'KickForSignOut'),
              (e.KickForServerShutdown = 'KickForServerShutdown'),
              (e.KickForStopCommand = 'KickForStopCommand'),
              (e.KickForAppError = 'KickForAppError'),
              (e.KickForNoClientConnection = 'KickForNoClientConnection'),
              (e.KickForOutOfStreamingTime = 'KickForOutOfStreamingTime'),
              (e.WarningForBeingIdle = 'WarningForBeingIdle'));
          })(i || (i = {}));
          var n;
          if (
            new Map([
              [i.KickByNewSession, ct.RS.ServerKickByNewSession],
              [i.KickForClosedGame, ct.RS.ServerKickForClosedGame],
              [i.KickForBeingIdle, ct.RS.ServerKickForBeingIdle],
              [i.KickForSignOut, ct.RS.ServerKickForSignOut],
              [i.KickForServerShutdown, ct.RS.ServerKickForServerShutdown],
              [i.KickForStopCommand, ct.RS.ServerKickForStopCommand],
              [i.KickForAppError, ct.RS.ServerKickForAppError],
              [
                i.KickForNoClientConnection,
                ct.RS.ServerKickForNoClientConnection,
              ],
              [
                i.KickForOutOfStreamingTime,
                ct.RS.ServerKickForOutOfStreamingTime,
              ],
            ]).has(t.reason)
          )
            (h.r.Instance.info(
              `Server disconnect message::${t.reason}, ${t.hr}.`
            ),
              u.H.Instance.trackEvent(
                s()(
                  {
                    event: u.X.ServerInitiatedDisconnect,
                    reason: t.reason,
                    errorCode:
                      null !== (n = t.hr) && void 0 !== n ? n : c.ws.Unknown,
                  },
                  this.telemetryContext.getProps(this.cv)
                )
              ),
              (this.expectedDisconnectReason = t.reason),
              t.hr && (this.expectedDisconnectErrorCode = t.hr | 0),
              (this.kickedByNewSession =
                this.expectedDisconnectReason ===
                  ct.RS.ServerKickByNewSession ||
                this.expectedDisconnectErrorCode ===
                  c.ws.SessionResumedElsewhere),
              h.r.Instance.info(
                `Server disconnect message::${this.expectedDisconnectReason}, ${this.expectedDisconnectErrorCode}.`
              ),
              this.doDisconnect());
          else if ('WarningForBeingIdle' === t.reason) {
            var o, r;
            (h.r.Instance.info(
              `Warning for being idle; secondsUntilKick:${t.secondsUntilKick}`
            ),
              u.H.Instance.trackEvent(
                s()(
                  {
                    event: u.X.WarningForBeingIdle,
                    secondsUntilKick:
                      null !== (o = t.secondsUntilKick) && void 0 !== o ? o : 0,
                  },
                  this.telemetryContext.getProps(this.cv)
                )
              ),
              this.emit('sessionIdleWarning', {
                timeUntilDisconnectSeconds:
                  null !== (r = t.secondsUntilKick) && void 0 !== r ? r : 0,
              }));
          } else
            h.r.Instance.warning(
              `Unrecognized server-initiated disconnect reason: ${t.reason}`
            );
        }
        onGameTimeHandlerChanged(e) {
          try {
            const t = JSON.parse(e);
            (this._gameTimeData
              ? (this._gameTimeData = s()(
                  s()({}, this._gameTimeData),
                  {},
                  {
                    gameTimeLastUpdated: Date.now(),
                    gameTimeRemainingInSeconds: t.SecondsLeft,
                    isGameTimeActive: t.IsTimerActive,
                  }
                ))
              : (this._gameTimeData = {
                  gameTimeTotalInSeconds: t.SecondsLeft,
                  gameTimeRemainingInSeconds: t.SecondsLeft,
                  gameTimeLastUpdated: Date.now(),
                  isGameTimeActive: t.IsTimerActive,
                }),
              h.r.Instance.info(
                `GameTime changed: total time for session:${this._gameTimeData.gameTimeTotalInSeconds}, time left in session:${this._gameTimeData.gameTimeRemainingInSeconds}, last updated:${this._gameTimeData.gameTimeLastUpdated}.`
              ),
              this.emit('sessionGameTimeChanged', {
                gameTimeTotalInSeconds:
                  this._gameTimeData.gameTimeTotalInSeconds,
                gameTimeRemainingInSeconds:
                  this._gameTimeData.gameTimeRemainingInSeconds,
                gameTimeLastUpdated: this._gameTimeData.gameTimeLastUpdated,
                isGameTimeActive: this._gameTimeData.isGameTimeActive,
              }));
          } catch (t) {
            h.r.Instance.error(
              `Failed to parse game time message: ${(0, m.A)(t)}`
            );
          }
        }
        onAdditionalContextForGameChanged(e) {
          try {
            const t = JSON.parse(e);
            (null == t.AdditionalProperties ||
            ('object' === typeof t.AdditionalProperties &&
              null !== t.AdditionalProperties &&
              0 === Object.keys(t.AdditionalProperties).length)
              ? (this.logger.warning(
                  'Server did not provide the additional properties for this stream session. Clearing previous content.'
                ),
                (this._additionalContextForGame = null))
              : (h.r.Instance.info(
                  `Additional context for game changed: title id:${t.TitleId}, more properties:${t.AdditionalProperties}`
                ),
                (this._additionalContextForGame = t)),
              this.emit('sessionAdditionalContextForGameChanged', {
                additionalContextData: this._additionalContextForGame,
              }));
          } catch (t) {
            (h.r.Instance.error(
              `Failed to parse additional context message: ${(0, m.A)(t)}`
            ),
              (this._additionalContextForGame = null),
              this.emit('sessionAdditionalContextForGameChanged', {
                additionalContextData: null,
              }));
          }
        }
        onTitleInfoChanged(e) {
          const t = JSON.parse(e);
          (void 0 === t.state && (t.state = Ce.Active),
            void 0 === t.focused && (t.focused = !0));
          let i = parseInt(t.titleid, 16);
          (isNaN(i) && (i = 0),
            (t.titleid = i.toString()),
            h.r.Instance.info(
              `Title info changed: aumid:${t.titleaumid}, id:${t.titleid}, state:${t.state}, focused:${t.focused}.`
            ),
            u.H.Instance.trackEvent({
              event: u.X.StreamTitleChanged,
              cV: this.cv.getValue(),
              title: t.titleid,
            }),
            0 !== i &&
              null !== this._additionalContextForGame &&
              ((this._additionalContextForGame = null),
              this.emit('sessionAdditionalContextForGameChanged', {
                additionalContextData: null,
              })),
            this.emit('sessionTitleInfoChanged', {
              titleAumid: t.titleaumid,
              titleId: i,
              state: t.state,
              focused: t.focused,
            }));
        }
        startAudioVideoStatsCollection() {
          var e;
          this.stream &&
          this.streamStats &&
          null !== (e = this.stream) &&
          void 0 !== e &&
          e.isStatsCollectionSupported()
            ? this.streamStats.startAudioVideoStatsCollection()
            : this.logger.warning(
                "startAudioVideoStatsCollection() was called but the stream is not ready or doesn't support this method yet"
              );
        }
        getAllCollectedAudioVideoStats() {
          return this.streamStats && this.streamStats.collectionBegan
            ? this.streamStats.getAllCollectedAudioVideoStats()
            : [];
        }
        onVirtualGamepadChanged(e, t, i) {
          var n;
          null === (n = this.sourceManagedInputSink) ||
            void 0 === n ||
            n.onGamepadChanged(e, t, i);
        }
        onVirtualGamepadInput(e, t, i) {
          var n;
          const o = i.map((e) =>
            s()(
              s()({}, e),
              {},
              {
                LeftThumbYAxis: -e.LeftThumbYAxis,
                RightThumbYAxis: -e.RightThumbYAxis,
              }
            )
          );
          null === (n = this.sourceManagedInputSink) ||
            void 0 === n ||
            n.onGamepadInput(e, t, o, !0);
        }
        onPlayStreamGesture() {
          var e;
          (this.logger.info('[StreamSession] onPlayStreamGesture triggered'),
            null === (e = this.stream) ||
              void 0 === e ||
              e.onPlayStreamGesture(),
            this.isPlayStreamGestureRequiredByAudioContext
              ? this.audioContext.resume().catch((e) => {
                  this.logger.warning(
                    `Unable to resume AudioContext from the PlayStreamGestureRequiredChangedEvent callback - ${e.message}`
                  );
                })
              : this.logger.verbose(
                  'AudioContext does not require a user interaction - Skipping resume'
                ));
        }
        onVirtualPointerInput(e, t, i) {
          var n;
          null === (n = this.sourceManagedInputSink) ||
            void 0 === n ||
            n.onPointerInput(e, t, i);
        }
        onVirtualMouseInput(e) {
          var t;
          null === (t = this.sourceManagedInputSink) ||
            void 0 === t ||
            t.onMouseInput(e);
        }
      }
      (r()(ht, 'instances', 0),
        r()(ht, 'StreamSessionPauseSourceName', 'Stream Session State'),
        r()(
          ht,
          'GameTimeHandler',
          class {
            constructor(e) {
              (r()(this, 'streamSession', void 0),
                r()(
                  this,
                  'scope',
                  '/streaming/systemUi/messages/ShowGameTimeNotification'
                ),
                (this.streamSession = e));
            }
            onMessage(e, t) {
              try {
                (h.r.Instance.info(
                  `Received game time info-changed message: ${t}`
                ),
                  this.streamSession.onGameTimeHandlerChanged(t));
              } catch (i) {
                h.r.Instance.error(`Failed to process message: ${(0, m.A)(i)}`);
              }
            }
            onTransaction(e, t, i) {
              (h.r.Instance.warning(
                `Received unexpected server game time  transaction: ${t}`
              ),
                i.cancel());
            }
          }
        ),
        r()(
          ht,
          'AdditionalContextForGameHandler',
          class {
            constructor(e) {
              (r()(this, 'streamSession', void 0),
                r()(
                  this,
                  'scope',
                  '/streaming/systemUi/messages/ShowAdditionalContextForGame'
                ),
                (this.streamSession = e));
            }
            onMessage(e, t) {
              try {
                (h.r.Instance.info(
                  `Received additional context for game message: ${t}`
                ),
                  this.streamSession.onAdditionalContextForGameChanged(t));
              } catch (i) {
                h.r.Instance.error(`Failed to process message: ${(0, m.A)(i)}`);
              }
            }
            onTransaction(e, t, i) {
              (h.r.Instance.warning(
                `Received unexpected additional context transaction: ${t}`
              ),
                i.cancel());
            }
          }
        ),
        r()(
          ht,
          'TitleInfoHandler',
          class {
            constructor(e) {
              (r()(this, 'streamSession', void 0),
                r()(this, 'scope', '/streaming/properties/titleinfo'),
                (this.streamSession = e));
            }
            onMessage(e, t) {
              try {
                (h.r.Instance.info(`Received title info-changed message: ${t}`),
                  this.streamSession.onTitleInfoChanged(t));
              } catch (i) {
                h.r.Instance.error(`Failed to process message: ${(0, m.A)(i)}`);
              }
            }
            onTransaction(e, t, i) {
              (h.r.Instance.warning(
                `Received unexpected server title-changed transaction: ${t}`
              ),
                i.cancel());
            }
          }
        ),
        r()(
          ht,
          'ServerInitiatedDisconnectHandler',
          class {
            constructor(e) {
              (r()(this, 'streamSession', void 0),
                r()(
                  this,
                  'scope',
                  '/streaming/sessionLifetimeManagement/serverInitiatedDisconnect'
                ),
                (this.streamSession = e));
            }
            onMessage(e, t) {
              h.r.Instance.warning(
                `Received unexpected server disconnect message: ${t}`
              );
            }
            onTransaction(e, t, i) {
              try {
                h.r.Instance.info(`Received server disconnect message: ${t}`);
                try {
                  i.complete('');
                } catch (n) {}
                this.streamSession.onServerDisconnectMessage(t);
              } catch (s) {
                h.r.Instance.error(`Failed to process message: ${(0, m.A)(s)}`);
              }
            }
          }
        ),
        r()(
          ht,
          'MouseModeAdapter',
          class {
            constructor(e) {
              (r()(this, 'streamSession', void 0),
                r()(this, 'scope', '/streaming/mouse/cursor'),
                (this.streamSession = e));
            }
            onMessage(e, t) {
              try {
                (h.r.Instance.info(`Received mouse mode message: ${t}`),
                  this.streamSession.onCursorChanged(t));
              } catch (i) {
                h.r.Instance.error(`Failed to process message: ${(0, m.A)(i)}`);
              }
            }
            onTransaction(e, t, i) {
              (h.r.Instance.error(
                `Unexpected mouse mode transaction with message: ${t}`
              ),
                i.cancel());
            }
          }
        ));
      i(55367);
      const ut = { iceGatheringTimeoutMs: k.Bf },
        gt = (0, k.yy)(ut, {
          name: 'validateNetworkConfiguration',
          ignoreNullish: !0,
          throwErrors: !0,
        }),
        mt = {
          packetLossPercentageBadThreshold: k.Bf,
          pingMsBadThreshold: k.Bf,
          jitterMsBadThreshold: k.Bf,
          decodeMsBadThreshold: k.Bf,
          consecutiveBadIntervalsForTrigger: k.Bf,
          consecutiveGoodIntervalsForClear: k.Bf,
        },
        pt = (0, k.yy)(mt, {
          name: 'validateNetworkQualityIndicatorConfiguration',
          ignoreNullish: !0,
          throwErrors: !0,
        }),
        vt = [
          'options',
          'systemUiHandler',
          'touchControlHandler',
          'nexusButtonHandler',
          'clientDeviceCapabilities',
          'pollingConfiguration',
        ],
        St = -new Date().getTimezoneOffset();
      function ft(...e) {
        const t = {
          options: {
            directIpAddress: '',
            systemUpdateGroup: '',
            enableNarrator: !1,
            highContrastMode: z.Off,
            timezoneOffsetMinutes: St,
            iceLocalOnly: !1,
            releaseChannel: Se.Release,
            constrainTitleOnPause: !0,
            requestPlayStreamGesture: !0,
            enableOptionalDataCollection: void 0,
            enableDebugMessageHandler: !1,
          },
          audioConfiguration: { audioMode: C.w.Stereo },
          statisticsConfiguration: {},
          inputConfiguration: {
            enableGamepadInput: !0,
            sensorInputPollingRateInHz: 60,
          },
          videoConfiguration: {
            showStreamStatisticsOverlay: !1,
            emitStreamStatisticsSimplifiedEvent: !1,
            enableNetworkQualityIndicator: !1,
          },
          networkConfiguration: { iceGatheringTimeoutMs: 5e3 },
          systemUiHandler: {
            getSupportedSystemUis: () => [],
            onHideSystemUi: () => {},
            onShowSystemUi: () => {},
          },
          clientDeviceCapabilities: {},
          touchControlHandler: void 0,
          stateSharePrototypeHandler: void 0,
          nexusButtonHandler: void 0,
          pollingConfiguration: new x(!1),
          nqiConfiguration: {
            jitterMsBadThreshold: 20,
            packetLossPercentageBadThreshold: 1,
            pingMsBadThreshold: 80,
            decodeMsBadThreshold: 12,
            consecutiveBadIntervalsForTrigger: 5,
            consecutiveGoodIntervalsForClear: 5,
          },
        };
        return e.reduce(
          (e, t) => (
            Object.keys(e).forEach((i) => {
              void 0 !== t[i] &&
                (void 0 === e[i] ? (e[i] = t[i]) : Object.assign(e[i], t[i]));
            }),
            e
          ),
          t
        );
      }
      function yt(e) {
        var t;
        const i = ft(e);
        return (
          null === (t = i.options) || void 0 === t || delete t.directIpAddress,
          i
        );
      }
      const wt = {
          audioConfiguration: C.F,
          inputConfiguration: A,
          videoConfiguration: K,
          statisticsConfiguration: M,
          networkConfiguration: gt,
          nqiConfiguration: pt,
        },
        Ct = (() => {
          const e = (0, k.yy)(wt, {
            name: 'validateClientStreamingConfigOverrides',
            ignoreNullish: !0,
            throwErrors: !0,
          });
          return (t) => null == t || e(t);
        })();
      function Tt(e) {
        return e.isFireOS && !e.isSupportedTVBrowser ? 'android' : e.osName;
      }
      var bt;
      !(function (e) {
        ((e.CloudConsole = 'CloudConsole'),
          (e.PersonalConsole = 'PersonalConsole'),
          (e.ManagedDevkit = 'ManagedDevkit'),
          (e.Unknown = 'Unknown'));
      })(bt || (bt = {}));
      class kt {
        constructor(e, t, i, n, s) {
          (r()(this, 'sessionCv', void 0),
            r()(this, 'clientSessionId', void 0),
            r()(this, 'titleId', void 0),
            r()(this, 'serverType', void 0),
            r()(this, 'createTime', void 0),
            r()(this, 'connectionType', void 0),
            r()(this, 'sessionPath', ''),
            (this.sessionCv = e.getValue()),
            (this.titleId = i),
            (this.serverType = t),
            (this.createTime = Date.now()),
            (this.clientSessionId =
              null !== n && void 0 !== n ? n : T.W.makeBase()),
            (this.connectionType = s));
        }
        setSessionPath(e) {
          const t = new RegExp(
            '.*([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})'
          ).exec(e);
          this.sessionPath = t ? t[1] : e;
        }
        getProps(e) {
          var t;
          return {
            cV: e.getValue(),
            sessionCv: this.sessionCv,
            clientSessionId: this.clientSessionId,
            title: null !== (t = this.titleId) && void 0 !== t ? t : '',
            sessionId: this.sessionPath,
            timeSinceCreateMs: Date.now() - this.createTime,
            serverType: this.serverType,
            connectionType: this.connectionType,
          };
        }
        getClientSessionId() {
          return this.clientSessionId;
        }
      }
      var It;
      !(function (e) {
        ((e.NotStarted = 'Session.Request.NotStarted'),
          (e.Queued = 'Session.Request.Queued'),
          (e.Launching = 'Session.Request.Launching'),
          (e.Ready = 'Session.Request.Ready'),
          (e.Cancelled = 'Session.Request.Cancelled'));
      })(It || (It = {}));
      class At extends l.EventEmitter {
        get state() {
          return this._state;
        }
        get titleInfo() {
          return this._titleInfo;
        }
        constructor(e, t, i, n, s, o, a, l, d, c) {
          (super(),
            r()(this, 'cv', void 0),
            r()(this, 'configuration', void 0),
            r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            r()(this, 'user', void 0),
            r()(this, 'playClient', void 0),
            r()(this, 'locale', void 0),
            r()(this, 'streamType', void 0),
            r()(this, 'audioContext', void 0),
            r()(this, 'deviceInformation', void 0),
            r()(this, 'retryAttemptCount', void 0),
            r()(this, 'maxRetryPollingSessionsCount', 1),
            r()(this, 'waitTime', void 0),
            r()(this, 'inFlight', !1),
            r()(this, 'getTransferToken', void 0),
            r()(this, 'sessionPath', void 0),
            r()(this, 'endpointSettings', void 0),
            r()(this, 'instanceId', ++At.instances),
            r()(this, 'progressCallback', void 0),
            r()(this, 'telemetryContext', void 0),
            r()(this, '_state', It.NotStarted),
            r()(this, '_titleInfo', void 0),
            (this.configuration = e),
            (this.user = t),
            (this._titleInfo = c),
            (this.cv = i),
            (this.logger = new h.r(
              'StreamSessionRequest',
              `(${this.instanceId})`
            )),
            (this.telemetry = u.H.Instance),
            (this.playClient = n),
            (this.endpointSettings = t.endpointSettings.clone()),
            (this.locale = s),
            (this.streamType = o),
            (this.retryAttemptCount = 0),
            (this.telemetryContext = a),
            (this.getTransferToken = l),
            (this.deviceInformation = d));
        }
        async createSession(e, t) {
          try {
            ((this.progressCallback = e),
              this.inFlight &&
                this.logger.throw(
                  'StreamSessionRequest in use',
                  c.ws.InvalidState
                ));
            'blocked' === this.deviceInformation.capabilities.streamReadiness
              ? this.logger.throw(
                  'Disconnected due to incompatible browser',
                  c.ws.Unsupported
                )
              : this.logger.verbose('Valid browser detected');
            return (
              (this.inFlight = !0),
              (this.audioContext = t),
              await this.startProcessingRequest()
            );
          } catch (i) {
            throw (
              i instanceof d.F &&
                this.emit('sessionRequestFailed', { errorCode: i.code }),
              i
            );
          }
        }
        async continueWithPolling() {
          if (
            (this.sessionPath ||
              this.logger.throw(
                'Polling has invalid state, call createSession instead',
                c.ws.InvalidState
              ),
            this._state === It.Cancelled)
          )
            return new Promise((e, t) => {
              this.logger.rejectWithWarning(
                'StreamSessionRequest cancelled during polling',
                c.ws.Cancelled,
                t
              );
            });
          try {
            const e = await this.playClient.getState(
              this.user,
              this.endpointSettings,
              this.sessionPath,
              this.configuration.pollingConfiguration
            );
            this.retryAttemptCount = 0;
            const t = e.state;
            switch (
              (this.logger.info(`stateResponseState:${t}`),
              e.transferUri && this.endpointSettings.setDomain(e.transferUri),
              this.setState(t),
              t)
            ) {
              case _.ReadyToConnect:
                return this.continueWithSendingTransferToken();
              case _.WaitingForResources:
                return new Promise((e) => {
                  setTimeout(() => {
                    e(this.continueWithPolling());
                  }, this.configuration.pollingConfiguration.queuePollingIntervalMs);
                });
              case _.Provisioning:
                return new Promise((e) => {
                  setTimeout(() => {
                    e(this.continueWithPolling());
                  }, this.configuration.pollingConfiguration.provisioningPollingIntervalMs);
                });
              case _.Provisioned:
                return this.continueWithProvisioned();
              default:
                (this.telemetry.trackEvent(
                  s()(
                    s()(
                      { event: u.X.SessionFailed },
                      this.telemetryContext.getProps(this.cv)
                    ),
                    {},
                    {
                      errorMessage: `Failure polling progress: Received an unknown state: ${t}`,
                    }
                  )
                ),
                  this.logger.throw(
                    'SessionClient::PollProgress failed with failed state',
                    c.ws.Unexpected
                  ));
            }
          } catch (e) {
            if (
              (this.logger.info(
                `Failed getState, retry: ${this.retryAttemptCount}`
              ),
              e instanceof d.F &&
                (c.CW.includes(e.code) || e.code === c.ws.Unexpected) &&
                (this.telemetry.trackEvent(
                  s()(
                    s()(
                      { event: u.X.SessionFailed },
                      this.telemetryContext.getProps(this.cv)
                    ),
                    {},
                    {
                      errorCode: e.code,
                      errorMessage: `Aborting polling retries due to service error: ${(0, c.kE)(e.code)}`,
                    }
                  )
                ),
                this.logger.throw(
                  `Aborting polling retries due to service error: ${(0, c.kE)(e.code)}`,
                  e.code
                )),
              this.retryAttemptCount < this.maxRetryPollingSessionsCount)
            )
              return (
                (this.retryAttemptCount += 1),
                new Promise((e) => {
                  setTimeout(() => {
                    e(this.continueWithPolling());
                  }, this.configuration.pollingConfiguration.retryPollingIntervalMs);
                })
              );
            this.logger.throw('No more retries allowed', c.ws.Timeout);
          }
        }
        async continueWithSendingTransferToken() {
          let e;
          this.sessionPath ||
            this.logger.throw(
              'Session has invalid state, call createSession instead',
              c.ws.InvalidState
            );
          try {
            if (((e = await this.getTransferToken()), !e))
              throw new Error(
                'TransferToken returned from getTransferToken is falsy'
              );
          } catch (i) {
            const e = (0, g.g)(i);
            this.logger.throw(e.message, c.ws.InvalidState);
          }
          const t = { userToken: e };
          return (
            await this.playClient.sendConnect(
              this.user,
              this.endpointSettings,
              this.sessionPath,
              t
            ),
            this.continueWithPolling()
          );
        }
        setState(e) {
          let t = null;
          if (this._state !== It.Cancelled) {
            switch (e) {
              case _.Provisioned:
                t = It.Ready;
                break;
              case _.WaitingForResources:
              case _.ReadyToConnect:
                t = It.Queued;
                break;
              case _.Provisioning:
                t = It.Launching;
                break;
              case _.Failed:
                break;
              default:
                this.logger.throw(`SessionState failed: ${e}`, c.ws.Unknown);
            }
            var i;
            if (null != t)
              ((this._state = t),
                null === (i = this.progressCallback) ||
                  void 0 === i ||
                  i.call(this, this._state));
          }
        }
        async continueWithProvisioned() {
          var e, t, i, n;
          this.logger.info('continueWithProvisioned: Provisioned!');
          const o = await this.playClient.getConfiguration(
            this.user,
            this.endpointSettings,
            null !== (e = this.sessionPath) && void 0 !== e ? e : ''
          );
          if (this._state === It.Cancelled)
            return new Promise((e, t) => {
              this.logger.rejectWithWarning(
                'StreamSessionRequest cancelled during provisioning',
                c.ws.Cancelled,
                t
              );
            });
          this.telemetry.trackEvent(
            s()(
              { event: u.X.SessionReady },
              this.telemetryContext.getProps(this.cv)
            )
          );
          const r = {
              user: this.user,
              sessionPath:
                null !== (t = this.sessionPath) && void 0 !== t ? t : '',
              titleId:
                null !==
                  (i =
                    null === (n = this._titleInfo) || void 0 === n
                      ? void 0
                      : n.titleId) && void 0 !== i
                  ? i
                  : '',
              serverInfo: o.serverDetails,
              keepAlivePulseInSeconds: o.keepAlivePulseInSeconds,
              correlationVector: this.cv.increment(),
              endpointSettings: this.endpointSettings,
            },
            a = o.serverDetails;
          let l = this.configuration;
          if (o.clientStreamingConfigOverrides)
            try {
              if (this.configuration.options.ignoreServiceConfiguration)
                this.logger.info(
                  'Ignoring the service-specified StreamSessionConfiguration due to options override.'
                );
              else {
                const e = s()({}, o.clientStreamingConfigOverrides);
                (vt.forEach((t) => {
                  null != e[t] &&
                    (this.logger.warning(
                      `Client-exclusive key "${t}" was defined in the clientStreamingConfigOverride - Removing the key from the service-provided config`
                    ),
                    delete e[t]);
                }),
                  (l = ft(this.configuration, e)),
                  this.logger.info(
                    'Merging the service-specified StreamSessionConfiguration on top of the client-specified StreamSessionConfiguration.'
                  ),
                  this.logger.verbose(`Merged Configuration:\n${(0, m.A)(l)}`));
              }
              (this.logger.verbose(
                `Service-Specified Configuration:\n${(0, m.A)(o.clientStreamingConfigOverrides)}`
              ),
                this.logger.verbose(
                  `Client-Specified Configuration:\n${(0, m.A)(this.configuration)}`
                ));
            } catch (p) {
              const e = (0, g.g)(p);
              this.logger.error(
                `An unexpected error occurred while applying clientStreamingConfigOverrides - ${e.message}`
              );
            }
          const d = s()(
            {
              event: u.X.SessionConfiguration,
              configuration: (0, m.A)(yt(l)),
              streamType: this.streamType,
            },
            this.telemetryContext.getProps(this.cv)
          );
          (o.clientStreamingConfigOverrides &&
            !this.configuration.options.ignoreServiceConfiguration &&
            (d.serviceSpecifiedOverrides = (0, m.A)(
              o.clientStreamingConfigOverrides
            )),
            this.telemetry.trackEvent(d));
          const h = new ht(
            l,
            a,
            this.cv.increment(),
            this.streamType,
            this.connectionType(),
            this.audioContext,
            this.telemetryContext,
            this.deviceInformation
          );
          return (
            h.setUserSession(r),
            h.setPlayClient(this.playClient),
            (this.inFlight = !1),
            h
          );
        }
        async getWaitTime() {
          if (
            null != this.playClient &&
            null != this.user &&
            null != this._titleInfo
          ) {
            if (null == this.waitTime) {
              const e = await this.playClient.getTitleWaitTime(
                this.user,
                this._titleInfo.titleId
              );
              ((this.waitTime = s()({ retrievedAtTimestamp: Date.now() }, e)),
                this.logger.info(`title wait time: ${(0, m.A)(this.waitTime)}`),
                setTimeout(() => {
                  this.waitTime = void 0;
                }, this.configuration.pollingConfiguration.queuePollingIntervalMs));
            }
            return this.waitTime;
          }
        }
        cancel() {
          this._state !== It.Cancelled &&
            ((this.inFlight = !1),
            (this._state = It.Cancelled),
            this.telemetry.trackEvent(
              s()(
                { event: u.X.SessionCancelled },
                this.telemetryContext.getProps(this.cv)
              )
            ));
        }
      }
      r()(At, 'instances', 0);
      class xt extends At {
        constructor(e, t, i, n, s, o, r, a, l, d) {
          super(e, t, i, n, s, o, r, a, l, d);
        }
        async triggerPlayRequest(e) {
          try {
            this.retryAttemptCount = 0;
            const t = await this.sendPlayRequest(this.user, e, this.cv);
            return (
              this.logger.info(`sessionPath: ${t.sessionPath}`),
              (this.sessionPath = t.sessionPath),
              this.telemetryContext.setSessionPath(t.sessionPath),
              this.telemetry.trackEvent(
                s()(
                  { event: u.X.SessionReceivedSessionPath },
                  this.telemetryContext.getProps(this.cv)
                )
              ),
              this.continueWithPolling()
            );
          } catch (t) {
            if (
              (this.logger.info(`triggerPlayRequest failed: ${t}`),
              t instanceof d.F)
            ) {
              const e = t;
              this.logger.throw(
                `StreamSessionRequest: triggerPlay. GameStreamErrorCode: ${(0, c.kE)(e.code)}. GameStreamError: ${e.message}`,
                e.code
              );
            }
            this.logger.throw(
              `StreamSessionRequest: triggerPlay. Error:${(0, m.A)(t)}`,
              c.ws.Unknown
            );
          }
        }
      }
      class Et extends xt {
        constructor(e, t, i, n, s, o, r, a, l) {
          (super(
            e,
            t,
            i,
            n,
            s,
            o,
            new kt(i, bt.CloudConsole, r.titleId, void 0, ct.Tu.Cloud),
            a,
            l,
            r
          ),
            this._titleInfo ||
              this.logger.throw('No title specified', c.ws.InvalidArgument));
        }
        async startProcessingRequest() {
          (this.logger.info('Creating new cloud session.'),
            this.telemetry.trackEvent(
              s()(
                {
                  event: u.X.SessionCreating,
                  locale: this.locale,
                  timezoneMinutes:
                    this.configuration.options.timezoneOffsetMinutes,
                },
                this.telemetryContext.getProps(this.cv)
              )
            ));
          const e = this.user.validateSystemUpdateGroup(
              this.configuration.options.systemUpdateGroup
            ),
            t = this.playClient.deviceInformation,
            i = {
              nanoVersion: ve(this.streamType),
              enableTextToSpeech: this.configuration.options.enableNarrator,
              magnifier: this.configuration.options.enableMagnifier,
              highContrast: this.configuration.options.highContrastMode,
              locale: this.locale,
              useIceConnection: !1,
              timezoneOffsetMinutes:
                this.configuration.options.timezoneOffsetMinutes,
              sdkType: 'web',
              osName: Tt(t),
              enableOptionalDataCollection:
                this.configuration.options.enableOptionalDataCollection,
            },
            n = {
              titleId: this._titleInfo.titleId,
              systemUpdateGroup: e,
              settings: i,
              serverId: '',
              fallbackRegionNames: this.user.fallbackRegionNames,
              clientSessionId: this.telemetryContext.getClientSessionId(),
            };
          return await this.triggerPlayRequest(n);
        }
        async sendPlayRequest(e, t) {
          return this.playClient.sendPlayCloud(e, t);
        }
        connectionType() {
          return ct.Tu.Cloud;
        }
      }
      class Mt extends xt {
        constructor(e, t, i, n, s, o, a, l, d) {
          (super(
            e,
            t,
            i,
            n,
            s,
            o,
            new kt(i, bt.PersonalConsole, void 0, void 0, ct.Tu.Home),
            l,
            d,
            void 0
          ),
            r()(this, 'consoleId', void 0),
            a ||
              this.logger.throw(
                'No console id specified',
                c.ws.InvalidArgument
              ),
            (this.consoleId = a));
        }
        async startProcessingRequest() {
          (this.logger.info('Creating new remote play session.'),
            this.telemetry.trackEvent(
              s()(
                {
                  event: u.X.SessionCreating,
                  locale: this.locale,
                  timezoneMinutes:
                    this.configuration.options.timezoneOffsetMinutes,
                },
                this.telemetryContext.getProps(this.cv)
              )
            ));
          const e = this.playClient.deviceInformation,
            t = {
              titleId: '',
              systemUpdateGroup: '',
              settings: {
                nanoVersion: ve(this.streamType),
                enableTextToSpeech: this.configuration.options.enableNarrator,
                magnifier: this.configuration.options.enableMagnifier,
                highContrast: this.configuration.options.highContrastMode,
                locale: this.locale,
                useIceConnection: !1,
                timezoneOffsetMinutes:
                  this.configuration.options.timezoneOffsetMinutes,
                sdkType: 'web',
                osName: Tt(e),
                enableOptionalDataCollection:
                  this.configuration.options.enableOptionalDataCollection,
              },
              serverId: this.consoleId,
              fallbackRegionNames: [],
              clientSessionId: this.telemetryContext.getClientSessionId(),
            };
          return await this.triggerPlayRequest(t);
        }
        async sendPlayRequest(e, t) {
          return this.playClient.sendPlayHome(e, t);
        }
        connectionType() {
          return ct.Tu.Home;
        }
      }
      class Pt extends xt {
        constructor(e, t, i, n, s, o, a, l, d) {
          (super(
            e,
            t,
            i,
            n,
            s,
            o,
            new kt(i, bt.ManagedDevkit, void 0, void 0, ct.Tu.ManagedDevkit),
            a,
            l,
            void 0
          ),
            r()(this, 'path', void 0),
            d ||
              this.logger.throw('No play path specified', c.ws.InvalidArgument),
            (this.path = d));
        }
        async startProcessingRequest() {
          this.logger.info('Creating new managed devkit play session.');
          const e = { osName: Tt(this.playClient.deviceInformation) };
          return await this.triggerPlayRequest(e);
        }
        async sendPlayRequest(e, t) {
          return this.playClient.sendPlayManagedDevkit(this.path, e, t);
        }
        connectionType() {
          return ct.Tu.ManagedDevkit;
        }
      }
      const Dt = (e) =>
        e &&
        'productId' in e &&
        'title' in e &&
        'description' in e &&
        'creator' in e &&
        'image' in e &&
        'payload' in e;
      var Rt = i(44256),
        Lt = i(19409);
      class Ft extends Rt.W {
        constructor() {
          super('StreamClientLogHandler');
        }
        onVerbose(e, ...t) {
          this.log(e, Lt.LogLevel.Debug, t.join(' '));
        }
        onInfo(e, ...t) {
          this.log(e, Lt.LogLevel.Info, t.join(' '));
        }
        onWarning(e, ...t) {
          this.log(e, Lt.LogLevel.Warn, t.join(' '));
        }
        onError(e, ...t) {
          this.log(e, Lt.LogLevel.Error, t.join(' '));
        }
      }
      r()(Ft, 'isSupported', Rt.W.isSupported);
      class Nt {
        constructor(e, t) {
          (r()(this, 'user', void 0),
            r()(this, 'playClient', void 0),
            r()(this, 'logger', void 0),
            (this.user = e),
            (this.playClient = t),
            (this.user = e),
            (this.playClient = t),
            (this.logger = h.r.Instance));
        }
        async getAllUserContent() {
          return (
            this.logger.info(
              'Calling gamestream services for user content info'
            ),
            this.playClient.getUserContent(this.user)
          );
        }
        async deleteUserContent(e, t) {
          return (
            this.logger.info(
              'Calling gamestream services to delete user content info'
            ),
            this.playClient.deleteUserContent(this.user, e, t)
          );
        }
      }
      var Ut = i(99677);
      const $t = JSON.parse('{"webSdkPackageVersion":"10.6.48"}');
      function Vt(e) {
        return {
          make: e.vendor,
          model: e.model,
          platformType: e.deviceType,
          sdkType: 'web',
        };
      }
      function Bt(e) {
        return { browserName: e.browserName, browserVersion: e.browserVersion };
      }
      function Gt(e) {
        var t;
        return {
          clientAppId: window.location.host,
          clientAppType: 'browser',
          clientAppVersion:
            null === (t = jt.appMetadata) || void 0 === t ? void 0 : t.version,
          clientSdkVersion: $t.webSdkPackageVersion,
          httpEnvironment: 'prod',
          sdkInstallId: e,
        };
      }
      function Ht(e) {
        return { name: Tt(e), ver: e.osVersion, platform: e.deviceType };
      }
      class Ot {
        constructor(e, t) {
          (r()(this, 'sdkInstallId', void 0),
            r()(this, 'deviceInformation', void 0),
            r()(this, 'priority', 0),
            r()(this, 'intercept', async (e) => {
              const t = { env: Gt(this.sdkInstallId) };
              (this.deviceInformation || (this.deviceInformation = new ke.P6()),
                await this.deviceInformation.updatePlatformSpecificInformation());
              const i = {
                  displayInfo: {
                    dimensions: {
                      heightInPixels: window.outerHeight,
                      widthInPixels: window.outerWidth,
                    },
                    pixelDensity: {
                      dpiX: window.devicePixelRatio,
                      dpiY: window.devicePixelRatio,
                    },
                  },
                  browser: Bt(this.deviceInformation),
                  hw: Vt(this.deviceInformation),
                  os: Ht(this.deviceInformation),
                },
                n = (0, m.A)({ appInfo: t, dev: i });
              return a.InterceptedRequest.fromRequest(e, {
                additionalHeaders: { 'X-MS-Device-Info': n },
              });
            }),
            (this.sdkInstallId = e),
            (this.deviceInformation = t));
        }
      }
      class Kt {
        constructor(e) {
          (r()(this, 'onRetryAfterUpdate', void 0),
            r()(this, 'priority', 0),
            r()(this, 'intercept', async (e, t) => {
              if (this.onRetryAfterUpdate && t.headers.has('Retry-After')) {
                const e = t.headers.get('Retry-After'),
                  i = e ? parseInt(e, 10) : void 0;
                this.onRetryAfterUpdate(i);
              }
              return t;
            }),
            (this.onRetryAfterUpdate = e));
        }
      }
      class qt {
        constructor(e, t = new T.W(), i = globalThis.fetch, n = new ke.P6()) {
          (r()(this, 'logger', void 0),
            r()(this, 'endpointSettings', void 0),
            r()(this, 'basicFetch', void 0),
            r()(this, 'playFetch', void 0),
            r()(this, 'tabFetch', void 0),
            r()(this, 'cv', void 0),
            r()(this, 'deviceInformation', void 0),
            (this.logger = h.r.Instance),
            (this.endpointSettings = e),
            (this.basicFetch = i),
            (this.cv = t),
            (this.deviceInformation = n));
          ((this.playFetch = (0, a.createInterceptedFetch)(this.basicFetch, {
            request: [
              new Q(),
              new ne(this.endpointSettings.getHeaders()),
              new j.CorrelationVectorInterceptor(async () =>
                this.cv.increment().getValue()
              ),
            ],
            response: [new te(this.logger)],
            error: [new ie(this.logger)],
          })),
            (this.tabFetch = (0, a.createInterceptedFetch)(this.basicFetch, {
              error: [new ie(this.logger)],
            })));
        }
        setSessionCv(e) {
          this.cv = e;
        }
        async sendPlayCloud(e, t) {
          const i = `${e.endpointSettings.getDomain()}/v5/sessions/cloud/play`,
            n = (0, a.createInterceptedFetch)(oe(this.playFetch, e), {
              request: [
                new Ot(
                  e.endpointSettings.getSdkInstallId(),
                  this.deviceInformation
                ),
              ],
            });
          try {
            const e = await n(i, { method: 'POST', body: (0, m.A)(t) }),
              s = await e.text(),
              o = JSON.parse(s);
            return (
              o ||
                this.logger.throw(
                  'sendPlayCloud returned invalid json',
                  c.ws.BadConfiguration
                ),
              o
            );
          } catch (s) {
            this.throwCaughtError(s, 'sendPlayCloud');
          }
        }
        async sendPlayHome(e, t) {
          const i = `${e.endpointSettings.getDomain()}/v5/sessions/home/play`,
            n = (0, a.createInterceptedFetch)(oe(this.playFetch, e), {
              request: [
                new Ot(
                  e.endpointSettings.getSdkInstallId(),
                  this.deviceInformation
                ),
              ],
            });
          try {
            const e = await n(i, { method: 'POST', body: (0, m.A)(t) }),
              s = await e.text(),
              o = JSON.parse(s);
            return (
              o ||
                this.logger.throw(
                  'sendPlayHome returned invalid json',
                  c.ws.BadConfiguration
                ),
              o
            );
          } catch (s) {
            this.throwCaughtError(s, 'sendPlayHome');
          }
        }
        async sendPlayManagedDevkit(e, t, i) {
          const n = `${t.endpointSettings.getDomain()}/${e}/play`,
            s = (0, a.createInterceptedFetch)(oe(this.playFetch, t), {
              request: [
                new Ot(
                  t.endpointSettings.getSdkInstallId(),
                  this.deviceInformation
                ),
              ],
            });
          try {
            const e = await s(n, { method: 'POST', body: (0, m.A)(i) }),
              t = await e.text(),
              o = JSON.parse(t);
            return (
              o ||
                this.logger.throw(
                  'sendPlayManagedDevkit returned invalid json',
                  c.ws.BadConfiguration
                ),
              o
            );
          } catch (o) {
            this.throwCaughtError(o, 'sendPlayManagedDevkit');
          }
        }
        async getState(e, t, i, n) {
          const s = `${t.getDomain()}/${i}/state`,
            o = (0, a.createInterceptedFetch)(oe(this.playFetch, e), {
              response: [new Kt(n.onRetryAfterUpdate)],
            });
          try {
            const e = await o(s, { method: 'GET' }),
              t = await e.text();
            this.logger.info(`text response from polling of /state: ${t}`);
            const i = JSON.parse(t);
            return (
              i ||
                this.logger.throw(
                  'getState returned invalid json',
                  c.ws.BadConfiguration
                ),
              i
            );
          } catch (r) {
            this.throwCaughtError(r, 'getState');
          }
        }
        async sendConnect(e, t, i, n) {
          const s = `${t.getDomain()}/${i}/connect`,
            o = oe(this.playFetch, e);
          try {
            await o(s, { method: 'POST', body: (0, m.A)(n) });
          } catch (r) {
            this.throwCaughtError(r, 'sendConnect');
          }
        }
        async getConfiguration(e, t, i) {
          const n = `${t.getDomain()}/${i}/configuration`,
            s = oe(this.playFetch, e);
          try {
            const e = await s(n, { method: 'GET' }),
              t = await e.text(),
              i = JSON.parse(t);
            i ||
              this.logger.throw(
                'getConfiguration returned invalid json',
                c.ws.BadConfiguration
              );
            const r = i.clientStreamingConfigOverrides;
            if (r && ('string' === typeof r || r instanceof String)) {
              let e;
              try {
                e = JSON.parse(r);
              } catch (o) {
                const e = (0, g.g)(o);
                this.logger.error(
                  `An unexpected error occurred while JSON parsing clientStreamingConfigOverrides - ${e.message}`
                );
              }
              try {
                (Ct(e), (i.clientStreamingConfigOverrides = e));
              } catch (o) {
                const e = (0, g.g)(o);
                (this.logger.error(
                  `Invalid clientStreamingConfigOverrides specified - ${e.message}`
                ),
                  this.logger.error(
                    `Removing invalid 'clientStreamingConfigOverrides' property from configuration response - ${r}`
                  ),
                  (i.clientStreamingConfigOverrides = void 0));
              }
            }
            return i;
          } catch (r) {
            this.throwCaughtError(r, 'getConfiguration');
          }
        }
        async sendSessionFileABug(e, t, i) {
          const n = `${e.endpointSettings.getDomain()}/${t}/fileabug`,
            s = (0, a.createInterceptedFetch)(oe(this.playFetch, e), {
              request: [
                new Ot(
                  e.endpointSettings.getSdkInstallId(),
                  this.deviceInformation
                ),
              ],
            });
          try {
            await s(n, { method: 'POST', body: (0, m.A)(i) });
          } catch (o) {
            this.throwCaughtError(o, 'sendSessionFileABug');
          }
        }
        async sendTelemetryEventsViaServices(e, t) {
          const i = `${e.endpointSettings.getDomain()}/v1/client/cte`,
            n = (0, a.createInterceptedFetch)(oe(this.playFetch, e), {
              request: [
                new Ot(
                  e.endpointSettings.getSdkInstallId(),
                  this.deviceInformation
                ),
              ],
            });
          try {
            await n(i, { method: 'POST', body: (0, m.A)(t) });
          } catch (s) {
            this.throwCaughtError(s, 'sendTelemetryEventsViaServices');
          }
        }
        async fetchTitleInfosByIds(e, t, i, { version: n } = { version: 2 }) {
          const s = oe(this.playFetch, e);
          try {
            const o = await s(
              `${e.endpointSettings.getDomain()}/v${n}/titles`,
              {
                method: 'POST',
                body: JSON.stringify({ alternateIds: t, alternateIdType: i }),
              }
            );
            return await o.json();
          } catch (o) {
            this.logger.throw(
              'fetchTitleInfoByIds returned invalid json',
              c.ws.BadConfiguration
            );
          }
        }
        async enumerateTitles(e, t, i, { version: n } = { version: 2 }) {
          let s = `${e.endpointSettings.getDomain()}/v${n}/titles?mr=${t}`;
          i && (s = `${s}&ct=${i}`);
          const o = oe(this.playFetch, e);
          try {
            const e = await o(s, { method: 'GET' }),
              t = await e.text(),
              i = JSON.parse(t);
            return (
              i ||
                this.logger.throw(
                  'enumerateTitles returned invalid json',
                  c.ws.BadConfiguration
                ),
              i
            );
          } catch (r) {
            this.throwCaughtError(r, 'enumerateTitles');
          }
        }
        async enumerateMruTitles(e, t, i, { version: n } = { version: 2 }) {
          let s = `${e.endpointSettings.getDomain()}/v${n}/titles/mru?mr=${t}`;
          i && (s = `${s}&ct=${i}`);
          const o = oe(this.playFetch, e);
          try {
            const e = await o(s, { method: 'GET' }),
              t = await e.text(),
              i = JSON.parse(t);
            return (
              i ||
                this.logger.throw(
                  'enumerateMruTitles returned invalid json',
                  c.ws.BadConfiguration
                ),
              i
            );
          } catch (r) {
            this.throwCaughtError(r, 'enumerateMruTitles');
          }
        }
        async getActiveTitlesForUser(e) {
          const t = `${e.endpointSettings.getDomain()}/v5/sessions/cloud/active`,
            i = oe(this.playFetch, e);
          try {
            const e = await i(t, { method: 'GET' }),
              n = await e.text(),
              s = JSON.parse(n);
            return (
              s ||
                this.logger.throw(
                  'getActiveTitlesForUser returned invalid json',
                  c.ws.BadConfiguration
                ),
              s
            );
          } catch (n) {
            this.throwCaughtError(n, 'getActiveTitlesForUser');
          }
        }
        async getTitleWaitTime(e, t) {
          const i = `${e.endpointSettings.getDomain()}/v1/waittime/${t}`,
            n = oe(this.playFetch, e);
          try {
            const e = await n(i, { method: 'GET' }),
              t = await e.text(),
              s = JSON.parse(t);
            return (
              s ||
                this.logger.throw(
                  'getTitleWaitTime returned invalid json',
                  c.ws.BadConfiguration
                ),
              s
            );
          } catch (s) {
            this.throwCaughtError(s, 'getTitleWaitTime');
          }
        }
        async enumerateConsoles(e, t, i) {
          let n = `${e.endpointSettings.getDomain()}/v6/servers/home?mr=${t}`;
          i && (n = `${n}&ct=${i}`);
          const s = oe(this.playFetch, e);
          try {
            const e = await s(n, { method: 'GET' }),
              t = await e.text(),
              i = JSON.parse(t);
            return (
              i ||
                this.logger.throw(
                  'enumerateConsoles returned invalid json',
                  c.ws.BadConfiguration
                ),
              i
            );
          } catch (o) {
            this.throwCaughtError(o, 'enumerateConsoles');
          }
        }
        async deleteSession(e, t, i) {
          const n = `${t.getDomain()}/${i}`,
            s = oe(this.playFetch, e);
          try {
            await s(n, { method: 'DELETE' });
          } catch (o) {
            this.throwCaughtError(o, 'deleteSession');
          }
        }
        async sendSessionKeepAlive(e, t, i) {
          const n = `${t.getDomain()}/${i}/keepalive`,
            s = oe(this.playFetch, e);
          try {
            const e = await s(n, { method: 'POST' }),
              t = await e.text(),
              i = JSON.parse(t);
            return (
              i ||
                this.logger.throw(
                  'sendSessionKeepAlive returned invalid json',
                  c.ws.BadConfiguration
                ),
              i
            );
          } catch (o) {
            this.throwCaughtError(o, 'sendSessionKeepAlive');
          }
        }
        async sendIce(e, t, i, n) {
          const s = `${t.getDomain()}/${i}/ice`,
            o = oe(this.playFetch, e);
          try {
            await o(s, { method: 'POST', body: (0, m.A)(n.Data) });
          } catch (r) {
            this.throwCaughtError(r, 'sendIce');
          }
        }
        async getIce(e, t, i) {
          const n = `${t.getDomain()}/${i}/ice`,
            s = oe(this.playFetch, e);
          try {
            const e = await s(n, { method: 'GET' }),
              t = await e.text();
            if ((this.logger.info(`getIce returned ${t}`), '' === t))
              return null;
            const i = JSON.parse(t),
              o = JSON.parse(i.exchangeResponse);
            return (
              o ||
                this.logger.throw(
                  'getIce returned invalid json',
                  c.ws.BadConfiguration
                ),
              o
            );
          } catch (o) {
            this.throwCaughtError(o, 'getIce');
          }
        }
        async sendSdp(e, t, i, n) {
          const s = `${t.getDomain()}/${i}/sdp`,
            o = oe(this.playFetch, e);
          try {
            await o(s, { method: 'POST', body: (0, m.A)(n.Data) });
          } catch (r) {
            this.throwCaughtError(r, 'sendSdp');
          }
        }
        async getSdp(e, t, i) {
          const n = `${t.getDomain()}/${i}/sdp`,
            s = oe(this.playFetch, e);
          try {
            const e = await s(n, { method: 'GET' }),
              t = await e.text();
            if ((this.logger.info(`getSdp returned ${t}`), '' === t))
              return null;
            const i = JSON.parse(t);
            return (
              i ||
                this.logger.throw(
                  'getSdp returned invalid json',
                  c.ws.BadConfiguration
                ),
              i.exchangeResponse
            );
          } catch (o) {
            this.throwCaughtError(o, 'getSdp');
          }
        }
        async getTouchAdaptationBundle(e, t, i) {
          const n = `${t.getDomain()}/v1/sessions/tabs/${i}/download?noRedirect=true`,
            s = oe(this.playFetch, e);
          try {
            const e = await s(n, { method: 'GET' }),
              t = await e.text(),
              i = await this.tabFetch(t, { method: 'GET' });
            return await i.arrayBuffer();
          } catch (o) {
            this.throwCaughtError(o, 'getTouchAdaptationBundle');
          }
        }
        async getUserContent(e) {
          const t = `${e.endpointSettings.getDomain()}/v1/usercontent`,
            i = oe(this.playFetch, e);
          try {
            const e = await i(t, { method: 'GET' }),
              n = await e.text(),
              s = JSON.parse(n);
            return (
              s ||
                this.logger.throw(
                  'usercontent returned invalid json',
                  c.ws.BadConfiguration
                ),
              s
            );
          } catch (n) {
            this.throwCaughtError(n, 'usercontent');
          }
        }
        async deleteUserContent(e, t, i) {
          const n = `${e.endpointSettings.getDomain()}/v1/usercontent/${t}/${i}`,
            s = oe(this.playFetch, e);
          try {
            await s(n, { method: 'DELETE' });
          } catch (o) {
            this.throwCaughtError(o, 'deleteUserContent');
          }
        }
        async getTitleInputConfigurations(e, t, i) {
          const n = oe(this.playFetch, e);
          try {
            const s = await n(
              `${e.endpointSettings.getDomain()}/v2/titles/inputconfigs`,
              {
                method: 'POST',
                body: JSON.stringify({ titleIds: t, titleIdType: i }),
              }
            );
            return await s.json();
          } catch (s) {
            this.logger.throw(
              'getTitleInputConfigurations returned invalid json',
              c.ws.BadConfiguration
            );
          }
        }
        throwCaughtError(e, t) {
          if (e instanceof d.F) this.logger.throw(e.message, e.code);
          else {
            const i = (0, g.g)(e);
            this.logger.throw(
              `${t} could not complete: ${i.message}`,
              c.ws.Unexpected
            );
          }
        }
      }
      let _t = 0;
      class Xt {
        constructor(e) {
          (r()(this, 'logger', void 0),
            r()(this, 'priority', -1),
            r()(this, 'intercept', async (e) => {
              const t = e.headers.get(a.HttpHeader.CorrelationVector) || '';
              this.logger.info(
                `Http #${_t} call ${e.method} to ${e.url} with cv:${t}`
              );
              const i = s()(
                  s()({}, e.metadata),
                  {},
                  { startTime: Date.now(), callCount: _t }
                ),
                n = a.InterceptedRequest.fromRequest(e, { metadata: i });
              return (_t++, n);
            }),
            (this.logger = e));
        }
      }
      class Wt {
        constructor(e, t) {
          (r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            r()(this, 'priority', -1),
            r()(this, 'intercept', async (e, t) => {
              const i = e.metadata.startTime,
                n = e.metadata.callCount,
                s = '' + (Date.now() - i),
                o = e.headers.get(a.HttpHeader.CorrelationVector) || '';
              return (
                this.logger.info(
                  `Http #${n} completed from ${e.url} with ${t.status} in ${s} Ms with cv:${o}`
                ),
                this.telemetry.trackEvent({
                  event: u.X.HttpCompleted,
                  cV: o,
                  url: e.url,
                  latencyMs: s,
                  httpMethod: e.method,
                  httpStatus: t.status,
                }),
                t
              );
            }),
            (this.logger = e),
            (this.telemetry = t));
        }
      }
      class zt {
        constructor(e, t) {
          (r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            r()(this, 'priority', -1),
            r()(this, 'intercept', async (e, t) => {
              const i = e.metadata.startTime,
                n = e.metadata.callCount,
                s = '' + (Date.now() - i),
                o = e.headers.get(a.HttpHeader.CorrelationVector) || '';
              if (t instanceof a.HttpError) {
                const i = t.response;
                (this.logger.warning(
                  `Http #${n} failed from ${e.url} with ${i.status} in ${s} Ms with cv:${o}`
                ),
                  this.telemetry.trackEvent({
                    event: u.X.HttpCompleted,
                    cV: o,
                    url: e.url,
                    latencyMs: s,
                    httpMethod: e.method,
                    httpStatus: i.status,
                    errorMessage: t.message,
                  }));
              } else
                (this.logger.warning(
                  `Http #${n} failed from ${e.url} with '${t.message}' in ${s} Ms with cv:${o}`
                ),
                  this.telemetry.trackEvent({
                    event: u.X.HttpFailed,
                    cV: o,
                    url: e.url,
                    latencyMs: s,
                    httpMethod: e.method,
                    errorMessage: t.message,
                  }));
              throw t;
            }),
            (this.logger = e),
            (this.telemetry = t));
        }
      }
      class Yt {
        constructor(e, t) {
          (r()(this, 'playClient', void 0),
            r()(this, 'user', void 0),
            r()(this, 'logger', void 0),
            (this.user = e),
            (this.playClient = t),
            (this.logger = h.r.Instance));
        }
        async fetchTitleInfosByIds(e, t, i = { version: 2 }) {
          if (!e.length)
            return (
              this.logger.warning(
                'fetchTitleInfosByIds received an empty list of ids'
              ),
              []
            );
          const n = await this.playClient.fetchTitleInfosByIds(
            this.user,
            e,
            t,
            i
          );
          return (
            n.results.forEach((e) => {
              var t;
              e.details &&
                (e.details.productId =
                  null === (t = e.details.productId) || void 0 === t
                    ? void 0
                    : t.toUpperCase());
            }),
            n.results
          );
        }
        async enumerateTitles(e, t, i = { version: 2 }) {
          const n = await this.playClient.enumerateTitles(
            this.user,
            e,
            t.token,
            i
          );
          return (
            this.logger.info(`enumerated ${n.results.length} titles`),
            n.results.forEach((e) => {
              var t;
              e.details &&
                (e.details.productId =
                  null === (t = e.details.productId) || void 0 === t
                    ? void 0
                    : t.toUpperCase());
            }),
            n
          );
        }
        async enumerateMruTitles(e, t, i = { version: 2 }) {
          const n = await this.playClient.enumerateMruTitles(
            this.user,
            e,
            t.token,
            i
          );
          return (
            n.results.forEach((e) => {
              var t;
              e.details &&
                (e.details.productId =
                  null === (t = e.details.productId) || void 0 === t
                    ? void 0
                    : t.toUpperCase());
            }),
            this.logger.info(`enumerated ${n.results.length} MRU titles`),
            n
          );
        }
        async getActiveTitlesForUser(e) {
          const t = await this.playClient.getActiveTitlesForUser(e);
          return (
            this.logger.info(`retrieved ${t.length} active titles for user`),
            t
          );
        }
        async getTitleWaitTime(e, t) {
          const i = await this.playClient.getTitleWaitTime(e, t);
          return (this.logger.info(`title wait time: ${i}`), i);
        }
        async getTitleInputConfigurations(e, t) {
          return e.length
            ? await this.playClient.getTitleInputConfigurations(this.user, e, t)
            : (this.logger.warning(
                'getTitleInputConfigurations received an empty list of ids'
              ),
              []);
        }
      }
      class jt {
        get authRoutingService() {
          var e;
          return null !== (e = this.configuration.authRoutingService) &&
            void 0 !== e
            ? e
            : y.AzureFrontDoor;
        }
        constructor(e, t) {
          var i;
          (r()(this, 'cv', void 0),
            r()(this, 'logger', void 0),
            r()(this, 'telemetry', void 0),
            r()(this, 'playClient', void 0),
            r()(this, 'authClient', void 0),
            r()(this, 'endpointSettings', void 0),
            r()(this, 'configuration', void 0),
            r()(this, 'instanceId', ++jt.instances),
            r()(this, 'deviceInformation', void 0),
            (this.deviceInformation =
              null !==
                (i =
                  null === e || void 0 === e ? void 0 : e.deviceInformation) &&
              void 0 !== i
                ? i
                : new ke.P6()),
            (this.logger = new h.r('StreamClient', `(${this.instanceId})`)),
            (this.telemetry = u.H.Instance),
            this.telemetry.setHandler(
              null === e || void 0 === e ? void 0 : e.telemetryHandler
            ),
            null !== e && void 0 !== e && e.logHandler
              ? (h.r.logHandler =
                  null === e || void 0 === e ? void 0 : e.logHandler)
              : Ft.isSupported && (h.r.logHandler = new Ft()),
            (jt.appMetadata =
              null === e || void 0 === e ? void 0 : e.appMetadata),
            t
              ? (this.cv = t)
              : ((this.cv = new T.W()),
                this.logger.warning(
                  `No correlation vector is passed from the client. Used this new cv: ${this.cv.getValue()}`
                )),
            e ||
              this.logger.warning(
                'StreamClient was created without any configuration, falling back to defaults'
              ),
            (this.configuration =
              null !== e && void 0 !== e
                ? e
                : { httpEnvironment: le.Default, locale: 'en-us' }),
            this.configuration.locale || (this.configuration.locale = 'en-us'),
            this.logger.info(
              `Stream client created using sdk version: ${$t.webSdkPackageVersion}`
            ),
            this.logger.info(
              `Stream client using locale: ${this.configuration.locale}`
            ),
            (this.endpointSettings = new me(
              this.configuration.httpEnvironment,
              null === e || void 0 === e ? void 0 : e.sdkInstallId,
              this.configuration.headers
            )));
          const n = (function (e, t, i, n = {}) {
            return (
              (n.retryPredicate = re),
              (0, a.composeFetchEnhancers)(
                e,
                s()(
                  {
                    interceptors: {
                      request: [new Xt(t)],
                      response: [new Wt(t, i)],
                      error: [new zt(t, i)],
                    },
                  },
                  n
                )
              )
            );
          })(
            (this.configuration.keepAlive, globalThis.fetch),
            this.logger,
            this.telemetry
          );
          ((this.playClient = new qt(
            this.endpointSettings,
            this.cv,
            n,
            this.deviceInformation
          )),
            (this.authClient = new ae(this.cv, n)),
            this.setNewSessionCv(),
            this.telemetry.trackEvent({
              event: u.X.SdkInitialized,
              cV: this.cv.getValue(),
            }));
        }
        setNewSessionCv() {
          const e = this.cv.increment().extend();
          return (
            this.playClient.setSessionCv(e),
            this.authClient.setSessionCv(e),
            e
          );
        }
        shouldOfferingUseDnsPrefix(e) {
          switch (e) {
            case 'publicpreview':
            case 'takehome':
            case 'takehomeweb':
            case 'xgputest':
            case 'xgpubeta':
            case 'xgpuweb':
            case 'cloudgaming':
            case 'cloudgamingtakehome':
            case 'xgpuwebf2p':
            case 'xgpu':
            case 'xhome':
            case 'validunittestoffering':
            case 'core':
            case 'xgpuconsole':
            case 'xgpupcapp':
            case 'somerville':
            case 'xgpuks':
            case 'takehomeconsole':
              return !0;
            default:
              return !1;
          }
        }
        async login(e, t, i) {
          this.logger.info('Logging in with user token');
          const n = ('string' === typeof i ? i : i.id).toLowerCase(),
            s = this.createAuthEndpointSettings(i),
            o = Date.now(),
            r = this.cv.increment();
          let a;
          switch (e) {
            case w.ManagedDevkit:
              a = new f(t, i, r, s);
              break;
            case w.XCloud:
            default:
              a = new S(t, this.authClient, i, r, s);
          }
          try {
            (await a.updateToken(),
              this.telemetry.trackEvent({
                event: u.X.AuthCompleted,
                cV: r.getValue(),
                success: a.hasToken(),
                offeringId: n,
                latencyMs: Date.now() - o,
              }));
          } catch (l) {
            const e = (0, g.g)(l);
            throw (
              this.telemetry.trackEvent({
                event: u.X.AuthCompleted,
                cV: r.getValue(),
                success: !1,
                offeringId: n,
                latencyMs: Date.now() - o,
                error: e.message,
              }),
              l
            );
          }
          return (this.logger.info('Made a user!'), a);
        }
        deserializeUser(e, t, i) {
          this.logger.info('Deserializing user');
          const n = this.createAuthEndpointSettings(i),
            s = this.cv.increment(),
            o = S.deserialize(e, t, this.authClient, i, s, n);
          return (
            this.telemetry.trackEvent({
              event: u.X.AuthHydrated,
              cV: s.getValue(),
              offeringId: 'string' === typeof i ? i : i.id,
            }),
            this.logger.info('Deserialized a user!'),
            o
          );
        }
        getOfferings(e) {
          return this.authClient.getOfferings(e.token, this.endpointSettings);
        }
        getTitleManagerForUser(e) {
          return new Yt(e, this.playClient);
        }
        getContentManager(e) {
          return new Nt(e, this.playClient);
        }
        getConsolesForUser(e, t, i) {
          return this.playClient.enumerateConsoles(e, t, i);
        }
        createCloudSessionRequest(e, t, i, n, s) {
          const o = this.setNewSessionCv();
          return new Et(
            t,
            e,
            o,
            this.playClient,
            this.configuration.locale,
            s,
            i,
            n,
            this.deviceInformation
          );
        }
        createHomeConsoleSessionRequest(e, t, i, n, s) {
          const o = this.setNewSessionCv();
          return new Mt(
            t,
            e,
            o,
            this.playClient,
            this.configuration.locale,
            s,
            i,
            n,
            this.deviceInformation
          );
        }
        createDirectConnectSession(e, t, i, n, s, o, r) {
          const a = (0, Ut.ok)(t, i, o, r),
            l = this.setNewSessionCv();
          return new ht(
            e,
            a,
            l,
            s,
            ct.Tu.Direct,
            n,
            new kt(l, bt.PersonalConsole),
            this.playClient.deviceInformation
          );
        }
        createManagedDevkitConnectSession(e, t, i, n, s) {
          const o = this.setNewSessionCv();
          return new Pt(
            i,
            t,
            o,
            this.playClient,
            this.configuration.locale,
            n,
            s,
            this.deviceInformation,
            e.path
          );
        }
        getCorrelationVector() {
          return this.cv.increment().getValue();
        }
        getLogHandler() {
          return h.r.logHandler;
        }
        sendTelemetryEventsViaServices(e, t) {
          if (e) return this.playClient.sendTelemetryEventsViaServices(e, t);
        }
        getTouchAdaptationBundle(e, t) {
          return this.playClient.getTouchAdaptationBundle(
            e,
            e.endpointSettings,
            t
          );
        }
        isAzureTrafficManagerEligible(e) {
          return [
            'xgpuweb',
            'cloudgaming',
            'xgpuwebf2p',
            'takehomeweb',
          ].includes(e.toLowerCase());
        }
        createAuthEndpointSettings(e, t = this.authRoutingService) {
          const i = ('string' === typeof e ? e : e.id).toLowerCase();
          let n = t;
          (!i ||
            (n === y.AzureTrafficManager &&
              !1 === this.isAzureTrafficManagerEligible(i))) &&
            (n = y.AzureFrontDoor);
          const s = this.endpointSettings.clone();
          s.getHeaders().append(
            'X-GSSV-Routing',
            n === y.AzureTrafficManager ? 'ATM' : 'AFD'
          );
          const o = i && this.shouldOfferingUseDnsPrefix(i) ? i : void 0;
          return (s.setDomain(s.getDomainForAuth(n, o)), s);
        }
      }
      var Qt;
      function Jt(e) {
        return 'nativeTouch' in e && 'blockedByFamilySafety' in e;
      }
      function Zt(e) {
        return 'supportedInputTypes' in e;
      }
      function ei(e) {
        if (e) {
          var t;
          if (Jt(e.details)) return !0;
          if (
            Zt(e.details) &&
            null !== (t = e.details.supportedInputTypes) &&
            void 0 !== t &&
            t.includes(Qt.controller)
          )
            return !0;
        }
        return !1;
      }
      function ti(e) {
        if (e) {
          var t;
          if (Jt(e.details) && e.details.nativeTouch) return !0;
          if (
            Zt(e.details) &&
            null !== (t = e.details.supportedInputTypes) &&
            void 0 !== t &&
            t.includes(Qt.nativeTouch)
          )
            return !0;
        }
        return !1;
      }
      function ii(e) {
        var t;
        return (
          !!e &&
          Zt(e.details) &&
          (null === (t = e.details.supportedInputTypes) || void 0 === t
            ? void 0
            : t.includes(Qt.mouseAndKeyboard))
        );
      }
      function ni(e) {
        var t, i;
        return (
          (null !==
            (t =
              null === e ||
              void 0 === e ||
              null === (i = e.details) ||
              void 0 === i
                ? void 0
                : i.supportedTabs) && void 0 !== t
            ? t
            : []
          ).length > 0
        );
      }
      function si(e) {
        return (
          !!e &&
          Zt(e.details) &&
          e.details.supportedInputTypes.includes(Qt.nativeSensor)
        );
      }
      (r()(jt, 'appMetadata', void 0),
        r()(jt, 'instances', 0),
        (function (e) {
          ((e.controller = 'Controller'),
            (e.mouseAndKeyboard = 'MKB'),
            (e.customTouchOverlay = 'CustomTouchOverlay'),
            (e.genericTouch = 'GenericTouch'),
            (e.nativeTouch = 'NativeTouch'),
            (e.nativeSensor = 'NativeSensor'));
        })(Qt || (Qt = {})));
      const oi = {
          msvideoprocessing: () => {
            const e = document.createElement('video');
            return nt(e) && e.msGetVideoProcessingTypes().length > 0;
          },
        },
        ri = [
          'datachannel',
          'fullscreen',
          'gamepads',
          'lowbandwidth',
          'peerconnection',
          'webaudio',
          'webworkers',
          'msvideoprocessing',
        ];
      let ai;
      function li() {
        return (
          ai ||
          ((ai = new Promise((e, t) => {
            ai = i
              .e(563)
              .then(i.t.bind(i, 30278, 23))
              .then(() => {
                const { Modernizr: t } = window;
                if (!t) return void e(void 0);
                let i;
                if ('function' !== typeof t.addTest) {
                  (h.r.Instance.warning(
                    'Modernizr is missing the addTest API - Manually shimming additional tests'
                  ),
                    (i = t));
                  for (const e in oi) {
                    const t = e;
                    null == Object.getOwnPropertyDescriptor(i, t) &&
                      null == i[t] &&
                      Object.defineProperty(i, t, { get: oi[t] });
                  }
                } else i = t.addTest(oi);
                e(i);
              })
              .catch((e) => {
                ((ai = void 0), t(e));
              });
          })),
          ai)
        );
      }
      function di(e, t) {
        u.H.Instance.trackEvent(
          s()(
            {
              event: u.X.UnsupportedBrowserFeature,
              features: JSON.stringify(e),
            },
            ui(t)
          )
        );
      }
      function ci(e) {
        const t = ui(e);
        window.MediaSource && window.MediaSource.isTypeSupported
          ? (u.H.Instance.trackEvent(
              s()({ event: u.X.MediaSourceSupport, isSupported: 'true' }, t)
            ),
            [
              {
                name: 'AVC1',
                type: 'video/mp4',
                codecs: 'avc1.42c020, avc1.4d001f, avc1.4d002a',
              },
              { name: 'HVC1', type: 'video/mp4', codecs: 'hvc1.1.6.L123.B0' },
              { name: 'HEV1', type: 'video/mp4', codecs: 'hev1.1.6.L123.B0' },
              { name: 'VP9', type: 'video/mp4', codecs: 'vp09.00.50.08' },
              { name: 'AV1', type: 'video/mp4', codecs: 'av01.0.31M.08' },
              { name: 'OPUS', type: 'audio/webm', codecs: 'opus' },
              { name: 'AAC', type: 'audio/mp4', codecs: '' },
            ].forEach((e) => {
              let i = `${e.type};`;
              (e.codecs && (i += ` codecs="${e.codecs}"`),
                u.H.Instance.trackEvent(
                  s()(
                    s()(s()({ event: u.X.MediaSourceCodecSupport }, e), t),
                    {},
                    {
                      mime: i,
                      isSupported: JSON.stringify(
                        MediaSource.isTypeSupported(i)
                      ),
                    }
                  )
                ));
            }))
          : u.H.Instance.trackEvent(
              s()({ event: u.X.MediaSourceSupport, isSupported: 'false' }, t)
            );
      }
      async function hi(e) {
        let t,
          i = !0;
        try {
          t = await li();
        } catch (n) {
          h.r.Instance.error('Unable to load Modernizr', n);
        }
        return null == t
          ? (h.r.Instance.error(
              `Unable to determine if ${e} is supported - Modernizr is not in global scope, defaulting to true`
            ),
            !0)
          : (null != t[e]
              ? (i = t[e])
              : h.r.Instance.error(
                  `Unable to determine if ${e} is supported - Modernizr returned null, defaulting to true`
                ),
            i);
      }
      function ui(e) {
        return {
          browser: e.browserName,
          device: JSON.stringify(e.vendor),
          version: e.browserVersion,
        };
      }
      var gi = i(90101);
    },
    52468(e, t, i) {
      i.d(t, { Hd: () => r, _V: () => o, bK: () => a });
      var n = i(23522),
        s = i(16556);
      const o = {
          INSTANTIATE_GAME_STREAM: {
            START: '@gameStream/INSTANTIATE_GAME_STREAM_START',
            SUCCESS: '@gameStream/INSTANTIATE_GAME_STREAM_SUCCESS',
            ERROR: '@gameStream/INSTANTIATE_GAME_STREAM_ERROR',
          },
          TEARDOWN_GAME_STREAM: '@gameStream/TEARDOWN_GAME_STREAM',
        },
        r = (0, n.vR)(
          s.H.GameStream,
          o.INSTANTIATE_GAME_STREAM.START,
          (...e) => ({ params: e }),
          o.INSTANTIATE_GAME_STREAM.SUCCESS,
          (e) => ({ instance: e }),
          o.INSTANTIATE_GAME_STREAM.ERROR,
          (e) => ({ error: e })
        ),
        a = (0, n.VP)(s.H.GameStream, o.TEARDOWN_GAME_STREAM, (e) => ({
          instance: e,
        }));
    },
    52897(e, t, i) {
      i.d(t, { D: () => r, Gu: () => a });
      (i(62234), i(47010));
      var n = i(14041),
        s = i(89407),
        o = i(79367);
      const r = () =>
          'undefined' === typeof window.matchMedia
            ? s.EA.SmallPortrait
            : window.matchMedia(o.a7).matches
              ? s.EA.XXXLarge
              : window.matchMedia(o.gR).matches
                ? s.EA.XXLarge
                : window.matchMedia(o.oI).matches
                  ? s.EA.XLarge
                  : window.matchMedia(o.MN).matches
                    ? s.EA.Large
                    : window.matchMedia(o.Mu).matches
                      ? s.EA.Medium
                      : window.matchMedia(o.RZ).matches
                        ? s.EA.SmallLandscape
                        : s.EA.SmallPortrait,
        a = () => {
          const [e, t] = (0, n.useState)(() => r()),
            i = (0, n.useCallback)(() => {
              t(r);
            }, []);
          return (
            (0, n.useEffect)(() => {
              const e = window.matchMedia(o.RZ),
                t = window.matchMedia(o.Mu),
                n = window.matchMedia(o.MN),
                s = window.matchMedia(o.oI),
                r = window.matchMedia(o.gR),
                a = window.matchMedia(o.a7);
              if (e.addEventListener)
                return (
                  e.addEventListener('change', i),
                  t.addEventListener('change', i),
                  n.addEventListener('change', i),
                  s.addEventListener('change', i),
                  r.addEventListener('change', i),
                  a.addEventListener('change', i),
                  () => {
                    e.removeEventListener &&
                      (e.removeEventListener('change', i),
                      t.removeEventListener('change', i),
                      n.removeEventListener('change', i),
                      s.removeEventListener('change', i),
                      r.removeEventListener('change', i),
                      a.removeEventListener('change', i));
                  }
                );
            }, [i]),
            e
          );
        };
    },
    56188(e, t, i) {
      i.d(t, { F: () => r });
      var n = i(58212),
        s = i.n(n),
        o = (i(97107), i(76753));
      class r extends Error {
        constructor(e, t) {
          (super(e),
            s()(this, 'code', void 0),
            (this.code = (0, o.JQ)(t)),
            'function' === typeof Error.captureStackTrace
              ? Error.captureStackTrace(this, this.constructor)
              : (this.stack = new Error(`GameStreamError: ${t}`).stack),
            Object.setPrototypeOf(this, r.prototype));
        }
        toString() {
          return `GameStreamError: ${o.ws[this.code]}: ${this.message}`;
        }
      }
    },
    59306(e, t, i) {
      var n;
      (i.d(t, { P: () => n }),
        (function (e) {
          e[(e.WebRTCV1 = 0)] = 'WebRTCV1';
        })(n || (n = {})));
    },
    59724(e, t, i) {
      i.d(t, { n: () => o });
      i(47010);
      var n = i(14041);
      let s = !0;
      function o() {
        const [e, t] = (0, n.useState)(s);
        return (
          (0, n.useEffect)(() => {
            ((s = !1), t(s));
          }, []),
          e
        );
      }
    },
    70622(e, t, i) {
      i.d(t, { H: () => a, X: () => n });
      var n,
        s = i(58212),
        o = i.n(s),
        r = i(31622);
      !(function (e) {
        ((e.AuthCompleted = 'xCloud.Client.SDK.Auth.Completed'),
          (e.AuthHydrated = 'xCloud.Client.SDK.Auth.Hydrated'),
          (e.AuthUserTokenRefreshed =
            'xCloud.Client.SDK.Auth.UserTokenRefreshed'),
          (e.GameInviteAccepted = 'xCloud.Client.SDK.GameInviteAccepted'),
          (e.HttpCompleted = 'xCloud.Client.SDK.HttpRequestCompleted'),
          (e.HttpFailed = 'xCloud.Client.SDK.HttpRequestFailed'),
          (e.InputDevice = 'xCloud.Client.SDK.InputDevice'),
          (e.MediaSourceCodecSupport =
            'xCloud.Client.SDK.Browser.MediaSource.Codec.Support'),
          (e.MediaSourceSupport =
            'xCloud.Client.SDK.Browser.MediaSource.Support'),
          (e.MessageMismatchFieldType =
            'xCloud.Client.SDK.MessageMismatchFieldType'),
          (e.MessageMissingField = 'xCloud.Client.SDK.MessageMissingField'),
          (e.MicrophoneEnable = 'xCloud.Client.SDK.Microphone.Enable'),
          (e.MicrophoneDisable = 'xCloud.Client.SDK.Microphone.Disable'),
          (e.NonstandardGamepadConnected =
            'xCloud.Client.SDK.Gamepad.NonstandardConnected'),
          (e.SdkError = 'LogLevel.Error'),
          (e.SdkInitialized = 'xCloud.Client.SDK.Initialized'),
          (e.SdkWarning = 'LogLevel.Warning'),
          (e.SensorInitialization = 'xCloud.Client.SDK.SensorInitialization'),
          (e.SessionCancelled = 'xCloud.Client.SDK.Session.Cancelled'),
          (e.SessionConfiguration = 'xCloud.Client.SDK.Session.Configuration'),
          (e.SessionConnect = 'xCloud.Client.SDK.Session.Connect'),
          (e.SessionCreating = 'xCloud.Client.SDK.Session.Creating'),
          (e.SessionDisconnect = 'xCloud.Client.SDK.Session.Disconnect'),
          (e.SessionFailed = 'xCloud.Client.SDK.Session.Failed'),
          (e.SessionInvalidFrameMetadata =
            'xCloud.Client.SDK.Session.InvalidFrameMetadata'),
          (e.SessionNetworkQualityIndicatorSummary =
            'xCloud.Client.SDK.Session.NetworkQualityIndicatorSummary'),
          (e.SessionReady = 'xCloud.Client.SDK.Session.Ready'),
          (e.SessionReceivedSessionPath =
            'xCloud.Client.SDK.Session.ReceivedSessionPath'),
          (e.SessionReconnect = 'xCloud.Client.SDK.Session.Reconnect'),
          (e.SessionRedirected = 'xCloud.Client.SDK.Session.Redirected'),
          (e.SessionShutdown = 'xCloud.Client.SDK.Session.Shutdown'),
          (e.ServerInitiatedDisconnect =
            'xCloud.Client.SDK.StreamServerInitiatedDisconnect'),
          (e.ServicesDomainChanged =
            'xCloud.Client.SDK.EndpointSettings.ServicesDomainChanged'),
          (e.StateSharePrototypeInitiated =
            'xCloud.Client.SDK.StateShareDevToolInitiated'),
          (e.StreamMediaConfiguration =
            'xCloud.Client.SDK.Stream.Media.Configuration'),
          (e.StreamStatistics = 'xCloud.Client.SDK.Stream.Media.Statistics'),
          (e.StreamTitleChanged =
            'xCloud.Client.SDK.MicroManager.OnStreamTitleChanged'),
          (e.SystemUiCancel = 'xCloud.Client.SDK.SystemUi.Cancel'),
          (e.SystemUiCompleted = 'xCloud.Client.SDK.SystemUi.Completed'),
          (e.SystemUiMalformedResponse =
            'xCloud.Client.SDK.SystemUi.MalformedResponse'),
          (e.SystemUiRemoteCancellation =
            'xCloud.Client.SDK.SystemUi.RemoteCancellation'),
          (e.SystemUiShow = 'xCloud.Client.SDK.SystemUi.Show'),
          (e.UnknownKeyboardReading =
            'xCloud.Client.SDK.UnknownKeyboardReading'),
          (e.UnsupportedBrowserFeature =
            'xCloud.Client.SDK.Browser.UnsupportedFeature'),
          (e.VideoConfigurationUpdated =
            'xCloud.Client.SDK.Stream.Media.VideoConfigurationUpdated'),
          (e.VideoRestartStatistics =
            'xCloud.Client.SDK.Stream.Media.VideoRestartStatistics'),
          (e.VideoRenderBufferExceededCount =
            'xCloud.Client.SDK.Stream.Media.VideoRenderBufferExceededCount'),
          (e.WarningForBeingIdle = 'xCloud.Client.SDK.WarningForBeingIdle'));
      })(n || (n = {}));
      class a {
        constructor() {
          o()(this, 'telemetryHandler', void 0);
        }
        static get Instance() {
          return (this.instance || (this.instance = new a()), this.instance);
        }
        trackEvent(e, t) {
          var i;
          null === (i = this.telemetryHandler) ||
            void 0 === i ||
            i.onTrackEvent(e, t);
        }
        setHandler(e) {
          this.telemetryHandler = e;
        }
        setEnableLightweightTelemetry(e) {
          this.telemetryHandler &&
            (this.telemetryHandler.setEnableLightweightTelemetry(e),
            r.r.Instance.info(`LightweightTelemetry Provider enabled = ${e}`));
        }
        isLightweightTelemetryEnabled() {
          var e, t;
          return (
            null !==
              (e =
                null === (t = this.telemetryHandler) || void 0 === t
                  ? void 0
                  : t.isLightweightTelemetryEnabled()) &&
            void 0 !== e &&
            e
          );
        }
      }
      o()(a, 'instance', void 0);
    },
    74687(e, t, i) {
      i.d(t, { A: () => n });
      (i(97107), i(64727));
      const n = (e) =>
        'object' !== typeof e || e instanceof Error
          ? String(e)
          : JSON.stringify(e);
    },
    76203(e, t, i) {
      i.d(t, {
        Bf: () => a,
        Kg: () => r,
        Lm: () => o,
        Tn: () => l,
        y$: () => c,
        yy: () => h,
      });
      (i(97107), i(87050), i(10568));
      var n = i(37837),
        s = i(74687);
      const o = (e) => 'boolean' == typeof e;
      Object.assign(o, { toString: () => 'isBoolean' });
      const r = (e) => 'string' === typeof e || e instanceof String;
      Object.assign(r, { toString: () => 'isString' });
      const a = (e) => 'number' === typeof e && Number.isFinite(e);
      Object.assign(a, { toString: () => 'isFiniteNumber' });
      const l = (e) => 'function' === typeof e;
      Object.assign(l, { toString: () => 'isFunction' });
      const d = (e, t) => {
        for (const i in e) {
          if (t === e[i]) return !0;
        }
        return !1;
      };
      function c(e, { name: t = 'isEnumValue' } = {}) {
        return Object.assign(d.bind(null, e), { toString: () => t });
      }
      function h(
        e,
        {
          name: t = 'validate',
          ignoreNullish: i = !1,
          throwErrors: o = !1,
        } = {}
      ) {
        return Object.assign(
          function (r) {
            try {
              if (!r || 'object' !== typeof r || Array.isArray(r))
                throw new Error(
                  `Value passed into '${t}' was not an Object: ${typeof r}`
                );
              for (const n in e) {
                const o = e[n],
                  a = r[n];
                if ((!i || null != a) && !o(a)) {
                  let e = o.toString();
                  e.length > 50 && (e = e.slice(0, 50).concat('...'));
                  let i = (0, s.A)(a);
                  throw (
                    i.length > 50 && (i = i.slice(0, 50).concat('...')),
                    new Error(
                      `Value '${i}' of '${n}' for '${t}' was invalid according to method '${e}'`
                    )
                  );
                }
              }
              return !0;
            } catch (a) {
              const e = (0, n.g)(a);
              if (o) throw e;
              return !1;
            }
          },
          { toString: () => t }
        );
      }
      Object.assign(d, { toString: () => 'isEnumValue' });
    },
    76753(e, t, i) {
      i.d(t, { CW: () => s, JQ: () => o, kE: () => a, ws: () => n });
      var n;
      (i(81045),
        i(55367),
        i(75604),
        i(41532),
        i(32950),
        i(73599),
        i(64770),
        i(62080),
        i(97012),
        i(31274),
        i(29548),
        i(47342),
        i(14825),
        i(92467),
        i(67497),
        i(88236),
        i(47010));
      !(function (e) {
        ((e[(e.Success = 0)] = 'Success'),
          (e[(e.NotReady = -2147024875)] = 'NotReady'),
          (e[(e.OperationPending = -2147483638)] = 'OperationPending'),
          (e[(e.Bounds = -2147483637)] = 'Bounds'),
          (e[(e.IllegalMethodCall = -2147483634)] = 'IllegalMethodCall'),
          (e[(e.ApplicationExiting = -2147483622)] = 'ApplicationExiting'),
          (e[(e.NotImplemented = -2147467263)] = 'NotImplemented'),
          (e[(e.NoInterface = -2147467262)] = 'NoInterface'),
          (e[(e.InvalidPointer = -2147467261)] = 'InvalidPointer'),
          (e[(e.Aborted = -2147467260)] = 'Aborted'),
          (e[(e.Failed = -2147467259)] = 'Failed'),
          (e[(e.Unexpected = -2147418113)] = 'Unexpected'),
          (e[(e.IoFailure = -2147316574)] = 'IoFailure'),
          (e[(e.AccessDenied = -2147024891)] = 'AccessDenied'),
          (e[(e.InvalidHandle = -2147024890)] = 'InvalidHandle'),
          (e[(e.OutOfMemory = -2147024882)] = 'OutOfMemory'),
          (e[(e.Unsupported = -2147024846)] = 'Unsupported'),
          (e[(e.InvalidArgument = -2147024809)] = 'InvalidArgument'),
          (e[(e.InsufficientBuffer = -2147024774)] = 'InsufficientBuffer'),
          (e[(e.InvalidState = -2147019873)] = 'InvalidState'),
          (e[(e.AbiVersionMismatch = -2147023590)] = 'AbiVersionMismatch'),
          (e[(e.InvalidLocale = -2147009793)] = 'InvalidLocale'),
          (e[(e.UnknownString = -2147009863)] = 'UnknownString'),
          (e[(e.OnlEActionRequired = -2138701812)] = 'OnlEActionRequired'),
          (e[(e.InvalidJsonString = -2089484281)] = 'InvalidJsonString'),
          (e[(e.WebEUnexpectedContent = -2089484283)] =
            'WebEUnexpectedContent'),
          (e[(e.BadLength = -2147024872)] = 'BadLength'),
          (e[(e.ArithmeticOverflow = -2147024362)] = 'ArithmeticOverflow'),
          (e[(e.NotFound = -2147023728)] = 'NotFound'),
          (e[(e.FatalApplicationExit = -2147024183)] = 'FatalApplicationExit'),
          (e[(e.Cancelled = -2147023673)] = 'Cancelled'),
          (e[(e.NoSuchUser = -2147023579)] = 'NoSuchUser'),
          (e[(e.BadConfiguration = -2147023286)] = 'BadConfiguration'),
          (e[(e.ResourceDataNotFound = -2147023084)] = 'ResourceDataNotFound'),
          (e[(e.JsonValueNotFound = -2089484279)] = 'JsonValueNotFound'),
          (e[(e.NoNetwork = -2147023674)] = 'NoNetwork'),
          (e[(e.InternetNameNotResolved = -2147012889)] =
            'InternetNameNotResolved'),
          (e[(e.ServiceSpecificError = -2147023830)] = 'ServiceSpecificError'),
          (e[(e.Timeout = -2147024638)] = 'Timeout'),
          (e[(e.SSLException = -2147012841)] = 'SSLException'),
          (e[(e.AuthUnauthorized = -2145844847)] = 'AuthUnauthorized'),
          (e[(e.Conflict = -2145844839)] = 'Conflict'),
          (e[(e.Gone = -2145844838)] = 'Gone'),
          (e[(e.NoEntitlement = -2143322111)] = 'NoEntitlement'),
          (e[(e.GamePassExpired = -2143322098)] = 'GamePassExpired'),
          (e[(e.XboxLiveAccountCurfew = -2146051059)] =
            'XboxLiveAccountCurfew'),
          (e[(e.BlockedByParentalControls = -2117991998)] =
            'BlockedByParentalControls'),
          (e[(e.BlockedByScreenTime = -2136865785)] = 'BlockedByScreenTime'),
          (e[(e.BlockedByAppTime = -2015297515)] = 'BlockedByAppTime'),
          (e[(e.AppOutsideCurfew = -2015297516)] = 'AppOutsideCurfew'),
          (e[
            (e.TransferTokenMicrosoftAccountUnfamiliarLocation = -2147186433)
          ] = 'TransferTokenMicrosoftAccountUnfamiliarLocation'),
          (e[(e.TransferTokenMicrosoftAccountProofUp = -2147186613)] =
            'TransferTokenMicrosoftAccountProofUp'),
          (e[(e.SigninCountByDeviceTypeExceeded = -2146051050)] =
            'SigninCountByDeviceTypeExceeded'),
          (e[(e.TitleSinglePointOfPresenceViolated = -2146051042)] =
            'TitleSinglePointOfPresenceViolated'),
          (e[(e.GamePointOfPresenceViolated = -2146051073)] =
            'GamePointOfPresenceViolated'),
          (e[(e.AuthInvalidOffering = -2015756287)] = 'AuthInvalidOffering'),
          (e[(e.AuthBadToken = -2015756286)] = 'AuthBadToken'),
          (e[(e.TitleIdInUse = -2015756285)] = 'TitleIdInUse'),
          (e[(e.InvalidServicesDomain = -2015756284)] =
            'InvalidServicesDomain'),
          (e[(e.UnsupportedMarketOrFlight = -2015756283)] =
            'UnsupportedMarketOrFlight'),
          (e[(e.SigninBlockedByPasswordPrompt = -2015756282)] =
            'SigninBlockedByPasswordPrompt'),
          (e[(e.ConsoleStreamingDisabled = -2015756281)] =
            'ConsoleStreamingDisabled'),
          (e[(e.StreamingVersionNotRecognized = -2015756280)] =
            'StreamingVersionNotRecognized'),
          (e[(e.StreamingVersionObsolete = -2015756279)] =
            'StreamingVersionObsolete'),
          (e[(e.TitleOffline = -2015756278)] = 'TitleOffline'),
          (e[(e.SessionResumedElsewhere = -2015756277)] =
            'SessionResumedElsewhere'),
          (e[(e.AuthExpiredToken = -2015756276)] = 'AuthExpiredToken'),
          (e[(e.ServiceInternalError = -2015756275)] = 'ServiceInternalError'),
          (e[(e.TrialTimeExpired = -2015756273)] = 'TrialTimeExpired'),
          (e[(e.TrialAccessDenied = -2015756272)] = 'TrialAccessDenied'),
          (e[(e.ManagedDevkitUnauthorized = -2015756271)] =
            'ManagedDevkitUnauthorized'),
          (e[(e.ManagedDevkitAccessToAccountDenied = -2015756270)] =
            'ManagedDevkitAccessToAccountDenied'),
          (e[(e.ManagedDevkitInvalidRedeemCode = -2015756269)] =
            'ManagedDevkitInvalidRedeemCode'),
          (e[(e.ManagedDevkitAccountDoesNotExist = -2015756268)] =
            'ManagedDevkitAccountDoesNotExist'),
          (e[(e.ManagedDevkitSessionDoesNotExist = -2015756267)] =
            'ManagedDevkitSessionDoesNotExist'),
          (e[(e.ManagedDevkitStreamingSessionDoesNotExist = -2015756266)] =
            'ManagedDevkitStreamingSessionDoesNotExist'),
          (e[
            (e.ManagedDevkitStreamingSessionNotInExpectedState = -2015756265)
          ] = 'ManagedDevkitStreamingSessionNotInExpectedState'),
          (e[(e.ManagedDevkitStreamingSessionNoValidPassword = -2015756264)] =
            'ManagedDevkitStreamingSessionNoValidPassword'),
          (e[(e.ManagedDevkitAccessToSessionDenied = -2015756263)] =
            'ManagedDevkitAccessToSessionDenied'),
          (e[(e.MonthlyLimitExceeded = -2015756262)] = 'MonthlyLimitExceeded'),
          (e[(e.Unknown = -1879048193)] = 'Unknown'));
      })(n || (n = {}));
      const s = new Array(
          n.NoEntitlement,
          n.TitleIdInUse,
          n.TitleOffline,
          n.GamePassExpired,
          n.XboxLiveAccountCurfew,
          n.BlockedByParentalControls,
          n.BlockedByScreenTime,
          n.BlockedByAppTime,
          n.TransferTokenMicrosoftAccountUnfamiliarLocation,
          n.TransferTokenMicrosoftAccountProofUp,
          n.ServiceSpecificError,
          n.ServiceInternalError,
          n.TrialTimeExpired,
          n.TrialAccessDenied,
          n.ManagedDevkitUnauthorized,
          n.ManagedDevkitAccessToAccountDenied,
          n.ManagedDevkitInvalidRedeemCode,
          n.ManagedDevkitAccountDoesNotExist,
          n.ManagedDevkitSessionDoesNotExist,
          n.ManagedDevkitStreamingSessionDoesNotExist,
          n.ManagedDevkitStreamingSessionNotInExpectedState,
          n.ManagedDevkitStreamingSessionNoValidPassword,
          n.ManagedDevkitAccessToSessionDenied,
          n.MonthlyLimitExceeded,
          n.Unknown
        ),
        o = (e) => {
          if (null == e) return n.Unknown;
          const t = Number(e);
          return t in n ? t : n.Unknown;
        },
        r = Object.entries(n).reduce(
          (e, [t, i]) => ('number' !== typeof i || isNaN(i) || e.set(i, t), e),
          new Map()
        ),
        a = (e) => r.get(e);
    },
    78911(e, t, i) {
      i.d(t, { Ay: () => d, pA: () => l });
      i(93510);
      var n = i(52821),
        s = i(41178),
        o = i(52468),
        r = i(88262),
        a = i(16556);
      const l = Symbol('instance');
      const d = (0, n.v4G)(
        [a.H.GameStream],
        new n.sVo({ [l]: r.LCE_NOT_REQUESTED })
          .on(o.Hd.start.getType(), (e, t) =>
            (0, s.jM)(e, (t) => {
              t[l] = (0, r.lceFetching)(e[l]);
            })
          )
          .on(o.Hd.success.getType(), (e, { instance: t }) =>
            (0, s.jM)(e, (e) => {
              e[l] = (0, r.lceContent)(t);
            })
          )
          .on(o.Hd.error.getType(), (e, { error: t }) =>
            (0, s.jM)(e, (i) => {
              i[l] = (0, r.lceError)(t, e[l]);
            })
          )
          .on(o.bK.getType(), (e, t) =>
            (0, s.jM)(e, (e) => {
              e[l] = r.LCE_NOT_REQUESTED;
            })
          )
          .build()
      );
    },
    79406(e, t, i) {
      i.d(t, { F: () => r, w: () => n });
      var n,
        s = i(76203);
      !(function (e) {
        ((e.Stereo = 'Stereo'), (e.Mono = 'Mono'));
      })(n || (n = {}));
      const o = {
          enableMicrophone: s.Lm,
          gameVolumeLevel: s.Bf,
          useHardwareAudioDecoding: s.Lm,
          audioMode: (0, s.y$)(n, { name: 'isAudioMode' }),
          enableGameChat: s.Lm,
          outputDeviceSinkId: s.Kg,
        },
        r = (0, s.yy)(o, {
          name: 'validateAudioConfiguration',
          ignoreNullish: !0,
          throwErrors: !0,
        });
    },
    82361(e, t, i) {
      var n;
      function s(e, t = 0) {
        let i = 0;
        (e.DPadUp && (i |= n.DPadUp),
          e.DPadDown && (i |= n.DPadDown),
          e.DPadLeft && (i |= n.DPadLeft),
          e.DPadRight && (i |= n.DPadRight),
          e.Menu && (i |= n.Menu),
          e.View && (i |= n.View),
          e.LeftThumb && (i |= n.LeftThumb),
          e.RightThumb && (i |= n.RightThumb),
          e.LeftShoulder && (i |= n.LeftShoulder),
          e.RightShoulder && (i |= n.RightShoulder),
          e.Nexus && (i |= n.Nexus),
          e.A && (i |= n.A),
          e.B && (i |= n.B),
          e.X && (i |= n.X),
          e.Y && (i |= n.Y),
          e.LeftTrigger && (i |= n.LeftTrigger),
          e.RightTrigger && (i |= n.RightTrigger));
        let s = Math.hypot(e.LeftThumbXAxis, e.LeftThumbYAxis),
          o = s <= t;
        return (
          o || ((i |= n.LeftThumbXAxis), (i |= n.LeftThumbYAxis)),
          (s = Math.hypot(e.RightThumbXAxis, e.RightThumbYAxis)),
          (o = s <= t),
          o || ((i |= n.RightThumbXAxis), (i |= n.RightThumbYAxis)),
          i
        );
      }
      (i.d(t, { J: () => n, Z: () => s }),
        (function (e) {
          ((e[(e.None = 0)] = 'None'),
            (e[(e.DPadUp = 1)] = 'DPadUp'),
            (e[(e.DPadDown = 2)] = 'DPadDown'),
            (e[(e.DPadLeft = 4)] = 'DPadLeft'),
            (e[(e.DPadRight = 8)] = 'DPadRight'),
            (e[(e.Menu = 16)] = 'Menu'),
            (e[(e.View = 32)] = 'View'),
            (e[(e.LeftThumb = 64)] = 'LeftThumb'),
            (e[(e.RightThumb = 128)] = 'RightThumb'),
            (e[(e.LeftShoulder = 256)] = 'LeftShoulder'),
            (e[(e.RightShoulder = 512)] = 'RightShoulder'),
            (e[(e.Nexus = 1024)] = 'Nexus'),
            (e[(e.Misc = 2048)] = 'Misc'),
            (e[(e.A = 4096)] = 'A'),
            (e[(e.B = 8192)] = 'B'),
            (e[(e.X = 16384)] = 'X'),
            (e[(e.Y = 32768)] = 'Y'),
            (e[(e.LeftTrigger = 65536)] = 'LeftTrigger'),
            (e[(e.RightTrigger = 131072)] = 'RightTrigger'),
            (e[(e.LeftThumbXAxis = 262144)] = 'LeftThumbXAxis'),
            (e[(e.LeftThumbYAxis = 524288)] = 'LeftThumbYAxis'),
            (e[(e.RightThumbXAxis = 1048576)] = 'RightThumbXAxis'),
            (e[(e.RightThumbYAxis = 2097152)] = 'RightThumbYAxis'));
        })(n || (n = {})));
    },
    84048(e, t, i) {
      function n(e) {
        return 'getCurrentLogArray' in e;
      }
      i.d(t, { k: () => n });
    },
    86923(e, t, i) {
      i.d(t, { C: () => h });
      (i(62234), i(47748), i(47010));
      var n = i(14041),
        s = i(53677),
        o = i(15387),
        r = i(41243),
        a = i(87309),
        l = i(95505),
        d = i(57333),
        c = i(32057);
      const h = (e, t = !1) => {
        const { developerSettingsStore: i, stickyQueryStrings: h } = (0, d.A)(),
          u = (0, s.d4)(c.TX),
          g = (0, o.G_)(a.H.EnableOverrideDevSettings),
          m = (0, r.D)(),
          p = (0, n.useCallback)(() => {
            const n = `devTools.${e}`,
              s = i.getSetting(e),
              o = Object.values(l.xr.DevTools).includes(n),
              r = l.F5.includes(n);
            if ((g ? !r || !m : !u) || !o || t) return s;
            switch (typeof s) {
              case 'boolean':
                return h.getBoolean(n, s);
              case 'string':
                return h.getString(n, s);
              default:
                return s;
            }
          }, [i, g, t, m, u, e, h]),
          [v, S] = (0, n.useState)(() => p());
        (0, n.useEffect)(() => {
          const t = () => {
            S(p());
          };
          return (
            i.addOnKeyUpdateListener(e, t),
            () => i.removeOnKeyUpdateListener(e, t)
          );
        }, [i, e, p]);
        return [
          v,
          (t) => {
            i.setSetting(e, t);
          },
        ];
      };
    },
    89407(e, t, i) {
      i.d(t, {
        Cv: () => l,
        EA: () => h,
        KB: () => r,
        KM: () => d,
        UR: () => a,
        Ug: () => c,
        _P: () => o,
        jy: () => s,
      });
      (i(98376), i(14293));
      var n = i(79367);
      Number(n.z7.replace('px', ''));
      const s = Number(n.jy.replace('px', '')),
        o = Number(n._P.replace('px', '')),
        r = Number(n.KB.replace('px', '')),
        a = Number(n.UR.replace('px', '')),
        l = Number(n.Cv.replace('px', '')),
        d = Number(n.KM.replace('px', '')),
        c = Number(n.Ug.replace('px', ''));
      var h;
      !(function (e) {
        ((e[(e.SmallPortrait = 0)] = 'SmallPortrait'),
          (e[(e.SmallLandscape = 1)] = 'SmallLandscape'),
          (e[(e.Medium = 2)] = 'Medium'),
          (e[(e.Large = 3)] = 'Large'),
          (e[(e.XLarge = 4)] = 'XLarge'),
          (e[(e.XXLarge = 5)] = 'XXLarge'),
          (e[(e.XXXLarge = 6)] = 'XXXLarge'));
      })(h || (h = {}));
    },
    90101(e, t, i) {
      var n;
      (i.d(t, { L: () => n }),
        (function (e) {
          ((e.DecodePerformance = 'DecodePerformance'),
            (e.Jitter = 'Jitter'),
            (e.PacketLoss = 'PacketLoss'),
            (e.Ping = 'Ping'));
        })(n || (n = {})));
    },
    90507(e, t, i) {
      i.d(t, { W: () => l });
      var n = i(58212),
        s = i.n(n),
        o = i(76753),
        r = i(31622);
      const a =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      class l {
        constructor(e, t) {
          if (
            (s()(this, 'vector', void 0),
            s()(this, 'value', 0),
            s()(this, 'logger', void 0),
            (this.logger = r.r.Instance),
            e)
          ) {
            const i = e.split('.');
            this.vector = t ? i[0] : e;
          } else this.vector = l.makeBase();
        }
        static makeBase() {
          let e = '';
          for (let t = 0; t < 22; t++)
            e += a.charAt(Math.floor(64 * Math.random()));
          return e;
        }
        getValue() {
          return `${this.vector}.${this.value}`;
        }
        getBase() {
          return this.vector.split('.')[0];
        }
        increment() {
          return (this.value++, this);
        }
        extend() {
          return (
            this.vector.length + 2 >= 127 &&
              this.logger.throw(
                'Correlation vector is too long!',
                o.ws.BadConfiguration
              ),
            new l(this.getValue())
          );
        }
      }
    },
    97406(e, t, i) {
      i.d(t, {
        $B: () => s,
        Cv: () => k,
        Fg: () => M,
        Lh: () => S,
        NP: () => P,
        Qs: () => w,
        RE: () => A,
        SE: () => g,
        Sl: () => h,
        TZ: () => c,
        VU: () => u,
        W8: () => m,
        WT: () => v,
        Yu: () => I,
        dr: () => R,
        iz: () => d,
        mb: () => n,
        ot: () => E,
        pY: () => p,
        pu: () => D,
        qb: () => T,
        sl: () => x,
        t: () => y,
        yB: () => f,
        yy: () => C,
      });
      var n,
        s,
        o = i(58212),
        r = i.n(o),
        a =
          (i(69375),
          i(10785),
          i(78357),
          i(46196),
          i(50821),
          i(36554),
          i(68472),
          i(41696),
          i(81045),
          i(45950),
          i(75604),
          i(41532),
          i(32950),
          i(73599),
          i(64770),
          i(62080),
          i(97012),
          i(31274),
          i(29548),
          i(47342),
          i(14825),
          i(92467),
          i(67497),
          i(88236),
          i(4793),
          i(17216),
          i(66653),
          i(77706),
          i(45023),
          i(14972),
          i(12991),
          i(47010),
          i(91211)),
        l = i(82361);
      (!(function (e) {
        ((e[(e.IntervalTimer = 0)] = 'IntervalTimer'),
          (e[(e.IntervalWorkerThread = 1)] = 'IntervalWorkerThread'));
      })(n || (n = {})),
        (function (e) {
          ((e[(e.None = 0)] = 'None'),
            (e[(e.Metadata = 1)] = 'Metadata'),
            (e[(e.GamepadReport = 2)] = 'GamepadReport'),
            (e[(e.PointerReport = 4)] = 'PointerReport'),
            (e[(e.ClientMetadata = 8)] = 'ClientMetadata'),
            (e[(e.ServerMetadata = 16)] = 'ServerMetadata'),
            (e[(e.Mouse = 32)] = 'Mouse'),
            (e[(e.Keyboard = 64)] = 'Keyboard'),
            (e[(e.Vibration = 128)] = 'Vibration'),
            (e[(e.SensorReport = 256)] = 'SensorReport'),
            (e[(e.UnreliableInputReport = 512)] = 'UnreliableInputReport'),
            (e[(e.UnreliableInputAck = 1024)] = 'UnreliableInputAck'));
        })(s || (s = {})));
      const d = {
          GamepadIndex: 0,
          A: 0,
          B: 0,
          X: 0,
          Y: 0,
          LeftShoulder: 0,
          RightShoulder: 0,
          LeftTrigger: 0,
          RightTrigger: 0,
          View: 0,
          Menu: 0,
          LeftThumb: 0,
          RightThumb: 0,
          DPadUp: 0,
          DPadDown: 0,
          DPadLeft: 0,
          DPadRight: 0,
          Nexus: 0,
          LeftThumbXAxis: 0,
          LeftThumbYAxis: 0,
          RightThumbXAxis: 0,
          RightThumbYAxis: 0,
          PhysicalPhysicality: 0,
          VirtualPhysicality: 0,
          Dirty: !1,
          Virtual: !1,
        },
        c = 1,
        h = 6;
      var u, g, m, p, v;
      (!(function (e) {
        e[(e.FourMotorRumble = 0)] = 'FourMotorRumble';
      })(u || (u = {})),
        (function (e) {
          ((e.None = 'relative'),
            (e.Arrow = 'default'),
            (e.Hand = 'pointer'),
            (e.Ibeam = 'text'));
        })(g || (g = {})),
        (function (e) {
          ((e[(e.Relative = 0)] = 'Relative'),
            (e[(e.Absolute = 1)] = 'Absolute'));
        })(m || (m = {})),
        (function (e) {
          ((e[(e.Pixels = 0)] = 'Pixels'),
            (e[(e.Line = 1)] = 'Line'),
            (e[(e.Page = 2)] = 'Page'));
        })(p || (p = {})),
        (function (e) {
          ((e[(e.Unknown = 0)] = 'Unknown'),
            (e[(e.Unreliable = 1)] = 'Unreliable'),
            (e[(e.Approximate = 2)] = 'Approximate'),
            (e[(e.Accurate = 3)] = 'Accurate'));
        })(v || (v = {})));
      const S = {
        accelerationX: 0,
        accelerationY: 0,
        accelerationZ: 0,
        accelerationTimestamp: 0,
        angularVelocityX: 0,
        angularVelocityY: 0,
        angularVelocityZ: 0,
        angularVelocityTimestamp: 0,
        magneticFieldX: 0,
        magneticFieldY: 0,
        magneticFieldZ: 0,
        magneticFieldTimestamp: 0,
        orientationW: 0,
        orientationX: 0,
        orientationY: 0,
        orientationZ: 0,
        orientationTimestamp: 0,
        accelerationAccuracy: v.Unknown,
        angularVelocityAccuracy: v.Unknown,
        magneticFieldAccuracy: v.Unknown,
        orientationAccuracy: v.Unknown,
      };
      class f {
        constructor() {
          (r()(this, 'discriminator', void 0), (this.discriminator = 0));
        }
        markStateChange(e = 1) {
          this.discriminator += e;
        }
        isStateChanged(e) {
          return this.discriminator !== e.discriminator;
        }
      }
      var y, w;
      !(function (e) {
        ((e[(e.DpadUp = 0)] = 'DpadUp'),
          (e[(e.DpadDown = 1)] = 'DpadDown'),
          (e[(e.DpadLeft = 2)] = 'DpadLeft'),
          (e[(e.DpadRight = 3)] = 'DpadRight'),
          (e[(e.Menu = 4)] = 'Menu'),
          (e[(e.View = 5)] = 'View'),
          (e[(e.LeftThumb = 6)] = 'LeftThumb'),
          (e[(e.RightThumb = 7)] = 'RightThumb'),
          (e[(e.LeftShoulder = 8)] = 'LeftShoulder'),
          (e[(e.RightShoulder = 9)] = 'RightShoulder'),
          (e[(e.Nexus = 10)] = 'Nexus'),
          (e[(e.Share = 11)] = 'Share'),
          (e[(e.A = 12)] = 'A'),
          (e[(e.B = 13)] = 'B'),
          (e[(e.X = 14)] = 'X'),
          (e[(e.Y = 15)] = 'Y'),
          (e[(e.EnumLength = 16)] = 'EnumLength'));
      })(y || (y = {}));
      class C extends f {
        constructor() {
          (super(),
            r()(this, 'gamepadId', void 0),
            r()(this, 'transitionCount', void 0),
            r()(this, 'triggerLeft', void 0),
            r()(this, 'triggerRight', void 0),
            r()(this, 'thumbLX', void 0),
            r()(this, 'thumbLY', void 0),
            r()(this, 'thumbRX', void 0),
            r()(this, 'thumbRY', void 0),
            r()(this, 'physicalPhysicality', void 0),
            r()(this, 'virtualPhysicality', void 0),
            (this.gamepadId = 0),
            (this.transitionCount = new Uint8Array(y.EnumLength)),
            (this.triggerLeft = 0),
            (this.triggerRight = 0),
            (this.thumbLX = 0),
            (this.thumbLY = 0),
            (this.thumbRX = 0),
            (this.thumbRY = 0),
            (this.physicalPhysicality = l.J.None),
            (this.virtualPhysicality = l.J.None));
        }
        isEqual(e) {
          for (let t = 0; t < y.EnumLength; t++)
            if (this.transitionCount[t] != e.transitionCount[t]) return !1;
          return (
            this.triggerLeft === e.triggerLeft &&
            this.triggerRight === e.triggerRight &&
            this.thumbLX === e.thumbLX &&
            this.thumbLY === e.thumbLY &&
            this.thumbRX === e.thumbRX &&
            this.thumbRY === e.thumbRY &&
            this.physicalPhysicality === e.physicalPhysicality &&
            this.virtualPhysicality === e.virtualPhysicality
          );
        }
        copyFrom(e) {
          this.discriminator = e.discriminator;
          for (let t = 0; t < y.EnumLength; t++)
            this.transitionCount[t] = e.transitionCount[t];
          ((this.triggerLeft = e.triggerLeft),
            (this.triggerRight = e.triggerRight),
            (this.thumbLX = e.thumbLX),
            (this.thumbLY = e.thumbLY),
            (this.thumbRX = e.thumbRX),
            (this.thumbRY = e.thumbRY),
            (this.physicalPhysicality = e.physicalPhysicality),
            (this.virtualPhysicality = e.virtualPhysicality));
        }
      }
      !(function (e) {
        ((e[(e.PointerUpDown = 0)] = 'PointerUpDown'),
          (e[(e.PointerMove = 1)] = 'PointerMove'),
          (e[(e.EnumLength = 2)] = 'EnumLength'));
      })(w || (w = {}));
      class T extends f {
        constructor() {
          (super(),
            r()(this, 'pointerId', void 0),
            r()(this, 'pointerStateCountByStateType', void 0),
            r()(this, 'x', void 0),
            r()(this, 'y', void 0),
            r()(this, 'pressure', void 0),
            r()(this, 'twist', void 0),
            r()(this, 'width', void 0),
            r()(this, 'height', void 0),
            r()(this, 'clientWidth', void 0),
            r()(this, 'clientHeight', void 0),
            (this.pointerId = 0),
            (this.pointerStateCountByStateType = new Uint8Array(w.EnumLength)),
            (this.x = 0),
            (this.y = 0),
            (this.pressure = 0),
            (this.twist = 0),
            (this.width = 0),
            (this.height = 0));
        }
        isPointerUp() {
          return this.pointerStateCountByStateType[w.PointerUpDown] % 2 === 0;
        }
        isEqual(e) {
          for (let t = 0; t < w.EnumLength; t++)
            if (
              this.pointerStateCountByStateType[t] !==
              e.pointerStateCountByStateType[t]
            )
              return !1;
          return (
            this.pointerId === e.pointerId &&
            this.x === e.x &&
            this.y === e.y &&
            this.pressure === e.pressure &&
            this.twist === e.twist &&
            this.width === e.width &&
            this.height === e.height &&
            this.clientWidth === e.clientWidth &&
            this.clientHeight === e.clientHeight
          );
        }
        copyFrom(e) {
          this.discriminator = e.discriminator;
          for (let t = 0; t < w.EnumLength; t++)
            this.pointerStateCountByStateType[t] =
              e.pointerStateCountByStateType[t];
          ((this.pointerId = e.pointerId),
            (this.x = e.x),
            (this.y = e.y),
            (this.pressure = e.pressure),
            (this.twist = e.twist),
            (this.width = e.width),
            (this.height = e.height),
            (this.clientWidth = e.clientWidth),
            (this.clientHeight = e.clientHeight));
        }
      }
      const b = 256;
      class k extends f {
        constructor() {
          (super(),
            r()(this, 'transitionCount', void 0),
            (this.transitionCount = new Uint8Array(b)));
        }
        isKeyDown(e) {
          return !(e >= b || e < 0) && this.transitionCount[e] % 2 === 1;
        }
        isEqual(e) {
          for (let t = 0; t < b; t++)
            if (this.transitionCount[t] !== e.transitionCount[t]) return !1;
          return !0;
        }
        copyFrom(e) {
          this.discriminator = e.discriminator;
          for (let t = 0; t < b; t++)
            this.transitionCount[t] = e.transitionCount[t];
        }
      }
      class I {
        constructor() {
          (r()(this, 'changedKeys', void 0), (this.changedKeys = new Map()));
        }
      }
      var A, x;
      (!(function (e) {
        ((e[(e.Left = 1)] = 'Left'),
          (e[(e.Right = 2)] = 'Right'),
          (e[(e.Middle = 4)] = 'Middle'),
          (e[(e.XButton1 = 8)] = 'XButton1'),
          (e[(e.XButton2 = 16)] = 'XButton2'));
      })(A || (A = {})),
        (function (e) {
          ((e[(e.Left = 0)] = 'Left'),
            (e[(e.Right = 1)] = 'Right'),
            (e[(e.Middle = 2)] = 'Middle'),
            (e[(e.XButton1 = 3)] = 'XButton1'),
            (e[(e.XButton2 = 4)] = 'XButton2'),
            (e[(e.ButtonCount = 8)] = 'ButtonCount'));
        })(x || (x = {})));
      class E extends f {
        constructor() {
          (super(),
            r()(this, 'transitionCount', void 0),
            r()(this, 'x', void 0),
            r()(this, 'y', void 0),
            r()(this, 'wheelX', void 0),
            r()(this, 'wheelY', void 0),
            r()(this, 'type', void 0),
            (this.transitionCount = new Uint8Array(x.ButtonCount)),
            (this.x = 0),
            (this.y = 0),
            (this.wheelX = 0),
            (this.wheelY = 0),
            (this.type = m.Relative));
        }
        isButtonDown(e) {
          return (
            !(e >= x.ButtonCount || e < 0) && this.transitionCount[e] % 2 === 1
          );
        }
        isEqual(e) {
          for (let t = 0; t < x.ButtonCount; t++)
            if (this.transitionCount[t] !== e.transitionCount[t]) return !1;
          return (
            this.x === e.x &&
            this.y === e.y &&
            this.wheelX === e.wheelX &&
            this.wheelY === e.wheelY &&
            this.type === e.type
          );
        }
        copyFrom(e) {
          this.discriminator = e.discriminator;
          for (let t = 0; t < x.ButtonCount; t++)
            this.transitionCount[t] = e.transitionCount[t];
          ((this.x = e.x),
            (this.y = e.y),
            (this.wheelX = e.wheelX),
            (this.wheelY = e.wheelY),
            (this.type = e.type));
        }
      }
      class M {
        constructor() {
          (r()(this, 'changedGamepads', void 0),
            r()(this, 'changedPointers', void 0),
            r()(this, 'changedKeyboard', void 0),
            r()(this, 'changedMouse', void 0),
            r()(this, 'lockKeysState', void 0),
            (this.changedGamepads = new Array()),
            (this.changedPointers = new Array()),
            (this.lockKeysState = new R()));
        }
        isEmpty() {
          return (
            0 === this.changedGamepads.length &&
            0 === this.changedPointers.length &&
            void 0 === this.changedKeyboard &&
            void 0 === this.changedMouse &&
            !this.lockKeysState.isInitialized()
          );
        }
      }
      class P {
        constructor(e) {
          (r()(this, 'frameId', void 0),
            r()(this, 'gamepad', void 0),
            r()(this, 'pointers', void 0),
            r()(this, 'keyboard', void 0),
            r()(this, 'mouse', void 0),
            r()(this, 'lockKeysState', void 0),
            (this.frameId = e),
            (this.gamepad = new C()),
            (this.pointers = new Array()),
            (this.keyboard = new k()),
            (this.mouse = new E()),
            (this.lockKeysState = new R()));
        }
        calculateChanges(e) {
          const t = new M();
          this.gamepad.isStateChanged(e.gamepad) ||
          !this.gamepad.isEqual(e.gamepad)
            ? (t.changedGamepads = [this.gamepad])
            : (t.changedGamepads = new Array());
          for (const i of this.pointers) {
            const n = e.pointers.find((e) => e.pointerId === i.pointerId);
            (void 0 !== n && !n.isStateChanged(i) && n.isEqual(i)) ||
              t.changedPointers.push(i);
          }
          if (
            this.keyboard.isStateChanged(e.keyboard) ||
            !this.keyboard.isEqual(e.keyboard)
          ) {
            const i = new I();
            for (let t = 0; t < b; t++)
              this.keyboard.transitionCount[t] !==
                e.keyboard.transitionCount[t] &&
                i.changedKeys.set(t, this.keyboard.transitionCount[t]);
            t.changedKeyboard = i;
          } else t.changedKeyboard = void 0;
          return (
            this.mouse.isStateChanged(e.mouse) || !this.mouse.isEqual(e.mouse)
              ? (t.changedMouse = this.mouse)
              : (t.changedMouse = void 0),
            this.lockKeysState.isInitialized() &&
              !this.lockKeysState.isEqual(e.lockKeysState) &&
              t.lockKeysState.copyFrom(this.lockKeysState),
            t
          );
        }
        isStateChanged(e) {
          let t = !1;
          if (
            e.gamepad.discriminator === this.gamepad.discriminator &&
            e.mouse.discriminator === this.mouse.discriminator &&
            e.keyboard.discriminator === this.keyboard.discriminator &&
            e.pointers.length === this.pointers.length &&
            e.lockKeysState.isEqual(this.lockKeysState)
          )
            for (const i of this.pointers) {
              const n = e.pointers.find((e) => e.pointerId === i.pointerId);
              if (void 0 === n || i.discriminator !== n.discriminator) {
                t = !0;
                break;
              }
            }
          else t = !0;
          return t;
        }
        copyFrom(e) {
          for (
            this.frameId = e.frameId, this.gamepad.copyFrom(e.gamepad);
            this.pointers.length < e.pointers.length;
          )
            this.pointers.push(new T());
          for (let t = 0; t < e.pointers.length; t++)
            this.pointers[t].copyFrom(e.pointers[t]);
          ((this.pointers.length = e.pointers.length),
            this.keyboard.copyFrom(e.keyboard),
            this.mouse.copyFrom(e.mouse),
            this.lockKeysState.copyFrom(e.lockKeysState));
        }
      }
      const D = {
        KeyA: 4,
        KeyB: 5,
        KeyC: 6,
        KeyD: 7,
        KeyE: 8,
        KeyF: 9,
        KeyG: 10,
        KeyH: 11,
        KeyI: 12,
        KeyJ: 13,
        KeyK: 14,
        KeyL: 15,
        KeyM: 16,
        KeyN: 17,
        KeyO: 18,
        KeyP: 19,
        KeyQ: 20,
        KeyR: 21,
        KeyS: 22,
        KeyT: 23,
        KeyU: 24,
        KeyV: 25,
        KeyW: 26,
        KeyX: 27,
        KeyY: 28,
        KeyZ: 29,
        Digit1: 30,
        Digit2: 31,
        Digit3: 32,
        Digit4: 33,
        Digit5: 34,
        Digit6: 35,
        Digit7: 36,
        Digit8: 37,
        Digit9: 38,
        Digit0: 39,
        Enter: 40,
        Escape: 41,
        Backspace: 42,
        Tab: 43,
        Space: 44,
        Minus: 45,
        Equal: 46,
        BracketLeft: 47,
        BracketRight: 48,
        Backslash: 49,
        Semicolon: 51,
        Quote: 52,
        Backquote: 53,
        Comma: 54,
        Period: 55,
        Slash: 56,
        CapsLock: 57,
        F1: 58,
        F2: 59,
        F3: 60,
        F4: 61,
        F5: 62,
        F6: 63,
        F7: 64,
        F8: 65,
        F9: 66,
        F10: 67,
        F11: 68,
        F12: 69,
        ScrollLock: 71,
        Pause: 72,
        Insert: 73,
        Home: 74,
        PageUp: 75,
        Delete: 76,
        End: 77,
        PageDown: 78,
        ArrowRight: 79,
        ArrowLeft: 80,
        ArrowDown: 81,
        ArrowUp: 82,
        NumLock: 83,
        NumpadDivide: 84,
        NumpadMultiply: 85,
        NumpadSubtract: 86,
        NumpadAdd: 87,
        NumpadEnter: 88,
        Numpad1: 89,
        Numpad2: 90,
        Numpad3: 91,
        Numpad4: 92,
        Numpad5: 93,
        Numpad6: 94,
        Numpad7: 95,
        Numpad8: 96,
        Numpad9: 97,
        Numpad0: 98,
        NumpadDecimal: 99,
        ControlLeft: 224,
        ShiftLeft: 225,
        AltLeft: 226,
        MetaLeft: 227,
        ControlRight: 228,
        ShiftRight: 229,
        AltRight: 230,
        MetaRight: 231,
      };
      class R {
        constructor(e, t, i) {
          (r()(this, 'capsLock', void 0),
            r()(this, 'numLock', void 0),
            r()(this, 'scrollLock', void 0),
            r()(this, 'initialized', !1),
            void 0 === e || void 0 === t || void 0 === i
              ? ((this.capsLock = !1),
                (this.numLock = !1),
                (this.scrollLock = !1),
                (this.initialized = !1))
              : ((this.capsLock = e),
                (this.numLock = t),
                (this.scrollLock = i),
                (this.initialized = !0)));
        }
        isInitialized() {
          return this.initialized;
        }
        isEqual(e) {
          return (
            e.isInitialized() === this.isInitialized() &&
            this.capsLock === e.capsLock &&
            this.numLock === e.numLock &&
            this.scrollLock === e.scrollLock
          );
        }
        copyFrom(e) {
          e.isInitialized()
            ? ((this.capsLock = e.capsLock),
              (this.numLock = e.numLock),
              (this.scrollLock = e.scrollLock),
              (this.initialized = !0))
            : ((this.capsLock = !1),
              (this.numLock = !1),
              (this.scrollLock = !1),
              (this.initialized = !1));
        }
      }
      (r()(R, 'KeyboardReportType', a.KeyboardReportTypes.LockKeySync),
        r()(R, 'CapsLockKeyString', 'CapsLock'),
        r()(R, 'CapsLockWindowsKey', a.WindowsVkeyMap.VK_CAPITAL),
        r()(R, 'CapsLockKeyCode', 20),
        r()(R, 'NumLockKeyString', 'NumLock'),
        r()(R, 'NumLockWindowsKey', a.WindowsVkeyMap.VK_NUMLOCK),
        r()(R, 'NumLockKeyCode', 144),
        r()(R, 'ScrollLockKeyString', 'ScrollLock'),
        r()(R, 'ScrollLockWindowsKey', a.WindowsVkeyMap.VK_SCROLL),
        r()(R, 'ScrollLockKeyCode', 145));
    },
    99677(e, t, i) {
      function n(e) {
        var t;
        return 0 === e.ipV4Port
          ? e.ipV4Address
          : `${e.ipV4Address}:${e.ipV4Port}${null !== (t = e.uriPathAndQuery) && void 0 !== t ? t : ''}`;
      }
      function s(e) {
        var t;
        return 0 === e.ipV6Port
          ? e.ipV6Address
          : `${e.ipV6Address}:${e.ipV6Port}${null !== (t = e.uriPathAndQuery) && void 0 !== t ? t : ''}`;
      }
      function o(e, t, i, n) {
        const s = e.lastIndexOf(':'),
          o = e.lastIndexOf(']'),
          r = -1 != o;
        let a = '',
          l = 0,
          d = '',
          c = 0;
        return (
          -1 === s || (r && s < o) || s === e.length - 1
            ? r
              ? (c = 9002)
              : (l = 9002)
            : r
              ? (c = Number(e.substring(s + 1)))
              : (l = Number(e.substring(s + 1))),
          r
            ? (d = e.substring(0, o + 1))
            : (a = -1 === s ? e : e.substring(0, s)),
          {
            ipV4Address: a,
            ipV4Port: l,
            ipV6Address: d,
            ipV6Port: c,
            srtp: { key: t },
            uriPathAndQuery: i,
            stunServerAddresses: n,
          }
        );
      }
      i.d(t, { C3: () => s, Ix: () => n, ok: () => o });
    },
  },
]);
