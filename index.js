/**
 * @typedef {Object} BeaconOverride
 * @property {string} [name] - The name of the app
 * @property {string} [description] - The description of the app
 * @property {string} [url] - The canonical URL of the app
 * @property {string} [image] - The preview image of the app
 * @property {string} [tags] - The tags of the app
 * @property {boolean} [stripQueryParams] - Whether to strip query parameters
 */

/**
 * Generates a random v4 UUID. In scenarios where window.crypto is not available,
 * falls back to a manual generation method using Math.random(). We don't necessarily need
 * to ensure it's cryptographically random, so the use of Math.random() is acceptable.
 * @returns {string} A v4 UUID string
 */
function generateRandomUUID() {
  if (crypto && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const rand = Math.floor(Math.random() * 16); // Generate random value from 0-15
    const digit = c == 'x' ? rand : (rand & 0x3 | 0x8); // y must be 8, 9, A, or B
    return digit.toString(16);
  });
}

export default class Beacon {
  /** @type {string} The relay URL that this beacon will connect to */
  relay;
  /** @type {string} The name of the app, if specified. Overrides page checks. */
  specifiedName;
  /** @type {string} The description of the app, if specified. Overrides page checks. */
  specifiedDescription;
  /** @type {string} The canonical URL of the app, if specified. Overrides page checks. */
  specifiedUrl;
  /** @type {string} The preview image of the app, if specified. Overrides page checks. */
  specifiedImage;
  /** @type {string} The tags for the app, if specified. Overrides page checks. */
  specifiedTags;
  /** @type {boolean} Whether the beacon is currently in a browser context */
  browserContext = 'document' in globalThis;
  /** @type {Document} The top-level HTML document, if we detect we are running in an iframe. */
  topLevelDocument = null;
  /** @type {boolean} Controls whether query params are stripped from a URL by default if grabbing from document. Defaults to true. */
  stripQueryParams = true;

  /**
   *
   * @param {string} relay The relay URL that this beacon will connect to
   * @param {BeaconOverride} override Manual overrides for name and description. Will be passed directly to the relay when signalling.
   * @returns {Beacon}
   */
  constructor(relay, override = null) {
    if (!this.browserContext) {
      console.error("This beacon can only be used in a browser context!");
      return;
    }
    if (!relay) {
      console.error("You must specify a relay URL for the beacon to connect to!");
      return;
    }
    this.relay = relay;
    if (override) {
      this.specifiedName = override.name ?? null;
      this.specifiedDescription = override.description ?? null;
      this.specifiedUrl = override.url ?? null;
      this.specifiedImage = override.image ?? null;
      this.specifiedTags = override.tags ?? null;
      this.stripQueryParams = override.stripQueryParams ?? true;
    }

    this.sessionId = generateRandomUUID();
    console.log("Zesty Beacon v0.0.18");
  }

  /**
   * Retrieves the canonical URL from meta tag if specified, otherwise the current document URL
   * @returns {string}
   */
  getUrl() {
    if (this.specifiedUrl) return this.specifiedUrl;

    const location = this.topLevelDocument ? window.top.location : window.document.location;
    if (this.stripQueryParams) {
      return location.protocol + '//' + location.host + location.pathname;
    } else {
      return location.href;
    }
  }

  /**
   * Retrieves app name from meta tag, returning document title if not found
   * @returns {string}
   */
  getName() {
    if (this.specifiedName) return this.specifiedName;

    const document = this.topLevelDocument ?? window.document;
    const meta = document.head.querySelector('meta[name="application-name"]');
    if (meta) {
      return meta.getAttribute('content');
    } else {
      return document.title;
    }
  }

  /**
   * Retrieves app description from meta tag, returning empty string if not found
   * @returns {string}
   */
  getDescription() {
    if (this.specifiedDescription) return this.specifiedDescription;

    const document = this.topLevelDocument ?? window.document;
    const meta = document.head.querySelector('meta[name="description"]');
    const og = document.head.querySelector('meta[property="og:description"]');
    if (meta && meta.hasAttribute('description')) {
      // This is technically incorrect but there are instances of this in the wild,
      // so check for this first.
      return meta.getAttribute('description');
    } else if (meta) {
      return meta.getAttribute('content');
    } else if (og) {
      return og.getAttribute('content');
    } else {
      return "";
    }
  }

  /**
   * Retrieves an image relevant to the page content, either from the OpenGraph image
   * or a snapshot of the canvas once the 3D world has rendered.
   * @returns {Promise<string>}
   */
  async getImage() {
    if (this.specifiedImage) return this.specifiedImage;

    const document = this.topLevelDocument ?? window.document;
    const meta = document.head.querySelector('meta[property="og:image"]');

    if (meta) {
      let content = meta.getAttribute('content');
      if (content.length === 0) {
        // Content attribute is blank for some reason
        return "#";
      } else if (content.startsWith("http")) {
        // Content is an absolute URL, pass on as is
        return content;
      } else {
        // Content is a relative URL, concatenate with current URL
        return new URL(content, this.getUrl()).href;
      }
    }

    // For A-Frame scenes, wait for the scene to load before capturing
    const aScene = document.querySelector('a-scene');
    if (aScene) {
      await new Promise(resolve => {
        if (aScene.hasLoaded) {
          resolve();
        } else {
          aScene.addEventListener('loaded', resolve, { once: true });
        }
      });
      const aframeFallback = aScene.components.screenshot;
      if (aframeFallback) {
        // A-Frame inserts a component by default that allows you to save the current scene
        // in an equirectangular or perspective screenshot. We use perspective here for less warping
        // and reduce the dimensions, as it defaults to 4096 x 2048
        let oldWidth = aframeFallback.width;
        let oldHeight = aframeFallback.height;
        aScene.setAttribute("screenshot", "width: 2048; height: 1024;");
        const canvas = aframeFallback.getCanvas('perspective');
        const dataURL = canvas.toDataURL();
        // Restore initial values for screenshot after image is taken
        aScene.setAttribute("screenshot", `width: ${oldWidth}; height: ${oldHeight};`);
        return dataURL;
      }
    }

    // Generic canvas capture: poll until the canvas has real rendered content,
    // trying every 2 seconds for up to 30 seconds total.
    const maxAttempts = 15;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const canvas = this.findBestCanvas(document);
      if (canvas) {
        const captured = await this.captureCanvas(canvas);
        if (this.isValidCapture(captured)) return captured;
      }
    }

    return "#";
  }

  /**
   * Finds the largest canvas element on the page by area.
   * @param {Document} document
   * @returns {HTMLCanvasElement|null}
   */
  findBestCanvas(document) {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length === 0) return null;
    let best = null;
    let bestArea = 0;
    for (const c of canvases) {
      const area = c.width * c.height;
      if (area > bestArea) {
        bestArea = area;
        best = c;
      }
    }
    return best;
  }

  /**
   * Captures a canvas element as a JPEG data URL, with a two-attempt strategy
   * to handle WebGL contexts that don't preserve the drawing buffer.
   * @param {HTMLCanvasElement} canvas
   * @returns {Promise<string|null>}
   */
  async captureCanvas(canvas) {
    const capture = (source) => {
      try {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / source.width);
        const w = Math.floor(source.width * scale);
        const h = Math.floor(source.height * scale);
        const temp = document.createElement('canvas');
        temp.width = w;
        temp.height = h;
        const ctx = temp.getContext('2d');
        ctx.drawImage(source, 0, 0, w, h);
        return temp.toDataURL('image/jpeg', 0.8);
      } catch (e) {
        return null;
      }
    };

    // Attempt 1: Direct capture
    let dataURL = capture(canvas);
    if (this.isValidCapture(dataURL)) return dataURL;

    // Attempt 2: Capture on next animation frame (works for preserveDrawingBuffer: false)
    dataURL = await new Promise(resolve => {
      requestAnimationFrame(() => resolve(capture(canvas)));
    });
    if (this.isValidCapture(dataURL)) return dataURL;

    return null;
  }

  /**
   * Checks whether a captured data URL contains meaningful image data.
   * Blank canvases compress to very small JPEGs (<5KB / ~6800 chars base64),
   * while real 3D scenes at 800px wide produce much larger images.
   * @param {string|null} dataURL
   * @returns {boolean}
   */
  isValidCapture(dataURL) {
    return dataURL != null && dataURL.length > 10000;
  }

  /**
   * Checks whether this page contains adult content.
   * @returns {boolean}
   */
  isAdult() {
    const document = this.topLevelDocument ?? window.document;
    const meta = document.head.querySelector('meta[name="rating"]');
    if (meta) {
      const meta1 = meta.getAttribute('content') === 'adult';
      // Comes from https://www.rtalabel.org/?content=howto
      const meta2 = meta.getAttribute('content') === 'RTA-5042-1996-1400-1577-RTA';
      return meta1 || meta2;
    }

    // At this point, ideally the website has accurately indicated its content rating.
    // If not, it will need to be filtered manually on the relay side.
    return false;
  }

  /**
   * Retrieves any specified keywords for the page, which in turn will assist with filtering
   * on the relay side.
   * @returns {string}
   */
  getTags() {
    if (this.specifiedTags) return this.specifiedTags;

    const document = this.topLevelDocument ?? window.document;
    const meta = document.head.querySelector('meta[name="keywords"]');
    if (meta) {
      return meta.getAttribute('content');
    } else {
      return "";
    }
  }

  /**
   * Sends a signal to the relay with the app's current metadata
   * @returns {Promise<void>}
   */
  async signal() {
    if (!this.browserContext) {
      console.error("This beacon can only be used in a browser context!");
      return;
    }
    if (!this.relay) {
      console.error("You must specify a relay URL for the beacon to connect to!");
      return;
    }
    if (document.readyState !== 'complete') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    // Check if we are running in an iframe. If so, try to get the top-level document.
    // Unfortunately, this will only work if the frames are same-origin.
    if (window.self !== window.top) {
      try {
        this.topLevelDocument = window.top.document;
      } catch {
        console.error("Cannot get URL of cross-origin frame, aborting.");
        return;
      }
    }
    const url = this.getUrl();
    const name = this.getName();
    const description = this.getDescription();
    const adult = this.isAdult();
    const tags = this.getTags();
    if (!url || !name || !description) {
      console.error("Missing required metadata! Check your <meta> tags for the following attributes: data-canonical-url, name=application-name, name=description, og:image");
      return;
    }
    const basePayload = {
      url,
      name,
      description,
      active: true,
      adult,
      tags,
    };
    const sendBeacon = async () => {
      const freshImage = await this.getImage();
      await fetch(`${this.relay}/beacon`, {
        method: 'PUT',
        body: JSON.stringify({ ...basePayload, image: freshImage }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    };
    await sendBeacon();
    setInterval(sendBeacon, 24 * 60 * 60 * 1000);
    const heartbeat = setInterval(async () => {
      try {
        await fetch(`${this.relay}/session`, {
          method: 'POST',
          body: JSON.stringify({
            session_id: this.sessionId,
            url,
            timestamp: Date.now(),
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch {
        console.error("Failed to send heartbeat signal! Relay server is not reachable.")
        clearInterval(heartbeat);
      }
    }, 5000);
  }
}