export default class Beacon {
  /** @type {string} The relay URL that this beacon will connect to */
  relay;
  /** @type {string} The name of the app, if specified. Overrides page checks. */
  specifiedName;
  /** @type {string} The description of the app, if specified. Overrides page checks. */
  specifiedDescription;
  /** @type {boolean} Whether the beacon is currently in a browser context */
  browserContext = 'document' in globalThis;
  /** @type {Document} The top-level HTML document, if we detect we are running in an iframe. */
  topLevelDocument = null;

  /**
   *
   * @param {string} relay The relay URL that this beacon will connect to
   * @param {{ name?: string, description?: string }} override Manual overrides for name and description. Will be passed directly to the relay when signalling.
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
    }
  }

  /**
   * Retrieves the canonical URL from meta tag if specified, otherwise the current document URL
   * @returns {string}
   */
  getUrl() {
    const document = this.topLevelDocument ?? window.document;
    const meta = document.head.querySelector('meta[data-canonical-url]');
    if (meta) {
      return meta.getAttribute('data-canonical-url');
    } else {
      return this.topLevelDocument ? window.top.location.href : window.document.location.href;
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
    if (!url || !name || !description) {
      console.error("Missing required metadata! Check your <meta> tags for the following attributes: data-canonical-url, name=application-name, name=description");
      return;
    }
    const payload = {
      url,
      name,
      description,
      active: true
    };
    await fetch(`${this.relay}/beacon`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}