export default class Beacon {
  relay;
  specifiedName;
  specifiedDescription;
  browserContext = 'document' in globalThis;

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

  getUrl() {
    const meta = document.head.querySelector('meta[data-canonical-url]');
    if (meta) {
      return meta.getAttribute('data-canonical-url');
    } else {
      return document.location.href;
    }
  }

  getName() {
    if (this.specifiedName) return this.specifiedName;

    const meta = document.head.querySelector('meta[name="application-name"]');
    if (meta) {
      return meta.getAttribute('content');
    } else {
      return document.title;
    }
  }

  getDescription() {
    if (this.specifiedDescription) return this.specifiedDescription;

    const meta = document.head.querySelector('meta[name="description"]');
    if (meta) {
      return meta.getAttribute('content');
    } else {
      return "";
    }
  }

  async signal() {
    if (!this.browserContext) {
      console.error("This beacon can only be used in a browser context!");
      return;
    }
    if (!relay) {
      console.error("You must specify a relay URL for the beacon to connect to!");
      return;
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